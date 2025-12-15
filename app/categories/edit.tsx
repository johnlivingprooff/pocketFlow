import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, useColorScheme, ActivityIndicator } from 'react-native';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';
import { router, useLocalSearchParams } from 'expo-router';
import * as CategoryIcons from '../../src/assets/icons/CategoryIcons';
import { CATEGORY_ICONS, CategoryIconName } from '../../src/assets/icons/CategoryIcons';
import { updateCategory, getCategoryById, getCategories, Category } from '../../src/lib/db/categories';
import { ThemedAlert } from '../../src/components/ThemedAlert';
import { EmojiPicker } from '../../src/components/EmojiPicker';
import { INCOME_TAXONOMY, EXPENSE_TAXONOMY } from '../../src/constants/categoryTaxonomy';
import { getRecommendedColors, type ColorOption } from '../../src/constants/categoryColors';

// Helper to check if a string is an emoji
const isEmojiIcon = (iconValue: string): boolean => {
  if (!iconValue) return false;
  return /[\p{Emoji}]/u.test(iconValue);
};

const renderCategoryIcon = (
  iconValue: string | undefined,
  categoryType: 'income' | 'expense' | 'both' | undefined,
  size: number = 14,
  color: string = '#FFFFFF'
) => {
  const icon = iconValue || '';
  if (isEmojiIcon(icon)) {
    return <Text style={{ fontSize: size }}>{icon}</Text>;
  }

  const fallbackKey: CategoryIconName = (categoryType === 'income' ? 'moneyrecive' : 'moneysend') as CategoryIconName;
  const iconKey = (icon || fallbackKey) as CategoryIconName;
  const IconComp = CATEGORY_ICONS[iconKey] || CATEGORY_ICONS[fallbackKey];
  return IconComp ? <IconComp size={size} color={color} /> : null;
};

