import { prisma } from '../../core/db/prisma';
import { Event, EventStatus } from './event.types';

export const createEvent = async (
  repoId: string,
  githubDeliveryId: string,
  eventType: string,
  payload: string,
  status: EventStatus
): Promise<Event> => {
  return prisma.event.create({
    data: {
      repoId,
      githubDeliveryId,
      eventType,
      payload,
      status,
    },
  });
};

export const getEventByDeliveryId = async (githubDeliveryId: string): Promise<Event | null> => {
  return prisma.event.findUnique({
    where: { githubDeliveryId },
  });
};

export const getEventById = async (id: string): Promise<Event | null> => {
  return prisma.event.findUnique({
    where: { id },
  });
};

export const updateEventStatus = async (
  id: string, 
  status: EventStatus,
  errorLog?: string
): Promise<Event> => {
  return prisma.event.update({
    where: { id },
    data: { 
      status,
      ...(errorLog !== undefined && { errorLog }),
    },
  });
};

export const updateEventAiMetadata = async (
  id: string,
  aiSummary: string | null,
  aiPriority: string | null,
  aiSuggestedLabel: string | null
): Promise<Event> => {
  return prisma.event.update({
    where: { id },
    data: {
      aiSummary,
      aiPriority,
      aiSuggestedLabel,
    },
  });
};

export const incrementEventRetry = async (id: string): Promise<Event> => {
  return prisma.event.update({
    where: { id },
    data: {
      retryCount: { increment: 1 },
      status: EventStatus.PENDING,
      errorLog: null,
    },
  });
};
