import { Request, Response } from 'express';
import * as webhookService from './webhook.service';
import { ApiError } from '../../core/utils/apiError';
import { logger } from '../../core/utils/logger';

export const handleGithubWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const eventType = req.headers['x-github-event'] as string;
  const deliveryId = req.headers['x-github-delivery'] as string;

  const rawBody = (req as any).rawBody as string;

  if (!signature || !eventType || !deliveryId) {
    throw new ApiError(400, 'Missing GitHub webhook headers');
  }

  // 1. Verify signature
  webhookService.verifySignature(rawBody, signature);

  // 2. Identify the repository
  const payload = req.body;
  const githubRepoId = payload?.repository?.id?.toString();

  logger.info({
    eventType,
    deliveryId,
    githubRepoId,
  }, 'Received GitHub webhook');

  if (!githubRepoId) {
    // If it's an event not tied to a repository (like ping or organization), we just return 200
    res.status(200).send('Event ignored - no repository found in payload');
    return;
  }

  await webhookService.processWebhook(deliveryId, eventType, githubRepoId, rawBody);

  res.status(200).send({ success: true });
};
