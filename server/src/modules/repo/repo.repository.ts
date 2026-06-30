import { prisma } from '../../core/db/prisma';
import { Repo } from './repo.types';

export const createRepo = async (
  githubRepoId: string,
  owner: string,
  name: string,
  userId: string
): Promise<Repo> => {
  return prisma.repo.create({
    data: {
      githubRepoId,
      owner,
      name,
      userId,
    },
  });
};

export const getRepoByGithubId = async (githubRepoId: string): Promise<Repo | null> => {
  return prisma.repo.findUnique({
    where: { githubRepoId },
  });
};

export const getRepoById = async (id: string): Promise<Repo | null> => {
  return prisma.repo.findUnique({
    where: { id },
  });
};

export const getUserRepos = async (userId: string): Promise<Repo[]> => {
  return prisma.repo.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

export const deleteRepo = async (id: string): Promise<void> => {
  await prisma.repo.delete({
    where: { id },
  });
};

export const updateRepo = async (id: string, data: { slackWebhookUrl?: string | null }): Promise<Repo> => {
  return prisma.repo.update({
    where: { id },
    data,
  });
};
