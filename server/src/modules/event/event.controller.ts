import { Request, Response } from 'express';
import * as eventService from './event.service';
import * as repoRepository from '../repo/repo.repository';
import { ApiError } from '../../core/utils/apiError';

export const listEvents = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const repoId = req.params.repoId as string;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  if (!repoId) {
    throw new ApiError(400, 'Repo ID is required');
  }

  // Verify repo belongs to user
  const repo = await repoRepository.getRepoById(repoId);
  if (!repo || repo.userId !== userId) {
    throw new ApiError(403, 'Forbidden');
  }

  const result = await eventService.listEvents(repoId, page, limit);
  res.status(200).send(result);
};

export const listGlobalEvents = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, 'Unauthorized');
  
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await eventService.listGlobalEvents(userId, page, limit);
  res.status(200).send(result);
};

export const retryEvent = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const eventId = req.params.eventId as string;
  if (!userId) throw new ApiError(401, 'Unauthorized');
  if (!eventId) throw new ApiError(400, 'Event ID is required');

  const result = await eventService.retryEvent(eventId, userId);
  res.status(200).send(result);
};
