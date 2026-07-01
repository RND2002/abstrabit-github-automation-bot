import api from './client';
import { Rule } from '../types';

export const getRulesByRepo = async (repoId: string): Promise<Rule[]> => {
  const response = await api.get(`/rule/repo/${repoId}`);
  return response.data.rules || [];
};

export const createRule = async (data: { repoId: string, name: string, event: string, condition: string, action: string, actionArgs?: string | null, slackWebhookUrl?: string | null, slackAlert?: boolean, slackMessage?: string | null }): Promise<Rule> => {
  const response = await api.post(`/rule`, data);
  return response.data;
};

export const deleteRule = async (id: string): Promise<void> => {
  await api.delete(`/rule/${id}`);
};
