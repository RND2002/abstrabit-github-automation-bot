import { prisma } from '../../core/db/prisma';
import { Constants } from '../../config/constants';
import { logger } from '../../core/utils/logger';
import * as eventRepository from './event.repository';
import { dispatchToRuleEngine } from '../webhook/webhook.service';
import { ApiError } from '../../core/utils/apiError';

export const listEvents = async (repoId: string, page: number = 1, limit: number = 20) => {
  const skip = (page - 1) * limit;

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where: { repoId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.event.count({ where: { repoId } }),
  ]);

  return {
    data: events,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const listGlobalEvents = async (userId: string, page: number = 1, limit: number = 20) => {
  const skip = (page - 1) * limit;

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where: { repo: { userId } },
      include: { repo: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.event.count({ where: { repo: { userId } } }),
  ]);

  return {
    data: events,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const retryEvent = async (eventId: string, userId: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { repo: true },
  });

  if (!event) throw new ApiError(404, 'Event not found');
  if (event.repo.userId !== userId) throw new ApiError(403, 'Forbidden');

  if (event.retryCount >= Constants.Retry.MaxRetries) {
    throw new ApiError(400, `Maximum retry limit (${Constants.Retry.MaxRetries}) reached`);
  }

  await eventRepository.incrementEventRetry(eventId);
  
  logger.info({ eventId, retryCount: event.retryCount + 1 }, 'Manual event retry initiated');

  // Re-trigger the rule engine processing in background
  dispatchToRuleEngine(eventId).catch((err) => {
    logger.error({ err, eventId }, 'Unhandled error during event retry');
  });

  return { success: true, message: 'Event retry initiated' };
};
