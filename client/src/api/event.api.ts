import api from './client';
import { Event } from '../types';

export const getEventsByRepo = async (repoId: string, page = 1, limit = 20) => {
  const response = await api.get(`/event/repo/${repoId}?page=${page}&limit=${limit}`);
  return response.data.data;
};

export const getGlobalEvents = async (page = 1, limit = 20) => {
  const response = await api.get(`/event/global?page=${page}&limit=${limit}`);
  return response.data.data;
};

export const retryEvent = async (eventId: string) => {
  const response = await api.post(`/event/${eventId}/retry`);
  return response.data;
};
