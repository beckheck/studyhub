import { describe, expect, it } from 'vite-plus/test'
import { addToDirty, removeFromDirty, addTombstone, removeTombstone, queueDepth } from './sync-queue'
import type { PendingDeleteSync } from '@/types'

describe('sync-queue dirty item helpers', () => {
  describe('addToDirty', () => {
    it('appends an id to the list', () => {
      expect(addToDirty([], 'item-1')).toEqual(['item-1'])
    })

    it('does not duplicate an id already present', () => {
      expect(addToDirty(['item-1'], 'item-1')).toEqual(['item-1'])
    })

    it('keeps existing entries and appends a new id', () => {
      expect(addToDirty(['item-1', 'item-2'], 'item-3')).toEqual(['item-1', 'item-2', 'item-3'])
    })

    it('does not mutate the input list', () => {
      const list = ['item-1']
      addToDirty(list, 'item-2')
      expect(list).toEqual(['item-1'])
    })
  })

  describe('removeFromDirty', () => {
    it('removes a present id', () => {
      expect(removeFromDirty(['item-1', 'item-2'], 'item-1')).toEqual(['item-2'])
    })

    it('returns the same list when the id is absent', () => {
      expect(removeFromDirty(['item-1'], 'item-9')).toEqual(['item-1'])
    })

    it('does not mutate the input list', () => {
      const list = ['item-1']
      removeFromDirty(list, 'item-1')
      expect(list).toEqual(['item-1'])
    })
  })
})

describe('sync-queue tombstone helpers', () => {
  const tombstone = (itemId: string, googleCalendarEventId: string): PendingDeleteSync => ({
    itemId,
    googleCalendarEventId,
  })

  describe('addTombstone', () => {
    it('appends a tombstone entry', () => {
      const next = addTombstone([], { itemId: 'item-1', googleCalendarEventId: 'gcal-1' })
      expect(next).toEqual([{ itemId: 'item-1', googleCalendarEventId: 'gcal-1' }])
    })

    it('does not duplicate an itemId already queued', () => {
      const list = [tombstone('item-1', 'gcal-1')]
      expect(addTombstone(list, { itemId: 'item-1', googleCalendarEventId: 'gcal-2' })).toEqual([
        { itemId: 'item-1', googleCalendarEventId: 'gcal-1' },
      ])
    })

    it('does not mutate the input list', () => {
      const list = [tombstone('item-1', 'gcal-1')]
      addTombstone(list, { itemId: 'item-2', googleCalendarEventId: 'gcal-2' })
      expect(list).toEqual([{ itemId: 'item-1', googleCalendarEventId: 'gcal-1' }])
    })
  })

  describe('removeTombstone', () => {
    it('removes the tombstone for a given itemId', () => {
      const list = [tombstone('item-1', 'gcal-1'), tombstone('item-2', 'gcal-2')]
      expect(removeTombstone(list, 'item-1')).toEqual([{ itemId: 'item-2', googleCalendarEventId: 'gcal-2' }])
    })

    it('returns the same list when the itemId is absent', () => {
      const list = [tombstone('item-1', 'gcal-1')]
      expect(removeTombstone(list, 'item-9')).toEqual([{ itemId: 'item-1', googleCalendarEventId: 'gcal-1' }])
    })

    it('does not mutate the input list', () => {
      const list = [tombstone('item-1', 'gcal-1')]
      removeTombstone(list, 'item-1')
      expect(list).toEqual([{ itemId: 'item-1', googleCalendarEventId: 'gcal-1' }])
    })
  })
})

describe('sync-queue queueDepth', () => {
  it('counts dirty items and tombstones together', () => {
    const dirty: string[] = ['item-1', 'item-2']
    const tombstones: PendingDeleteSync[] = [{ itemId: 'item-3', googleCalendarEventId: 'gcal-3' }]
    expect(queueDepth(dirty, tombstones)).toBe(3)
  })

  it('returns zero for empty queues', () => {
    expect(queueDepth([], [])).toBe(0)
  })
})
