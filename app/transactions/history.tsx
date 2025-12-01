import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';
import { useTransactions } from '../../src/lib/hooks/useTransactions';
import { TransactionItem } from '../../src/components/TransactionItem';
import { Link } from 'expo-router';
import { formatDate } from '../../src/utils/date';
import { formatCurrency } from '../../src/utils/formatCurrency';

export default function HistoryScreen() {
  const { themeMode, defaultCurrency } = useSettings();
  const t = theme(themeMode);
  const { transactions } = useTransactions(0, 100);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Group transactions by date
  const groupedTransactions: Record<string, typeof transactions> = {};
  const filteredTransactions = transactions.filter(tx => {
    const matchesCategory = !filterCategory || tx.category === filterCategory;
    const matchesSearch = !searchQuery || 
      (tx.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       tx.notes?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  filteredTransactions.forEach(tx => {
    const date = formatDate(new Date(tx.date).toISOString());
    if (!groupedTransactions[date]) {
      groupedTransactions[date] = [];
    }
    groupedTransactions[date].push(tx);
  });

  // Calculate daily totals
  const dailyTotals: Record<string, number> = {};
  Object.keys(groupedTransactions).forEach(date => {
    dailyTotals[date] = groupedTransactions[date].reduce((sum, tx) => 
      sum + (tx.type === 'expense' ? tx.amount : 0), 0
    );
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }}>
      <View style={{ padding: 16 }}>
        {/* Header */}
        <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 16 }}>Transaction History</Text>

        {/* Filter Bar */}
        <View style={{ marginBottom: 24 }}>
          <TextInput
            style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 8,
              padding: 12,
              color: t.textPrimary,
              marginBottom: 12
            }}
            placeholder="Search transactions..."
            placeholderTextColor={t.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setFilterCategory('')}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: !filterCategory ? t.accent : t.card,
                  borderWidth: 1,
                  borderColor: !filterCategory ? t.accent : t.border
                }}
              >
                <Text style={{ color: !filterCategory ? t.background : t.textPrimary, fontWeight: '600' }}>All</Text>
              </TouchableOpacity>
              {['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment'].map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setFilterCategory(cat)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: filterCategory === cat ? t.accent : t.card,
                    borderWidth: 1,
                    borderColor: filterCategory === cat ? t.accent : t.border
                  }}
                >
                  <Text style={{ color: filterCategory === cat ? t.background : t.textPrimary, fontWeight: '600' }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Grouped Transactions */}
        {Object.keys(groupedTransactions).length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📝</Text>
            <Text style={{ color: t.textSecondary, fontSize: 16 }}>No transactions found</Text>
          </View>
        )}

        {Object.keys(groupedTransactions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(date => (
          <View key={date} style={{ marginBottom: 24 }}>
            {/* Date Header with Daily Total */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
              paddingBottom: 8,
              borderBottomWidth: 1,
              borderBottomColor: t.border
            }}>
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700' }}>{date}</Text>
              <Text style={{ color: t.accent, fontSize: 14, fontWeight: '700' }}>
                {formatCurrency(dailyTotals[date], defaultCurrency)}
              </Text>
            </View>

            {/* Transactions for this date */}
            <View style={{ gap: 8 }}>
              {groupedTransactions[date].map(tx => (
                <Link key={tx.id} href={`/transactions/${tx.id}`} asChild>
                  <TouchableOpacity style={{
                    backgroundColor: t.card,
                    borderWidth: 1,
                    borderColor: t.border,
                    borderRadius: 12,
                    padding: 12
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>
                          {tx.category || 'Uncategorized'}
                        </Text>
                        {tx.notes && (
                          <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                            {tx.notes}
                          </Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                        <Text style={{
                          color: tx.type === 'income' ? t.income : t.expense,
                          fontSize: 16,
                          fontWeight: '700'
                        }}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, defaultCurrency)}
                        </Text>
                        {tx.receipt_uri && (
                          <Text style={{ color: t.textSecondary, fontSize: 10, marginTop: 2 }}>📎 Receipt</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                </Link>
              ))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
