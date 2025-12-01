import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';

interface CategoryDrillDownProps {
  visible: boolean;
  category: string | null;
  transactions: Array<{
    id: number;
    amount: number;
    date: string;
    notes?: string;
  }>;
  onClose: () => void;
  textColor: string;
  backgroundColor: string;
  cardColor: string;
  borderColor: string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}

export default function CategoryDrillDown({
  visible,
  category,
  transactions,
  onClose,
  textColor,
  backgroundColor,
  cardColor,
  borderColor,
  formatCurrency,
  formatDate,
}: CategoryDrillDownProps) {
  if (!category) return null;

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor }}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 20,
            borderBottomWidth: 1,
            borderBottomColor: borderColor,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: textColor, fontSize: 24, fontWeight: '800' }}>
                {category}
              </Text>
              <Text style={{ color: textColor, fontSize: 14, marginTop: 4, opacity: 0.7 }}>
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} • {formatCurrency(totalAmount)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: cardColor,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: textColor, fontSize: 20, fontWeight: '600' }}>×</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transactions List */}
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {transactions.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ color: textColor, fontSize: 16, opacity: 0.7 }}>
                No transactions found
              </Text>
            </View>
          ) : (
            transactions.map((transaction) => (
              <View
                key={transaction.id}
                style={{
                  backgroundColor: cardColor,
                  borderWidth: 1,
                  borderColor: borderColor,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: textColor, fontSize: 16, fontWeight: '700' }}>
                    {formatCurrency(transaction.amount)}
                  </Text>
                  <Text style={{ color: textColor, fontSize: 13, opacity: 0.7 }}>
                    {formatDate(transaction.date)}
                  </Text>
                </View>
                {transaction.notes && (
                  <Text style={{ color: textColor, fontSize: 14, opacity: 0.8 }}>
                    {transaction.notes}
                  </Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
