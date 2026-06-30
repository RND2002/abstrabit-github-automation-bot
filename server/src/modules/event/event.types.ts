export interface Event {
  id: string;
  repoId: string;
  githubDeliveryId: string;
  eventType: string;
  payload: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum EventStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  IGNORED = 'IGNORED',
}
