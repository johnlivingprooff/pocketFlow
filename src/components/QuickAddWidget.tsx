import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { theme } from '../theme/theme';
import { router } from 'expo-router';
import { Transaction } from '../types/transaction';
import { formatCurrency } from '../utils/formatCurrency';
import { formatShortDate } from '../utils/date';
import * as CategoryIcons from '../assets/icons/CategoryIcons';

interface QuickAddWidgetProps {
  recentTransactions: Transaction[];
  defaultCurrency: string;
  themeMode?: 'light' | 'dark' | 'system';
}

export function QuickAddWidget({ 
  recentTransactions, 
  defaultCurrency,
  themeMode = 'system'
}: QuickAddWidgetProps) {
  const systemColorScheme = useColorScheme();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);

  // Get last transaction for "repeat" feature
  const lastTransaction = recentTransactions[0];

  // Get unique categories from recent transactions (last 10)
  const recentCategories = React.useMemo(() => {
    const cats = recentTransactions
      .slice(0, 10)
      .map(t => ({ category: t.category, type: t.type }))
      .filter((v, i, a) => a.findIndex(t => t.category === v.category) === i)
      .slice(0, 4);
    return cats;
  }, [recentTransactions]);

  const handleQuickAdd = (type: 'expense' | 'income') => {
    router.push({ pathname: '/transactions/add', params: { type } });
  };

  const handleRepeatLast = () => {
    if (!lastTransaction) return;
    
    // Navigate to add screen with pre-filled params
    router.push({
      pathname: '/transactions/add',
      params: {
        type: lastTransaction.type,
        walletId: String(lastTransaction.wallet_id),
        category: lastTransaction.category,
        amount: String(Math.abs(lastTransaction.amount)),
      }
    });
  };

  const getIconForCategory = (category?: string, type?: string) => {
    if (!category) return null;
    // Try to match icon by category name
    const iconName = category.split('/')[0].trim();
    return (CategoryIcons as any)[iconName] || 
           (type === 'income' ? CategoryIcons.MoneyReciveIcon : CategoryIcons.MoneySendIcon);
  };

  return (
    <View style={{ marginBottom: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>Quick Add</Text>
        {lastTransaction && (
          <TouchableOpacity onPress={handleRepeatLast}>
            <Text style={{ color: t.accent, fontSize: 13, fontWeight: '700' }}>Repeat Last</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 12 }}>
        <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 12 }}>
          Fast paths for the most common entries.
        </Text>

        {/* One-tap expense/income buttons */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => handleQuickAdd('expense')}
            style={{
              flex: 1,
              backgroundColor: t.danger + '15',
              borderWidth: 1,
              borderColor: t.danger + '40',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <CategoryIcons.MoneySendIcon size={18} color={t.danger} />
            <Text style={{ color: t.danger, fontSize: 14, fontWeight: '800' }}>Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleQuickAdd('income')}
            style={{
              flex: 1,
              backgroundColor: t.success + '15',
              borderWidth: 1,
              borderColor: t.success + '40',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <CategoryIcons.MoneyReciveIcon size={18} color={t.success} />
            <Text style={{ color: t.success, fontSize: 14, fontWeight: '800' }}>Income</Text>
          </TouchableOpacity>
        </View>

        {/* Recent category shortcuts */}
        {recentCategories.length > 0 && (
          <>
            <Text style={{ color: t.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>
              Recent Categories
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {recentCategories.map((item, idx) => {
                const Icon = getIconForCategory(item.category, item.type);
                const isIncome = item.type === 'income';
                
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => router.push({
                      pathname: '/transactions/add',
                      params: { type: item.type, category: item.category }
                    })}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: t.background,
                      borderWidth: 1,
                      borderColor: t.border,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                    }}
                  >
                    {Icon && <Icon size={14} color={isIncome ? t.success : t.danger} />}
                    <Text style={{ color: t.textPrimary, fontSize: 12, fontWeight: '600' }}>
                      {item.category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: recentCategories.length > 0 ? 12 : 0 }}>
          <TouchableOpacity
            onPress={() => router.push('/transactions/history')}
            style={{
              flex: 1,
              backgroundColor: t.background,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: t.textPrimary, fontSize: 12, fontWeight: '700' }}>Open history</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push({ pathname: '/transactions/add', params: { type: 'transfer' } })}
            style={{
              flex: 1,
              backgroundColor: t.background,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: t.textPrimary, fontSize: 12, fontWeight: '700' }}>Transfer</Text>
          </TouchableOpacity>
        </View>

        {/* Last transaction quick repeat */}
        {lastTransaction && (
          <TouchableOpacity
            onPress={handleRepeatLast}
            style={{
              marginTop: 12,
              backgroundColor: t.background,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 10,
              padding: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.textSecondary, fontSize: 11 }}>Tap to repeat:</Text>
              <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700', marginTop: 2 }}>
                {lastTransaction.category || 'Transaction'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ 
                color: lastTransaction.type === 'income' ? t.success : t.danger,
                fontSize: 16,
                fontWeight: '800'
              }}>
                {formatCurrency(Math.abs(lastTransaction.amount), defaultCurrency)}
              </Text>
              <Text style={{ color: t.textTertiary, fontSize: 10, marginTop: 2 }}>
                {formatShortDate(lastTransaction.date)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
