import { ItemDialogProvider, useItemDialog } from '@/items/ItemDialogProvider'
import { act, fireEvent, render, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { ItemTask } from '@/items/task/modelSchema'
import type { Item } from '@/items/models'

vi.mock('@/items/base/dialog', () => ({
  ItemDialog: () => <div data-testid="item-dialog" />,
}))

vi.mock('@/hooks/useItemWrite', () => ({
  useItemWrite: () => ({
    saveItem: vi.fn().mockResolvedValue(undefined),
    updateItemFields: vi.fn().mockResolvedValue(undefined),
    deleteItem: vi.fn().mockResolvedValue(undefined),
  }),
}))

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
  } as ItemTask
}

function Consumer() {
  const dialog = useItemDialog()
  return (
    <div>
      <span data-testid="open">{String(dialog.open)}</span>
      <span data-testid="item-type">{dialog.itemType}</span>
      <button
        data-testid="open-add"
        onClick={() => dialog.openAddDialog('task', { title: 'Test Task', courseId: 'course-1' })}
      >
        openAdd
      </button>
      <button
        data-testid="open-edit"
        onClick={() => dialog.openEditDialog(makeTaskItem({ id: 'task-existing' }) as Item)}
      >
        openEdit
      </button>
    </div>
  )
}

describe('ItemDialogProvider context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('throws when useItemDialog is called outside a provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useItemDialog())).toThrow('useItemDialog must be used within an ItemDialogProvider')
    spy.mockRestore()
  })

  it('provides a dialog instance to consumers and renders ItemDialog internally', () => {
    const { getByTestId } = render(
      <ItemDialogProvider>
        <Consumer />
      </ItemDialogProvider>,
    )

    expect(getByTestId('open').textContent).toBe('false')
    expect(getByTestId('item-type').textContent).toBe('task')
  })

  it('shares one dialog instance across consumers (state survives re-renders)', () => {
    const { getByTestId } = render(
      <ItemDialogProvider>
        <Consumer />
      </ItemDialogProvider>,
    )

    fireEvent.click(getByTestId('open-add'))
    expect(getByTestId('open').textContent).toBe('true')
  })

  it('openEditDialog sets the editing item and opens the dialog', () => {
    const { getByTestId } = render(
      <ItemDialogProvider>
        <Consumer />
      </ItemDialogProvider>,
    )

    act(() => {
      fireEvent.click(getByTestId('open-edit'))
    })

    expect(getByTestId('open').textContent).toBe('true')
  })
})
