export const SYNC_INTERVAL_OPTIONS = [1, 5, 15, 30] as const
export const DEFAULT_SYNC_INTERVAL_MIN = 5

export function normalizeSyncIntervalMin(value: number): number {
  if ((SYNC_INTERVAL_OPTIONS as readonly number[]).includes(value)) {
    return value
  }
  return DEFAULT_SYNC_INTERVAL_MIN
}
