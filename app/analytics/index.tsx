import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Dimensions, Platform } from 'react-native';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';
import { monthSpend, todaySpend, categoryBreakdown } from '../../src/lib/db/transactions';
import { formatCurrency } from '../../src/utils/formatCurrency';

export default function AnalyticsPage() {
  const { themeMode, defaultCurrency } = useSettings();
  const t = theme(themeMode);
  const [monthTotal, setMonthTotal] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);
  const [categories, setCategories] = useState<Array<{ category: string; total: number }>>([]);
  const [largestPurchase, setLargestPurchase] = useState(0);
  const [avgDailySpend, setAvgDailySpend] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      (async () => {
        const month = await monthSpend();
        const today = await todaySpend();
        const breakdown = await categoryBreakdown();
        
        setMonthTotal(month);
        setTodayTotal(today);
        setCategories(breakdown);
        
        // Calculate average daily spend (simplified)
        const daysInMonth = new Date().getDate();
        setAvgDailySpend(month / daysInMonth);
        
        // Find largest purchase (simplified - using category totals)
        const largest = Math.max(...breakdown.map(c => c.total), 0);
        setLargestPurchase(largest);
      })();
    }
  }, []);

  const topCategory = categories.length > 0 ? categories[0] : null;
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32;

  // Calculate pie chart segments
  const total = categories.reduce((sum, cat) => sum + cat.total, 0);
  const chartData = categories.map(cat => ({
    ...cat,
    percentage: total > 0 ? (cat.total / total) * 100 : 0
  }));

  const colors = ['#C1A12F', '#84670B', '#B3B09E', '#6B6658', '#332D23', '#8B7355', '#A67C52', '#D4AF37'];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }}>
      <View style={{ padding: 16 }}>
        {/* Header */}
        <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 24 }}>Analytics</Text>

        {/* Insights Cards */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Insights</Text>
          
          {topCategory && (
            <View style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12
            }}>
              <Text style={{ color: t.accent, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>TOP CATEGORY</Text>
              <Text style={{ color: t.textPrimary, fontSize: 16 }}>
                Your highest spending category this month is <Text style={{ fontWeight: '700' }}>{topCategory.category}</Text>
              </Text>
            </View>
          )}

          <View style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12
          }}>
            <Text style={{ color: t.accent, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>DAILY AVERAGE</Text>
            <Text style={{ color: t.textPrimary, fontSize: 16 }}>
              You're spending an average of <Text style={{ fontWeight: '700' }}>{formatCurrency(avgDailySpend, defaultCurrency)}</Text> per day
            </Text>
          </View>
        </View>

        {/* Trends Cards */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Trends</Text>
          
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <View style={{
              flex: 1,
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              padding: 16
            }}>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 8 }}>Avg Daily Spend</Text>
              <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '800' }}>
                {formatCurrency(avgDailySpend, defaultCurrency)}
              </Text>
            </View>

            <View style={{
              flex: 1,
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              padding: 16
            }}>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 8 }}>Largest Purchase</Text>
              <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '800' }}>
                {formatCurrency(largestPurchase, defaultCurrency)}
              </Text>
            </View>
          </View>

          <View style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 16
          }}>
            <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 8 }}>Total This Month</Text>
            <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>
              {formatCurrency(monthTotal, defaultCurrency)}
            </Text>
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Category Breakdown</Text>
          
          {/* Simple Bar Chart */}
          <View style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 16
          }}>
            {chartData.map((item, index) => (
              <View key={item.category} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600' }}>{item.category}</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 14 }}>
                    {formatCurrency(item.total, defaultCurrency)} ({item.percentage.toFixed(0)}%)
                  </Text>
                </View>
                <View style={{
                  height: 8,
                  backgroundColor: t.background,
                  borderRadius: 4,
                  overflow: 'hidden'
                }}>
                  <View
                    style={{
                      height: '100%',
                      width: `${item.percentage}%`,
                      backgroundColor: colors[index % colors.length]
                    }}
                  />
                </View>
              </View>
            ))}

            {chartData.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ fontSize: 48, marginBottom: 8 }}>📊</Text>
                <Text style={{ color: t.textSecondary, fontSize: 14 }}>No data available yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Monthly Spending Chart Placeholder */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Monthly Spending</Text>
          
          <View style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 16,
            height: 200,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 48, marginBottom: 8 }}>📈</Text>
            <Text style={{ color: t.textSecondary, fontSize: 14, textAlign: 'center' }}>
              Chart visualization coming soon
            </Text>
            <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
              Daily spending trends will be displayed here
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
