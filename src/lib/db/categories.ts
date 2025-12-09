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
};

export async function createCategory(category: Category): Promise<number> {
  const startTime = Date.now();
  try {
    const result = await execRun(
      `INSERT INTO categories (name, type, icon, color, is_preset, budget, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'));`,
      [
        category.name,
        category.type,
        category.icon ?? null,
        category.color ?? null,
        category.is_preset ?? 0,
        category.budget ?? null,
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
  
  params.push(id);
  await execRun(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?;`, params);
}

export async function deleteCategory(id: number): Promise<void> {
  await execRun('DELETE FROM categories WHERE id = ?;', [id]);
}

export async function getCategories(type?: 'income' | 'expense'): Promise<Category[]> {
  if (type) {
    return exec<Category>('SELECT * FROM categories WHERE type = ? OR type = "both" ORDER BY is_preset DESC, name ASC;', [type]);
  }
  return exec<Category>('SELECT * FROM categories ORDER BY is_preset DESC, name ASC;');
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
