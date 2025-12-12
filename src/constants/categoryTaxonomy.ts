/**
 * Comprehensive Category Taxonomy for Malawi Personal Finance
 * Based on local economic context and user needs
 */

export interface CategoryDefinition {
  name: string;
  icon?: string; // Icon name for SVG or emoji (optional for now)
  subcategories?: string[];
}

// ============================================================================
// INCOME CATEGORIES
// ============================================================================

export const INCOME_TAXONOMY: CategoryDefinition[] = [
  {
    name: 'Salary & Employment',
    icon: 'salary',
    subcategories: [
      'Full-time Employment',
      'Part-time Employment',
      'Contract Work',
      'Overtime Pay',
      'Bonuses & Incentives',
    ],
  },
  {
    name: 'Business & Self-Employment',
    icon: 'business',
    subcategories: [
      'Retail / Grocery (Kiosks, Hawkers)',
      'Barbershop / Salon',
      'Carpentry / Welding / Tailoring',
      'Motorbike Taxi ("Kabaza") Income',
      'Minibus Business',
      'Restaurant / Food Stand',
      'Farm Produce Trading',
      'Consulting',
      'Design & Creative Services',
      'Repairs & Maintenance Services',
      'Sole Proprietorship Revenue',
    ],
  },
  {
    name: 'Agriculture & Livestock',
    icon: 'agriculture',
    subcategories: [
      'Crop Sales (Maize, Tobacco, Groundnuts, Soya, etc.)',
      'Livestock Sales (Goats, Chickens, Cattle)',
      'Farm Produce Sales (Vegetables, Fruits)',
      'Agricultural Subsidy Payments',
      'Cooperative Dividends',
    ],
  },
  {
    name: 'Investments',
    icon: 'stock',
    subcategories: [
      'Malawi Stock Exchange (MSE) Dividends',
      'MSE Capital Gains',
      'Treasury Bills / Government Securities',
      'Fixed Deposits / Interest Income',
      'Forex Trading Profits',
      'Crypto Trading Profits',
      'Peer-to-Peer Lending Returns',
    ],
  },
  {
    name: 'Property & Assets',
    icon: 'home',
    subcategories: [
      'Rental Income (Houses, Rooms, Shops)',
      'Land Lease Income',
      'Equipment / Tool Hire Income',
    ],
  },
  {
    name: 'Transport Income',
    icon: 'kabaza',
    subcategories: [
      'Taxi / Ride Service',
      'Truck / Delivery Income',
      'Vehicle Hire',
    ],
  },
  {
    name: 'Digital Income',
    icon: 'internet',
    subcategories: [
      'Online Freelancing',
      'Content Creation (YouTube, TikTok, etc.)',
      'Affiliate Income',
      'App-based Microtasks',
    ],
  },
  {
    name: 'Transfers & Support',
    icon: 'gift',
    subcategories: [
      'Local Remittances',
      'International Remittances',
      'Gifts Received',
      'Family Support Received',
      'Donations Received',
    ],
  },
  {
    name: 'Miscellaneous Income',
    icon: 'other',
    subcategories: [
      'Refunds',
      'Lotto / Prize Wins',
      'Insurance Payouts (Non-health)',
      'One-off Items Sold',
    ],
  },
];

// ============================================================================
// EXPENSE CATEGORIES
// ============================================================================

