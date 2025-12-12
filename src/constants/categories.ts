/**
 * Legacy category constants - replaced by categoryTaxonomy.ts
 * Kept for backward compatibility
 */

import { INCOME_TAXONOMY, EXPENSE_TAXONOMY, getAllCategoriesFlat, getMainCategories } from './categoryTaxonomy';

export const EXPENSE_CATEGORIES = getMainCategories('expense');
export const INCOME_CATEGORIES = getMainCategories('income');
export const CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

// Export taxonomy for new implementations
export { INCOME_TAXONOMY, EXPENSE_TAXONOMY, getAllCategoriesFlat, getMainCategories };
