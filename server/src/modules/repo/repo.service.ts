import * as repoRepository from './repo.repository';
import { listUserRepos, createWebhook, deleteWebhook } from '../../integrations/github/github.client';
import { ApiError } from '../../core/utils/apiError';
import { logger } from '../../core/utils/logger';
import { env } from '../../config/env';

export const listGithubRepos = async (githubToken: string) => {
  const repos = await listUserRepos(githubToken);
  return repos.filter((repo: any) => repo.permissions?.admin === true);
};

export const connectRepo = async (
  userId: string,
  githubToken: string,
  githubRepoId: string,
  owner: string,
  name: string
) => {
  // Check if already connected
  const existing = await repoRepository.getRepoByGithubId(githubRepoId);
  if (existing) {
    throw new ApiError(400, 'Repository is already connected');
  }

  const webhookUrl = `${env.API_URL || 'https://abstrabit.onrender.com'}/api/webhook/github`;

  try {
    await createWebhook(githubToken, owner, name, webhookUrl, env.WEBHOOK_SECRET);
  } catch (error: any) {
    if (error.response?.status === 422) {
      logger.warn({ owner, name }, 'Webhook already exists — proceeding with connection');
    } else {
      throw new ApiError(400, `Failed to create webhook: ${error.message}`);
    }
  }

  // Save to DB
  return repoRepository.createRepo(githubRepoId, owner, name, userId);
};

export const disconnectRepo = async (userId: string, githubToken: string, repoId: string) => {
  const repo = await repoRepository.getRepoById(repoId);
  if (!repo) {
    throw new ApiError(404, 'Repository not found');
  }

  if (repo.userId !== userId) {
    throw new ApiError(403, 'Forbidden');
  }


  await repoRepository.deleteRepo(repoId);
};

export const getConnectedRepos = async (userId: string) => {
  return repoRepository.getUserRepos(userId);
};

export const updateRepoSettings = async (userId: string, repoId: string, data: { slackWebhookUrl?: string | null }) => {
  const repo = await repoRepository.getRepoById(repoId);
  if (!repo) {
    throw new ApiError(404, 'Repository not found');
  }

  if (repo.userId !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  return repoRepository.updateRepo(repoId, data);
};
