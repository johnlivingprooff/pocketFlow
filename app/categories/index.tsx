import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, useColorScheme } from 'react-native';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';
import { Link, router } from 'expo-router';
import { getCategories, Category } from '../../src/lib/db/categories';

export default function CategoriesPage() {
  const { themeMode } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }}>
      <View style={{ padding: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>Categories</Text>
          <Link href="/categories/create" asChild>
            <TouchableOpacity style={{ backgroundColor: t.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
              <Text style={{ color: t.background, fontWeight: '700' }}>+ New</Text>
            </TouchableOpacity>
          </Link>
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

        {/* Categories Grid */}
        <View style={{ gap: 12 }}>
          {filteredCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: category.color || t.primary,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Text style={{ fontSize: 24 }}>📊</Text>
                </View>
                <View>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>{category.name}</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {category.type === 'income' ? 'Income' : 'Expense'} {category.is_preset ? '• Preset' : '• Custom'}
                  </Text>
                </View>
              </View>
              <Text style={{ color: t.textSecondary, fontSize: 20 }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Empty State */}
        {filteredCategories.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 48 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🔍</Text>
            <Text style={{ color: t.textSecondary, fontSize: 16 }}>No categories found</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
