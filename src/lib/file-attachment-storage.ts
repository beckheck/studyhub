/**
 * File Attachment Storage System
 * Stores file attachments through a repository adapter supplied by the caller.
 * See ADR 0003: lib modules do not import the store.
 */

import type { FileAttachmentMetadata, StoredFileAttachment } from '@/types';
import { uid } from './utils';

export interface FileRepository {
  getFile(fileId: string): Promise<StoredFileAttachment | null>;
  getFileMetadata(fileId: string): Promise<FileAttachmentMetadata | null>;
  putFile(stored: StoredFileAttachment): Promise<void>;
  deleteFile(fileId: string): Promise<boolean>;
  listMetadata(): Promise<FileAttachmentMetadata[]>;
}

export class FileAttachmentStorage {
  private static readonly CACHE_SIZE = 10;

  private fileCache: Map<string, { data: StoredFileAttachment; accessTime: number }> = new Map();

  constructor(private repo: FileRepository) {}

  async storeFile(file: File): Promise<FileAttachmentMetadata> {
    const fileId = uid();
    const base64 = await this.fileToBase64(file);
    const metadata: FileAttachmentMetadata = {
      id: fileId,
      fileName: file.name,
      fileSize: this.formatFileSize(file.size),
      fileType: file.type,
      uploadedAt: Date.now(),
    };
    const storedFile: StoredFileAttachment = {
      ...metadata,
      fileData: base64,
    };

    try {
      await this.repo.putFile(storedFile);
      return metadata;
    } catch (error) {
      console.error('Failed to store file attachment:', error);
      throw new Error('Failed to store file attachment');
    }
  }

  async getFileMetadata(fileId: string): Promise<FileAttachmentMetadata | null> {
    try {
      return await this.repo.getFileMetadata(fileId);
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      return null;
    }
  }

  async getFile(fileId: string): Promise<StoredFileAttachment | null> {
    const cached = this.fileCache.get(fileId);
    if (cached) {
      cached.accessTime = Date.now();
      return cached.data;
    }

    try {
      const fileData = await this.repo.getFile(fileId);
      if (fileData) {
        this.addToCache(fileId, fileData);
      }
      return fileData;
    } catch (error) {
      console.error('Failed to get file:', error);
      return null;
    }
  }

  private addToCache(fileId: string, fileData: StoredFileAttachment): void {
    while (this.fileCache.size >= FileAttachmentStorage.CACHE_SIZE) {
      let oldestKey: string | undefined;
      let oldestTime = Date.now();

      for (const [key, value] of this.fileCache.entries()) {
        if (value.accessTime < oldestTime) {
          oldestTime = value.accessTime;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.fileCache.delete(oldestKey);
      } else {
        break;
      }
    }

    this.fileCache.set(fileId, {
      data: fileData,
      accessTime: Date.now(),
    });
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      this.fileCache.delete(fileId);
      return await this.repo.deleteFile(fileId);
    } catch (error) {
      console.error('Failed to delete file attachment:', error);
      return false;
    }
  }

  async getAllFileMetadata(): Promise<FileAttachmentMetadata[]> {
    try {
      return await this.repo.listMetadata();
    } catch (error) {
      console.error('Failed to get all file metadata:', error);
      return [];
    }
  }

  async cleanupOrphanedFiles(referencedFileIds: Set<string>): Promise<number> {
    let deletedCount = 0;

    try {
      const allMetadata = await this.getAllFileMetadata();

      for (const metadata of allMetadata) {
        if (!referencedFileIds.has(metadata.id)) {
          const success = await this.deleteFile(metadata.id);
          if (success) {
            deletedCount++;
            console.log(`Cleaned up orphaned file: ${metadata.fileName}`);
          }
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup orphaned files:', error);
      return 0;
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
}
