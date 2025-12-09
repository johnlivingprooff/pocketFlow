import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  useColorScheme,
  Modal,
  TextInput,
  FlatList,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { theme } from '../../src/theme/theme';
import { useSettings } from '../../src/store/useStore';
import { Category, getCategories, updateCategory } from '../../src/lib/db/categories';
import { CATEGORY_ICONS, CategoryIconName } from '../../src/assets/icons/CategoryIcons';
import { formatCurrency } from '../../src/utils/formatCurrency';

interface CategoryWithBudget extends Category {
  walletCurrency?: string;
}

// Helper function to determine if a string is an emoji
const isEmojiIcon = (iconValue: string): boolean => {
  if (!iconValue) return false;
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

export default function CategoriesScreen() {
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  const { themeMode, defaultCurrency } = useSettings();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);

  const [categories, setCategories] = useState<CategoryWithBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<CategoryWithBudget | null>(null);
  const [editBudget, setEditBudget] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(false);
      const allCategories = await getCategories();
      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBudget = (category: CategoryWithBudget) => {
    setEditingCategory(category);
    setEditBudget(category.budget?.toString() ?? '');
    setShowEditModal(true);
  };

  const handleSaveBudget = async () => {
    if (!editingCategory) return;

    try {
      const budgetValue = editBudget.trim() ? parseFloat(editBudget) : null;

      if (budgetValue !== null && (isNaN(budgetValue) || budgetValue < 0)) {
        Alert.alert('Invalid Input', 'Please enter a valid positive amount or leave blank for no budget');
        return;
      }

      await updateCategory(editingCategory.id!, { budget: budgetValue });
      setShowEditModal(false);
      setEditingCategory(null);
      setEditBudget('');
      loadCategories();

      Alert.alert(
        'Success',
        budgetValue === null
          ? 'Budget removed successfully'
          : `Budget set to ${formatCurrency(budgetValue, defaultCurrency)}`
      );
    } catch (error) {
      console.error('Error updating budget:', error);
      Alert.alert('Error', 'Failed to update budget');
    }
  };

  const handleRemoveBudget = async () => {
    if (!editingCategory) return;

    Alert.alert(
      'Remove Budget',
      `Remove budget limit from ${editingCategory.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateCategory(editingCategory.id!, { budget: null });
              setShowEditModal(false);
              setEditingCategory(null);
              setEditBudget('');
              loadCategories();
              Alert.alert('Success', 'Budget removed successfully');
            } catch (error) {
              console.error('Error removing budget:', error);
              Alert.alert('Error', 'Failed to remove budget');
            }
          },
        },
      ]
    );
  };

  const getFilteredCategories = useCallback(() => {
    if (filterType === 'all') {
      return categories;
    }
    return categories.filter(cat => cat.type === filterType || cat.type === 'both');
  }, [categories, filterType]);

  const groupCategoriesByType = (cats: CategoryWithBudget[]) => {
    const sections: { title: string; data: CategoryWithBudget[] }[] = [];

    if (filterType === 'all' || filterType === 'expense') {
      const expenses = cats.filter(c => c.type === 'expense' || c.type === 'both');
      if (expenses.length > 0) {
        sections.push({
          title: 'Expenses',
          data: expenses,
        });
      }
    }

    if (filterType === 'all' || filterType === 'income') {
      const incomes = cats.filter(c => c.type === 'income' || c.type === 'both');
      if (incomes.length > 0) {
        sections.push({
          title: 'Income',
          data: incomes,
        });
      }
    }

    return sections;
  };

  const filteredCategories = getFilteredCategories();
  const sections = groupCategoriesByType(filteredCategories);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['left', 'right', 'top']}>
      {/* Header */}
      <View style={{ backgroundColor: t.background, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ color: t.primary, fontSize: 16, fontWeight: '600' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color: t.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 16 }}>Budget & Goals</Text>

        {/* Filter Tabs */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['all', 'expense', 'income'].map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => setFilterType(type as 'all' | 'expense' | 'income')}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: filterType === type ? t.primary : t.card,
                borderWidth: 1,
                borderColor: filterType === type ? t.primary : t.border,
              }}
            >
              <Text
                style={{
                  color: filterType === type ? '#FFFFFF' : t.textPrimary,
                  fontSize: 12,
                  fontWeight: '600',
                  textTransform: 'capitalize',
                }}
              >
                {type === 'all' ? 'All' : type === 'expense' ? 'Expenses' : 'Income'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Categories List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: t.textSecondary }}>Loading categories...</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: t.textSecondary, fontSize: 14 }}>No categories found</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.id}`}
          renderItem={({ item: category }) => {
            return (
              <TouchableOpacity
                onPress={() => handleEditBudget(category)}
                style={{
                  backgroundColor: t.card,
                  marginHorizontal: 16,
                  marginBottom: 8,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: t.border,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: category.color || t.primary,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    {renderCategoryIcon(category.icon, category.name, 22, '#FFFFFF')}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>
                      {category.name}
                    </Text>
                    <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4 }}>
                      {category.budget ? (
                        `Budget: ${formatCurrency(category.budget, defaultCurrency)}`
                      ) : (
                        'No budget set'
                      )}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: t.textSecondary, fontSize: 20 }}>›</Text>
              </TouchableOpacity>
            );
          }}
          renderSectionHeader={({ section: { title } }) => (
            <View style={{ backgroundColor: t.background, paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>
                {title}
              </Text>
            </View>
          )}
          contentContainerStyle={{ paddingVertical: 12 }}
          scrollEnabled={true}
        />
      )}

      {/* Edit Budget Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowEditModal(false);
          setEditingCategory(null);
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: t.card, borderRadius: 12, borderWidth: 1, borderColor: t.border }}>
            {/* Header */}
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: editingCategory?.color || t.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  {editingCategory && renderCategoryIcon(editingCategory.icon, editingCategory.name, 28, '#FFFFFF')}
                </View>
                <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800', flex: 1 }}>
                  {editingCategory?.name}
                </Text>
              </View>
              <Text style={{ color: t.textSecondary, fontSize: 12 }}>
                {editingCategory?.is_preset ? '🎯 Preset category' : '✨ Custom category'}
              </Text>
            </View>

            {/* Input Section */}
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                MONTHLY BUDGET
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: t.textSecondary, fontSize: 16, fontWeight: '600' }}>
                  {defaultCurrency}
                </Text>
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: t.background,
                    borderRadius: 8,
                    padding: 12,
                    color: t.textPrimary,
                    fontSize: 16,
                    fontWeight: '600',
                    borderWidth: 1,
                    borderColor: t.border,
                  }}
                  placeholder="0.00"
                  placeholderTextColor={t.textSecondary}
                  keyboardType="decimal-pad"
                  value={editBudget}
                  onChangeText={setEditBudget}
                />
              </View>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 8 }}>
                Leave empty to remove budget limit
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={{ padding: 16, flexDirection: 'row', gap: 12 }}>
              {editingCategory?.budget && (
                <TouchableOpacity
                  onPress={handleRemoveBudget}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 8,
                    backgroundColor: 'rgba(255,59,48,0.1)',
                    borderWidth: 1,
                    borderColor: '#ff3b30',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#ff3b30', fontWeight: '700' }}>Remove</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  setShowEditModal(false);
                  setEditingCategory(null);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: t.background,
                  borderWidth: 1,
                  borderColor: t.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: t.textPrimary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveBudget}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: t.primary,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Category Floating Button */}
      <Link href="/categories/create" asChild>
        <TouchableOpacity
          accessibilityLabel="Add Category"
          style={{
            position: 'absolute',
            right: 20,
            bottom: 24,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: t.primary,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            elevation: 4,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '800' }}>＋</Text>
        </TouchableOpacity>
      </Link>
    </SafeAreaView>
  );
}
