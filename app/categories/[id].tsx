import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, useColorScheme, ActivityIndicator } from 'react-native';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getCategories, Category } from '../../src/lib/db/categories';
import { CATEGORY_ICONS, CategoryIconName } from '../../src/assets/icons/CategoryIcons';
import { PlusIcon } from '../../src/assets/icons/PlusIcon';
import { EditIcon } from '../../src/assets/icons/EditIcon';
import { categoryBreakdown } from '../../src/lib/db/transactions';
import { formatCurrency } from '../../src/utils/formatCurrency';

// Helper function to determine if a string is an emoji
const isEmojiIcon = (iconValue: string): boolean => {
  if (!iconValue) return false;
  return /[\p{Emoji}]/u.test(iconValue);
};

// Helper function to render an icon (emoji or SVG)
const renderCategoryIcon = (
  iconValue: string | undefined,
  categoryName: string,
  categoryType: 'income' | 'expense' | 'both' | undefined,
  fontSize: number = 20,
  color: string = '#FFFFFF'
) => {
  const icon = iconValue || '';
  if (isEmojiIcon(icon)) {
    return <Text style={{ fontSize }}>{icon}</Text>;
  }

  const iconKey = (icon || categoryName) as CategoryIconName;
  const fallbackKey: CategoryIconName = (categoryType === 'income' ? 'moneyrecive' : 'moneysend') as CategoryIconName;
  const IconComp = CATEGORY_ICONS[iconKey] || CATEGORY_ICONS[fallbackKey];
  return IconComp ? <IconComp size={fontSize > 24 ? 24 : fontSize} color={color} /> : null;
};

export default function CategoryDetailPage() {
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categorySpending, setCategorySpending] = useState<Record<string, number>>({});

  useFocusEffect(
    React.useCallback(() => {
      loadCategoryData();
    }, [id])
  );

  const loadCategoryData = async () => {
    try {
      setLoading(true);
      const [allCategories, breakdown] = await Promise.all([
        getCategories(),
        categoryBreakdown()
      ]);
      
      // Find parent category
      const parent = allCategories.find(cat => cat.id?.toString() === id);
      if (!parent) {
        router.back();
        return;
      }
      
      // Find all subcategories
      const subs = allCategories.filter(cat => cat.parent_category_id === parent.id);
      
      setParentCategory(parent);
      setSubcategories(subs);
      
      // Map spending data
      const spendingMap: Record<string, number> = {};
      breakdown.forEach(item => {
        spendingMap[item.category] = item.total;
      });
      setCategorySpending(spendingMap);
    } catch (error) {
      console.error('Failed to load category data:', error);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (category: Category) => {
    router.push(`/categories/edit?id=${category.id}`);
  };

  const handleAddSubcategory = () => {
    if (parentCategory) {
      router.push(`/categories/create?parentId=${parentCategory.id}&type=${parentCategory.type}`);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: t.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  if (!parentCategory) {
    return null;
  }

  const renderSubcategoryItem = ({ item: category }: { item: Category }) => {
    const currentSpending = categorySpending[category.name] || 0;
    const budget = category.budget || 0;
    const hasBudget = budget > 0;
    const budgetPercentage = hasBudget ? Math.min((currentSpending / budget) * 100, 100) : 0;
    const isOverBudget = currentSpending > budget;
    
    return (
      <View style={{ marginBottom: 12 }}>
        <TouchableOpacity
          onPress={() => router.push(`/transactions/history?category=${category.name}`)}
          style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            ...shadows.sm
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: category.color || t.primary,
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {renderCategoryIcon(category.icon, category.name, category.type, 20, '#FFFFFF')}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '600' }}>{category.name}</Text>
              
              {hasBudget ? (
                <View style={{ marginTop: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: isOverBudget ? t.danger : t.textSecondary, fontSize: 11, fontWeight: '600' }}>
                      {formatCurrency(currentSpending, defaultCurrency)}
                    </Text>
                    <Text style={{ color: t.textSecondary, fontSize: 11 }}>
                      {formatCurrency(budget, defaultCurrency)}
                    </Text>
                  </View>
                  <View style={{
                    height: 6,
                    backgroundColor: t.border,
                    borderRadius: 3,
                    overflow: 'hidden'
                  }}>
                    <View style={{
                      height: '100%',
                      width: `${budgetPercentage}%`,
                      backgroundColor: isOverBudget ? t.danger : budgetPercentage > 80 ? '#FFA500' : t.success,
                      borderRadius: 3
                    }} />
                  </View>
                </View>
              ) : (
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>
                  Subcategory {category.is_preset ? '• Preset' : '• Custom'}
                </Text>
              )}
            </View>
          </View>
          
          {/* Edit Button */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleEditCategory(category);
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: t.background,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: t.border
            }}
          >
            <EditIcon size={18} color={t.textPrimary} />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    );
  };

  const parentSpending = categorySpending[parentCategory.name] || 0;
  const parentBudget = parentCategory.budget || 0;
  const hasBudget = parentBudget > 0;
  const budgetPercentage = hasBudget ? Math.min((parentSpending / parentBudget) * 100, 100) : 0;
  const isOverBudget = parentSpending > parentBudget;

  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      <FlatList
        data={subcategories}
        renderItem={renderSubcategoryItem}
        keyExtractor={item => (item.id?.toString() || item.name)}
        contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 100 }}
        ListHeaderComponent={() => (
          <View>
            {/* Back Button */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 32 }}
            >
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>← Back</Text>
            </TouchableOpacity>

            {/* Parent Category Card */}
            <View style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              ...shadows.sm
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                  <View style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: parentCategory.color || t.primary,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    {renderCategoryIcon(parentCategory.icon, parentCategory.name, parentCategory.type, 26, '#FFFFFF')}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '800' }}>{parentCategory.name}</Text>
                    <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 2 }}>
                      {parentCategory.type === 'income' ? 'Income' : 'Expense'} Category
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={handleAddSubcategory}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: t.primary,
                      justifyContent: 'center',
                      alignItems: 'center',
                      ...shadows.sm
                    }}
                  >
                    <PlusIcon size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleEditCategory(parentCategory)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: t.background,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: t.border
                    }}
                  >
                    <EditIcon size={20} color={t.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Budget Info */}
              {hasBudget && (
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: isOverBudget ? t.danger : t.textSecondary, fontSize: 12, fontWeight: '600' }}>
                      {formatCurrency(parentSpending, defaultCurrency)} spent
                    </Text>
                    <Text style={{ color: t.textSecondary, fontSize: 12 }}>
                      {formatCurrency(parentBudget, defaultCurrency)} budget
                    </Text>
                  </View>
                  <View style={{
                    height: 8,
                    backgroundColor: t.border,
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}>
                    <View style={{
                      height: '100%',
                      width: `${budgetPercentage}%`,
                      backgroundColor: isOverBudget ? t.danger : budgetPercentage > 80 ? '#FFA500' : t.success,
                      borderRadius: 4
                    }} />
                  </View>
                </View>
              )}
            </View>

            {/* Subcategories Header */}
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
              Subcategories ({subcategories.length})
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 48 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📂</Text>
            <Text style={{ color: t.textSecondary, fontSize: 16, marginBottom: 8 }}>No subcategories yet</Text>
            <TouchableOpacity
              onPress={handleAddSubcategory}
              style={{
                backgroundColor: t.primary,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
                marginTop: 8
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>+ Add Subcategory</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}
