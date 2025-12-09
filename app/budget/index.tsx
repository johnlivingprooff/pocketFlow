import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform, Modal } from 'react-native';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { monthSpend, categoryBreakdown } from '../../src/lib/db/transactions';
import { getCategories, updateCategory, Category } from '../../src/lib/db/categories';
import { CATEGORY_ICONS, CategoryIconName } from '../../src/assets/icons/CategoryIcons';

// Helper function to determine if a string is an emoji
const isEmojiIcon = (iconValue: string): boolean => {
  if (!iconValue) return false;
  // Check if the string contains emoji characters
  return /[\p{Emoji}]/u.test(iconValue);
};

// Helper function to render an icon (emoji or SVG)
const renderCategoryIcon = (
  iconValue: string | undefined,
  categoryName: string,
  fontSize: number = 20,
  color: string = '#FFFFFF'
) => {
  const icon = iconValue || '';
  
  if (isEmojiIcon(icon)) {
    return <Text style={{ fontSize }}>{icon}</Text>;
  } else {
    // Try to resolve SVG icon
    const iconKey = (icon || categoryName) as CategoryIconName;
    const IconComp = CATEGORY_ICONS[iconKey] || CATEGORY_ICONS['Other'];
    return IconComp ? <IconComp size={fontSize > 24 ? 24 : fontSize} color={color} /> : null;
  }
};

