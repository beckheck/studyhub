import { useState } from 'react';
import { useDashboardLayout } from './useStore';

export function useCardCollapse(cardId: string) {
  const { isWidgetCollapsed, setWidgetCollapsed } = useDashboardLayout();
  const [isAnimating, setIsAnimating] = useState(false);

  const collapsed = isWidgetCollapsed(cardId);

  const toggleCollapse = () => {
    setIsAnimating(true);
    setWidgetCollapsed(cardId, !collapsed);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return { collapsed, toggleCollapse, isAnimating };
}
