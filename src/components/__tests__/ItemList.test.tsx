import { ItemList } from '@/items/ItemList'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

// Mock the translation function
vi.mock('@/i18n/config', () => ({
  t: (key: string) => {
    const translations: Record<string, string> = {
      'common:common.items': 'Items',
      'items:task.title': 'Task',
      'items:exam.title': 'Exam',
      'items:event.title': 'Event',
      'items:timetable.title': 'Timetable',
      'common:common.searchByTitle': 'Search by title...',
      'common:common.noItemsYet': 'No items yet. Click the buttons above to add some!',
      'common:common.noItemsFound': 'No items found matching your search',
    }
    return translations[key] || key
  },
}))

// Mock the dialog components
vi.mock('@/items/base/dialog', () => ({
  ItemDialog: ({ open, onSave, onDelete }: any) => (
    <div data-testid="item-dialog" style={{ display: open ? 'block' : 'none' }}>
      <button onClick={() => onSave({ title: 'Test Item', dueAt: '2025-01-01' })}>Save</button>
      <button onClick={onDelete}>Delete</button>
    </div>
  ),
}))

vi.mock('@/items/ItemDialogProvider', () => ({
  useItemDialog: () => ({
    open: false,
    editingItem: null,
    itemType: 'task',
    form: { title: '', dueAt: '' },
    setForm: vi.fn(),
    hidden: {},
    disabled: {},
    openAddDialog: vi.fn(),
    openEditDialog: vi.fn(),
    closeDialog: vi.fn(),
    handleSave: vi.fn(),
    handleDelete: vi.fn(),
    handleChangeItemType: vi.fn(),
    onOpenChange: vi.fn(),
  }),
}))

describe('ItemList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the component with title and add buttons', () => {
    render(<ItemList />)

    // Check if the main title is rendered
    expect(screen.getByText('Items')).toBeInTheDocument()

    // Check if all add buttons are rendered
    expect(screen.getByText('Task')).toBeInTheDocument()
    expect(screen.getByText('Exam')).toBeInTheDocument()
    expect(screen.getByText('Event')).toBeInTheDocument()
    expect(screen.getByText('Timetable')).toBeInTheDocument()

    // Check if the search input is rendered
    expect(screen.getByPlaceholderText('Search by title...')).toBeInTheDocument()
  })

  it('displays no items message when list is empty', () => {
    render(<ItemList />)

    expect(screen.getByText('No items yet. Click the buttons above to add some!')).toBeInTheDocument()
  })

  it('filters items based on search input', async () => {
    render(<ItemList />)

    const searchInput = screen.getByPlaceholderText('Search by title...')

    // Type in the search input
    fireEvent.change(searchInput, { target: { value: 'test' } })

    await waitFor(() => {
      expect(screen.getByText('No items found matching your search')).toBeInTheDocument()
    })
  })

  it('has proper CSS classes for styling', () => {
    const { container } = render(<ItemList className="custom-class" />)

    // Check if custom class is applied
    const mainDiv = container.firstChild as HTMLElement
    expect(mainDiv).toHaveClass('custom-class')
    expect(mainDiv).toHaveClass('space-y-4')
  })

  it('renders add buttons with plus icons', () => {
    render(<ItemList />)

    // Find all buttons that contain Plus icons (by finding svg elements)
    const addButtons = screen.getAllByRole('button')
    const addTaskButton = addButtons.find(button => button.textContent?.includes('Task'))

    expect(addTaskButton).toBeInTheDocument()
  })
})
