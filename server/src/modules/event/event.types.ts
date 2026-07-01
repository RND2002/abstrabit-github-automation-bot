export { EventStatus } from '../../config/constants';

export interface Event {
  id: string;
  repoId: string;
  githubDeliveryId: string;
  eventType: string;
  payload: string;
  status: string;
  aiSummary: string | null;
  aiPriority: string | null;
  aiSuggestedLabel: string | null;
  errorLog: string | null;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}
