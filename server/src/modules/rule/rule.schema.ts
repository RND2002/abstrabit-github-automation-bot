import { z } from 'zod';

export const createRuleSchema = z.object({
  body: z.object({
    repoId: z.string(),
    name: z.string(),
    event: z.string(),
    condition: z.string(), // json string or simplified query
    action: z.string(),
    actionArgs: z.string().optional().nullable(),
    slackWebhookUrl: z.string().optional().nullable(),
    slackAlert: z.boolean().optional(),
    slackMessage: z.string().optional().nullable(),
    isActive: z.boolean().default(true),
  }),
});

export type CreateRuleSchema = z.infer<typeof createRuleSchema>['body'];
