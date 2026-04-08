import * as FileSystem from 'expo-file-system/legacy';
import { ensureTables, getDbAsync } from '../db';
import { invalidateTransactionCaches, invalidateWalletCaches } from '../cache/queryCache';
import { enqueueWrite } from '../db/writeQueue';

type CsvExportFile = {
  date: Date;
  filename: string;
  uri: string;
};

type ParsedCsvTransaction = {
  amount: number;
  category: string | null;
  currency: string;
  date: string;
  notes?: string;
  type: 'expense' | 'income';
  walletName: string;
};

type TransactionExecutor = {
  executeAsync: (sql: string, params?: unknown[]) => Promise<unknown>;
};

const EXPORTS_DIR_NAME = 'exports';
const EXPORT_FILE_PREFIX = 'pocketFlow_transactions_';

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (character === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseUsDateToIso(dateText: string): string {
  const match = dateText.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    throw new Error(`Unsupported CSV date: ${dateText}`);
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);

  if (
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    throw new Error(`Invalid CSV date: ${dateText}`);
  }

  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
}

function parseExportedTransactionsCsv(content: string): ParsedCsvTransaction[] {
  const normalizedContent = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lines = normalizedContent.split('\n');
  const rows: ParsedCsvTransaction[] = [];
  let headerValidated = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.trim() === '') {
      continue;
    }

    if (line.trim() === '--- SUMMARY ---') {
      break;
    }

    const columns = parseCsvLine(line);
    if (!headerValidated) {
      const header = columns.join(',');
      if (header !== 'Date,Type,Amount,Category,Wallet,Currency,Notes') {
        throw new Error('Unsupported transaction CSV format');
      }
      headerValidated = true;
      continue;
    }

    if (columns.length < 7) {
      throw new Error(`Malformed CSV row: ${line}`);
    }

    const [dateText, typeText, amountText, categoryText, walletNameText, currencyText, notesText] = columns;
    const normalizedType = typeText.trim().toLowerCase();
    if (normalizedType !== 'income' && normalizedType !== 'expense') {
      throw new Error(`Unsupported transaction type in CSV: ${typeText}`);
    }

    const parsedAmount = Number(amountText);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      throw new Error(`Invalid transaction amount in CSV: ${amountText}`);
    }

    const walletName = walletNameText.trim();
    const currency = currencyText.trim();
    if (!walletName || !currency) {
      throw new Error('CSV transaction row is missing wallet metadata');
    }

    const normalizedCategory = categoryText.trim();
    rows.push({
      amount: parsedAmount,
      category:
        !normalizedCategory || normalizedCategory === 'Uncategorized'
          ? null
          : normalizedCategory,
      currency,
      date: parseUsDateToIso(dateText),
      notes: notesText ? notesText.replace(/\r/g, '').trim() || undefined : undefined,
      type: normalizedType,
      walletName,
    });
  }

  if (!headerValidated) {
    throw new Error('CSV header not found');
  }

  return rows;
}

export async function listTransactionCsvExports(): Promise<CsvExportFile[]> {
  try {
    const documentDir = FileSystem.documentDirectory;
    if (!documentDir) {
      throw new Error('Document directory not available');
    }

    const exportsDir = `${documentDir}${EXPORTS_DIR_NAME}`;
    const dirInfo = await FileSystem.getInfoAsync(exportsDir);
    if (!dirInfo.exists) {
      return [];
    }

    const files = await FileSystem.readDirectoryAsync(exportsDir);
    return files
      .filter((filename) => filename.startsWith(EXPORT_FILE_PREFIX) && filename.endsWith('.csv'))
      .map((filename) => {
        const match = filename.match(/pocketFlow_transactions_(\d+)\.csv/);
        const timestamp = match ? Number(match[1]) : 0;
        return {
          date: new Date(timestamp),
          filename,
          uri: `${exportsDir}/${filename}`,
        };
      })
      .sort((left, right) => right.date.getTime() - left.date.getTime());
  } catch (error) {
    console.error('Error listing transaction CSV exports:', error);
    return [];
  }
}

