import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { theme } from '../theme/theme';
import * as CategoryIcons from '../assets/icons/CategoryIcons';
import { Category } from '../lib/db/categories';

interface Props {
  categories: Category[];
  selectedCategory: string;
  onSelect: (category: string) => void;
  recentCategories?: string[]; // Most recently used categories
  type: 'income' | 'expense';
  themeMode?: 'light' | 'dark' | 'system';
}

export function QuickCategoryChips({ 
  categories, 
  selectedCategory, 
  onSelect, 
  recentCategories = [],
  type,
  themeMode = 'system'
}: Props) {
  const systemColorScheme = useColorScheme();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);

  // Get icon component for category
  const getIcon = (iconName?: string) => {
    if (!iconName) {
      return type === 'income' 
        ? (CategoryIcons as any).MoneyReciveIcon 
        : (CategoryIcons as any).MoneySendIcon;
    }
    return (CategoryIcons as any)[iconName] || (CategoryIcons as any)[iconName.split('/')[0].trim()];
  };

  // Prioritize recent categories, then show others
  const prioritizedCategories = React.useMemo(() => {
    const recent = recentCategories
      .map(name => categories.find(c => c.name === name))
      .filter((c): c is Category => c !== undefined);
    
    const others = categories.filter(c => !recentCategories.includes(c.name));
    return [...recent, ...others].slice(0, 8); // Limit to 8 total
  }, [categories, recentCategories]);

  if (categories.length === 0) return null;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ 
        color: t.textSecondary, 
        fontSize: 12, 
        fontWeight: '700', 
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5
      }}>
        Quick Select {recentCategories.length > 0 && '(Recently Used)'}
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {prioritizedCategories.map((cat) => {
          const isSelected = selectedCategory === cat.name;
          const Icon = getIcon(cat.icon);
          
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onSelect(cat.name)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: isSelected ? t.primary : t.card,
                borderWidth: 1,
                borderColor: isSelected ? t.primary : t.border,
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 8,
                minHeight: 36,
              }}
            >
              {Icon && <Icon width={16} height={16} color={isSelected ? '#fff' : t.textSecondary} />}
              <Text style={{
                color: isSelected ? '#fff' : t.textPrimary,
                fontSize: 13,
                fontWeight: isSelected ? '700' : '600',
              }}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
