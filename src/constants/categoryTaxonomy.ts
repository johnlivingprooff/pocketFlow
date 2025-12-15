/**
 * Category Taxonomy - Essential Income and Expense Categories
 */

export interface CategoryDefinition {
  name: string;
  icon?: string;
  subcategories?: string[];
}

// ============================================================================
// INCOME CATEGORIES (Essential Only)
// ============================================================================

export const INCOME_TAXONOMY: CategoryDefinition[] = [
  {
    name: 'Work Income',
    icon: 'salary',
    subcategories: [
      'Salary / Wages',
      'Overtime / Bonuses',
    ],
  },
  {
    name: 'Business Income',
    icon: 'business',
    subcategories: [
      'Sales',
      'Services',
    ],
  },
  {
    name: 'Investment Income',
    icon: 'investment',
    subcategories: [
      'Interest / Dividends',
      'Capital Gains',
    ],
  },
  {
    name: 'Support & Transfers',
    icon: 'gift',
    subcategories: [
      'Family Support',
      'Gifts / Remittances',
    ],
  },
];

// ============================================================================
// EXPENSE CATEGORIES (Essential Only)
// ============================================================================

export const EXPENSE_TAXONOMY: CategoryDefinition[] = [
  {
    name: 'Housing',
    icon: 'Housing',
    subcategories: [
      'Rent / Mortgage',
      'Maintenance',
    ],
  },
  {
    name: 'Food',
    icon: 'Food & Groceries',
    subcategories: [
      'Groceries / Snacks',
      'Eating Out / Fine Dining',
    ],
  },
  {
    name: 'Transport',
    icon: 'Travel',
    subcategories: [
      'Fuel / Fares',
      'Maintenance',
    ],
  },
  {
    name: 'Utilities & Communication',
    icon: 'Utilities',
    subcategories: [
      'Electricity / Water',
      'Airtime / Internet',
    ],
  },
];