export const EXPENSE_TAXONOMY: CategoryDefinition[] = [
  {
    name: 'Housing & Utilities',
    icon: 'home',
    subcategories: [
      'Rent',
      'Mortgage',
      'Electricity (ESCOM)',
      'Water',
      'Waste / Sanitation',
      'Repairs & Maintenance',
      'Security Services',
    ],
  },
  {
    name: 'Food & Groceries',
    icon: 'groceries',
    subcategories: [
      'Groceries (Home Use)',
      'Eating Out',
      'Market Purchases (Local Produce)',
      'Snacks & Beverages',
    ],
  },
  {
    name: 'Transport',
    icon: 'fuel',
    subcategories: [
      'Fuel',
      'Public Transport',
      'Kabaza Rides',
      'Vehicle Maintenance',
      'Insurance (Motor)',
      'Parking & Tolls',
    ],
  },
  {
    name: 'Communication',
    icon: 'phone',
    subcategories: [
      'Mobile Airtime',
      'Data Bundles',
      'WiFi / ISP Services',
      'Device Repairs',
    ],
  },
  {
    name: 'Health',
    icon: 'health',
    subcategories: [
      'Hospital Visits',
      'Medication',
      'Health Insurance',
      'Checkups & Diagnostics',
    ],
  },
  {
    name: 'Education',
    icon: 'school',
    subcategories: [
      'Tuition Fees',
      'School Supplies',
      'Books & Learning Materials',
      'Training Courses / Skills Development',
    ],
  },
  {
    name: 'Personal Care',
    icon: 'shopping',
    subcategories: [
      'Haircut / Salon',
      'Toiletries',
      'Cosmetics',
      'Clothing & Shoes',
    ],
  },
  {
    name: 'Family Obligations',
    icon: 'church',
    subcategories: [
      'Church Giving (Tithes, Offerings)',
      'Donations & Charitable Giving',
      'Family Support Sent',
      'Funeral Contributions',
      'Community Contributions',
    ],
  },
  {
    name: 'Financial Services',
    icon: 'bank',
    subcategories: [
      'Bank Fees',
      'Mobile Money Fees',
      'Loan Repayments',
      'SACCO / Cooperative Contributions',
    ],
  },
  {
    name: 'Business Expenses',
    icon: 'cart',
    subcategories: [
      'Inventory Purchases',
      'Rent for Business Premises',
      'Licenses & Permits',
      'Employee Wages',
      'Utilities (Business)',
      'Equipment Purchases',
      'Advertising & Marketing',
      'Transport (Business-related)',
    ],
  },
  {
    name: 'Agriculture Expenses',
    icon: 'agriculture',
    subcategories: [
      'Seeds & Inputs',
      'Fertilizers',
      'Pesticides',
      'Labour',
      'Livestock Feed',
      'Vet Services',
      'Farm Tools & Equipment',
    ],
  },
  {
    name: 'Investment Expenses',
    icon: 'percentage',
    subcategories: [
      'MSE Brokerage Fees',
      'Forex Trading Fees',
      'Crypto Platform Fees',
      'Advisory Fees',
    ],
  },
  {
    name: 'Entertainment & Leisure',
    icon: 'tv',
    subcategories: [
      'TV Subscriptions',
      'Events & Outings',
      'Hobbies',
      'Streaming Platforms',
    ],
  },
  {
    name: 'Household & Lifestyle',
    icon: 'home',
    subcategories: [
      'Cleaning Supplies',
      'Furniture',
      'Home Appliances',
      'Décor',
    ],
  },
  {
    name: 'Savings & Goals',
    icon: 'savings',
    subcategories: [
      'Emergency Fund',
      'Long-term Savings',
      'Short-term Savings',
      'Savings Group (Village Bank / Banki M\'tundu)',
    ],
  },
  {
    name: 'Miscellaneous',
    icon: 'other',
    subcategories: [
      'Unexpected Expenses',
      'Penalties & Fines',
      'Misc Purchases',
    ],
  },
];

/**
 * Get all categories (main + subcategories) as a flat list
 */
export function getAllCategoriesFlat(type: 'income' | 'expense'): string[] {
  const taxonomy = type === 'income' ? INCOME_TAXONOMY : EXPENSE_TAXONOMY;
  const categories: string[] = [];
  
  taxonomy.forEach(mainCat => {
    categories.push(mainCat.name);
    if (mainCat.subcategories) {
      mainCat.subcategories.forEach(subCat => {
        categories.push(subCat); // subCat is already a string
      });
    }
  });
  
  return categories;
}

/**
 * Get only main categories
 */
export function getMainCategories(type: 'income' | 'expense'): string[] {
  const taxonomy = type === 'income' ? INCOME_TAXONOMY : EXPENSE_TAXONOMY;
  return taxonomy.map(cat => cat.name);
}
