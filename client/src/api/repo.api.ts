import api from './client';
import { Repo } from '../types';

export const getConnectedRepos = async (): Promise<Repo[]> => {
  const response = await api.get('/repo');
  return response.data.repos;
};

export const getGithubRepos = async (): Promise<any[]> => {
  const response = await api.get('/repo/github');
  return response.data.repos;
};

export const connectRepo = async (githubRepoId: string, owner: string, name: string): Promise<Repo> => {
  const response = await api.post('/repo', { githubRepoId, owner, name });
  return response.data.repo;
};

export const disconnectRepo = async (id: string): Promise<void> => {
  await api.delete(`/repo/${id}`);
};

export const updateRepoSettings = async (id: string, data: { slackWebhookUrl?: string | null }): Promise<Repo> => {
  const response = await api.patch(`/repo/${id}/settings`, data);
  return response.data.repo;
};
