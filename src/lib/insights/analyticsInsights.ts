// Phase 3: Advanced Insights & Recommendations

export interface SpendingInsight {
  type: 'warning' | 'success' | 'info' | 'tip';
  title: string;
  message: string;
  icon: string;
}

export interface FinancialHealthScore {
  score: number; // 0-100
  rating: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  factors: {
    savingsRate: number;
    spendingConsistency: number;
    budgetAdherence: number;
    incomeStability: number;
  };
}

/**
 * Analyzes spending patterns and generates insights
 */
export function generateSpendingInsights(data: {
  monthlyComparison: any;
  weekComparison: any;
  incomeExpense: any;
  spendingStreak: any;
  categories: Array<{ category: string; total: number }>;
  avgDailySpend: number;
}): SpendingInsight[] {
  const insights: SpendingInsight[] = [];

  // Insight 1: Week over week spending trend
  if (data.weekComparison) {
    if (data.weekComparison.change > 20) {
      insights.push({
        type: 'warning',
        title: 'Spending Surge Detected',
        message: `Your spending is up ${data.weekComparison.change.toFixed(0)}% from last week. Consider reviewing your recent expenses.`,
        icon: '📈'
      });
    } else if (data.weekComparison.change < -20) {
      insights.push({
        type: 'success',
        title: 'Great Progress!',
        message: `You've reduced spending by ${Math.abs(data.weekComparison.change).toFixed(0)}% compared to last week. Keep it up!`,
        icon: '🎉'
      });
    }
  }

  // Insight 2: Savings rate analysis
  if (data.incomeExpense && data.incomeExpense.income > 0) {
    const savingsRate = data.incomeExpense.savingsRate;
    if (savingsRate < 0) {
      insights.push({
        type: 'warning',
        title: 'Spending Exceeds Income',
        message: 'You\'re spending more than you earn this month. Consider cutting back on non-essential expenses.',
        icon: '⚠️'
      });
    } else if (savingsRate >= 20) {
      insights.push({
        type: 'success',
        title: 'Excellent Savings!',
        message: `You're saving ${savingsRate.toFixed(0)}% of your income. You're on track for financial success!`,
        icon: '💰'
      });
    } else if (savingsRate < 10) {
      insights.push({
        type: 'info',
        title: 'Room for Improvement',
        message: 'Try to save at least 10-20% of your income each month for better financial health.',
        icon: '💡'
      });
    }
  }

  // Insight 3: Spending streak analysis
  if (data.spendingStreak && data.spendingStreak.currentStreak >= 7) {
    insights.push({
      type: 'tip',
      title: 'Consider a No-Spend Day',
      message: `You've spent for ${data.spendingStreak.currentStreak} consecutive days. Try having a no-spend day to reset your habits.`,
      icon: '🎯'
    });
  }

  // Insight 4: Top category spending
  if (data.categories && data.categories.length > 0) {
    const topCategory = data.categories[0];
    const total = data.categories.reduce((sum, cat) => sum + cat.total, 0);
    const percentage = (topCategory.total / total) * 100;
    
    if (percentage > 40) {
      insights.push({
        type: 'info',
        title: 'Category Concentration',
        message: `${percentage.toFixed(0)}% of your spending is on ${topCategory.category}. Consider if this aligns with your priorities.`,
        icon: '📊'
      });
    }
  }

  // Insight 5: Monthly comparison
  if (data.monthlyComparison) {
    const thisMonth = data.monthlyComparison.thisMonth.expense;
    const lastMonth = data.monthlyComparison.lastMonth.expense;
    
    if (thisMonth > lastMonth * 1.3) {
      insights.push({
        type: 'warning',
        title: 'Monthly Spending Up',
        message: `You're spending ${(((thisMonth - lastMonth) / lastMonth) * 100).toFixed(0)}% more than last month.`,
        icon: '📉'
      });
    } else if (thisMonth < lastMonth * 0.8) {
      insights.push({
        type: 'success',
        title: 'Spending Reduction',
        message: `You've reduced monthly spending by ${(((lastMonth - thisMonth) / lastMonth) * 100).toFixed(0)}%!`,
        icon: '✨'
      });
    }
  }

  return insights;
}

/**
 * Generates personalized savings suggestions
 */
export function generateSavingsSuggestions(data: {
  categories: Array<{ category: string; total: number }>;
  avgDailySpend: number;
  incomeExpense: any;
}): SpendingInsight[] {
  const suggestions: SpendingInsight[] = [];

  // Suggestion 1: High-spending categories
  if (data.categories && data.categories.length > 0) {
    const topThree = data.categories.slice(0, 3);
    const total = data.categories.reduce((sum, cat) => sum + cat.total, 0);
    
    topThree.forEach((cat, index) => {
      const percentage = (cat.total / total) * 100;
      if (percentage > 25 && index === 0) {
        suggestions.push({
          type: 'tip',
          title: `Reduce ${cat.category} Spending`,
          message: `Try cutting your ${cat.category} expenses by 10-15% to save more each month.`,
          icon: '💡'
        });
      }
    });
  }

  // Suggestion 2: Daily spending optimization
  if (data.avgDailySpend > 0) {
    const potentialSavings = data.avgDailySpend * 0.1 * 30; // 10% reduction over a month
    suggestions.push({
      type: 'tip',
      title: 'Daily Spending Challenge',
      message: `If you reduce daily spending by just 10%, you could save an extra amount per month.`,
      icon: '🎯'
    });
  }

  // Suggestion 3: Savings rate improvement
  if (data.incomeExpense && data.incomeExpense.income > 0) {
    const currentSavingsRate = data.incomeExpense.savingsRate;
    if (currentSavingsRate < 20) {
      const targetSavings = data.incomeExpense.income * 0.2;
      const additionalSavingsNeeded = targetSavings - data.incomeExpense.netSavings;
      
      if (additionalSavingsNeeded > 0) {
        suggestions.push({
          type: 'tip',
          title: 'Reach 20% Savings Goal',
          message: `Aim to save ${currentSavingsRate < 0 ? '20%' : 'an additional amount'} to reach the recommended 20% savings rate.`,
          icon: '🎯'
        });
      }
    }
  }

  return suggestions;
}