export default function EditCategory() {
  const { themeMode } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');
  const params = useLocalSearchParams();
  const categoryId = params.id ? parseInt(String(params.id)) : null;
  
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState('');
  const [iconType, setIconType] = useState<'emoji' | 'svg'>('emoji');
  const [selectedSvg, setSelectedSvg] = useState<CategoryIconName>('wallet');
  const [selectedEmoji, setSelectedEmoji] = useState('💰');
  const [selectedColor, setSelectedColor] = useState('#66BB6A');
  const [categoryType, setCategoryType] = useState<'income' | 'expense'>('expense');
  const [colorOptions, setColorOptions] = useState<ColorOption[]>(getRecommendedColors('expense'));
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [isSubcategory, setIsSubcategory] = useState(false);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: Array<{ text: string; onPress?: () => void }>;
  }>({ visible: false, title: '', message: '', buttons: [] });

  useEffect(() => {
    loadCategory();
  }, [categoryId]);

  useEffect(() => {
    if (!loading) {
      loadParentCategories();
      // Update color options when category type changes
      const recommendedColors = getRecommendedColors(categoryType);
      setColorOptions(recommendedColors);
    }
  }, [categoryType, loading]);

  const loadCategory = async () => {
    if (!categoryId) {
      router.back();
      return;
    }

    try {
      const cat = await getCategoryById(categoryId);
      if (!cat) {
        setAlertConfig({
          visible: true,
          title: 'Error',
          message: 'Category not found',
          buttons: [{ text: 'OK', onPress: () => router.back() }]
        });
        return;
      }

      setCategoryName(cat.name);
      setCategoryType(cat.type === 'both' ? 'expense' : cat.type);
      setSelectedColor(cat.color || '#C1A12F');
      setMonthlyBudget(cat.budget ? String(cat.budget) : '');
      setIsSubcategory(!!cat.parent_category_id);
      setSelectedParentId(cat.parent_category_id || null);

      // Set icon state
      if (cat.icon && isEmojiIcon(cat.icon)) {
        setIconType('emoji');
        setSelectedEmoji(cat.icon);
      } else if (cat.icon && Object.keys(CATEGORY_ICONS).includes(cat.icon)) {
        setIconType('svg');
        setSelectedSvg(cat.icon as CategoryIconName);
      } else {
        // Default fallback
        setIconType('emoji');
        setSelectedEmoji('💰');
      }

      // Initialize color options based on category type
      setColorOptions(getRecommendedColors(cat.type === 'both' ? 'expense' : cat.type));

      setLoading(false);
    } catch (error) {
      console.error('Failed to load category:', error);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Failed to load category',
        buttons: [{ text: 'OK', onPress: () => router.back() }]
      });
    }
  };

  const loadParentCategories = async () => {
    try {
      const cats = await getCategories(categoryType);
      // Only show main categories (no parent_category_id) and exclude current category
      const mainCats = cats.filter(c => !c.parent_category_id && c.id !== categoryId);
      setParentCategories(mainCats);
    } catch (error) {
      console.error('Failed to load parent categories:', error);
    }
  };

  const handleSave = async () => {
    if (!categoryId) return;

    if (!categoryName.trim()) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Please enter a category name',
        buttons: [{ text: 'OK' }]
      });
      return;
    }

    if (isSubcategory && !selectedParentId) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Please select a parent category',
        buttons: [{ text: 'OK' }]
      });
      return;
    }

    try {
      const budgetValue = monthlyBudget ? parseFloat(monthlyBudget) : null;
      const iconToSave = iconType === 'svg' ? selectedSvg : selectedEmoji;
      
      await updateCategory(categoryId, {
        name: categoryName.trim(),
        type: categoryType,
        icon: iconToSave,
        color: selectedColor,
        budget: budgetValue,
        parent_category_id: isSubcategory ? selectedParentId : null,
      });
      setAlertConfig({
        visible: true,
        title: 'Success',
        message: 'Category updated successfully',
        buttons: [{ text: 'OK', onPress: () => router.back() }]
      });
    } catch (error: any) {
      if (error?.message?.includes('UNIQUE constraint')) {
        setAlertConfig({
          visible: true,
          title: 'Error',
          message: `A ${categoryType} category with this name already exists`,
          buttons: [{ text: 'OK' }]
        });
      } else {
        setAlertConfig({
          visible: true,
          title: 'Error',
          message: 'Failed to update category',
          buttons: [{ text: 'OK' }]
        });
      }
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: t.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: t.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16, paddingTop: 20 }}>
        {/* Header */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 8 }}>Edit Category</Text>
          <Text style={{ color: t.textSecondary, fontSize: 14 }}>Update {isSubcategory ? 'subcategory' : 'category'} details</Text>
        </View>

        {/* Subcategory Toggle */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Category Level</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={() => {
                setIsSubcategory(false);
                setSelectedParentId(null);
              }}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 8,
                backgroundColor: !isSubcategory ? t.primary : t.card,
                borderWidth: 1,
                borderColor: !isSubcategory ? t.primary : t.border,
              }}
            >
              <Text style={{ color: !isSubcategory ? '#FFFFFF' : t.textPrimary, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>Main Category</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsSubcategory(true)}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 8,
                backgroundColor: isSubcategory ? t.primary : t.card,
                borderWidth: 1,
                borderColor: isSubcategory ? t.primary : t.border,
              }}
            >
              <Text style={{ color: isSubcategory ? '#FFFFFF' : t.textPrimary, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>Subcategory</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Type */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Type</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={() => setCategoryType('expense')}
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
              onPress={() => setCategoryType('income')}
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

        {/* Parent Category Selector (for subcategories) */}
        {isSubcategory && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Parent Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {parentCategories.map((cat) => {
                  const catIcon = cat.icon || '';
                  const isCatEmoji = isEmojiIcon(catIcon);
                  
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setSelectedParentId(cat.id!)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 8,
                        backgroundColor: selectedParentId === cat.id ? t.primary : t.card,
                        borderWidth: 1,
                        borderColor: selectedParentId === cat.id ? t.primary : t.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <View style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: cat.color || t.primary,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        {renderCategoryIcon(cat.icon, cat.type, 14, '#FFFFFF')}
                      </View>
                      <Text style={{ 
                        color: selectedParentId === cat.id ? '#FFFFFF' : t.textPrimary, 
                        fontSize: 14, 
                        fontWeight: '600' 
                      }}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Category Name */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Name *</Text>
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
            placeholder="Enter category name"
            placeholderTextColor={t.textSecondary}
            value={categoryName}
            onChangeText={setCategoryName}
          />
        </View>

        {/* Icon Selector */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 12 }}>Icon</Text>
          
          {/* Icon Type Toggle */}
          <View style={{ flexDirection: 'row', marginBottom: 16, backgroundColor: t.card, borderRadius: 8, padding: 4 }}>
            <TouchableOpacity
              onPress={() => setIconType('svg')}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 6,
                backgroundColor: iconType === 'svg' ? t.primary : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: iconType === 'svg' ? '#FFFFFF' : t.textPrimary, fontWeight: '600' }}>SVG Icons</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIconType('emoji')}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 6,
                backgroundColor: iconType === 'emoji' ? t.primary : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: iconType === 'emoji' ? '#FFFFFF' : t.textPrimary, fontWeight: '600' }}>Emoji</Text>
            </TouchableOpacity>
          </View>

          {iconType === 'emoji' ? (
            <EmojiPicker 
              selectedEmoji={selectedEmoji}
              onEmojiSelected={setSelectedEmoji}
              themeColors={{
                background: t.background,
                card: t.card,
                textPrimary: t.textPrimary,
                textSecondary: t.textSecondary,
                border: t.border,
                primary: t.primary,
                accent: t.accent,
              }}
            />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {Object.keys(CATEGORY_ICONS).map((iconKey) => {
                const IconComp = CATEGORY_ICONS[iconKey as CategoryIconName];
                const isSelected = selectedSvg === iconKey;
                return (
                  <TouchableOpacity
                    key={iconKey}
                    onPress={() => setSelectedSvg(iconKey as CategoryIconName)}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: isSelected ? t.primary : t.card,
                      borderWidth: 1,
                      borderColor: isSelected ? t.primary : t.border,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <IconComp size={24} color={isSelected ? '#FFFFFF' : t.textPrimary} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Color Selection */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Accent Color</Text>
          <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 12 }}>Colors chosen based on psychology for {categoryType} categories</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {colorOptions.map((colorOption) => (
              <TouchableOpacity
                key={colorOption.color}
                onPress={() => setSelectedColor(colorOption.color)}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: colorOption.color,
                  borderWidth: 3,
                  borderColor: selectedColor === colorOption.color ? t.textPrimary : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {selectedColor === colorOption.color && (
                  <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
          {colorOptions.find(c => c.color === selectedColor) && (
            <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>
              {colorOptions.find(c => c.color === selectedColor)!.label}: {colorOptions.find(c => c.color === selectedColor)!.description}
            </Text>
          )}
        </View>

        {/* Monthly Budget */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{categoryType === 'income' ? 'Monthly Target' : 'Monthly Budget'} (Optional)</Text>
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
            onChangeText={setMonthlyBudget}
          />
          <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4 }}>{categoryType === 'income' ? 'Set an income target for this category' : 'Set a spending limit for this category'}</Text>
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
              {iconType === 'emoji' ? (
                <Text style={{ fontSize: 24 }}>{selectedEmoji}</Text>
              ) : (
                (() => {
                  const IconComp = CATEGORY_ICONS[selectedSvg];
                  return <IconComp size={24} color="#FFFFFF" />;
                })()
              )}
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
          <Text style={{ color: t.background, fontSize: 16, fontWeight: '700' }}>Update Category</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
      
      <ThemedAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={() => setAlertConfig({ ...alertConfig, visible: false })}
        themeMode={themeMode}
        systemColorScheme={systemColorScheme || 'light'}
      />
    </KeyboardAvoidingView>
  );
}
