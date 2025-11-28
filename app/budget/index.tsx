import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { monthSpend, categoryBreakdown } from '../../src/lib/db/transactions';
import { EXPENSE_CATEGORIES } from '../../src/constants/categories';

export default function BudgetPage() {
  const { themeMode, defaultCurrency } = useSettings();
  const t = theme(themeMode);
  const [monthlyBudget, setMonthlyBudget] = useState('5000');
  const [monthSpent, setMonthSpent] = useState(0);
  const [categorySpending, setCategorySpending] = useState<Record<string, number>>({});
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, string>>({});

  useEffect(() => {
    if (Platform.OS !== 'web') {
      (async () => {
        setMonthSpent(await monthSpend());
        const breakdown = await categoryBreakdown();
        const spendingMap: Record<string, number> = {};
        breakdown.forEach(item => {
          spendingMap[item.category] = item.total;
        });
        setCategorySpending(spendingMap);
      })();
    }
  }, []);

  const budgetAmount = parseFloat(monthlyBudget) || 0;
  const spentPercentage = budgetAmount > 0 ? (monthSpent / budgetAmount) * 100 : 0;
  const remaining = budgetAmount - monthSpent;

  const getCategoryBudget = (category: string) => parseFloat(categoryBudgets[category] || '0') || 0;
  const getCategorySpent = (category: string) => categorySpending[category] || 0;
  const getCategoryPercentage = (category: string) => {
    const budget = getCategoryBudget(category);
    return budget > 0 ? (getCategorySpent(category) / budget) * 100 : 0;
  };

  const alertCategories = EXPENSE_CATEGORIES.filter((cat: string) => getCategoryPercentage(cat) >= 80);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }}>
      <View style={{ padding: 16 }}>
        {/* Header */}
        <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 24 }}>Budget Management</Text>

        {/* Monthly Budget Card */}
        <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <Text style={{ color: t.textSecondary, fontSize: 14, marginBottom: 8 }}>Monthly Budget</Text>
          <TextInput
            style={{
              backgroundColor: t.background,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 8,
              padding: 12,
              color: t.textPrimary,
              fontSize: 24,
              fontWeight: '800',
              marginBottom: 16
            }}
            keyboardType="decimal-pad"
            value={monthlyBudget}
            onChangeText={setMonthlyBudget}
            placeholder="0.00"
            placeholderTextColor={t.textSecondary}
          />

          {/* Progress Bar */}
          <View style={{ marginBottom: 12 }}>
            <View style={{ height: 12, backgroundColor: t.background, borderRadius: 6, overflow: 'hidden' }}>
              <View
                style={{
                  height: '100%',
                  width: `${Math.min(spentPercentage, 100)}%`,
                  backgroundColor: spentPercentage >= 100 ? '#DC2626' : spentPercentage >= 80 ? '#F59E0B' : t.accent
                }}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: t.textSecondary, fontSize: 12 }}>Spent</Text>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700' }}>
                {formatCurrency(monthSpent, defaultCurrency)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: t.textSecondary, fontSize: 12 }}>Remaining</Text>
              <Text style={{ color: remaining >= 0 ? t.accent : '#DC2626', fontSize: 18, fontWeight: '700' }}>
                {formatCurrency(remaining, defaultCurrency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Alerts Section */}
        {alertCategories.length > 0 && (
          <View style={{ backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <Text style={{ color: '#92400E', fontSize: 16, fontWeight: '700', marginBottom: 8 }}>⚠️ Budget Alerts</Text>
            {alertCategories.map((cat: string) => (
              <Text key={cat} style={{ color: '#92400E', fontSize: 14, marginBottom: 4 }}>
                • {cat} is at {getCategoryPercentage(cat).toFixed(0)}%
              </Text>
            ))}
          </View>
        )}

        {/* Category Budgets */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Category Budgets</Text>
          
          {EXPENSE_CATEGORIES.map((category: string) => {
            const spent = getCategorySpent(category);
            const budget = getCategoryBudget(category);
            const percentage = getCategoryPercentage(category);

            return (
              <View key={category} style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600' }}>{category}</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12 }}>
                    {formatCurrency(spent, defaultCurrency)} / {budget > 0 ? formatCurrency(budget, defaultCurrency) : '—'}
                  </Text>
                </View>
                
                <TextInput
                  style={{
                    backgroundColor: t.card,
                    borderWidth: 1,
                    borderColor: t.border,
                    borderRadius: 8,
                    padding: 10,
                    color: t.textPrimary,
                    fontSize: 14,
                    marginBottom: 8
                  }}
                  keyboardType="decimal-pad"
                  value={categoryBudgets[category] || ''}
                  onChangeText={(text) => setCategoryBudgets({ ...categoryBudgets, [category]: text })}
                  placeholder="Set budget..."
                  placeholderTextColor={t.textSecondary}
                />

                {budget > 0 && (
                  <View style={{ height: 6, backgroundColor: t.background, borderRadius: 3, overflow: 'hidden' }}>
                    <View
                      style={{
                        height: '100%',
                        width: `${Math.min(percentage, 100)}%`,
                        backgroundColor: percentage >= 100 ? '#DC2626' : percentage >= 80 ? '#F59E0B' : t.accent
                      }}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={{
            backgroundColor: t.accent,
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 32
          }}
        >
          <Text style={{ color: t.background, fontSize: 16, fontWeight: '700' }}>Save Budget Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
