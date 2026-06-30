import { prisma } from '../../core/db/prisma';
import { UserCreateInput } from './user.types';

export const upsertFromGithub = async (data: UserCreateInput) => {
  return prisma.user.upsert({
    where: { githubId: data.githubId },
    update: {
      email: data.email,
      username: data.username,
      avatarUrl: data.avatarUrl,
    },
    create: data,
  });
};

export const getById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
  });
};
