import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, useColorScheme, Modal } from 'react-native';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';
import { Link, router, useFocusEffect } from 'expo-router';
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

export default function CategoriesPage() {
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categorySpending, setCategorySpending] = useState<Record<string, number>>({});

  useFocusEffect(
    React.useCallback(() => {
      loadCategories();
    }, [])
  );

  const loadCategories = async () => {
    try {
      const [cats, breakdown] = await Promise.all([
        getCategories(),
        categoryBreakdown()
      ]);
      
      setCategories(cats);
      
      const spendingMap: Record<string, number> = {};
      breakdown.forEach(item => {
        spendingMap[item.category] = item.total;
      });
      setCategorySpending(spendingMap);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (category: Category) => {
    router.push(`/categories/edit?id=${category.id}`);
  };

  const handleAddSubcategory = (category: Category) => {
    router.push(`/categories/create?parentId=${category.id}&type=${category.type}`);
  };

  const filteredCategories = useMemo(() => {
    return categories
      .filter(cat => (typeFilter === 'all' ? true : cat.type === typeFilter))
      .filter(cat => cat.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [categories, typeFilter, searchQuery]);

  const renderItem = ({ item: category }: { item: Category }) => {
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
            alignItems: 'center'
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: category.color || t.primary,
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {renderCategoryIcon(category.icon, category.name, 22, '#FFFFFF')}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>{category.name}</Text>
              
              {hasBudget ? (
                <View style={{ marginTop: 6 }}>
                  {/* Budget Progress Bar */}
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
                  {category.type === 'income' ? 'Income' : 'Expense'} {category.is_preset ? '• Preset' : '• Custom'}
                  {category.parent_category_id && ' • Subcategory'}
                </Text>
              )}
            </View>
          </View>
          
          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {!category.parent_category_id && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleAddSubcategory(category);
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
                <PlusIcon size={20} color={t.textPrimary} />
              </TouchableOpacity>
            )}
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
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>Categories</Text>
        <Link href="/categories/create" asChild>
          <TouchableOpacity style={{ backgroundColor: t.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
            <Text style={{ color: t.background, fontWeight: '700' }}>+ New</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Type Filter Pills */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {([
          { key: 'all', label: 'All' },
          { key: 'income', label: 'Income' },
          { key: 'expense', label: 'Expense' }
        ] as const).map(({ key, label }) => {
          const selected = typeFilter === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setTypeFilter(key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: selected ? t.accent : t.card,
                borderWidth: 1,
                borderColor: selected ? t.accent : t.border
              }}
            >
              <Text style={{ color: selected ? t.background : t.textSecondary, fontWeight: '700' }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search Bar */}
      <TextInput
        style={{
          backgroundColor: t.card,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: 8,
          padding: 12,
          color: t.textPrimary,
          marginBottom: 24
        }}
        placeholder="Search categories..."
        placeholderTextColor={t.textSecondary}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      <FlatList
        data={filteredCategories}
        renderItem={renderItem}
        keyExtractor={item => (item.id?.toString() || item.name)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 48 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🔍</Text>
            <Text style={{ color: t.textSecondary, fontSize: 16 }}>No categories found</Text>
          </View>
        }
      />
    </View>
  );
}
