export const Constants = {
  Cookie: {
    Session: 'abstrabit_session',
  },
  Auth: {
    SessionExpiryDays: 30,
  }
} as const;

export enum EventStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  IGNORED = 'IGNORED',
}
