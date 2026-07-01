import { z } from 'zod';

export const createRuleBodySchema = z.object({
  repoId: z.string(),
  name: z.string(),
  event: z.string(),
  condition: z.string(),
  action: z.string(),
  actionArgs: z.string().optional().nullable(),
  slackWebhookUrl: z.string().optional().nullable(),
  slackAlert: z.boolean().optional(),
  slackMessage: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const verifySlackBodySchema = z.object({
  webhookUrl: z.string().url('Webhook URL must be a valid URL'),
});

export type CreateRuleSchema = z.infer<typeof createRuleBodySchema>;
export type VerifySlackSchema = z.infer<typeof verifySlackBodySchema>;
