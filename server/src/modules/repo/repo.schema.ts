import { z } from 'zod';

export const connectRepoSchema = z.object({
  body: z.object({
    githubRepoId: z.string({
      message: 'githubRepoId is required',
    }),
    owner: z.string({
      message: 'owner is required',
    }),
    name: z.string({
      message: 'name is required',
    }),
  }),
});

export type ConnectRepoSchema = z.infer<typeof connectRepoSchema>['body'];
