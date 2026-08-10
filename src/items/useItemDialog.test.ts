import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'
import { ItemDialogOptions, useItemDialog } from './useItemDialog'

describe('useItemDialog', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useItemDialog())

    expect(result.current.open).toBe(false)
    expect(result.current.itemType).toBe('task')
    expect(result.current.editingItem).toBeNull()
  })

  it('should change item type while preserving common fields', () => {
    const { result } = renderHook(() => useItemDialog())

    act(() => {
      result.current.openAddDialog('task', {
        title: 'Sample Item',
        courseId: 'cs101',
        notes: 'Some notes',
        color: '#ff0000',
      })
    })

    // Initial state
    expect(result.current.itemType).toBe('task')
    expect(result.current.form.title).toBe('Sample Item')
    expect(result.current.form.courseId).toBe('cs101')
    expect(result.current.form.notes).toBe('Some notes')
    expect(result.current.form.color).toBe('#ff0000')

    // Exam-specific fields should be set to defaults
    expect(result.current.form).toHaveProperty('dueAt')
    expect(result.current.form).not.toHaveProperty('weight')

    // Change type to exam
    act(() => {
      result.current.handleChangeItemType('exam')
    })

    // Common fields should be preserved
    expect(result.current.itemType).toBe('exam')
    expect(result.current.form.title).toBe('Sample Item')
    expect(result.current.form.courseId).toBe('cs101')
    expect(result.current.form.notes).toBe('Some notes')
    expect(result.current.form.color).toBe('#ff0000')

    // Exam-specific fields should be set to defaults
    expect(result.current.form).not.toHaveProperty('dueAt')
    expect(result.current.form).toHaveProperty('weight')
    expect(result.current.form).toHaveProperty('startsAt')
  })

  it('should not change type if handleChangeItemType is false', () => {
    const { result } = renderHook(() => useItemDialog())

    act(() => {
      result.current.openAddDialog('task', { title: 'Test' }, { disabled: { type: true } })
    })

    const originalType = result.current.itemType

    act(() => {
      result.current.handleChangeItemType('exam')
    })

    // Type should not change since handleChangeItemType is false
    expect(result.current.itemType).toBe(originalType)
  })

  it('should preserve current form data when changing type', () => {
    const { result } = renderHook(() => useItemDialog())

    // Open dialog with initial data
    act(() => {
      result.current.openAddDialog('task', {
        title: 'Original Title',
        courseId: 'cs101',
        notes: 'Original notes',
      })
    })

    // Simulate user modifying form data (like they would in the dialog)
    const modifiedFormData = {
      ...result.current.form,
      title: 'Modified Title',
      notes: 'Modified notes',
      courseId: 'cs201',
    }

    // Change type passing the modified form data (as the dialog would)
    act(() => {
      result.current.handleChangeItemType('exam', modifiedFormData)
    })

    // Verify that the modified data was preserved
    expect(result.current.itemType).toBe('exam')
    expect(result.current.form.title).toBe('Modified Title')
    expect(result.current.form.notes).toBe('Modified notes')
    expect(result.current.form.courseId).toBe('cs201')
  })

  it('should not change type if new type is the same as current type', () => {
    const { result } = renderHook(() => useItemDialog())

    act(() => {
      result.current.openAddDialog('task', { title: 'Test' })
    })

    const originalForm = result.current.form

    act(() => {
      result.current.handleChangeItemType('task')
    })

    // Form should remain unchanged
    expect(result.current.itemType).toBe('task')
    expect(result.current.form).toEqual(originalForm)
  })

  describe('availableItemTypes functionality', () => {
    it('should initialize with all item types available by default', () => {
      const { result } = renderHook(() => useItemDialog())

      expect(result.current.availableItemTypes).toEqual(['task', 'exam', 'event', 'timetable'])
    })

    it('should set availableItemTypes when opening add dialog with options', () => {
      const { result } = renderHook(() => useItemDialog())

      act(() => {
        result.current.openAddDialog('task', {}, { availableItemTypes: ['task', 'exam'] })
      })

      expect(result.current.availableItemTypes).toEqual(['task', 'exam'])
      expect(result.current.open).toBe(true)
      expect(result.current.itemType).toBe('task')
    })

    it('should set availableItemTypes when opening edit dialog with options', () => {
      const { result } = renderHook(() => useItemDialog())

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
      }

      act(() => {
        result.current.openEditDialog(mockItem, { availableItemTypes: ['event', 'timetable'] })
      })

      expect(result.current.availableItemTypes).toEqual(['event', 'timetable'])
      expect(result.current.open).toBe(true)
      expect(result.current.editingItem).toEqual(mockItem)
    })

    it('should default to all types if availableItemTypes is not specified in options', () => {
      const { result } = renderHook(() => useItemDialog())

      act(() => {
        result.current.openAddDialog('task', {}, { hidden: { courseId: true } })
      })

      expect(result.current.availableItemTypes).toEqual(['task', 'exam', 'event', 'timetable'])
    })

    it('should prevent changing to unavailable item type', () => {
      const { result } = renderHook(() => useItemDialog())

      act(() => {
        result.current.openAddDialog('task', { title: 'Test' }, { availableItemTypes: ['task', 'exam'] })
      })

      const originalType = result.current.itemType
      const originalForm = result.current.form

      // Try to change to event (not in available types)
      act(() => {
        result.current.handleChangeItemType('event')
      })

      // Type and form should remain unchanged
      expect(result.current.itemType).toBe(originalType)
      expect(result.current.form).toEqual(originalForm)
    })

    it('should allow changing to available item type', () => {
      const { result } = renderHook(() => useItemDialog())

      act(() => {
        result.current.openAddDialog(
          'task',
          { title: 'Test', courseId: 'cs101' },
          { availableItemTypes: ['task', 'exam'] },
        )
      })

      act(() => {
        result.current.handleChangeItemType('exam')
      })

      // Type should change and common fields should be preserved
      expect(result.current.itemType).toBe('exam')
      expect(result.current.form.title).toBe('Test')
      expect(result.current.form.courseId).toBe('cs101')
    })

    it('should reset open when closing dialog', () => {
      const { result } = renderHook(() => useItemDialog())

      act(() => {
        result.current.openAddDialog('task', {}, { availableItemTypes: ['task'] })
      })

      act(() => {
        result.current.closeDialog()
      })

      expect(result.current.open).toBe(false)
    })

    it('should handle empty availableItemTypes array', () => {
      const { result } = renderHook(() => useItemDialog())

      act(() => {
        result.current.openAddDialog('task', {}, { availableItemTypes: [] })
      })

      expect(result.current.availableItemTypes).toEqual([])

      // Should not be able to change type when no types are available
      act(() => {
        result.current.handleChangeItemType('exam')
      })

      expect(result.current.itemType).toBe('task') // Should remain unchanged
    })

    it('should work with single available type', () => {
      const { result } = renderHook(() => useItemDialog())

      act(() => {
        result.current.openAddDialog('event', {}, { availableItemTypes: ['event'] })
      })

      expect(result.current.availableItemTypes).toEqual(['event'])
      expect(result.current.itemType).toBe('event')

      // Should not be able to change to other types
      act(() => {
        result.current.handleChangeItemType('task')
      })

      expect(result.current.itemType).toBe('event') // Should remain unchanged
    })

    it('should preserve other options when availableItemTypes is set', () => {
      const { result } = renderHook(() => useItemDialog())

      const options: ItemDialogOptions = {
        availableItemTypes: ['task', 'exam'],
        hidden: { courseId: true },
        disabled: { title: true },
      }

      act(() => {
        result.current.openAddDialog('task', {}, options)
      })

      expect(result.current.availableItemTypes).toEqual(['task', 'exam'])
      expect(result.current.hidden.courseId).toBe(true)
      expect(result.current.disabled.title).toBe(true)
    })
  })
})
