import { prisma } from '../../core/db/prisma';

export const create = async (userId: string, token: string, expiresAt: Date) => {
  return prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });
};

export const findValid = async (id: string) => {
  return prisma.session.findFirst({
    where: {
      id,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: true,
    },
  });
};

export const findValidByUserId = async (userId: string) => {
  return prisma.session.findFirst({
    where: {
      userId,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const revoke = async (id: string) => {
  return prisma.session.delete({
    where: { id },
  });
};
