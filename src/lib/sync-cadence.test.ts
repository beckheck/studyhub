import { describe, expect, it } from 'vite-plus/test'
import { DEFAULT_SYNC_INTERVAL_MIN, normalizeSyncIntervalMin, SYNC_INTERVAL_OPTIONS } from './sync-cadence'

describe('sync-cadence', () => {
  it('exposes the settled preset options', () => {
    expect(SYNC_INTERVAL_OPTIONS).toEqual([1, 5, 15, 30])
  })

  it('defaults to 5 minutes', () => {
    expect(DEFAULT_SYNC_INTERVAL_MIN).toBe(5)
  })

  it('passes through a valid preset', () => {
    expect(normalizeSyncIntervalMin(1)).toBe(1)
    expect(normalizeSyncIntervalMin(15)).toBe(15)
  })

  it('falls back to the default for an unsupported value', () => {
    expect(normalizeSyncIntervalMin(0)).toBe(5)
    expect(normalizeSyncIntervalMin(7)).toBe(5)
    expect(normalizeSyncIntervalMin(-3)).toBe(5)
  })
})
