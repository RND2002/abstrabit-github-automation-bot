import { User } from '@prisma/client';

export type UserCreateInput = {
  githubId: string;
  email: string | null;
  username: string;
  avatarUrl: string | null;
};

export type UserResponse = Omit<User, 'updatedAt'>;
