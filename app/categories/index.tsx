import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';
import { Link, router } from 'expo-router';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../src/constants/categories';

export default function CategoriesPage() {
  const { themeMode } = useSettings();
  const t = theme(themeMode);
  const [searchQuery, setSearchQuery] = useState('');

  const allCategories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  const filteredCategories = allCategories.filter(cat => 
    cat.toLowerCase().includes(searchQuery.toLowerCase())
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
          {filteredCategories.map((category, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => router.push(`/transactions/history?category=${category}`)}
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
                  backgroundColor: t.background,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Text style={{ fontSize: 24 }}>📊</Text>
                </View>
                <View>
                  <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>{category}</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Tap to view transactions</Text>
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
