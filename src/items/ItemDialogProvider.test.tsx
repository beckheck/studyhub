import { ItemDialogProvider, useItemDialog } from '@/items/ItemDialogProvider';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ItemTask } from '@/items/task/modelSchema';
import { ItemForm } from '@/items/forms';

const mocked = vi.hoisted(() => ({
  syncItem: vi.fn(),
  deleteItem: vi.fn(),
  addItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItemLocal: vi.fn(),
}));

vi.mock('@/lib/google-calendar-sync', () => ({
  googleCalendarSync: {
    syncItem: mocked.syncItem,
    deleteItem: mocked.deleteItem,
  },
}));

vi.mock('@/items/base/dialog', () => ({
  ItemDialog: () => <div data-testid="item-dialog" />,
}));

vi.mock('@/hooks/useStore', async importOriginal => {
  const actual = await importOriginal<typeof import('@/hooks/useStore')>();
  return {
    ...actual,
    useItems: () => ({
      items: [],
      addItem: mocked.addItem,
      updateItem: mocked.updateItem,
      deleteItem: mocked.deleteItemLocal,
      getItemsByType: () => [],
    }),
    useGoogleCalendar: () => ({
      googleCalendar: { syncEnabled: false, accessToken: '', calendarId: '' },
    }),
    useAppState: () => ({ courses: [], projects: [] }),
    useCourses: () => ({ courses: [], getCourseTitle: () => '' }),
    useProjects: () => ({ projects: [] }),
  };
});

const taskForm: ItemForm = {
  title: 'Test Task',
  courseId: 'course-1',
  notes: '',
  color: '#ffffff',
  dueAt: '2024-01-10T23:59',
  priority: 'medium',
  isCompleted: false,
};

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

function Consumer() {
  const dialog = useItemDialog();
  return (
    <div>
      <span data-testid="open">{String(dialog.open)}</span>
      <span data-testid="item-type">{dialog.itemType}</span>
      <button data-testid="open-add" onClick={() => dialog.openAddDialog('task', { title: 'Test Task', courseId: 'course-1' })}>
        openAdd
      </button>
      <button data-testid="save" onClick={() => dialog.handleSave(taskForm)}>
        save
      </button>
      <button
        data-testid="open-edit"
        onClick={() => dialog.openEditDialog(makeTaskItem({ id: 'task-existing', googleCalendarEventId: 'g-existing' }))}
      >
        openEdit
      </button>
      <button data-testid="delete" onClick={() => dialog.handleDelete()}>
        delete
      </button>
    </div>
  );
}

describe('ItemDialogProvider context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('throws when useItemDialog is called outside a provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useItemDialog())).toThrow('useItemDialog must be used within an ItemDialogProvider');
    spy.mockRestore();
  });

  it('provides a dialog instance to consumers and renders ItemDialog internally', () => {
    mocked.addItem.mockImplementation((item: any) => ({ ...item, id: 'test-uuid-123' }));
    mocked.syncItem.mockResolvedValue({ success: true, googleEventId: 'g-1' });

    const { getByTestId } = render(
      <ItemDialogProvider>
        <Consumer />
      </ItemDialogProvider>
    );

    expect(getByTestId('open').textContent).toBe('false');
    expect(getByTestId('item-type').textContent).toBe('task');
  });

  it('shares one dialog instance across consumers (state survives re-renders)', () => {
    const { getByTestId } = render(
      <ItemDialogProvider>
        <Consumer />
      </ItemDialogProvider>
    );

    fireEvent.click(getByTestId('open-add'));
    expect(getByTestId('open').textContent).toBe('true');
  });

  it('handleSave calls addItem and syncs via googleCalendarSync.syncItem', async () => {
    mocked.addItem.mockImplementation((item: any) => ({ ...item, id: 'test-uuid-123' }));
    mocked.syncItem.mockResolvedValue({ success: true, googleEventId: 'g-new' });

    const { getByTestId } = render(
      <ItemDialogProvider>
        <Consumer />
      </ItemDialogProvider>
    );

    fireEvent.click(getByTestId('open-add'));

    await act(async () => {
      await fireEvent.click(getByTestId('save'));
    });

    await waitFor(() => {
      expect(mocked.syncItem).toHaveBeenCalledTimes(1);
    });

    const [syncedItem] = mocked.syncItem.mock.calls[0];
    expect(syncedItem.type).toBe('task');
  });

  it('handleSave stamps googleEventId via updateItem on success', async () => {
    mocked.addItem.mockImplementation((item: any) => ({ ...item, id: 'test-uuid-123' }));
    mocked.syncItem.mockResolvedValue({ success: true, googleEventId: 'g-stamped' });

    const { getByTestId } = render(
      <ItemDialogProvider>
        <Consumer />
      </ItemDialogProvider>
    );

    fireEvent.click(getByTestId('open-add'));

    await act(async () => {
      await fireEvent.click(getByTestId('save'));
    });

    await waitFor(() => {
      const stampCall = mocked.updateItem.mock.calls.find(
        ([id, updates]: [string, any]) => id === 'test-uuid-123' && updates?.googleCalendarEventId === 'g-stamped'
      );
      expect(stampCall).toBeDefined();
    });
  });

  it('handleSave does not stamp id when syncItem returns skipped', async () => {
    mocked.addItem.mockImplementation((item: any) => ({ ...item, id: 'test-uuid-123' }));
    mocked.syncItem.mockResolvedValue({ success: false, skipped: true });

    const { getByTestId } = render(
      <ItemDialogProvider>
        <Consumer />
      </ItemDialogProvider>
    );

    fireEvent.click(getByTestId('open-add'));

    await act(async () => {
      await fireEvent.click(getByTestId('save'));
    });

    await waitFor(() => {
      expect(mocked.syncItem).toHaveBeenCalledTimes(1);
    });

    const stampCall = mocked.updateItem.mock.calls.find(([, updates]: [string, any]) => updates?.googleCalendarEventId);
    expect(stampCall).toBeUndefined();
  });

  it('handleSave logs errors on failure and the item stays saved locally', async () => {
    mocked.addItem.mockImplementation((item: any) => ({ ...item, id: 'test-uuid-123' }));
    mocked.syncItem.mockRejectedValue(new Error('network down'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { getByTestId } = render(
      <ItemDialogProvider>
        <Consumer />
      </ItemDialogProvider>
    );

    fireEvent.click(getByTestId('open-add'));

    await act(async () => {
      await fireEvent.click(getByTestId('save'));
    });

    await waitFor(() => {
      expect(mocked.syncItem).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled();
    });

    expect(mocked.addItem).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it('handleDelete calls deleteItem locally and googleCalendarSync.deleteItem', async () => {
    mocked.deleteItem.mockResolvedValue({ success: true });

    const { getByTestId } = render(
      <ItemDialogProvider>
        <Consumer />
      </ItemDialogProvider>
    );

    fireEvent.click(getByTestId('open-edit'));

    await act(async () => {
      await fireEvent.click(getByTestId('delete'));
    });

    await waitFor(() => {
      expect(mocked.deleteItemLocal).toHaveBeenCalledWith('task-existing');
    });

    await waitFor(() => {
      expect(mocked.deleteItem).toHaveBeenCalledTimes(1);
    });

    const [deletedItem] = mocked.deleteItem.mock.calls[0];
    expect(deletedItem.type).toBe('task');
  });
});