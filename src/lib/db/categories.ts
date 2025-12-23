import { exec, execRun } from './index';
import { error as logError, log } from '../../utils/logger';

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

export async function createCategory(category: Category): Promise<number> {
  const startTime = Date.now();
  try {
    const result = await execRun(
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
    
    const writeTime = Date.now() - startTime;
    log(`[DB] Category created in ${writeTime}ms, name: ${category.name}, type: ${category.type}, timestamp: ${new Date().toISOString()}`);
    
    return result.lastInsertRowId;
  } catch (err: any) {
    const writeTime = Date.now() - startTime;
    logError(`[DB] Failed to create category after ${writeTime}ms:`, err);
    throw err; // Re-throw to allow UI to handle it
  }
}

export async function updateCategory(id: number, category: Partial<Category>): Promise<void> {
  const fields: string[] = [];
  const params: any[] = [];
  
  if (category.name !== undefined) { fields.push('name = ?'); params.push(category.name); }
  if (category.type !== undefined) { fields.push('type = ?'); params.push(category.type); }
  if (category.icon !== undefined) { fields.push('icon = ?'); params.push(category.icon); }
  if (category.color !== undefined) { fields.push('color = ?'); params.push(category.color); }
  if (category.budget !== undefined) { fields.push('budget = ?'); params.push(category.budget); }
  if (category.parent_category_id !== undefined) { fields.push('parent_category_id = ?'); params.push(category.parent_category_id); }
  
  params.push(id);
  await execRun(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?;`, params);
}

export async function deleteCategory(id: number): Promise<void> {
  await execRun('DELETE FROM categories WHERE id = ?;', [id]);
}

export async function getCategories(type?: 'income' | 'expense'): Promise<Category[]> {
  const startTime = Date.now();
  let result: Category[];
  
  if (type) {
    result = await exec<Category>('SELECT * FROM categories WHERE type = ? OR type = "both" ORDER BY is_preset DESC, name ASC;', [type]);
  } else {
    result = await exec<Category>('SELECT * FROM categories ORDER BY is_preset DESC, name ASC;');
  }
  
  const duration = Date.now() - startTime;
  log(`[DB] getCategories (${type || 'all'}) took ${duration}ms, fetched ${result.length} categories`);
  
  return result;
}

export async function getCategoryById(id: number): Promise<Category | null> {
  const results = await exec<Category>('SELECT * FROM categories WHERE id = ?;', [id]);
  return results.length > 0 ? results[0] : null;
}

export async function getCategoryByName(name: string, type?: 'income' | 'expense'): Promise<Category | null> {
  if (type) {
    const results = await exec<Category>(
      'SELECT * FROM categories WHERE LOWER(name) = LOWER(?) AND type = ?;',
      [name, type]
    );
    return results.length > 0 ? results[0] : null;
  }
  const results = await exec<Category>(
    'SELECT * FROM categories WHERE LOWER(name) = LOWER(?);',
    [name]
  );
  return results.length > 0 ? results[0] : null;
}

/**
 * Get all subcategories for a given parent category
 */
export async function getSubcategories(parentId: number): Promise<Category[]> {
  return await exec<Category>(
    'SELECT * FROM categories WHERE parent_category_id = ? ORDER BY name ASC;',
    [parentId]
  );
}

/**
 * Get all parent categories (categories with no parent)
 */
export async function getParentCategories(type?: 'income' | 'expense'): Promise<Category[]> {
  const startTime = Date.now();
  let result: Category[];
  
  if (type) {
    result = await exec<Category>(
      'SELECT * FROM categories WHERE parent_category_id IS NULL AND (type = ? OR type = "both") ORDER BY is_preset DESC, name ASC;',
      [type]
    );
  } else {
    result = await exec<Category>(
      'SELECT * FROM categories WHERE parent_category_id IS NULL ORDER BY is_preset DESC, name ASC;'
    );
  }
  
  const duration = Date.now() - startTime;
  log(`[DB] getParentCategories (${type || 'all'}) took ${duration}ms, fetched ${result.length} parents`);
  
  return result;
}

/**
 * Get category with its subcategories
 */
export async function getCategoryWithChildren(id: number): Promise<{ category: Category | null; children: Category[] }> {
  const category = await getCategoryById(id);
  const children = category ? await getSubcategories(id) : [];
  return { category, children };
}

/**
 * Get all categories organized hierarchically
 * Optimized: Single query instead of N+1 queries
 */
export async function getCategoriesHierarchy(type?: 'income' | 'expense'): Promise<Array<{ category: Category; children: Category[] }>> {
  const startTime = Date.now();
  
  // Get all parent categories with their children in one efficient query
  const parentsStart = Date.now();
  const parents = await getParentCategories(type);
  const parentsDuration = Date.now() - parentsStart;
  log(`[DB] getParentCategories (${type || 'all'}) took ${parentsDuration}ms`);
  
  // Get all children categories in a single query (not one per parent)
  const childrenStart = Date.now();
  let childrenQuery = 'SELECT * FROM categories WHERE parent_category_id IS NOT NULL';
  const params: any[] = [];
  
  if (type) {
    childrenQuery += ' AND (type = ? OR type = "both")';
    params.push(type);
  }
  
  childrenQuery += ' ORDER BY parent_category_id, is_preset DESC, name ASC;';
  
  const allChildren = await exec<Category>(childrenQuery, params);
  const childrenDuration = Date.now() - childrenStart;
  log(`[DB] getChildren query (${type || 'all'}) took ${childrenDuration}ms, fetched ${allChildren.length} children`);
  
  // Group children by parent_id
  const groupStart = Date.now();
  const childrenByParentId = new Map<number, Category[]>();
  for (const child of allChildren) {
    if (child.parent_category_id) {
      if (!childrenByParentId.has(child.parent_category_id)) {
        childrenByParentId.set(child.parent_category_id, []);
      }
      childrenByParentId.get(child.parent_category_id)!.push(child);
    }
  }
  const groupDuration = Date.now() - groupStart;
  
  // Build hierarchy
  const hierarchy = parents.map((parent) => ({
    category: parent,
    children: childrenByParentId.get(parent.id!) || [],
  }));
  
  const totalDuration = Date.now() - startTime;
  log(`[DB] getCategoriesHierarchy (${type || 'all'}) total: ${totalDuration}ms (parents: ${parentsDuration}ms, children: ${childrenDuration}ms, group: ${groupDuration}ms)`);
  
  return hierarchy;
}
