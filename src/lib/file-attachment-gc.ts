/**
 * File Attachment Garbage Collection
 * Scans app state for referenced file ids and deletes unreferenced files.
 * See ADR 0003: the reference scan lives where the app state shape lives,
 * not in the file storage module.
 */

import type { Course, Item } from '@/types'
import { FileAttachmentStorage } from './file-attachment-storage'

export interface FileAttachmentGCState {
  items: readonly Item[]
  courses: readonly Course[]
}

export async function runFileAttachmentGC(
  state: FileAttachmentGCState,
  storage: FileAttachmentStorage,
): Promise<number> {
  const referencedFileIds = new Set<string>()

  const extractFileIds = (htmlContent: string) => {
    if (!htmlContent) return

    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlContent, 'text/html')
    const fileAttachments = doc.querySelectorAll('[data-type="file-attachment"]')

    fileAttachments.forEach(element => {
      const fileId = element.getAttribute('data-file-id')
      if (fileId) {
        referencedFileIds.add(fileId)
      }
    })
  }

  state.items.forEach(item => {
    if (item.notes) {
      extractFileIds(item.notes)
    }
  })

  state.courses.forEach(course => {
    if (course.syllabusFileId) {
      referencedFileIds.add(course.syllabusFileId)
    }
  })

  const deletedCount = await storage.cleanupOrphanedFiles(referencedFileIds)

  if (deletedCount > 0) {
    console.log(`File attachment garbage collection: Cleaned up ${deletedCount} orphaned files`)
  }

  return deletedCount
}
