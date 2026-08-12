import { describe, it, expect } from 'vite-plus/test'
import {
  DEFAULT_DASHBOARD_WIDGET_ORDER,
  resolveOrder,
  reorder,
  moveToEnd,
  type DashboardWidgetId,
} from './dashboard-layout'

describe('DEFAULT_WIDGET_ORDER', () => {
  it('lists the six orderable widgets with pinned widgets first', () => {
    expect(DEFAULT_DASHBOARD_WIDGET_ORDER).toEqual([
      'schedule',
      'scratchpad',
      'nextUp',
      'mytasks',
      'soundtrack',
      'tips',
    ])
  })

  it('does not include calendar', () => {
    expect(DEFAULT_DASHBOARD_WIDGET_ORDER).not.toContain('calendar')
  })

  it('does not include weather or datetime (bare-frame widgets)', () => {
    expect(DEFAULT_DASHBOARD_WIDGET_ORDER).not.toContain('weather')
    expect(DEFAULT_DASHBOARD_WIDGET_ORDER).not.toContain('datetime')
  })
})

describe('resolveOrder', () => {
  it('returns the default order when stored order is empty', () => {
    expect(resolveOrder([])).toEqual([...DEFAULT_DASHBOARD_WIDGET_ORDER])
  })

  it('returns the default order when stored order is nullish', () => {
    expect(resolveOrder(null as unknown as readonly string[])).toEqual([...DEFAULT_DASHBOARD_WIDGET_ORDER])
  })

  it('pins schedule, scratchpad, and nextUp at the front', () => {
    const stored = ['mytasks', 'tips', 'nextUp', 'scratchpad', 'schedule', 'soundtrack']
    const result = resolveOrder(stored)
    expect(result.slice(0, 3)).toEqual(['schedule', 'scratchpad', 'nextUp'])
  })

  it('keeps user-ordered remaining widgets after the pinned block', () => {
    const stored = ['soundtrack', 'mytasks', 'tips']
    const result = resolveOrder(stored)
    expect(result.slice(3)).toEqual(['soundtrack', 'mytasks', 'tips'])
  })

  it('appends missing default widgets at the end', () => {
    const stored = ['mytasks']
    const result = resolveOrder(stored)
    expect(result).toEqual(['schedule', 'scratchpad', 'nextUp', 'mytasks', 'soundtrack', 'tips'])
  })

  it('filters unknown ids like the stale calendar widget', () => {
    const stored = ['calendar', 'schedule', 'mytasks']
    const result = resolveOrder(stored)
    expect(result).not.toContain('calendar')
    expect(result).toEqual(['schedule', 'scratchpad', 'nextUp', 'mytasks', 'soundtrack', 'tips'])
  })

  it('returns only pinned widgets when stored order has only pinned ids', () => {
    const stored = ['schedule', 'nextUp']
    const result = resolveOrder(stored)
    expect(result.slice(0, 3)).toEqual(['schedule', 'scratchpad', 'nextUp'])
    expect(result.slice(3)).toEqual(['mytasks', 'soundtrack', 'tips'])
  })

  it('does not duplicate widgets', () => {
    const stored = ['schedule', 'schedule', 'mytasks', 'mytasks']
    const result = resolveOrder(stored)
    const unique = new Set(result)
    expect(result.length).toBe(unique.size)
  })
})

describe('reorder', () => {
  it('moves a widget before the target', () => {
    const order: DashboardWidgetId[] = ['schedule', 'scratchpad', 'nextUp', 'mytasks', 'soundtrack', 'tips']
    const result = reorder(order, 'tips', 'mytasks')
    expect(result).toEqual(['schedule', 'scratchpad', 'nextUp', 'tips', 'mytasks', 'soundtrack'])
  })

  it('returns the same order when widget is not in the array', () => {
    const order: DashboardWidgetId[] = ['schedule', 'nextUp']
    const result = reorder(order, 'tips', 'nextUp')
    expect(result).toEqual(['schedule', 'nextUp'])
  })

  it('returns the same order when target is not in the array', () => {
    const order: DashboardWidgetId[] = ['schedule', 'nextUp']
    const result = reorder(order, 'schedule', 'tips')
    expect(result).toEqual(['schedule', 'nextUp'])
  })

  it('returns the same order when widget equals target', () => {
    const order: DashboardWidgetId[] = ['schedule', 'nextUp', 'mytasks']
    const result = reorder(order, 'nextUp', 'nextUp')
    expect(result).toEqual(['schedule', 'nextUp', 'mytasks'])
  })

  it('does not mutate the input array', () => {
    const order: DashboardWidgetId[] = ['schedule', 'nextUp', 'mytasks']
    const result = reorder(order, 'mytasks', 'schedule')
    expect(order).toEqual(['schedule', 'nextUp', 'mytasks'])
    expect(result).not.toBe(order)
  })

  it('moves the first widget before the second', () => {
    const order: DashboardWidgetId[] = ['schedule', 'nextUp', 'mytasks']
    const result = reorder(order, 'schedule', 'nextUp')
    expect(result).toEqual(['schedule', 'nextUp', 'mytasks'])
  })

  it('moves a widget to the front when target is the first widget', () => {
    const order: DashboardWidgetId[] = ['schedule', 'nextUp', 'mytasks', 'soundtrack']
    const result = reorder(order, 'soundtrack', 'schedule')
    expect(result).toEqual(['soundtrack', 'schedule', 'nextUp', 'mytasks'])
  })
})

describe('moveToEnd', () => {
  it('moves a widget to the end', () => {
    const order: DashboardWidgetId[] = ['schedule', 'nextUp', 'mytasks', 'tips']
    const result = moveToEnd(order, 'schedule')
    expect(result).toEqual(['nextUp', 'mytasks', 'tips', 'schedule'])
  })

  it('returns the same order when widget is not in the array', () => {
    const order: DashboardWidgetId[] = ['schedule', 'nextUp']
    const result = moveToEnd(order, 'tips')
    expect(result).toEqual(['schedule', 'nextUp'])
  })

  it('returns the same order when widget is already last', () => {
    const order: DashboardWidgetId[] = ['schedule', 'nextUp', 'mytasks']
    const result = moveToEnd(order, 'mytasks')
    expect(result).toEqual(['schedule', 'nextUp', 'mytasks'])
  })

  it('does not mutate the input array', () => {
    const order: DashboardWidgetId[] = ['schedule', 'nextUp', 'mytasks']
    const result = moveToEnd(order, 'schedule')
    expect(order).toEqual(['schedule', 'nextUp', 'mytasks'])
    expect(result).not.toBe(order)
  })
})

describe('DashboardWidgetId type', () => {
  it('accepts all eight widget ids', () => {
    const ids: DashboardWidgetId[] = [
      'weather',
      'datetime',
      'schedule',
      'nextUp',
      'soundtrack',
      'tips',
      'scratchpad',
      'mytasks',
    ]
    expect(ids).toHaveLength(8)
  })
})
