import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, useColorScheme, Modal, LayoutChangeEvent, GestureResponderEvent, StyleSheet } from 'react-native';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as CategoryIcons from '../../src/assets/icons/CategoryIcons';
import { CATEGORY_ICONS, CategoryIconName } from '../../src/assets/icons/CategoryIcons';
import { createCategory, getCategories, Category } from '../../src/lib/db/categories';
import { invalidateCategoriesCache } from '../../src/lib/hooks/useCategoriesCache';
import { ThemedAlert } from '../../src/components/ThemedAlert';
import { EmojiPicker } from '../../src/components/EmojiPicker';
import { INCOME_TAXONOMY, EXPENSE_TAXONOMY } from '../../src/constants/categoryTaxonomy';
import { getRecommendedColors, type ColorOption } from '../../src/constants/categoryColors';

export default function CreateCategory() {
  const { themeMode } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');
  const params = useLocalSearchParams();
  
  // Get query params for pre-filling (e.g., when adding subcategory)
  const parentIdParam = params.parentId ? parseInt(String(params.parentId)) : null;
  const typeParam = (params.type as 'income' | 'expense') || 'expense';
  
  const [categoryName, setCategoryName] = useState('');
  const [iconType, setIconType] = useState<'emoji' | 'svg'>('svg');
  const [selectedSvg, setSelectedSvg] = useState<CategoryIconName>(typeParam === 'income' ? 'moneyrecive' : 'moneysend');
  const [selectedEmoji, setSelectedEmoji] = useState('💰');
  const [selectedColor, setSelectedColor] = useState('#66BB6A');
  const [customHex, setCustomHex] = useState('#66BB6A');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [categoryType, setCategoryType] = useState<'income' | 'expense'>(typeParam);
  const [colorOptions, setColorOptions] = useState<ColorOption[]>(getRecommendedColors(typeParam));
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [isSubcategory, setIsSubcategory] = useState(!!parentIdParam);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(parentIdParam);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: Array<{ text: string; onPress?: () => void }>;
  }>({ visible: false, title: '', message: '', buttons: [] });

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

  useEffect(() => {
    loadParentCategories();
    // Update color options when category type changes
    const recommendedColors = getRecommendedColors(categoryType);
    setColorOptions(recommendedColors);
    // Set first recommended color as default if current color isn't in the new list
    if (!recommendedColors.find(c => c.color === selectedColor)) {
      setSelectedColor(recommendedColors[0].color);
      setCustomHex(recommendedColors[0].color);
    }

    // Keep default money send/receive icons aligned with category type
    if (iconType === 'svg' && (selectedSvg === 'moneyrecive' || selectedSvg === 'moneysend')) {
      const fallbackIcon = categoryType === 'income' ? 'moneyrecive' : 'moneysend';
      if (selectedSvg !== fallbackIcon) {
        setSelectedSvg(fallbackIcon);
      }
    }
  }, [categoryType]);

  const loadParentCategories = async () => {
    try {
      const cats = await getCategories(categoryType);
      // Only show main categories (no parent_category_id)
      const mainCats = cats.filter(c => !c.parent_category_id);
      setParentCategories(mainCats);
    } catch (error) {
      console.error('Failed to load parent categories:', error);
    }
  };

  const handleSave = async () => {
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
      await createCategory({
        name: categoryName.trim(),
        type: categoryType,
        icon: iconType === 'emoji' ? selectedEmoji : selectedSvg,
        color: selectedColor,
        is_preset: 0,
        budget: budgetValue,
        parent_category_id: isSubcategory ? selectedParentId : null,
      });
      
      // Invalidate categories cache to ensure new category appears immediately
      invalidateCategoriesCache();
      
      setAlertConfig({
        visible: true,
        title: 'Success',
        message: 'Category created successfully',
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
          message: 'Failed to create category',
          buttons: [{ text: 'OK' }]
        });
      }
    }
  };

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
          <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 8 }}>Add New Category</Text>
          <Text style={{ color: t.textSecondary, fontSize: 14 }}>Create a {isSubcategory ? 'subcategory' : 'main category'}</Text>
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
                {parentCategories.map((cat) => (
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
                    <Text style={{ color: selectedParentId === cat.id ? '#FFFFFF' : t.textPrimary, fontSize: 14, fontWeight: '600' }}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4 }}>Subcategories inherit the type from their parent</Text>
          </View>
        )}

        {/* Category Name */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{isSubcategory ? 'Subcategory' : 'Category'} Name</Text>
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

        {/* Color Selector */}
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
          <View style={{ marginTop: 16 }}>
            <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Custom Color</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: selectedColor, borderWidth: 1, borderColor: t.border }} />
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: t.card,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: t.textPrimary,
                  fontSize: 14,
                }}
                placeholder="#RRGGBB"
                placeholderTextColor={t.textSecondary}
                value={customHex}
                autoCapitalize="characters"
                onChangeText={(val) => {
                  const normalized = val.startsWith('#') ? val : `#${val}`;
                  setCustomHex(normalized);
                  if (/^#([0-9a-fA-F]{6})$/.test(normalized)) {
                    setSelectedColor(normalized);
                  }
                }}
              />
              <TouchableOpacity
                onPress={() => setShowColorPicker(true)}
                style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: t.primary }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Wheel</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 6 }}>
              Use the color wheel or hex to pick any shade beyond the defaults.
            </Text>
          </View>
        </View>

        {/* Monthly Budget (Optional) */}
        <View style={{ marginBottom: 32 }}>
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
          <Text style={{ color: t.background, fontSize: 16, fontWeight: '700' }}>Save Category</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
      
      <ColorPickerModal
        visible={showColorPicker}
        initialColor={selectedColor}
        onClose={() => setShowColorPicker(false)}
        onSave={(color) => {
          setSelectedColor(color);
          setCustomHex(color);
          setShowColorPicker(false);
        }}
        colors={t}
      />

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


