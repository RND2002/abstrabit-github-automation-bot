import crypto from 'crypto';
import { env } from '../../config/env';
import { ApiError } from '../../core/utils/apiError';
import * as eventRepository from '../event/event.repository';
import { EventStatus } from '../event/event.types';
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
    return; // Already processed or processing
  }

  // 2. Find repo in our DB
  const repo = await repoRepository.getRepoByGithubId(githubRepoId);
  if (!repo) {
    // If we don't track this repo, just ignore it.
    // However we'll store it as ignored just in case? Or just drop it.
    // Let's drop it to save DB space.
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
  // (In Phase 4 we will actually call the dispatcher here, right now just fire and forget)
  dispatchToRuleEngine(event.id).catch(console.error);
};

export const dispatchToRuleEngine = async (eventId: string) => {
  try {
    const event = await eventRepository.getEventById(eventId);
    if (!event || event.status !== EventStatus.PENDING) return;

    const repo = await repoRepository.getRepoById(event.repoId);
    if (!repo) return;

    let aiResult = null;
    let parsedPayload: any = {};
    try {
      parsedPayload = JSON.parse(event.payload);
    } catch(e) {}

    // AI Augmentation step
    if (
      env.OPENROUTER_API_KEY &&
      (event.eventType === 'issues' || event.eventType === 'pull_request') &&
      parsedPayload?.action === 'opened'
    ) {
      const issue = parsedPayload.issue || parsedPayload.pull_request;
      if (issue) {
        aiResult = await analyzeIssueOrPR(issue.title || '', issue.body || '');
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
        // Trigger action
        try {
          await triggerAction(rule, repo, event);
        } catch (error: any) {
          console.error(`Failed to execute action ${rule.action} for rule ${rule.id}:`, error);
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
    console.error('Error dispatching to rule engine:', error);
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
      if (value == null) break;
      value = value[part];
    }
    return value !== undefined && value !== null ? String(value) : match;
  });
};

const triggerAction = async (rule: any, repo: any, event: any) => {
  // Find user's active session to get github token
  const session = await prisma.session.findFirst({
    where: { userId: repo.userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!session && rule.action.startsWith('GITHUB_')) {
    console.error('No active session found for user to perform GitHub action');
    return;
  }

  const githubToken = session ? decrypt(session.token) : '';

  try {
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
        console.error(`No Slack Webhook URL found for rule ${rule.id} or repo ${repo.id}`);
      } else {
        let message = 'A webhook event occurred.';
        if (rule.actionArgs) {
          try {
            const args = JSON.parse(rule.actionArgs);
            if (args.message) message = args.message;
          } catch (e) {}
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
        console.error(`No Slack Webhook URL found for secondary alert on rule ${rule.id}`);
      } else {
        let message = rule.slackMessage || 'A webhook event occurred (secondary alert).';
        const finalMessage = interpolateTemplate(message, parsedPayload);
        await slackActionService.postToWebhookUrl(webhookUrl, finalMessage);
      }
    }
  } catch (error) {
    throw error;
  }
};
