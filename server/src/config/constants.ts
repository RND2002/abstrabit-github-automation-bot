export const Constants = {
  Cookie: {
    Session: 'abstrabit_session',
  },
  Auth: {
    SessionExpiryDays: 30,
  },
  Retry: {
    MaxRetries: 3,
    BaseDelayMs: 1000,
  },
} as const;

// Single source of truth — do NOT duplicate this enum elsewhere
export enum EventStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  IGNORED = 'IGNORED',
}
