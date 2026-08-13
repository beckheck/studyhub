import type { PendingDeleteSync } from '@/types'

export function addToDirty(dirtyItemIds: readonly string[], itemId: string): string[] {
  if (dirtyItemIds.includes(itemId)) {
    return [...dirtyItemIds]
  }
  return [...dirtyItemIds, itemId]
}

export function removeFromDirty(dirtyItemIds: readonly string[], itemId: string): string[] {
  if (!dirtyItemIds.includes(itemId)) {
    return [...dirtyItemIds]
  }
  return dirtyItemIds.filter(id => id !== itemId)
}

export function addTombstone(
  pendingDeleteSync: readonly PendingDeleteSync[],
  entry: PendingDeleteSync,
): PendingDeleteSync[] {
  if (pendingDeleteSync.some(t => t.itemId === entry.itemId)) {
    return [...pendingDeleteSync]
  }
  return [...pendingDeleteSync, entry]
}

export function removeTombstone(pendingDeleteSync: readonly PendingDeleteSync[], itemId: string): PendingDeleteSync[] {
  if (!pendingDeleteSync.some(t => t.itemId === itemId)) {
    return [...pendingDeleteSync]
  }
  return pendingDeleteSync.filter(t => t.itemId !== itemId)
}

export function queueDepth(dirtyItemIds: readonly string[], pendingDeleteSync: readonly PendingDeleteSync[]): number {
  return dirtyItemIds.length + pendingDeleteSync.length
}
