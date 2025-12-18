import { exec, execRun } from './index';
import { error as logError } from '../../utils/logger';

export type Category = {
  id?: number;
  name: string;
  type: 'income' | 'expense' | 'both';
  icon?: string;
  color?: string;
  is_preset?: number;
  created_at?: string;
  budget?: number | null;
  parent_category_id?: number | null;
};

export function createCategory(category: Category): number {
  try {
    const result = execRun(
      `INSERT INTO categories (name, type, icon, color, is_preset, budget, parent_category_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'));`,
      [
        category.name,
        category.type,
        category.icon ?? null,
        category.color ?? null,
        category.is_preset ?? 0,
        category.budget ?? null,
        category.parent_category_id ?? null,
      ]
    );
    
    return result.lastInsertRowId;
  } catch (err: any) {
    logError(`[DB] Failed to create category:`, err);
    throw err; // Re-throw to allow UI to handle it
  }
}

export function updateCategory(id: number, category: Partial<Category>): void {
  const fields: string[] = [];
  const params: any[] = [];
  
  if (category.name !== undefined) { fields.push('name = ?'); params.push(category.name); }
  if (category.type !== undefined) { fields.push('type = ?'); params.push(category.type); }
  if (category.icon !== undefined) { fields.push('icon = ?'); params.push(category.icon); }
  if (category.color !== undefined) { fields.push('color = ?'); params.push(category.color); }
  if (category.budget !== undefined) { fields.push('budget = ?'); params.push(category.budget); }
  if (category.parent_category_id !== undefined) { fields.push('parent_category_id = ?'); params.push(category.parent_category_id); }
  
  params.push(id);
  execRun(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?;`, params);
}

export function deleteCategory(id: number): void {
  execRun('DELETE FROM categories WHERE id = ?;', [id]);
}

export function getCategories(type?: 'income' | 'expense'): Category[] {
  if (type) {
    return exec<Category>('SELECT * FROM categories WHERE type = ? OR type = "both" ORDER BY is_preset DESC, name ASC;', [type]);
  } else {
    return exec<Category>('SELECT * FROM categories ORDER BY is_preset DESC, name ASC;');
  }
}

export function getCategoryById(id: number): Category | null {
  const results = exec<Category>('SELECT * FROM categories WHERE id = ?;', [id]);
  return results.length > 0 ? results[0] : null;
}

export function getCategoryByName(name: string, type?: 'income' | 'expense'): Category | null {
  if (type) {
    const results = exec<Category>(
      'SELECT * FROM categories WHERE LOWER(name) = LOWER(?) AND type = ?;',
      [name, type]
    );
    return results.length > 0 ? results[0] : null;
  }
  const results = exec<Category>(
    'SELECT * FROM categories WHERE LOWER(name) = LOWER(?);',
    [name]
  );
  return results.length > 0 ? results[0] : null;
}

/**
 * Get all subcategories for a given parent category
 */
export function getSubcategories(parentId: number): Category[] {
  return exec<Category>(
    'SELECT * FROM categories WHERE parent_category_id = ? ORDER BY name ASC;',
    [parentId]
  );
}

/**
 * Get all parent categories (categories with no parent)
 */
export function getParentCategories(type?: 'income' | 'expense'): Category[] {
  if (type) {
    return exec<Category>(
      'SELECT * FROM categories WHERE parent_category_id IS NULL AND (type = ? OR type = "both") ORDER BY is_preset DESC, name ASC;',
      [type]
    );
  } else {
    return exec<Category>(
      'SELECT * FROM categories WHERE parent_category_id IS NULL ORDER BY is_preset DESC, name ASC;'
    );
  }
}

/**
 * Get category with its subcategories
 */
export function getCategoryWithChildren(id: number): { category: Category | null; children: Category[] } {
  const category = getCategoryById(id);
  const children = category ? getSubcategories(id) : [];
  return { category, children };
}

/**
 * Get all categories organized hierarchically
 * Optimized: Single query instead of N+1 queries
 */
export function getCategoriesHierarchy(type?: 'income' | 'expense'): Array<{ category: Category; children: Category[] }> {
  // Get all parent categories with their children in one efficient query
  const parents = getParentCategories(type);
  
  // Get all children categories in a single query (not one per parent)
  let childrenQuery = 'SELECT * FROM categories WHERE parent_category_id IS NOT NULL';
  const params: any[] = [];
  
  if (type) {
    childrenQuery += ' AND (type = ? OR type = "both")';
    params.push(type);
  }
  
  childrenQuery += ' ORDER BY parent_category_id, is_preset DESC, name ASC;';
  
  const allChildren = exec<Category>(childrenQuery, params);
  
  // Group children by parent_id
  const childrenByParentId = new Map<number, Category[]>();
  for (const child of allChildren) {
    if (child.parent_category_id) {
      if (!childrenByParentId.has(child.parent_category_id)) {
        childrenByParentId.set(child.parent_category_id, []);
      }
      childrenByParentId.get(child.parent_category_id)!.push(child);
    }
  }
  
  // Build hierarchy
  const hierarchy = parents.map((parent) => ({
    category: parent,
    children: childrenByParentId.get(parent.id!) || [],
  }));
  
  return hierarchy;
}