/**
 * Detects spending patterns
 */
export function detectSpendingPatterns(data: {
  dailySpending: Array<{ day: number; amount: number }>;
  categories: Array<{ category: string; total: number }>;
}): SpendingInsight[] {
  const patterns: SpendingInsight[] = [];

  if (!data.dailySpending || data.dailySpending.length === 0) {
    return patterns;
  }

  // Pattern 1: Weekend spending
  const today = new Date();
  const daysOfWeek = data.dailySpending.map(d => {
    const date = new Date(today.getFullYear(), today.getMonth(), d.day);
    return { ...d, dayOfWeek: date.getDay() };
  });

  const weekendSpending = daysOfWeek
    .filter(d => d.dayOfWeek === 0 || d.dayOfWeek === 6)
    .reduce((sum, d) => sum + d.amount, 0);
  const weekdaySpending = daysOfWeek
    .filter(d => d.dayOfWeek !== 0 && d.dayOfWeek !== 6)
    .reduce((sum, d) => sum + d.amount, 0);

  if (weekendSpending > weekdaySpending * 0.4) {
    patterns.push({
      type: 'info',
      title: 'Weekend Spending Pattern',
      message: 'You tend to spend more on weekends. Planning ahead could help reduce impulse purchases.',
      icon: '📅'
    });
  }

  // Pattern 2: End of month spending
  const lastWeekSpending = data.dailySpending
    .slice(-7)
    .reduce((sum, d) => sum + d.amount, 0);
  const totalSpending = data.dailySpending.reduce((sum, d) => sum + d.amount, 0);

  if (lastWeekSpending > totalSpending * 0.4) {
    patterns.push({
      type: 'info',
      title: 'End-of-Month Surge',
      message: 'Your spending increases toward month-end. Consider spreading expenses more evenly.',
      icon: '📊'
    });
  }

  // Pattern 3: Consistent low spending days
  const lowSpendingDays = data.dailySpending.filter(d => d.amount === 0).length;
  if (lowSpendingDays >= 5) {
    patterns.push({
      type: 'success',
      title: 'Great Self-Control',
      message: `You had ${lowSpendingDays} no-spend days this month! Keep up the disciplined approach.`,
      icon: '⭐'
    });
  }

  return patterns;
}

/**
 * Calculates a financial health score
 */
export function calculateFinancialHealthScore(data: {
  incomeExpense: any;
  spendingStreak: any;
  weekComparison: any;
  dailySpending: Array<{ day: number; amount: number }>;
}): FinancialHealthScore {
  let score = 0;
  const factors = {
    savingsRate: 0,
    spendingConsistency: 0,
    budgetAdherence: 0,
    incomeStability: 0
  };

  // Factor 1: Savings rate (30 points)
  if (data.incomeExpense && data.incomeExpense.income > 0) {
    const savingsRate = data.incomeExpense.savingsRate;
    if (savingsRate >= 20) {
      factors.savingsRate = 30;
    } else if (savingsRate >= 10) {
      factors.savingsRate = 20;
    } else if (savingsRate >= 0) {
      factors.savingsRate = 10;
    } else {
      factors.savingsRate = 0;
    }
  } else {
    factors.savingsRate = 15; // Neutral if no income data
  }

  // Factor 2: Spending consistency (25 points)
  if (data.dailySpending && data.dailySpending.length > 0) {
    const amounts = data.dailySpending.map(d => d.amount).filter(a => a > 0);
    if (amounts.length > 0) {
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / mean;

      if (coefficientOfVariation < 0.5) {
        factors.spendingConsistency = 25; // Very consistent
      } else if (coefficientOfVariation < 1) {
        factors.spendingConsistency = 18; // Moderately consistent
      } else if (coefficientOfVariation < 2) {
        factors.spendingConsistency = 10; // Somewhat inconsistent
      } else {
        factors.spendingConsistency = 5; // Highly variable
      }
    }
  }

  // Factor 3: Budget adherence (25 points) - based on week-over-week change
  if (data.weekComparison) {
    const change = Math.abs(data.weekComparison.change);
    if (change < 10) {
      factors.budgetAdherence = 25; // Stable spending
    } else if (change < 25) {
      factors.budgetAdherence = 18;
    } else if (change < 50) {
      factors.budgetAdherence = 10;
    } else {
      factors.budgetAdherence = 5;
    }
  } else {
    factors.budgetAdherence = 15;
  }

  // Factor 4: Income stability (20 points)
  if (data.incomeExpense && data.incomeExpense.income > 0) {
    factors.incomeStability = 20; // Has income
  } else {
    factors.incomeStability = 0; // No income recorded
  }

  score = factors.savingsRate + factors.spendingConsistency + factors.budgetAdherence + factors.incomeStability;

  let rating: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  if (score >= 80) {
    rating = 'Excellent';
  } else if (score >= 60) {
    rating = 'Good';
  } else if (score >= 40) {
    rating = 'Fair';
  } else {
    rating = 'Poor';
  }

  return { score, rating, factors };
}
