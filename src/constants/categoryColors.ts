/**
 * Category color options based on color psychology
 * 
 * These colors are scientifically chosen to match the psychological associations
 * of different spending and income categories.
 */

export interface ColorOption {
  color: string;
  label: string;
  description: string;
}

// Income category colors (Growth & Prosperity)
export const INCOME_COLORS: ColorOption[] = [
  { color: '#66BB6A', label: 'Green', description: 'Growth, money, abundance' },
  { color: '#43A047', label: 'Money Green', description: 'Income, earnings' },
  { color: '#4CAF50', label: 'Leaf Green', description: 'Nature, agriculture, resources' },
  { color: '#2E7D32', label: 'Deep Green', description: 'Business, profit' },
  { color: '#1B5E20', label: 'Dark Green', description: 'Long-term growth, investments' },
  { color: '#1976D2', label: 'Blue', description: 'Trust, stable inflow' },
  { color: '#1565C0', label: 'Deep Blue', description: 'Reliability, support' },
  { color: '#F9A825', label: 'Gold', description: 'Earned success, reward' },
  { color: '#FBC02D', label: 'Warm Yellow', description: 'Community, giving' },
];

// Expense category colors (Purpose-Driven)
export const EXPENSE_COLORS: ColorOption[] = [
  // Essential & Foundational
  { color: '#1A237E', label: 'Navy Blue', description: 'Housing, stability, foundation' },
  { color: '#0288D1', label: 'Sky Blue', description: 'Savings, future planning' },
  
  // Health & Wellness
  { color: '#00897B', label: 'Turquoise', description: 'Healthcare, wellness, movement' },
  
  // Learning & Growth
  { color: '#7B1FA2', label: 'Purple', description: 'Education, learning, growth' },
  { color: '#9C27B0', label: 'Violet', description: 'Entertainment, creativity' },
  
  // Nourishment & Comfort
  { color: '#FF6F00', label: 'Warm Orange', description: 'Food, nourishment' },
  { color: '#A1887F', label: 'Beige', description: 'Household, home comfort' },
  
  // Personal & Social
  { color: '#E91E63', label: 'Pink', description: 'Personal care, self-expression' },
  { color: '#F9A825', label: 'Warm Yellow', description: 'Social, community, warmth' },
  
  // Business & Operations
  { color: '#757575', label: 'Grey', description: 'Business, professional, neutral' },
  { color: '#616161', label: 'Dark Grey', description: 'Financial services, structure' },
  
  // Communication & Tech
  { color: '#00ACC1', label: 'Cyan', description: 'Communication, digital' },
  
  // Agriculture
  { color: '#4CAF50', label: 'Leaf Green', description: 'Agriculture, farming' },
  
  // Attention & Alerts
  { color: '#D32F2F', label: 'Red', description: 'Debt, loans, outflow' },
  
  // Flexible & Undefined
  { color: '#607D8B', label: 'Grey-Blue', description: 'Miscellaneous, flexible' },
];

// All colors combined for general use
export const ALL_CATEGORY_COLORS = Array.from(new Set([
  ...INCOME_COLORS.map(c => c.color),
  ...EXPENSE_COLORS.map(c => c.color)
]));

/**
 * Get recommended colors based on category type
 */
export function getRecommendedColors(type: 'income' | 'expense'): ColorOption[] {
  return type === 'income' ? INCOME_COLORS : EXPENSE_COLORS;
}

/**
 * Get color option details by color hex
 */
export function getColorInfo(color: string): ColorOption | undefined {
  return [...INCOME_COLORS, ...EXPENSE_COLORS].find(c => c.color === color);
}
