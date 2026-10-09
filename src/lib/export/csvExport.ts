import * as FileSystem from 'expo-file-system/legacy';
import { exec } from '../db';

interface TransactionWithWallet {
  id: number;
  date: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description?: string;
  walletName: string;
  walletCurrency: string;
  notes?: string;
}

/**
 * Exports all transactions to CSV format with comprehensive details
 */
export async function exportTransactionsToCSV(): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    // Fetch all transactions with wallet details
    const transactions = await exec<TransactionWithWallet>(
      `SELECT 
        t.id,
        t.date,
        t.type,
        t.amount,
        t.category,
        w.name as walletName,
        w.currency as walletCurrency,
        t.notes
       FROM transactions t
       JOIN wallets w ON t.wallet_id = w.id
       ORDER BY t.date DESC`
    );

    // Build CSV content with array+join (O(n)) instead of += in loop (O(n²)
    // string copying). Single pass also accumulates totals — previously
    // 2 extra filter+reduce scans. Identical output.
    const lines: string[] = ['Date,Type,Amount,Category,Wallet,Currency,Notes'];
    let totalIncome = 0;
    let totalExpense = 0;
    for (const transaction of transactions) {
      const date = new Date(transaction.date).toLocaleDateString('en-US');
      const type = transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
      const amount = Math.abs(transaction.amount).toFixed(2);
      const category = transaction.category || 'Uncategorized';
      const wallet = transaction.walletName;
      const currency = transaction.walletCurrency;
      const notes = transaction.notes ? `"${transaction.notes.replace(/"/g, '""')}"` : '';

      lines.push(`${date},${type},${amount},${category},${wallet},${currency},${notes}`);
      if (transaction.type === 'income') totalIncome += transaction.amount;
      else if (transaction.type === 'expense') totalExpense += transaction.amount;
    }
    totalExpense = Math.abs(totalExpense);

    // Add summary section
    lines.push('', '', '--- SUMMARY ---');
    lines.push(`Total Transactions,${transactions.length}`);

    lines.push(`Total Income,${totalIncome.toFixed(2)}`);
    lines.push(`Total Expense,${totalExpense.toFixed(2)}`);
    lines.push(`Net Savings,${(totalIncome - totalExpense).toFixed(2)}`);
    lines.push(`Exported Date,${new Date().toLocaleString()}`);
    const csv = lines.join('\n') + '\n';

    // Save to file
    const documentDir = FileSystem.documentDirectory;
    if (!documentDir) {
      throw new Error('Document directory not available');
    }

    const exportsDir = `${documentDir}exports`;
    try {
      await FileSystem.makeDirectoryAsync(exportsDir, { intermediates: true });
    } catch (e) {
      // Directory might already exist
    }

    const filename = `pocketFlow_transactions_${Date.now()}.csv`;
    const fileUri = `${exportsDir}/${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return { success: true, uri: fileUri };
  } catch (error) {
    console.error('Error exporting transactions to CSV:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to export CSV' };
  }
}

/**
 * Exports transactions for a specific date range to CSV
 */
export async function exportTransactionsByDateRangeToCSV(
  startDate: Date,
  endDate: Date
): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    const transactions = await exec<TransactionWithWallet>(
      `SELECT 
        t.id,
        t.date,
        t.type,
        t.amount,
        t.category,
        w.name as walletName,
        w.currency as walletCurrency,
        t.notes
       FROM transactions t
       JOIN wallets w ON t.wallet_id = w.id
       WHERE t.date >= ? AND t.date <= ?
       ORDER BY t.date DESC`,
      [startISO, endISO]
    );

    // Build CSV content (array+join, single-pass totals — see above)
    const lines: string[] = ['Date,Type,Amount,Category,Wallet,Currency,Notes'];
    let totalIncome = 0;
    let totalExpense = 0;

    for (const transaction of transactions) {
      const date = new Date(transaction.date).toLocaleDateString('en-US');
      const type = transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
      const amount = Math.abs(transaction.amount).toFixed(2);
      const category = transaction.category || 'Uncategorized';
      const wallet = transaction.walletName;
      const currency = transaction.walletCurrency;
      const notes = transaction.notes ? `"${transaction.notes.replace(/"/g, '""')}"` : '';

      lines.push(`${date},${type},${amount},${category},${wallet},${currency},${notes}`);
      if (transaction.type === 'income') totalIncome += transaction.amount;
      else if (transaction.type === 'expense') totalExpense += transaction.amount;
    }
    totalExpense = Math.abs(totalExpense);

    // Add summary section
    lines.push('', '', '--- SUMMARY ---');
    lines.push(`Total Transactions,${transactions.length}`);
    lines.push(`Period,"${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}"`);

    lines.push(`Total Income,${totalIncome.toFixed(2)}`);
    lines.push(`Total Expense,${totalExpense.toFixed(2)}`);
    lines.push(`Net Savings,${(totalIncome - totalExpense).toFixed(2)}`);
    lines.push(`Exported Date,${new Date().toLocaleString()}`);
    const csv = lines.join('\n') + '\n';

    // Save to file
    const documentDir = FileSystem.documentDirectory;
    if (!documentDir) {
      throw new Error('Document directory not available');
    }

    const exportsDir = `${documentDir}exports`;
    try {
      await FileSystem.makeDirectoryAsync(exportsDir, { intermediates: true });
    } catch (e) {
      // Directory might already exist
    }

    const filename = `pocketFlow_transactions_${Date.now()}.csv`;
    const fileUri = `${exportsDir}/${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return { success: true, uri: fileUri };
  } catch (error) {
    console.error('Error exporting transactions to CSV:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to export CSV' };
  }
}
