import { Session } from '@prisma/client';

export type SessionCreateInput = {
  userId: string;
  token: string;
  expiresAt: Date;
};

export type SessionResponse = Session;
