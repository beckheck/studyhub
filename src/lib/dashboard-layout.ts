export type DashboardWidgetId =
  | 'weather'
  | 'datetime'
  | 'schedule'
  | 'nextUp'
  | 'soundtrack'
  | 'tips'
  | 'scratchpad'
  | 'mytasks'

export const DEFAULT_DASHBOARD_WIDGET_ORDER: readonly DashboardWidgetId[] = [
  'schedule',
  'scratchpad',
  'nextUp',
  'mytasks',
  'soundtrack',
  'tips',
]

const PINNED_ORDER: readonly DashboardWidgetId[] = ['schedule', 'scratchpad', 'nextUp']

const VALID_WIDGET_IDS = new Set<DashboardWidgetId>(DEFAULT_DASHBOARD_WIDGET_ORDER)

export function resolveOrder(storedOrder: readonly string[] | null | undefined): DashboardWidgetId[] {
  if (!storedOrder?.length) return [...DEFAULT_DASHBOARD_WIDGET_ORDER]

  const seen = new Set<string>()
  const stored = storedOrder.filter((id): id is DashboardWidgetId => {
    if (!VALID_WIDGET_IDS.has(id as DashboardWidgetId) || seen.has(id)) return false
    seen.add(id)
    return true
  })

  const pinnedWidgets = PINNED_ORDER.filter(id => stored.includes(id) || DEFAULT_DASHBOARD_WIDGET_ORDER.includes(id))
  const remainingWidgets = stored.filter(id => !PINNED_ORDER.includes(id))
  const missingWidgets = DEFAULT_DASHBOARD_WIDGET_ORDER.filter(
    id => !pinnedWidgets.includes(id) && !remainingWidgets.includes(id),
  )

  return [...pinnedWidgets, ...remainingWidgets, ...missingWidgets]
}

export function reorder(
  order: readonly DashboardWidgetId[],
  widgetId: DashboardWidgetId,
  targetWidgetId: DashboardWidgetId,
): DashboardWidgetId[] {
  const result = [...order]
  const fromIndex = result.indexOf(widgetId)
  const targetIndex = result.indexOf(targetWidgetId)

  if (fromIndex === -1 || targetIndex === -1 || widgetId === targetWidgetId) {
    return result
  }

  result.splice(fromIndex, 1)
  const adjustedTargetIndex = result.indexOf(targetWidgetId)
  result.splice(adjustedTargetIndex, 0, widgetId)
  return result
}

export function moveToEnd(order: readonly DashboardWidgetId[], widgetId: DashboardWidgetId): DashboardWidgetId[] {
  const result = [...order]
  const fromIndex = result.indexOf(widgetId)

  if (fromIndex === -1 || fromIndex === result.length - 1) {
    return result
  }

  result.splice(fromIndex, 1)
  result.push(widgetId)
  return result
}
