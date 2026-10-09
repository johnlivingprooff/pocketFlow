import { useState, useEffect } from 'react';
import { AppState } from 'react-native';
import { getBudgets } from '../db/budgets';
import { getGoals } from '../db/goals';

interface TabBadgeCounts {
  analytics: number;
  settings: number;
}

/**
 * Hook to get badge counts for tab bar
 * Monitors budgets/goals for alerts and notifications
 */
export function useTabBadges(): TabBadgeCounts {
  const [badgeCounts, setBadgeCounts] = useState<TabBadgeCounts>({
    analytics: 0,
    settings: 0,
  });

  useEffect(() => {
    let mounted = true;
    const loadBadgeCounts = async () => {
      // Skip while backgrounded (was polling full budget+goal scans every
      // 30s even when hidden). Same visible behavior, no bg work.
      if (AppState.currentState !== 'active') return;
      try {
        // Parallel fetch (was sequential). Single-pass counts below
        // replace filter().length allocations. Identical thresholds.
        const [budgets, goals] = await Promise.all([getBudgets(), getGoals()]);
        let overBudgetCount = 0;
        for (const b of budgets) {
          const percentage = (b.currentSpending / b.limitAmount) * 100;
          if (percentage >= 85) overBudgetCount++;
        }
        let goalMilestones = 0;
        for (const g of goals) {
          const percentage = (g.currentProgress / g.targetAmount) * 100;
          if (percentage >= 100 || (percentage >= 75 && percentage < 100)) {
            goalMilestones++;
          }
        }

        if (!mounted) return;
        setBadgeCounts((prev) => {
          const next = { analytics: overBudgetCount + goalMilestones, settings: 0 };
          // Avoid re-render when counts unchanged
          if (prev.analytics === next.analytics && prev.settings === next.settings) return prev;
          return next;
        });
      } catch (error) {
        console.error('Failed to load tab badge counts:', error);
      }
    };

    loadBadgeCounts();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadBadgeCounts, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return badgeCounts;
}
