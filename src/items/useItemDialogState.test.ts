import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ItemDialogOptions, useItemDialogState } from './useItemDialogState';

describe('useItemDialogState', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useItemDialogState());

    expect(result.current.open).toBe(false);
    expect(result.current.itemType).toBe('task');
    expect(result.current.editingItem).toBeNull();
    expect(result.current.availableItemTypes).toEqual(['task', 'exam', 'event', 'timetable']);
  });

  describe('openAddDialog', () => {
    it('opens the dialog with the given type and merges initial data over the default form', () => {
      const { result } = renderHook(() => useItemDialogState());

      act(() => {
        result.current.openAddDialog('task', {
          title: 'Sample Item',
          courseId: 'cs101',
          notes: 'Some notes',
          color: '#ff0000',
        });
      });

      expect(result.current.open).toBe(true);
      expect(result.current.itemType).toBe('task');
      expect(result.current.editingItem).toBeNull();
      expect(result.current.form.title).toBe('Sample Item');
      expect(result.current.form.courseId).toBe('cs101');
      expect(result.current.form.notes).toBe('Some notes');
      expect(result.current.form.color).toBe('#ff0000');
      expect(result.current.form).toHaveProperty('dueAt');
    });

    it('applies hidden and disabled flags merged over the type defaults', () => {
      const { result } = renderHook(() => useItemDialogState());

      act(() => {
        result.current.openAddDialog('task', {}, {
          hidden: { courseId: true },
          disabled: { title: true },
        });
      });

      expect(result.current.hidden.courseId).toBe(true);
      // 'type' and 'isCompleted' are forced hidden for add
      expect(result.current.hidden.type).toBe(true);
      expect(result.current.hidden.isCompleted).toBe(true);
      expect(result.current.disabled.title).toBe(true);
    });

    it('restricts availableItemTypes to the options provided', () => {
      const { result } = renderHook(() => useItemDialogState());

      act(() => {
        result.current.openAddDialog('task', {}, { availableItemTypes: ['task', 'exam'] });
      });

      expect(result.current.availableItemTypes).toEqual(['task', 'exam']);
    });

    it('defaults availableItemTypes to all types when not specified', () => {
      const { result } = renderHook(() => useItemDialogState());

      act(() => {
        result.current.openAddDialog('task', {}, { hidden: { courseId: true } });
      });

      expect(result.current.availableItemTypes).toEqual(['task', 'exam', 'event', 'timetable']);
    });
  });

  describe('openEditDialog', () => {
    it('populates form and editingItem from the item, and forces type hidden', () => {
      const { result } = renderHook(() => useItemDialogState());

      const mockItem = {
        id: '1',
        type: 'event' as const,
        title: 'Test Event',
        courseId: 'cs101',
        notes: '',
        color: '#ffffff',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 3600000),
        isAllDay: false,
      };

      act(() => {
        result.current.openEditDialog(mockItem, { availableItemTypes: ['event', 'timetable'] });
      });

      expect(result.current.open).toBe(true);
      expect(result.current.editingItem).toEqual(mockItem);
      expect(result.current.itemType).toBe('event');
      expect(result.current.availableItemTypes).toEqual(['event', 'timetable']);
      // edit path forces type hidden but not isCompleted
      expect(result.current.hidden.type).toBe(true);
      expect(result.current.hidden.isCompleted).toBeUndefined();
      expect(result.current.form.title).toBe('Test Event');
    });
  });

  describe('closeDialog', () => {
    it('sets open to false', () => {
      const { result } = renderHook(() => useItemDialogState());

      act(() => {
        result.current.openAddDialog('task');
      });
      expect(result.current.open).toBe(true);

      act(() => {
        result.current.closeDialog();
      });

      expect(result.current.open).toBe(false);
    });
  });

  describe('onOpenChange', () => {
    it('closes when called with false', () => {
      const { result } = renderHook(() => useItemDialogState());

      act(() => {
        result.current.openAddDialog('task');
      });

      act(() => {
        result.current.onOpenChange(false);
      });

      expect(result.current.open).toBe(false);
    });

    it('opens when called with true', () => {
      const { result } = renderHook(() => useItemDialogState());

      act(() => {
        result.current.onOpenChange(true);
      });

      expect(result.current.open).toBe(true);
    });
  });

  describe('handleChangeItemType', () => {
    it('changes type while preserving common fields and mapping dueAt to startsAt', () => {
      const { result } = renderHook(() => useItemDialogState());

      act(() => {
        result.current.openAddDialog('task', {
          title: 'Sample Item',
          courseId: 'cs101',
          notes: 'Some notes',
          color: '#ff0000',
        });
      });

      act(() => {
        result.current.handleChangeItemType('exam');
      });

      expect(result.current.itemType).toBe('exam');
      expect(result.current.form.title).toBe('Sample Item');
      expect(result.current.form.courseId).toBe('cs101');
      expect(result.current.form.notes).toBe('Some notes');
      expect(result.current.form.color).toBe('#ff0000');
      expect(result.current.form).not.toHaveProperty('dueAt');
      expect(result.current.form).toHaveProperty('weight');
      expect(result.current.form).toHaveProperty('startsAt');
    });

    it('does not change type when the type field is disabled', () => {
      const { result } = renderHook(() => useItemDialogState());

      act(() => {
        result.current.openAddDialog('task', { title: 'Test' }, { disabled: { type: true } });
      });

      const originalType = result.current.itemType;

      act(() => {
        result.current.handleChangeItemType('exam');
      });

      expect(result.current.itemType).toBe(originalType);
    });

    it('does not change type when the new type equals the current type', () => {
      const { result } = renderHook(() => useItemDialogState());

      act(() => {
        result.current.openAddDialog('task', { title: 'Test' });
      });

      const originalForm = result.current.form;

      act(() => {
        result.current.handleChangeItemType('task');
      });

      expect(result.current.itemType).toBe('task');
      expect(result.current.form).toEqual(originalForm);
    });

    it('does not change type when the new type is not in availableItemTypes', () => {
      const { result } = renderHook(() => useItemDialogState());

      act(() => {
        result.current.openAddDialog('task', { title: 'Test' }, { availableItemTypes: ['task', 'exam'] });
      });

      const originalType = result.current.itemType;
      const originalForm = result.current.form;

      act(() => {
        result.current.handleChangeItemType('event');
      });

      expect(result.current.itemType).toBe(originalType);
      expect(result.current.form).toEqual(originalForm);
    });

    it('preserves current form data passed as an argument over the state form', () => {
      const { result } = renderHook(() => useItemDialogState());

      act(() => {
        result.current.openAddDialog('task', {
          title: 'Original Title',
          courseId: 'cs101',
          notes: 'Original notes',
        });
      });

      const modifiedFormData = {
        ...result.current.form,
        title: 'Modified Title',
        notes: 'Modified notes',
        courseId: 'cs201',
      };

      act(() => {
        result.current.handleChangeItemType('exam', modifiedFormData);
      });

      expect(result.current.itemType).toBe('exam');
      expect(result.current.form.title).toBe('Modified Title');
      expect(result.current.form.notes).toBe('Modified notes');
      expect(result.current.form.courseId).toBe('cs201');
    });

    it('allows changing to an available type and preserves common fields', () => {
      const { result } = renderHook(() => useItemDialogState());

      act(() => {
        result.current.openAddDialog(
          'task',
          { title: 'Test', courseId: 'cs101' },
          { availableItemTypes: ['task', 'exam'] }
        );
      });

      act(() => {
        result.current.handleChangeItemType('exam');
      });

      expect(result.current.itemType).toBe('exam');
      expect(result.current.form.title).toBe('Test');
      expect(result.current.form.courseId).toBe('cs101');
    });

    it('does not change type when availableItemTypes is empty', () => {
      const { result } = renderHook(() => useItemDialogState());

      act(() => {
        result.current.openAddDialog('task', {}, { availableItemTypes: [] });
      });

      expect(result.current.availableItemTypes).toEqual([]);

      act(() => {
        result.current.handleChangeItemType('exam');
      });

      expect(result.current.itemType).toBe('task');
    });

    it('does not change type when only one type is available', () => {
      const { result } = renderHook(() => useItemDialogState());

      act(() => {
        result.current.openAddDialog('event', {}, { availableItemTypes: ['event'] });
      });

      act(() => {
        result.current.handleChangeItemType('task');
      });

      expect(result.current.itemType).toBe('event');
    });
  });

  describe('setForm', () => {
    it('replaces the form state directly', () => {
      const { result } = renderHook(() => useItemDialogState());

      act(() => {
        result.current.openAddDialog('task', { title: 'Before' });
      });

      act(() => {
        result.current.setForm({ ...result.current.form, title: 'After' } as any);
      });

      expect(result.current.form.title).toBe('After');
    });
  });
});