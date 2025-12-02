import { Platform, Alert } from 'react-native';
import { Paths, File } from 'expo-file-system';

export interface AnalyticsReportData {
  generatedAt: string;
  period: string;
  summary: {
    totalIncome: number;
    totalExpense: number;
    netSavings: number;
    savingsRate: number;
  };
  categories: Array<{ category: string; total: number; percentage: number }>;
  insights: Array<{ type: string; title: string; message: string }>;
  financialHealth?: {
    score: number;
    rating: string;
  };
}

/**
 * Generates a formatted text report of analytics data
 */
export function generateTextReport(data: AnalyticsReportData): string {
  let report = `POCKETFLOW ANALYTICS REPORT\n`;
  report += `${'='.repeat(50)}\n\n`;
  
  report += `Generated: ${new Date(data.generatedAt).toLocaleString()}\n`;
  report += `Period: ${data.period}\n\n`;
  
  report += `SUMMARY\n`;
  report += `${'-'.repeat(50)}\n`;
  report += `Total Income:    ${data.summary.totalIncome.toFixed(2)}\n`;
  report += `Total Expense:   ${data.summary.totalExpense.toFixed(2)}\n`;
  report += `Net Savings:     ${data.summary.netSavings.toFixed(2)}\n`;
  report += `Savings Rate:    ${data.summary.savingsRate.toFixed(1)}%\n\n`;
  
  if (data.financialHealth) {
    report += `FINANCIAL HEALTH\n`;
    report += `${'-'.repeat(50)}\n`;
    report += `Score: ${data.financialHealth.score}/100 (${data.financialHealth.rating})\n\n`;
  }
  
  report += `SPENDING BY CATEGORY\n`;
  report += `${'-'.repeat(50)}\n`;
  data.categories.forEach((cat, index) => {
    report += `${index + 1}. ${cat.category.padEnd(30)} ${cat.total.toFixed(2).padStart(12)} (${cat.percentage.toFixed(1)}%)\n`;
  });
  report += `\n`;
  
  if (data.insights && data.insights.length > 0) {
    report += `KEY INSIGHTS\n`;
    report += `${'-'.repeat(50)}\n`;
    data.insights.forEach((insight, index) => {
      report += `${index + 1}. ${insight.title}\n`;
      report += `   ${insight.message}\n\n`;
    });
  }
  
  report += `${'-'.repeat(50)}\n`;
  report += `End of Report\n`;
  
  return report;
}

/**
 * Generates a CSV format report
 */
export function generateCSVReport(data: AnalyticsReportData): string {
  let csv = `PocketFlow Analytics Report\n`;
  csv += `Generated,${data.generatedAt}\n`;
  csv += `Period,${data.period}\n\n`;
  
  csv += `Summary\n`;
  csv += `Metric,Amount\n`;
  csv += `Total Income,${data.summary.totalIncome}\n`;
  csv += `Total Expense,${data.summary.totalExpense}\n`;
  csv += `Net Savings,${data.summary.netSavings}\n`;
  csv += `Savings Rate,${data.summary.savingsRate}%\n\n`;
  
  if (data.financialHealth) {
    csv += `Financial Health\n`;
    csv += `Score,${data.financialHealth.score}\n`;
    csv += `Rating,${data.financialHealth.rating}\n\n`;
  }
  
  csv += `Category Spending\n`;
  csv += `Category,Amount,Percentage\n`;
  data.categories.forEach(cat => {
    csv += `${cat.category},${cat.total},${cat.percentage}%\n`;
  });
  
  return csv;
}

/**
 * Exports analytics report to a file
 */
export async function exportAnalyticsReport(
  data: AnalyticsReportData,
  format: 'txt' | 'csv' = 'txt'
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    if (Platform.OS === 'web') {
      // For web, trigger download
      const content = format === 'csv' ? generateCSVReport(data) : generateTextReport(data);
      const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pocketflow_analytics_${Date.now()}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
      return { success: true };
    }

    // For mobile, save to file system using new API
    const content = format === 'csv' ? generateCSVReport(data) : generateTextReport(data);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `pocketflow_analytics_${timestamp}.${format}`;
    
    // Use the new File API - directories are created automatically
    try {
      const reportFile = new File(Paths.document, 'reports', fileName);
      await reportFile.create();
      await reportFile.write(content);
      
      Alert.alert(
        'Report Exported',
        `Your analytics report has been saved to:\n${fileName}`,
        [{ text: 'OK' }]
      );
      
      return { success: true, filePath: reportFile.uri };
    } catch (fileError) {
      // Fallback: try without subdirectory
      const fallbackFile = new File(Paths.document, fileName);
      await fallbackFile.create();
      await fallbackFile.write(content);
      
      Alert.alert(
        'Report Exported',
        `Your analytics report has been saved to:\n${fileName}`,
        [{ text: 'OK' }]
      );
      
      return { success: true, filePath: fallbackFile.uri };
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
