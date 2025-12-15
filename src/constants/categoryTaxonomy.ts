/**
 * Category Taxonomy - Universal Income and Expense Categories
 */

export interface CategoryDefinition {
  name: string;
  icon?: string;
  subcategories?: string[];
}

// ============================================================================
// INCOME CATEGORIES (10 categories, 2 subcategories each)
// ============================================================================

export const INCOME_TAXONOMY: CategoryDefinition[] = [
  {
    name: 'Salary/Wages',
    icon: 'salary',
    subcategories: [
      'Primary Job',
      'Overtime/Bonuses',
    ],
  },
  {
    name: 'Business Income',
    icon: 'business',
    subcategories: [
      'Sales Revenue',
      'Service Fees',
    ],
  },
  {
    name: 'Freelance/Gig Work',
    icon: 'Freelance',
    subcategories: [
      'Contract Projects',
      'One-off Tasks',
    ],
  },
  {
    name: 'Investments',
    icon: 'investment',
    subcategories: [
      'Dividends/Interest',
      'Capital Gains',
    ],
  },
  {
    name: 'Rental Income',
    icon: 'Property',
    subcategories: [
      'Residential Property',
      'Commercial Property',
    ],
  },
  {
    name: 'Agriculture/Farming',
    icon: 'Agriculture',
    subcategories: [
      'Crop Sales',
      'Livestock Sales',
    ],
  },
  {
    name: 'Online/Digital Income',
    icon: 'moneyrecive',
    subcategories: [
      'Content Creation',
      'Online Services',
    ],
  },
  {
    name: 'Gifts & Support Received',
    icon: 'gift',
    subcategories: [
      'Family Support',
      'Donations/Gifts',
    ],
  },
  {
    name: 'Refunds & Rebates',
    icon: 'moneyrecive',
    subcategories: [
      'Purchase Refunds',
      'Tax/Fee Rebates',
    ],
  },
  {
    name: 'Other Income',
    icon: 'moneyrecive',
    subcategories: [
      'Prizes/Winnings',
      'Miscellaneous Income',
    ],
  },
];

// ============================================================================
// EXPENSE CATEGORIES (10 categories, 2 subcategories each)
// ============================================================================

export const EXPENSE_TAXONOMY: CategoryDefinition[] = [
  {
    name: 'Housing',
    icon: 'Housing',
    subcategories: [
      'Rent/Mortgage',
      'Maintenance & Repairs',
    ],
  },
  {
    name: 'Food & Groceries',
    icon: 'Food & Groceries',
    subcategories: [
      'Home Groceries',
      'Eating Out',
    ],
  },
  {
    name: 'Transport',
    icon: 'Travel',
    subcategories: [
      'Fuel/Fares',
      'Maintenance',
    ],
  },
  {
    name: 'Utilities',
    icon: 'Utilities',
    subcategories: [
      'Electricity & Water',
      'Waste & Sanitation',
    ],
  },
  {
    name: 'Communication',
    icon: 'Communication',
    subcategories: [
      'Airtime & Data',
      'Internet Services',
    ],
  },
  {
    name: 'Health',
    icon: 'health',
    subcategories: [
      'Medical Visits',
      'Medication',
    ],
  },
  {
    name: 'Education',
    icon: 'education',
    subcategories: [
      'Tuition Fees',
      'Learning Materials',
    ],
  },
  {
    name: 'Personal & Lifestyle',
    icon: 'shopping',
    subcategories: [
      'Clothing & Personal Care',
      'Entertainment',
    ],
  },
  {
    name: 'Savings & Investments',
    icon: 'savings',
    subcategories: [
      'Short-term Savings',
      'Long-term Investments',
    ],
  },
  {
    name: 'Other Expenses',
    icon: 'moneysend',
    subcategories: [
      'Emergency Costs',
      'Miscellaneous Expenses',
    ],
  },
];

