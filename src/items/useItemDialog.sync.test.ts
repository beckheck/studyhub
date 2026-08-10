import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ItemTask } from '@/items/task/modelSchema';
import type { ItemEvent } from '@/items/event/modelSchema';
import { ItemForm } from '@/items/forms';
import { useItemDialog } from './useItemDialog';

const mocked = vi.hoisted(() => ({
  syncItem: vi.fn(),
  deleteItem: vi.fn(),
  addItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItemLocal: vi.fn(),
  useStoreMocked: false as boolean,
  appState: { courses: [], projects: [] },
}));

vi.mock('@/lib/google-calendar-sync', () => ({
  googleCalendarSync: {
    syncItem: mocked.syncItem,
    deleteItem: mocked.deleteItem,
  },
}));

vi.mock('@/hooks/useStore', async importOriginal => {
  const actual = await importOriginal<typeof import('@/hooks/useStore')>();
  return {
    ...actual,
    useItems: () => {
      if (mocked.useStoreMocked) {
        return {
          addItem: mocked.addItem,
          updateItem: mocked.updateItem,
          deleteItem: mocked.deleteItemLocal,
        };
      }
      return actual.useItems();
    },
    useGoogleCalendar: () => {
      if (mocked.useStoreMocked) {
        return { googleCalendar: { syncEnabled: false } };
      }
      return actual.useGoogleCalendar();
    },
    useAppState: () => {
      if (mocked.useStoreMocked) {
        return mocked.appState;
      }
      return actual.useAppState();
    },
  };
});

import { googleCalendarSync } from '@/lib/google-calendar-sync';

function makeTaskItem(overrides: Partial<ItemTask> = {}): ItemTask {
  return {
    id: 'task-1',
    type: 'task',
    title: 'Test Task',
    courseId: 'course-1',
    isDeleted: false,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    dueAt: new Date('2024-01-10T23:59:00.000Z'),
    priority: 'medium',
    isCompleted: false,
    ...overrides,
  } as ItemTask;
}

function makeEventItem(overrides: Partial<ItemEvent> = {}): ItemEvent {
  return {
    id: 'evt-1',
    type: 'event',
    title: 'Test Event',
    courseId: 'course-1',
    isDeleted: false,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    startsAt: new Date('2024-01-10T14:00:00.000Z'),
    endsAt: new Date('2024-01-10T15:00:00.000Z'),
    isAllDay: false,
    ...overrides,
  } as ItemEvent;
}

const taskForm: ItemForm = {
  title: 'Test Task',
  courseId: 'course-1',
  notes: '',
  color: '#ffffff',
  dueAt: '2024-01-10T23:59',
  priority: 'medium',
  isCompleted: false,
};

