import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';
import { router } from 'expo-router';
import * as CategoryIcons from '../../src/assets/icons/CategoryIcons';
import { createCategory } from '../../src/lib/db/categories';
import { useUnsavedChanges } from '../../src/lib/hooks/useUnsavedChanges';

const ICON_OPTIONS: Array<{ name: CategoryIcons.CategoryIconName; Icon: React.FC<any> }> = [
  { name: 'Food', Icon: CategoryIcons.FoodIcon },
  { name: 'Transport', Icon: CategoryIcons.TransportIcon },
  { name: 'Rent', Icon: CategoryIcons.HomeIcon },
  { name: 'Groceries', Icon: CategoryIcons.GroceriesIcon },
  { name: 'Utilities', Icon: CategoryIcons.UtilitiesIcon },
  { name: 'Shopping', Icon: CategoryIcons.ShoppingIcon },
  { name: 'Healthcare', Icon: CategoryIcons.HealthcareIcon },
  { name: 'Entertainment', Icon: CategoryIcons.EntertainmentIcon },
  { name: 'Education', Icon: CategoryIcons.EducationIcon },
  { name: 'Bills', Icon: CategoryIcons.BillsIcon },
  { name: 'Salary', Icon: CategoryIcons.SalaryIcon },
  { name: 'Business', Icon: CategoryIcons.BusinessIcon },
  { name: 'Investment', Icon: CategoryIcons.InvestmentIcon },
  { name: 'Gift', Icon: CategoryIcons.GiftIcon },
  { name: 'Clothing', Icon: CategoryIcons.ClothingIcon },
  { name: 'Travel', Icon: CategoryIcons.TravelIcon },
];
const COLOR_OPTIONS = ['#6B6658', '#84670B', '#B3B09E', '#C1A12F', '#332D23', '#8B7355', '#A67C52', '#D4AF37'];

export default function CreateCategory() {
  const { themeMode } = useSettings();
  const t = theme(themeMode);
  const [categoryName, setCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<CategoryIcons.CategoryIconName>('Food');
  const [selectedColor, setSelectedColor] = useState('#C1A12F');
  const [categoryType, setCategoryType] = useState<'income' | 'expense'>('expense');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track unsaved changes
  const { promptBeforeLeaving } = useUnsavedChanges(hasUnsavedChanges);

  const handleSave = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      await createCategory({
        name: categoryName.trim(),
        type: categoryType,
        icon: selectedIcon,
        color: selectedColor,
        is_preset: 0,
      });
      Alert.alert('Success', 'Category created successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      if (error?.message?.includes('UNIQUE constraint')) {
        Alert.alert('Error', 'A category with this name already exists');
      } else {
        Alert.alert('Error', 'Failed to create category');
      }
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }}>
      <View style={{ padding: 16 }}>
        {/* Header */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 8 }}>Add New Category</Text>
          <Text style={{ color: t.textSecondary, fontSize: 14 }}>Create a custom spending category</Text>
        </View>

        {/* Category Type */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Type</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={() => { setCategoryType('expense'); setHasUnsavedChanges(true); }}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 8,
                backgroundColor: categoryType === 'expense' ? t.primary : t.card,
                borderWidth: 1,
                borderColor: categoryType === 'expense' ? t.primary : t.border,
              }}
            >
              <Text style={{ color: categoryType === 'expense' ? '#FFFFFF' : t.textPrimary, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setCategoryType('income'); setHasUnsavedChanges(true); }}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 8,
                backgroundColor: categoryType === 'income' ? t.primary : t.card,
                borderWidth: 1,
                borderColor: categoryType === 'income' ? t.primary : t.border,
              }}
            >
              <Text style={{ color: categoryType === 'income' ? '#FFFFFF' : t.textPrimary, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>Income</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Name */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Category Name</Text>
          <TextInput
            style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 8,
              padding: 12,
              color: t.textPrimary,
              fontSize: 16
            }}
            placeholder="e.g., Groceries, Entertainment"
            placeholderTextColor={t.textSecondary}
            value={categoryName}
            onChangeText={(text) => { setCategoryName(text); setHasUnsavedChanges(true); }}
          />
        </View>

        {/* Icon Selector */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 12 }}>Select Icon</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {ICON_OPTIONS.map((iconOption) => {
              const IconComponent = iconOption.Icon;
              const isSelected = selectedIcon === iconOption.name;
              return (
                <TouchableOpacity
                  key={iconOption.name}
                  onPress={() => { setSelectedIcon(iconOption.name); setHasUnsavedChanges(true); }}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: isSelected ? t.primary : t.card,
                    borderWidth: 2,
                    borderColor: isSelected ? t.primary : t.border,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <IconComponent size={28} color={isSelected ? '#FFFFFF' : t.textPrimary} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Color Selector */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 12 }}>Accent Color</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {COLOR_OPTIONS.map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => { setSelectedColor(color); setHasUnsavedChanges(true); }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: color,
                  borderWidth: 3,
                  borderColor: selectedColor === color ? t.textPrimary : 'transparent'
                }}
              />
            ))}
          </View>
        </View>

        {/* Monthly Budget (Optional) */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Monthly Budget (Optional)</Text>
          <TextInput
            style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 8,
              padding: 12,
              color: t.textPrimary,
              fontSize: 16
            }}
            placeholder="0.00"
            placeholderTextColor={t.textSecondary}
            keyboardType="decimal-pad"
            value={monthlyBudget}
            onChangeText={(text) => { setMonthlyBudget(text); setHasUnsavedChanges(true); }}
          />
          <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4 }}>Set a spending limit for this category</Text>
        </View>

        {/* Preview */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 12 }}>Preview</Text>
          <View style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12
          }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: selectedColor,
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Text style={{ fontSize: 24 }}>{selectedIcon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>
                {categoryName || 'Category Name'}
              </Text>
              {monthlyBudget && (
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>
                  Budget: {monthlyBudget}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          style={{
            backgroundColor: t.accent,
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 32
          }}
        >
          <Text style={{ color: t.background, fontSize: 16, fontWeight: '700' }}>Save Category</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