export async function restoreFromTransactionCsv(
  csvUri: string
): Promise<{
  error?: string;
  importedTransactions?: number;
  recreatedWallets?: number;
  success: boolean;
}> {
  try {
    const content = await FileSystem.readAsStringAsync(csvUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const parsedTransactions = parseExportedTransactionsCsv(content);

    if (parsedTransactions.length === 0) {
      throw new Error('The CSV file did not contain any transactions');
    }

    const walletIdByKey = new Map<string, number>();
    const walletRows: Array<{
      currency: string;
      id: number;
      name: string;
    }> = [];
    const categoryKeys = new Set<string>();
    let nextWalletId = 1;

    for (const transaction of parsedTransactions) {
      const walletKey = `${transaction.walletName}:::${transaction.currency}`;
      if (!walletIdByKey.has(walletKey)) {
        walletIdByKey.set(walletKey, nextWalletId);
        walletRows.push({
          currency: transaction.currency,
          id: nextWalletId,
          name: transaction.walletName,
        });
        nextWalletId += 1;
      }

      if (transaction.category && transaction.category !== 'Transfer') {
        categoryKeys.add(`${transaction.type}:::${transaction.category}`);
      }
    }

    await enqueueWrite(async () => {
      const database = await getDbAsync();
      const now = new Date().toISOString();

      await database.transaction(async (tx: TransactionExecutor) => {
        await tx.executeAsync('DELETE FROM transactions;');
        await tx.executeAsync('DELETE FROM budgets;');
        await tx.executeAsync('DELETE FROM goals;');
        await tx.executeAsync('DELETE FROM wallets;');
        await tx.executeAsync('DELETE FROM categories;');
        await tx.executeAsync(
          'DELETE FROM sqlite_sequence WHERE name IN ("transactions", "wallets", "categories", "goals", "budgets");'
        );

        for (const wallet of walletRows) {
          await tx.executeAsync(
            `INSERT INTO wallets (
              id, name, currency, initial_balance, type, color, description, created_at, is_primary, exchange_rate, display_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              wallet.id,
              wallet.name,
              wallet.currency,
              0,
              'Cash',
              null,
              null,
              now,
              wallet.id === 1 ? 1 : 0,
              1,
              wallet.id - 1,
            ]
          );
        }

        for (const categoryKey of categoryKeys) {
          const [type, name] = categoryKey.split(':::');
          await tx.executeAsync(
            `INSERT OR IGNORE INTO categories (name, type, icon, color, is_preset, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, type, null, null, 0, now]
          );
        }

        for (const transaction of parsedTransactions) {
          const walletId = walletIdByKey.get(`${transaction.walletName}:::${transaction.currency}`);
          if (walletId == null) {
            throw new Error(`Wallet mapping missing for ${transaction.walletName}`);
          }

          await tx.executeAsync(
            `INSERT INTO transactions (
              wallet_id, type, amount, category, date, notes, receipt_path, is_recurring, recurrence_frequency, recurrence_end_date, parent_transaction_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              walletId,
              transaction.type,
              transaction.type === 'expense' ? -Math.abs(transaction.amount) : Math.abs(transaction.amount),
              transaction.category,
              transaction.date,
              transaction.notes ?? null,
              null,
              0,
              null,
              null,
              null,
              now,
            ]
          );
        }
      });

      await ensureTables();
      invalidateTransactionCaches();
      invalidateWalletCaches();
    }, 'restore_transactions_csv');

    return {
      importedTransactions: parsedTransactions.length,
      recreatedWallets: walletRows.length,
      success: true,
    };
  } catch (error) {
    console.error('Error restoring transactions from CSV:', error);
    return {
      error:
        error instanceof Error
          ? `${error.message}. Existing data was left untouched.`
          : 'Failed to restore transactions from CSV. Existing data was left untouched.',
      success: false,
    };
  }
}
