import { runFileAttachmentGC, type FileAttachmentGCState } from './file-attachment-gc'
import type { Course, Item } from '@/types'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

function makeItem(notes?: string): Item {
  return {
    id: `item-${Math.random().toString(36).slice(2)}`,
    type: 'task',
    title: 't',
    isDeleted: false,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    notes,
  } as unknown as Item
}

function makeCourse(syllabusFileId?: string): Course {
  return {
    id: `course-${Math.random().toString(36).slice(2)}`,
    title: 'c',
    syllabusFileId,
  }
}

function makeStorageStub(): {
  deletedIds: string[]
  storage: { cleanupOrphanedFiles: (ids: Set<string>) => Promise<number> }
} {
  const deletedIds: string[] = []
  const storage = {
    cleanupOrphanedFiles: vi.fn(async (_referencedIds: Set<string>) => {
      // The stub records what the sibling passed as "referenced".
      // The real cleanupOrphanedFiles deletes everything NOT in the set.
      // For the test we just capture the set so tests can assert referenced ids.
      return 0
    }),
  }
  return { deletedIds, storage }
}

describe('runFileAttachmentGC', () => {
  let storage: ReturnType<typeof makeStorageStub>['storage']

  beforeEach(() => {
    ;({ storage } = makeStorageStub())
  })

  it('collects file ids from item notes with [data-type="file-attachment"][data-file-id]', async () => {
    const state: FileAttachmentGCState = {
      items: [
        makeItem('<div data-type="file-attachment" data-file-id="note-file-1"></div>'),
        makeItem('<div data-type="file-attachment" data-file-id="note-file-2"></div>'),
      ],
      courses: [],
    }

    await runFileAttachmentGC(state, storage as any)

    const passedSet = (storage.cleanupOrphanedFiles as any).mock.calls[0][0] as Set<string>
    expect(passedSet.has('note-file-1')).toBe(true)
    expect(passedSet.has('note-file-2')).toBe(true)
  })

  it('collects syllabusFileId from courses', async () => {
    const state: FileAttachmentGCState = {
      items: [],
      courses: [makeCourse('syllabus-1'), makeCourse('syllabus-2'), makeCourse(undefined)],
    }

    await runFileAttachmentGC(state, storage as any)

    const passedSet = (storage.cleanupOrphanedFiles as any).mock.calls[0][0] as Set<string>
    expect(passedSet.has('syllabus-1')).toBe(true)
    expect(passedSet.has('syllabus-2')).toBe(true)
  })

  it('keeps a file referenced in notes but not syllabus', async () => {
    const state: FileAttachmentGCState = {
      items: [makeItem('<div data-type="file-attachment" data-file-id="notes-only"></div>')],
      courses: [makeCourse('syllabus-only')],
    }

    await runFileAttachmentGC(state, storage as any)

    const passedSet = (storage.cleanupOrphanedFiles as any).mock.calls[0][0] as Set<string>
    expect(passedSet.has('notes-only')).toBe(true)
    expect(passedSet.has('syllabus-only')).toBe(true)
  })

  it('keeps a file referenced in syllabus but not notes', async () => {
    const state: FileAttachmentGCState = {
      items: [makeItem('<div data-type="file-attachment" data-file-id="notes-only"></div>')],
      courses: [makeCourse('syllabus-only')],
    }

    await runFileAttachmentGC(state, storage as any)

    const passedSet = (storage.cleanupOrphanedFiles as any).mock.calls[0][0] as Set<string>
    expect(passedSet.has('syllabus-only')).toBe(true)
  })

  it('passes an empty set when nothing references any file', async () => {
    const state: FileAttachmentGCState = {
      items: [makeItem(undefined), makeItem('<p>no attachment here</p>')],
      courses: [makeCourse(undefined)],
    }

    await runFileAttachmentGC(state, storage as any)

    const passedSet = (storage.cleanupOrphanedFiles as any).mock.calls[0][0] as Set<string>
    expect(passedSet.size).toBe(0)
  })

  it('returns the deleted count from cleanupOrphanedFiles', async () => {
    ;(storage.cleanupOrphanedFiles as any).mockResolvedValueOnce(7)
    const state: FileAttachmentGCState = { items: [], courses: [] }

    const result = await runFileAttachmentGC(state, storage as any)

    expect(result).toBe(7)
  })

  it('ignores empty notes', async () => {
    const state: FileAttachmentGCState = {
      items: [makeItem('')],
      courses: [],
    }

    await runFileAttachmentGC(state, storage as any)

    const passedSet = (storage.cleanupOrphanedFiles as any).mock.calls[0][0] as Set<string>
    expect(passedSet.size).toBe(0)
  })
})
