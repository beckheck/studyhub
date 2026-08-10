import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useItems } from '@/hooks/useStore'
import { t } from '@/i18n/config'
import { Item } from '@/items/models'
import { useItemDialog } from '@/items/ItemDialogProvider'
import { cn } from '@/lib/utils'
import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getItemMethods } from './methods'
import { compareDates } from '@/lib/date-utils'

interface ItemListProps {
  className?: string
}

const getTimestamp = (item: Item) => {
  return getItemMethods(item).getDate()
}

export function ItemList({ className }: ItemListProps) {
  // Use the unified items hook instead of local state
  const { items } = useItems()
  const [filterText, setFilterText] = useState('')

  // Use the item dialog hook
  const itemDialog = useItemDialog()

  // Sort items by startsAt or dueAt
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aTime = getTimestamp(a as Item)
      const bTime = getTimestamp(b as Item)
      return compareDates(aTime, bTime)
    })
  }, [items])

  // Filter items by title
  const filteredItems = useMemo(() => {
    if (!filterText.trim()) return sortedItems
    const searchTerm = filterText.toLowerCase().trim()
    return sortedItems.filter(item => (item.title ?? '').toLowerCase().includes(searchTerm))
  }, [sortedItems, filterText])

  // Get completion status display
  const getCompletionStatus = (item: Item) => {
    const hasCompletion = ['task', 'exam'].includes(item.type) && (item as any).isCompleted
    return hasCompletion ? (
      <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ {t('common:common.completed')}</span>
    ) : null
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with Add buttons */}
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('common:common.items')}</h2>

        {/* Toolbar with add buttons */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => itemDialog.openAddDialog('task')} variant="outline" size="sm" className="rounded-xl">
            <Plus className="w-4 h-4" />
            {t('items:task.title')}
          </Button>
          <Button onClick={() => itemDialog.openAddDialog('exam')} variant="outline" size="sm" className="rounded-xl">
            <Plus className="w-4 h-4" />
            {t('items:exam.title')}
          </Button>
          <Button onClick={() => itemDialog.openAddDialog('event')} variant="outline" size="sm" className="rounded-xl">
            <Plus className="w-4 h-4" />
            {t('items:event.title')}
          </Button>
          <Button
            onClick={() => itemDialog.openAddDialog('timetable')}
            variant="outline"
            size="sm"
            className="rounded-xl"
          >
            <Plus className="w-4 h-4" />
            {t('items:timetable.title')}
          </Button>
        </div>

        {/* Filter input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={t('common:common.searchByTitle')}
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-2">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {filterText ? t('common:common.noItemsFound') : t('common:common.noItemsYet')}
          </div>
        ) : (
          filteredItems.map(item => {
            const itemMethods = getItemMethods(item as Item)
            return (
              <div
                key={item.id}
                onClick={() => itemDialog.openEditDialog(item as Item)}
                className={cn(
                  'p-4 bg-white dark:bg-gray-800 rounded-r-xl',
                  'border border-gray-200 dark:border-gray-600',
                  'hover:shadow-md transition-shadow cursor-pointer',
                  itemMethods.getPriorityColorClass(),
                )}
                style={{ borderLeftColor: item.color }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {itemMethods.getIcon()}
                      <span className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400">
                        {t(`items:${item.type}.title`)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{item.title}</h3>
                    {getCompletionStatus(item as Item)}
                  </div>
                  <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                    {itemMethods.getItemDate() && <div>{itemMethods.getItemDate()}</div>}
                    {itemMethods.getMetadata()}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
