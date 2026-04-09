import { describe, expect, it } from 'vitest';
import { buildCalendarMatrix } from '@/components/MiniCalendar';

describe('buildCalendarMatrix', () => {
  it('returns a full 42-day grid for months that need six weeks', () => {
    const matrix = buildCalendarMatrix(new Date(2026, 7, 1));

    expect(matrix).toHaveLength(42);
    expect(matrix[0].getFullYear()).toBe(2026);
    expect(matrix[0].getMonth()).toBe(6);
    expect(matrix[41].getMonth()).toBe(8);
  });

  it('still includes the last day of the target month', () => {
    const matrix = buildCalendarMatrix(new Date(2026, 7, 1));

    expect(matrix.some(date => date.getFullYear() === 2026 && date.getMonth() === 7 && date.getDate() === 31)).toBe(true);
  });
});
