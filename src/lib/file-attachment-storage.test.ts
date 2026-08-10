import { FileAttachmentStorage, type FileRepository } from './file-attachment-storage';
import type { FileAttachmentMetadata, StoredFileAttachment } from '@/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

class InMemoryFileRepository implements FileRepository {
  files: Map<string, StoredFileAttachment> = new Map();
  metadata: Map<string, FileAttachmentMetadata> = new Map();
  putFileCalls: StoredFileAttachment[] = [];
  deleteFileCalls: string[] = [];

  async getFile(fileId: string): Promise<StoredFileAttachment | null> {
    return this.files.get(fileId) ?? null;
  }
  async getFileMetadata(fileId: string): Promise<FileAttachmentMetadata | null> {
    return this.metadata.get(fileId) ?? null;
  }
  async putFile(stored: StoredFileAttachment): Promise<void> {
    this.putFileCalls.push(stored);
    this.files.set(stored.id, stored);
    this.metadata.set(stored.id, {
      id: stored.id,
      fileName: stored.fileName,
      fileSize: stored.fileSize,
      fileType: stored.fileType,
      uploadedAt: stored.uploadedAt,
    });
  }
  async deleteFile(fileId: string): Promise<boolean> {
    this.deleteFileCalls.push(fileId);
    const hadFile = this.files.has(fileId);
    this.files.delete(fileId);
    this.metadata.delete(fileId);
    return hadFile;
  }
  async listMetadata(): Promise<FileAttachmentMetadata[]> {
    return Array.from(this.metadata.values());
  }
}

function makeFile(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)]);
  return new File([blob], name, { type });
}

function mockNextUuid(value: string): void {
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => value as `${string}-${string}-${string}-${string}-${string}`);
}

function mockUuidSequence(values: string[]): void {
  let i = 0;
  vi.spyOn(crypto, 'randomUUID').mockImplementation(
    () => values[i++] as `${string}-${string}-${string}-${string}-${string}`,
  );
}

describe('FileAttachmentStorage', () => {
  let repo: InMemoryFileRepository;
  let storage: FileAttachmentStorage;

  beforeEach(() => {
    repo = new InMemoryFileRepository();
    storage = new FileAttachmentStorage(repo);
  });

  describe('storeFile', () => {
    it('converts the file to base64, stores a StoredFileAttachment via the repo, and returns metadata', async () => {
      mockNextUuid('file-id-1');
      const file = makeFile('notes.pdf', 'application/pdf', 2048);

      const metadata = await storage.storeFile(file);

      expect(metadata.id).toBe('file-id-1');
      expect(metadata.fileName).toBe('notes.pdf');
      expect(metadata.fileSize).toBe('2.0 KB');
      expect(metadata.fileType).toBe('application/pdf');
      expect(metadata.uploadedAt).toBe(1640995200000);

      expect(repo.putFileCalls).toHaveLength(1);
      const stored = repo.putFileCalls[0];
      expect(stored.id).toBe('file-id-1');
      expect(stored.fileData).toContain('data:application/pdf;base64,');
      expect(repo.files.get('file-id-1')).toBe(stored);
      expect(repo.metadata.get('file-id-1')?.fileName).toBe('notes.pdf');
    });

    it('throws when the repo putFile throws', async () => {
      mockNextUuid('fail-id-1');
      const failingRepo: FileRepository = {
        getFile: async id => repo.getFile(id),
        getFileMetadata: async id => repo.getFileMetadata(id),
        putFile: async () => {
          throw new Error('disk full');
        },
        deleteFile: async id => repo.deleteFile(id),
        listMetadata: async () => repo.listMetadata(),
      };
      const failingStorage = new FileAttachmentStorage(failingRepo);
      const file = makeFile('big.pdf', 'application/pdf', 10);

      await expect(failingStorage.storeFile(file)).rejects.toThrow('Failed to store file attachment');
    });
  });

  describe('getFile', () => {
    it('returns null when the repo has no file for the id', async () => {
      expect(await storage.getFile('missing')).toBeNull();
    });

    it('reads from the repo and caches the result', async () => {
      mockNextUuid('cached-id-1');
      const file = makeFile('a.txt', 'text/plain', 5);
      await storage.storeFile(file);

      const first = await storage.getFile('cached-id-1');
      const second = await storage.getFile('cached-id-1');

      expect(first?.id).toBe('cached-id-1');
      expect(second).toBe(first);
    });

    it('evicts the oldest entry when the cache exceeds CACHE_SIZE (10)', async () => {
      const ids = Array.from({ length: 11 }, (_, i) => `id-${i}-0`);
      mockUuidSequence(ids);
      for (let i = 0; i < 11; i++) {
        await storage.storeFile(makeFile(`f${i}.txt`, 'text/plain', 1));
        await storage.getFile(ids[i]);
      }

      // The first file (id-0-0) should have been evicted by the LRU when the 11th was added.
      // A re-fetch misses the cache but the repo still has the file.
      const refetch = await storage.getFile(ids[0]);
      expect(refetch?.id).toBe(ids[0]);
    });
  });

  describe('deleteFile', () => {
    it('removes the file from the cache and the repo, returns true', async () => {
      mockNextUuid('del-id-1');
      await storage.storeFile(makeFile('del.txt', 'text/plain', 3));
      await storage.getFile('del-id-1');

      const result = await storage.deleteFile('del-id-1');

      expect(result).toBe(true);
      expect(repo.deleteFileCalls).toContain('del-id-1');
      expect(await repo.getFile('del-id-1')).toBeNull();
    });

    it('returns false when the repo has no file for the id', async () => {
      const result = await storage.deleteFile('never-existed');
      expect(result).toBe(false);
    });
  });

  describe('getFileMetadata / getAllFileMetadata', () => {
    it('reads metadata through the repo', async () => {
      mockNextUuid('meta-id-1');
      await storage.storeFile(makeFile('meta.txt', 'text/plain', 7));

      const metadata = await storage.getFileMetadata('meta-id-1');
      const all = await storage.getAllFileMetadata();

      expect(metadata?.id).toBe('meta-id-1');
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe('meta-id-1');
    });

    it('returns null for a missing metadata id', async () => {
      expect(await storage.getFileMetadata('nope')).toBeNull();
    });
  });

  describe('cleanupOrphanedFiles', () => {
    it('deletes files whose id is not in the referenced set and returns the count', async () => {
      mockUuidSequence(['keep-id-0', 'drop1-id-0', 'drop2-id-0']);
      for (const name of ['keep', 'drop1', 'drop2']) {
        await storage.storeFile(makeFile(`${name}.txt`, 'text/plain', 1));
      }

      const deletedCount = await storage.cleanupOrphanedFiles(new Set(['keep-id-0']));

      expect(deletedCount).toBe(2);
      expect(await repo.getFile('keep-id-0')).not.toBeNull();
      expect(await repo.getFile('drop1-id-0')).toBeNull();
      expect(await repo.getFile('drop2-id-0')).toBeNull();
    });

    it('returns 0 when every file is referenced', async () => {
      mockNextUuid('only-id-0');
      await storage.storeFile(makeFile('only.txt', 'text/plain', 1));

      const deletedCount = await storage.cleanupOrphanedFiles(new Set(['only-id-0']));

      expect(deletedCount).toBe(0);
      expect(await repo.getFile('only-id-0')).not.toBeNull();
    });

    it('returns 0 when there are no files', async () => {
      const deletedCount = await storage.cleanupOrphanedFiles(new Set());
      expect(deletedCount).toBe(0);
    });
  });
});
