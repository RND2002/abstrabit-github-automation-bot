import { Request, Response } from 'express';
import * as repoService from './repo.service';
import { ConnectRepoSchema } from './repo.schema';
import { ApiError } from '../../core/utils/apiError';

export const listGithubRepos = async (req: Request, res: Response) => {
  const githubToken = req.githubToken;
  if (!githubToken) {
    throw new ApiError(401, 'GitHub token not found');
  }

  const repos = await repoService.listGithubRepos(githubToken);
  res.status(200).send({ repos });
};

export const getConnectedRepos = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const repos = await repoService.getConnectedRepos(userId);
  res.status(200).send({ repos });
};

export const connectRepo = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const githubToken = req.githubToken;

  if (!userId || !githubToken) {
    throw new ApiError(401, 'Unauthorized');
  }

  const data = req.body as ConnectRepoSchema;
  const repo = await repoService.connectRepo(userId, githubToken, data.githubRepoId, data.owner, data.name);

  res.status(201).send({ repo });
};

export const disconnectRepo = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const githubToken = req.githubToken;

  if (!userId || !githubToken) {
    throw new ApiError(401, 'Unauthorized');
  }

  const { id } = req.params as { id: string };
  await repoService.disconnectRepo(userId, githubToken, id);

  res.status(200).send({ success: true });
};

export const updateRepoSettings = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const { id } = req.params as { id: string };
  const { slackWebhookUrl } = req.body;

  const repo = await repoService.updateRepoSettings(userId, id, { slackWebhookUrl });
  res.status(200).send({ repo });
};