type ColorPickerModalProps = {
  visible: boolean;
  initialColor: string;
  onClose: () => void;
  onSave: (color: string) => void;
  colors: ReturnType<typeof theme>;
};

function ColorPickerModal({ visible, initialColor, onClose, onSave, colors }: ColorPickerModalProps) {
  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(1);
  const [val, setVal] = useState(1);
  const squareSize = useRef({ width: 0, height: 0 });
  const sliderWidth = useRef(1);

  useEffect(() => {
    const { h, s, v } = hexToHsv(initialColor);
    setHue(h);
    setSat(s);
    setVal(v);
  }, [initialColor]);

  const currentHex = hsvToHex(hue, sat, val);

  const handleSvTouch = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    const w = squareSize.current.width || 1;
    const h = squareSize.current.height || 1;
    const newSat = clamp(locationX / w, 0, 1);
    const newVal = clamp(1 - locationY / h, 0, 1);
    setSat(newSat);
    setVal(newVal);
  };

  const handleHueTouch = (e: GestureResponderEvent) => {
    const { locationX } = e.nativeEvent;
    const w = sliderWidth.current || 1;
    const newHue = clamp(locationX / w, 0, 1) * 360;
    setHue(newHue);
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>Color Wheel</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: currentHex, borderWidth: 1, borderColor: colors.border }} />
            <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{currentHex}</Text>
          </View>

          <View
            style={{ width: '100%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}
            onLayout={(e: LayoutChangeEvent) => {
              squareSize.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
            }}
            onStartShouldSetResponder={() => true}
            onResponderMove={handleSvTouch}
            onResponderGrant={handleSvTouch}
          >
            <LinearGradient
              colors={[hsvToHex(hue, 0, val), hsvToHex(hue, 1, val)]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1 }}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,1)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{ ...StyleSheet.absoluteFillObject }}
            />
          </View>

          <View
            style={{ height: 28, borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}
            onLayout={(e: LayoutChangeEvent) => {
              sliderWidth.current = e.nativeEvent.layout.width;
            }}
            onStartShouldSetResponder={() => true}
            onResponderMove={handleHueTouch}
            onResponderGrant={handleHueTouch}
          >
            <LinearGradient
              colors={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1 }}
            />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
            <TouchableOpacity onPress={onClose} style={{ paddingVertical: 10, paddingHorizontal: 14 }}>
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSave(currentHex)}
              style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.primary, borderRadius: 10 }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Use Color</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hsvToHex(h: number, s: number, v: number): string {
  const { r, g, b } = hsvToRgb(h, s, v);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function toHex(x: number) {
  const hex = Math.round(x * 255).toString(16).padStart(2, '0');
  return hex.toUpperCase();
}

function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h < 120) {
    r = x; g = c; b = 0;
  } else if (h < 180) {
    r = 0; g = c; b = x;
  } else if (h < 240) {
    r = 0; g = x; b = c;
  } else if (h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }
  return { r: r + m, g: g + m, b: b + m };
}

function hexToHsv(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function hexToRgb(hex: string) {
  const sanitized = hex.replace('#', '');
  const num = parseInt(sanitized, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return { r, g, b };
}
