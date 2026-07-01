import crypto from 'crypto';
import { env } from '../../config/env';
import { ApiError } from '../../core/utils/apiError';
import { logger } from '../../core/utils/logger';
import { Constants, EventStatus } from '../../config/constants';
import * as eventRepository from '../event/event.repository';
import * as repoRepository from '../repo/repo.repository';
import * as ruleRepository from '../rule/rule.repository';
import * as ruleService from '../rule/rule.service';
import * as githubActionService from '../action/github-action.service';
import * as slackActionService from '../action/slack-action.service';
import { prisma } from '../../core/db/prisma';
import { decrypt } from '../../core/utils/crypto.util';
import { analyzeIssueOrPR } from '../../integrations/ai/openrouter.client';

export const verifySignature = (payload: string, signature: string) => {
  if (!signature) {
    throw new ApiError(401, 'No signature found on request');
  }

  const hmac = crypto.createHmac('sha256', env.WEBHOOK_SECRET);
  const digest = `sha256=${hmac.update(payload).digest('hex')}`;

  if (!crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
    throw new ApiError(401, 'Invalid signature');
  }
};

export const processWebhook = async (
  githubDeliveryId: string,
  eventType: string,
  githubRepoId: string,
  payload: string
) => {
  // 1. Dedup check
  const existingEvent = await eventRepository.getEventByDeliveryId(githubDeliveryId);
  if (existingEvent) {
    logger.info({ githubDeliveryId }, 'Duplicate webhook delivery — skipping');
    return; // Already processed or processing
  }

  // 2. Find repo in our DB
  const repo = await repoRepository.getRepoByGithubId(githubRepoId);
  if (!repo) {
    logger.debug({ githubRepoId }, 'Webhook from untracked repository — ignoring');
    return;
  }

  // 3. Store event
  const event = await eventRepository.createEvent(
    repo.id,
    githubDeliveryId,
    eventType,
    payload,
    EventStatus.PENDING
  );

  // 4. Dispatch to rule engine asynchronously so we can respond 200 fast
  dispatchToRuleEngine(event.id).catch((err) => {
    logger.error({ err, eventId: event.id }, 'Unhandled error in dispatchToRuleEngine');
  });
};

/**
 * Sleep helper for retry backoff.
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry a single action with exponential backoff.
 * Returns on success, throws on final failure.
 */
const withRetry = async <T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries: number = Constants.Retry.MaxRetries,
  baseDelay: number = Constants.Retry.BaseDelayMs
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt); // 1s, 2s, 4s
        logger.warn({ attempt: attempt + 1, maxRetries, delay, label }, 'Action failed — retrying');
        await sleep(delay);
      }
    }
  }
  throw lastError;
};

export const dispatchToRuleEngine = async (eventId: string) => {
  try {
    const event = await eventRepository.getEventById(eventId);
    if (!event || event.status !== EventStatus.PENDING) return;

    const repo = await repoRepository.getRepoById(event.repoId);
    if (!repo) return;

    let parsedPayload: any = {};
    try {
      parsedPayload = JSON.parse(event.payload);
    } catch (e) {
      logger.warn({ eventId }, 'Failed to parse event payload as JSON');
    }

    // AI Augmentation step
    if (
      env.OPENROUTER_API_KEY &&
      (event.eventType === 'issues' || event.eventType === 'pull_request') &&
      parsedPayload?.action === 'opened'
    ) {
      const issue = parsedPayload.issue || parsedPayload.pull_request;
      if (issue) {
        const aiResult = await analyzeIssueOrPR(issue.title || '', issue.body || '');
        if (aiResult) {
          await eventRepository.updateEventAiMetadata(
            event.id,
            aiResult.summary,
            aiResult.priority,
            aiResult.suggestedLabel
          );
          // Inject into memory payload for rule engine & template interpolation
          parsedPayload.ai = aiResult;
          event.payload = JSON.stringify(parsedPayload);
        }
      }
    }

    const rules = await ruleRepository.getActiveRulesByRepoId(repo.id);

    let hasError = false;
    let matchedAny = false;

    for (const rule of rules) {
      const isMatch = ruleService.matchEvent(rule, event.payload, event.eventType);
      
      if (isMatch) {
        matchedAny = true;
        try {
          await withRetry(
            () => triggerAction(rule, repo, event),
            `rule:${rule.id}/${rule.action}`
          );
        } catch (error: any) {
          logger.error({ err: error, ruleId: rule.id, action: rule.action }, 'Failed to execute action after retries');
          const errorLog = error?.response?.data ? JSON.stringify(error.response.data) : (error.message || String(error));
          await eventRepository.updateEventStatus(event.id, EventStatus.FAILED, `Rule ${rule.name}: ${errorLog}`);
          hasError = true;
          break; // Stop executing further rules on failure
        }
      }
    }

    if (!hasError) {
      await eventRepository.updateEventStatus(
        event.id,
        matchedAny ? EventStatus.PROCESSED : EventStatus.IGNORED
      );
    }
  } catch (error: any) {
    logger.error({ err: error, eventId }, 'Error dispatching to rule engine');
    const errorLog = error?.response?.data ? JSON.stringify(error.response.data) : (error.message || String(error));
    await eventRepository.updateEventStatus(eventId, EventStatus.FAILED, errorLog);
  }
};

