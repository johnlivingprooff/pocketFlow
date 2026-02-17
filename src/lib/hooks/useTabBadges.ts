import { useState, useEffect } from 'react';
import { getBudgets } from '../lib/db/budgets';
import { getGoals } from '../lib/db/goals';

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
    const loadBadgeCounts = async () => {
      try {
        // Check budgets for warnings
        const budgets = await getBudgets();
        const overBudgetCount = budgets.filter(b => {
          const percentage = (b.currentSpending / b.limitAmount) * 100;
          return percentage >= 85; // Warning threshold
        }).length;

        // Check goals for milestones
        const goals = await getGoals();
        const goalMilestones = goals.filter(g => {
          const percentage = (g.currentProgress / g.targetAmount) * 100;
          return percentage >= 100 || (percentage >= 75 && percentage < 100);
        }).length;

        setBadgeCounts({
          analytics: overBudgetCount + goalMilestones,
          settings: 0, // Could be used for update notifications
        });
      } catch (error) {
        console.error('Failed to load tab badge counts:', error);
      }
    };

    loadBadgeCounts();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadBadgeCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  return badgeCounts;
}
