import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { getById, deleteTransaction } from '../../src/lib/db/transactions';
import { Transaction } from '../../src/types/transaction';
import { formatDate } from '../../src/utils/date';
import { formatCurrency } from '../../src/utils/formatCurrency';

export default function TransactionDetail() {
  const { themeMode, defaultCurrency } = useSettings();
  const t = theme(themeMode);
  const { id } = useLocalSearchParams();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTransaction = useCallback(async () => {
    if (Platform.OS !== 'web' && id) {
      try {
        const txn = await getById(Number(id));
        setTransaction(txn);
      } catch (error) {
        Alert.alert('Error', 'Failed to load transaction');
      } finally {
        setLoading(false);
      }
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadTransaction();
    }, [loadTransaction])
  );

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(Number(id));
              Alert.alert('Success', 'Transaction deleted', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete transaction');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: t.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: t.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={{ flex: 1, backgroundColor: t.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: t.textSecondary }}>Transaction not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }}>
      <View style={{ padding: 16 }}>
        {/* Category Icon */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: t.card,
            borderWidth: 2,
            borderColor: t.border,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16
          }}>
            <Text style={{ fontSize: 48 }}>
              {transaction.type === 'income' ? '💰' : '💸'}
            </Text>
          </View>
          
          {/* Amount */}
          <Text style={{ color: t.accent, fontSize: 36, fontWeight: '800', marginBottom: 8 }}>
            {formatCurrency(transaction.amount, defaultCurrency)}
          </Text>
          
          <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '600' }}>
            {transaction.category || 'Uncategorized'}
          </Text>
        </View>

        {/* Details Card */}
        <View style={{
          backgroundColor: t.card,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: 12,
          padding: 16,
          marginBottom: 24
        }}>
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 4 }}>Date & Time</Text>
            <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>
              {formatDate(new Date(transaction.date).toISOString())}
            </Text>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 4 }}>Type</Text>
            <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600', textTransform: 'capitalize' }}>
              {transaction.type}
            </Text>
          </View>

          {transaction.notes && (
            <View>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 4 }}>Notes</Text>
              <Text style={{ color: t.textPrimary, fontSize: 16 }}>
                {transaction.notes}
              </Text>
            </View>
          )}
        </View>

        {/* Receipt Image */}
        {transaction.receipt_uri && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>Receipt</Text>
            <Image
              source={{ uri: transaction.receipt_uri }}
              style={{
                width: '100%',
                height: 300,
                borderRadius: 12,
                backgroundColor: t.card
              }}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Action Buttons */}
        <View style={{ gap: 12, marginBottom: 32 }}>
          <TouchableOpacity
            onPress={() => router.push(`/transactions/edit?id=${id}`)}
            style={{
              backgroundColor: t.accent,
              padding: 16,
              borderRadius: 12,
              alignItems: 'center'
            }}
          >
            <Text style={{ color: t.background, fontSize: 16, fontWeight: '700' }}>Edit Transaction</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            style={{
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderColor: t.expense,
              padding: 16,
              borderRadius: 12,
              alignItems: 'center'
            }}
          >
            <Text style={{ color: t.expense, fontSize: 16, fontWeight: '700' }}>Delete Transaction</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