const interpolateTemplate = (template: string, payload: any): string => {
  if (typeof template !== 'string') return template;
  return template.replace(/\{\{(.*?)\}\}/g, (match, key) => {
    const parts = key.trim().split('.');
    let value = payload;
    for (const part of parts) {
      if (value == null) {
        value = undefined;
        break;
      }
      value = value[part];
    }
    return value !== undefined && value !== null ? String(value) : '';
  });
};

const triggerAction = async (rule: any, repo: any, event: any) => {
  // Find user's active (non-expired) session to get github token
  const session = await prisma.session.findFirst({
    where: {
      userId: repo.userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!session && rule.action.startsWith('GITHUB_')) {
    logger.warn({ userId: repo.userId, ruleId: rule.id }, 'No active session found for GitHub action');
    return;
  }

  const githubToken = session ? decrypt(session.token) : '';

  if (rule.action === 'GITHUB_ADD_LABEL') {
    const parsedPayload = JSON.parse(event.payload);
    const issueNumber = parsedPayload.issue?.number || parsedPayload.pull_request?.number;
    if (issueNumber && rule.actionArgs) {
      const labels = JSON.parse(rule.actionArgs); // e.g. ["bug"]
      await githubActionService.addLabel(githubToken, repo.owner, repo.name, issueNumber, labels);
    }
  } else if (rule.action === 'GITHUB_COMMENT') {
    const parsedPayload = JSON.parse(event.payload);
    const issueNumber = parsedPayload.issue?.number || parsedPayload.pull_request?.number;
    if (issueNumber && rule.actionArgs) {
      const { body } = JSON.parse(rule.actionArgs); // e.g. { "body": "Hello!" }
      const finalBody = interpolateTemplate(body, parsedPayload);
      await githubActionService.postComment(githubToken, repo.owner, repo.name, issueNumber, finalBody);
    }
  } else if (rule.action === 'SLACK_MESSAGE') {
    const parsedPayload = JSON.parse(event.payload);
    const webhookUrl = rule.slackWebhookUrl || repo.slackWebhookUrl;
    
    if (!webhookUrl) {
      logger.warn({ ruleId: rule.id, repoId: repo.id }, 'No Slack Webhook URL found for rule or repo');
    } else {
      let message = 'A webhook event occurred.';
      if (rule.actionArgs) {
        try {
          const args = JSON.parse(rule.actionArgs);
          if (args.message) message = args.message;
        } catch (e) {
          // Ignore invalid actionArgs JSON
        }
      }
      
      const finalMessage = interpolateTemplate(message, parsedPayload);
      await slackActionService.postToWebhookUrl(webhookUrl, finalMessage);
    }
  }

  // Secondary Slack Alert (if slackAlert is checked and primary action wasn't SLACK_MESSAGE)
  if (rule.slackAlert && rule.action !== 'SLACK_MESSAGE') {
    const parsedPayload = JSON.parse(event.payload);
    const webhookUrl = rule.slackWebhookUrl || repo.slackWebhookUrl;
    
    if (!webhookUrl) {
      logger.warn({ ruleId: rule.id }, 'No Slack Webhook URL found for secondary alert');
    } else {
      const message = rule.slackMessage || 'A webhook event occurred (secondary alert).';
      const finalMessage = interpolateTemplate(message, parsedPayload);
      await slackActionService.postToWebhookUrl(webhookUrl, finalMessage);
    }
  }
};
