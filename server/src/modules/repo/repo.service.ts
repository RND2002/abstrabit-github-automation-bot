import * as repoRepository from './repo.repository';
import { listUserRepos, createWebhook, deleteWebhook } from '../../integrations/github/github.client';
import { ApiError } from '../../core/utils/apiError';
import { env } from '../../config/env';

export const listGithubRepos = async (githubToken: string) => {
  return listUserRepos(githubToken);
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

  // Create GitHub webhook
  // We need the public URL where GitHub will send webhooks.
  const webhookUrl = `${env.API_URL || 'https://abstrabit.onrender.com'}/api/webhook/github`;
  
  try {
    await createWebhook(githubToken, owner, name, webhookUrl, env.WEBHOOK_SECRET);
  } catch (error: any) {
    // If the webhook already exists, GitHub returns 422. We can safely ignore this and proceed.
    if (error.response?.status === 422) {
      console.warn(`Webhook already exists for ${owner}/${name}. Proceeding with connection.`);
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

  // Ideally, we'd delete the webhook here.
  // But we need the hook ID from GitHub. If we didn't save it in DB, we could fetch hooks and find it.
  // For now, we will just delete from DB.
  // To do a full implementation, we'd need to save hookId in DB, or fetch hooks to delete.
  
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
