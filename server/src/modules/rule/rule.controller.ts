import { Request, Response } from 'express';
import axios from 'axios';
import * as ruleService from './rule.service';
import { CreateRuleSchema, VerifySlackSchema } from './rule.schema';
import { ApiError } from '../../core/utils/apiError';
import { logger } from '../../core/utils/logger';
import * as repoRepository from '../repo/repo.repository';

export const createRule = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const data = req.body as CreateRuleSchema;

  // Verify repo belongs to user
  const repo = await repoRepository.getRepoById(data.repoId);
  if (!repo || repo.userId !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  const rule = await ruleService.createRule(data);
  res.status(201).send({ rule });
};

export const getRules = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const repoId = req.params.repoId as string;

  if (!repoId) {
    throw new ApiError(400, 'Repo ID is required');
  }

  // Verify repo belongs to user
  const repo = await repoRepository.getRepoById(repoId);
  if (!repo || repo.userId !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  const rules = await ruleService.getRules(repoId);
  res.status(200).send({ rules });
};

export const deleteRule = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const ruleId = req.params.id as string;

  // Verify rule belongs to a repo owned by the user
  const rule = await ruleService.getRuleById(ruleId);
  if (!rule) {
    throw new ApiError(404, 'Rule not found');
  }

  const repo = await repoRepository.getRepoById(rule.repoId);
  if (!repo || repo.userId !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  await ruleService.deleteRule(ruleId);
  res.status(200).send({ success: true });
};

export const verifySlackWebhook = async (req: Request, res: Response) => {
  const { webhookUrl } = req.body as VerifySlackSchema;

  try {
    await axios.post(webhookUrl, {
      text: 'Hello! This is a test ping from abstrabit to verify your webhook connection.'
    });
    res.status(200).send({ success: true });
  } catch (error: any) {
    logger.warn({ err: error, webhookUrl }, 'Slack verify ping failed');
    throw new ApiError(400, 'Failed to verify webhook URL. Please check if the URL is valid.');
  }
};