describe('useItemDialog handleSave sync wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.useStoreMocked = false;
    mocked.appState = { courses: [], projects: [] };
  });

  afterEach(() => {
    vi.clearAllMocks();
    mocked.useStoreMocked = false;
  });

  it('calls googleCalendarSync.syncItem after addItem on a new item', async () => {
    const { result } = renderHook(() => useItemDialog());

    act(() => {
      result.current.openAddDialog('task', { title: 'Test Task', courseId: 'course-1' });
    });

    mocked.syncItem.mockResolvedValue({ success: true, googleEventId: 'g-1' });

    await act(async () => {
      await result.current.handleSave(taskForm);
    });

    await waitFor(() => {
      expect(mocked.syncItem).toHaveBeenCalledTimes(1);
    });

    const [syncedItem, ctx] = mocked.syncItem.mock.calls[0];
    expect(syncedItem.type).toBe('task');
    expect(ctx.syncEnabled).toBe(false);
    expect(ctx.courses).toBeDefined();
  });

  it('builds course and project name maps into the sync context', async () => {
    mocked.useStoreMocked = true;
    mocked.appState = {
      courses: [{ id: 'course-1', title: 'Calculus 101' }],
      projects: [{ id: 'project-1', title: 'Project X' }],
    };
    mocked.addItem.mockImplementation((item: any) => ({ ...item, id: 'test-uuid-123' }));

    const { result } = renderHook(() => useItemDialog());

    act(() => {
      result.current.openAddDialog('task', { title: 'Test Task', courseId: 'course-1' });
    });

    mocked.syncItem.mockResolvedValue({ success: true, googleEventId: 'g-1' });

    await act(async () => {
      await result.current.handleSave(taskForm);
    });

    await waitFor(() => {
      expect(mocked.syncItem).toHaveBeenCalledTimes(1);
    });

    const [, ctx] = mocked.syncItem.mock.calls[0];
    expect(ctx.courses).toEqual({ 'course-1': 'Calculus 101' });
    expect(ctx.projects).toEqual({ 'project-1': 'Project X' });
    expect(ctx.syncEnabled).toBe(false);
  });

  it('stamps googleEventId via updateItem on success when googleEventId is present', async () => {
    mocked.useStoreMocked = true;
    mocked.addItem.mockImplementation((item: any) => ({ ...item, id: 'test-uuid-123' }));

    const { result } = renderHook(() => useItemDialog());

    act(() => {
      result.current.openAddDialog('task', { title: 'Test Task', courseId: 'course-1' });
    });

    mocked.syncItem.mockResolvedValue({ success: true, googleEventId: 'g-new-task' });

    await act(async () => {
      await result.current.handleSave(taskForm);
    });

    await waitFor(() => {
      expect(mocked.syncItem).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      const stampCall = mocked.updateItem.mock.calls.find(
        ([id, updates]: [string, any]) =>
          id === 'test-uuid-123' && updates?.googleCalendarEventId === 'g-new-task'
      );
      expect(stampCall).toBeDefined();
    });
  });

  it('does not stamp id when syncItem returns { skipped: true }', async () => {
    mocked.useStoreMocked = true;
    mocked.addItem.mockImplementation((item: any) => ({ ...item, id: 'test-uuid-123' }));

    const { result } = renderHook(() => useItemDialog());

    act(() => {
      result.current.openAddDialog('task', { title: 'Test Task', courseId: 'course-1' });
    });

    mocked.syncItem.mockResolvedValue({ success: false, skipped: true });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      await result.current.handleSave(taskForm);
    });

    await waitFor(() => {
      expect(mocked.syncItem).toHaveBeenCalledTimes(1);
    });

    expect(errorSpy).not.toHaveBeenCalled();
    const stampCall = mocked.updateItem.mock.calls.find(
      ([, updates]: [string, any]) => updates?.googleCalendarEventId
    );
    expect(stampCall).toBeUndefined();

    errorSpy.mockRestore();
  });

  it('logs errors via console.error on failure, item stays saved locally', async () => {
    const { result } = renderHook(() => useItemDialog());

    act(() => {
      result.current.openAddDialog('task', { title: 'Test Task', courseId: 'course-1' });
    });

    mocked.syncItem.mockRejectedValue(new Error('network down'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      await result.current.handleSave(taskForm);
    });

    await waitFor(() => {
      expect(mocked.syncItem).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled();
    });

    errorSpy.mockRestore();
  });

  it('calls googleCalendarSync.syncItem on update of an existing item', async () => {
    const existing = makeTaskItem({ id: 'task-existing', googleCalendarEventId: 'g-existing' });
    const { result } = renderHook(() => useItemDialog());

    act(() => {
      result.current.openEditDialog(existing);
    });

    mocked.syncItem.mockResolvedValue({ success: true, googleEventId: 'g-existing' });

    await act(async () => {
      await result.current.handleSave({ ...taskForm, title: 'Updated Title' });
    });

    await waitFor(() => {
      expect(mocked.syncItem).toHaveBeenCalledTimes(1);
    });

    const [syncedItem] = mocked.syncItem.mock.calls[0];
    expect(syncedItem.type).toBe('task');
  });
});

describe('useItemDialog handleDelete sync wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.useStoreMocked = false;
    mocked.appState = { courses: [], projects: [] };
  });

  afterEach(() => {
    vi.clearAllMocks();
    mocked.useStoreMocked = false;
  });

  it('calls googleCalendarSync.deleteItem after deleteItem for an event with googleCalendarEventId', async () => {
    const existing = makeEventItem({ id: 'evt-existing', googleCalendarEventId: 'g-evt' });
    const { result } = renderHook(() => useItemDialog());

    act(() => {
      result.current.openEditDialog(existing);
    });

    mocked.deleteItem.mockResolvedValue({ success: true });

    await act(async () => {
      await result.current.handleDelete();
    });

    await waitFor(() => {
      expect(mocked.deleteItem).toHaveBeenCalledTimes(1);
    });

    const [deletedItem, ctx] = mocked.deleteItem.mock.calls[0];
    expect(deletedItem.type).toBe('event');
    expect(ctx.syncEnabled).toBe(false);
    expect(ctx.courses).toBeDefined();
  });

  it('does not throw when deleteItem returns skipped', async () => {
    const existing = makeTaskItem({ id: 'task-existing' });
    const { result } = renderHook(() => useItemDialog());

    act(() => {
      result.current.openEditDialog(existing);
    });

    mocked.deleteItem.mockResolvedValue({ success: false, skipped: true });

    await act(async () => {
      await result.current.handleDelete();
    });

    await waitFor(() => {
      expect(mocked.deleteItem).toHaveBeenCalledTimes(1);
    });
  });

  it('logs errors via console.error when deleteItem rejects, item still deleted locally', async () => {
    const existing = makeEventItem({ id: 'evt-existing', googleCalendarEventId: 'g-evt' });
    const { result } = renderHook(() => useItemDialog());

    act(() => {
      result.current.openEditDialog(existing);
    });

    mocked.deleteItem.mockRejectedValue(new Error('delete failed'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      await result.current.handleDelete();
    });

    await waitFor(() => {
      expect(mocked.deleteItem).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled();
    });

    errorSpy.mockRestore();
  });
});