export default function BudgetPage() {
  const { themeMode, defaultCurrency } = useSettings();
  const t = theme(themeMode);
  const [monthlyBudget, setMonthlyBudget] = useState('5000');
  const [monthSpent, setMonthSpent] = useState(0);
  const [categorySpending, setCategorySpending] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<Category | null>(null);
  const [editBudgetValue, setEditBudgetValue] = useState('');
  const [showBudgetModal, setShowBudgetModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const cats = await getCategories('expense');
      setCategories(cats);
      
      // Initialize budget inputs from database
      const budgetMap: Record<number, string> = {};
      cats.forEach(cat => {
        if (cat.id && cat.budget) {
          budgetMap[cat.id] = cat.budget.toString();
        }
      });
      setCategoryBudgets(budgetMap);

      if (Platform.OS !== 'web') {
        setMonthSpent(await monthSpend());
        const breakdown = await categoryBreakdown();
        const spendingMap: Record<string, number> = {};
        breakdown.forEach(item => {
          spendingMap[item.category] = item.total;
        });
        setCategorySpending(spendingMap);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudgets = async () => {
    try {
      // Update each category with its new budget
      for (const category of categories) {
        if (category.id) {
          const budgetValue = parseFloat(categoryBudgets[category.id] || '0') || null;
          await updateCategory(category.id, { budget: budgetValue });
        }
      }
      // Reload data to reflect changes
      await loadData();
      console.log('Budgets saved successfully');
    } catch (error) {
      console.error('Failed to save budgets:', error);
    }
  };

  const openBudgetModal = (category: Category) => {
    setSelectedCategoryForEdit(category);
    setEditBudgetValue(categoryBudgets[category.id!] || '');
    setShowBudgetModal(true);
  };

  const closeBudgetModal = () => {
    setShowBudgetModal(false);
    setSelectedCategoryForEdit(null);
    setEditBudgetValue('');
  };

  const saveBudgetFromModal = () => {
    if (selectedCategoryForEdit?.id) {
      setCategoryBudgets({
        ...categoryBudgets,
        [selectedCategoryForEdit.id]: editBudgetValue
      });
    }
    closeBudgetModal();
  };

  const budgetAmount = parseFloat(monthlyBudget) || 0;
  const spentPercentage = budgetAmount > 0 ? (monthSpent / budgetAmount) * 100 : 0;
  const remaining = budgetAmount - monthSpent;

  const getCategoryBudget = (categoryId: number) => parseFloat(categoryBudgets[categoryId] || '0') || 0;
  const getCategorySpent = (categoryName: string) => categorySpending[categoryName] || 0;
  const getCategoryPercentage = (categoryId: number, categoryName: string) => {
    const budget = getCategoryBudget(categoryId);
    return budget > 0 ? (getCategorySpent(categoryName) / budget) * 100 : 0;
  };

  const alertCategories = categories.filter((cat) => {
    if (!cat.id) return false;
    return getCategoryPercentage(cat.id, cat.name) >= 80;
  });

  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      <ScrollView style={{ flex: 1 }}>
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
                  backgroundColor: spentPercentage >= 100 ? t.expense : spentPercentage >= 80 ? '#A08040' : t.accent
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
              <Text style={{ color: remaining >= 0 ? t.accent : t.expense, fontSize: 18, fontWeight: '700' }}>
                {formatCurrency(remaining, defaultCurrency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Alerts Section */}
        {alertCategories.length > 0 && (
          <View style={{ backgroundColor: '#E8DFC5', borderWidth: 1, borderColor: '#A08040', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <Text style={{ color: '#332D23', fontSize: 16, fontWeight: '700', marginBottom: 8 }}>⚠️ Budget Alerts</Text>
            {alertCategories.map((cat) => (
              cat.id && (
                <Text key={cat.id} style={{ color: '#332D23', fontSize: 14, marginBottom: 4 }}>
                  • {cat.name} is at {getCategoryPercentage(cat.id, cat.name).toFixed(0)}%
                </Text>
              )
            ))}
          </View>
        )}

        {/* Category Budgets */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Category Budgets</Text>
          
          {categories.map((category) => {
            if (!category.id) return null;
            const spent = getCategorySpent(category.name);
            const budget = getCategoryBudget(category.id);
            const percentage = getCategoryPercentage(category.id, category.name);

            return (
              <TouchableOpacity
                key={category.id}
                onPress={() => openBudgetModal(category)}
                style={{ marginBottom: 20 }}
              >
                {/* Category Header with Icon */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: category.color || t.primary,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    {renderCategoryIcon(category.icon, category.name, 20, '#FFFFFF')}
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600' }}>{category.name}</Text>
                    <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>
                      {formatCurrency(spent, defaultCurrency)} / {budget > 0 ? formatCurrency(budget, defaultCurrency) : '—'}
                    </Text>
                  </View>
                </View>

                {budget > 0 && (
                  <View style={{ height: 6, backgroundColor: t.background, borderRadius: 3, overflow: 'hidden' }}>
                    <View
                      style={{
                        height: '100%',
                        width: `${Math.min(percentage, 100)}%`,
                        backgroundColor: percentage >= 100 ? t.expense : percentage >= 80 ? '#A08040' : t.accent
                      }}
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSaveBudgets}
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

      {/* Budget Setting Modal */}
    {selectedCategoryForEdit && (
      <Modal
        visible={showBudgetModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeBudgetModal}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ 
            backgroundColor: t.background, 
            borderRadius: 16, 
            padding: 24, 
            width: '100%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 5
          }}>
            {/* Header with Icon */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <View style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: selectedCategoryForEdit.color || t.primary,
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                {renderCategoryIcon(selectedCategoryForEdit.icon, selectedCategoryForEdit.name, 28, '#FFFFFF')}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '700' }}>
                  {selectedCategoryForEdit.name}
                </Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4 }}>
                  Set monthly budget
                </Text>
              </View>
            </View>

            {/* Input */}
            <TextInput
              style={{
                backgroundColor: t.card,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 12,
                padding: 16,
                color: t.textPrimary,
                fontSize: 18,
                fontWeight: '600',
                marginBottom: 20
              }}
              keyboardType="decimal-pad"
              value={editBudgetValue}
              onChangeText={setEditBudgetValue}
              placeholder="0.00"
              placeholderTextColor={t.textSecondary}
            />

            {/* Spending Info */}
            <View style={{ 
              backgroundColor: t.card, 
              borderWidth: 1, 
              borderColor: t.border,
              borderRadius: 12, 
              padding: 12, 
              marginBottom: 20 
            }}>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 6 }}>Current Spending</Text>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700' }}>
                {formatCurrency(getCategorySpent(selectedCategoryForEdit.name), defaultCurrency)}
              </Text>
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={closeBudgetModal}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: t.card,
                  borderWidth: 1,
                  borderColor: t.border,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveBudgetFromModal}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: t.accent,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: t.background, fontSize: 16, fontWeight: '600' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      )}
    </View>
  );
}
