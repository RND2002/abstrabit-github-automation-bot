import { z } from 'zod';

export const connectRepoBodySchema = z.object({
  githubRepoId: z.string({
    message: 'githubRepoId is required',
  }),
  owner: z.string({
    message: 'owner is required',
  }),
  name: z.string({
    message: 'name is required',
  }),
});

export const updateRepoSettingsBodySchema = z.object({
  slackWebhookUrl: z.string().url().nullable().optional(),
});

export type ConnectRepoSchema = z.infer<typeof connectRepoBodySchema>;
export type UpdateRepoSettingsSchema = z.infer<typeof updateRepoSettingsBodySchema>;
