import { Session } from '@prisma/client';

export type SessionCreateInput = {
  userId: string;
  token: string; // The raw github access token, which will be encrypted
  expiresAt: Date;
};

export type SessionResponse = Session;
