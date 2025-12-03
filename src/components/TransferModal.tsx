import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { theme } from '../theme/theme';
import { Wallet } from '../types/wallet';

interface TransferModalProps {
  visible: boolean;
  onClose: () => void;
  wallets: Wallet[];
  balances: Record<number, number>;
  onTransfer: (fromWalletId: number, toWalletId: number, amount: number, notes?: string) => Promise<void>;
  mode?: 'light' | 'dark';
}

export function TransferModal({ visible, onClose, wallets, balances, onTransfer, mode = 'light' }: TransferModalProps) {
  const t = theme(mode);
  const [fromWalletId, setFromWalletId] = useState<number | null>(null);
  const [toWalletId, setToWalletId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleTransfer = async () => {
    setError('');
    
    if (!fromWalletId || !toWalletId) {
      setError('Please select both wallets');
      return;
    }
    
    if (fromWalletId === toWalletId) {
      setError('Cannot transfer to the same wallet');
      return;
    }
    
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    const fromBalance = balances[fromWalletId] ?? 0;
    if (numAmount > fromBalance) {
      setError('Insufficient balance in source wallet');
      return;
    }

    setIsSubmitting(true);
    try {
      await onTransfer(fromWalletId, toWalletId, numAmount, notes.trim() || undefined);
      // Reset form
      setFromWalletId(null);
      setToWalletId(null);
      setAmount('');
      setNotes('');
      onClose();
    } catch (err) {
      setError('Transfer failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fromWallet = wallets.find(w => w.id === fromWalletId);
  const toWallet = wallets.find(w => w.id === toWalletId);
  
  // Check if currencies match
  const currenciesDiffer = fromWallet && toWallet && fromWallet.currency !== toWallet.currency;
  
  // Calculate converted amount if currencies differ
  const getConvertedAmount = () => {
    if (!fromWallet || !toWallet || !amount) return null;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return null;
    
    if (fromWallet.currency === toWallet.currency) {
      return numAmount;
    }
    
    // Convert: fromAmount * fromRate / toRate
    const fromRate = fromWallet.exchange_rate ?? 1.0;
    const toRate = toWallet.exchange_rate ?? 1.0;
    return numAmount * fromRate / toRate;
  };
  
  const convertedAmount = getConvertedAmount();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        <View style={{ backgroundColor: t.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' }}>
          <ScrollView
            contentContainerStyle={{ padding: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ color: t.textPrimary, fontSize: 22, fontWeight: '700' }}>Transfer Money</Text>
              <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
                <Text style={{ color: t.textSecondary, fontSize: 28, fontWeight: '300' }}>×</Text>
              </TouchableOpacity>
            </View>

            {/* From Wallet */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: t.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>FROM WALLET</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                {wallets.map(wallet => (
                  <TouchableOpacity
                    key={wallet.id}
                    onPress={() => setFromWalletId(wallet.id!)}
                    disabled={isSubmitting}
                    style={{
                      backgroundColor: fromWalletId === wallet.id ? t.primary : t.card,
                      borderWidth: 1,
                      borderColor: fromWalletId === wallet.id ? t.primary : t.border,
                      borderRadius: 12,
                      padding: 12,
                      marginHorizontal: 4,
                      minWidth: 140,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: wallet.color || t.accent, marginRight: 6 }} />
                      <Text style={{ color: fromWalletId === wallet.id ? '#FFFFFF' : t.textPrimary, fontSize: 14, fontWeight: '600' }}>
                        {wallet.name}
                      </Text>
                    </View>
                    <Text style={{ color: fromWalletId === wallet.id ? '#FFFFFF' : t.textSecondary, fontSize: 12 }}>
                      {wallet.currency} {(balances[wallet.id!] ?? 0).toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* To Wallet */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: t.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>TO WALLET</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                {wallets
                  .filter(w => w.id !== fromWalletId)
                  .map(wallet => (
                    <TouchableOpacity
                      key={wallet.id}
                      onPress={() => setToWalletId(wallet.id!)}
                      disabled={isSubmitting}
                      style={{
                        backgroundColor: toWalletId === wallet.id ? t.primary : t.card,
                        borderWidth: 1,
                        borderColor: toWalletId === wallet.id ? t.primary : t.border,
                        borderRadius: 12,
                        padding: 12,
                        marginHorizontal: 4,
                        minWidth: 140,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: wallet.color || t.accent, marginRight: 6 }} />
                        <Text style={{ color: toWalletId === wallet.id ? '#FFFFFF' : t.textPrimary, fontSize: 14, fontWeight: '600' }}>
                          {wallet.name}
                        </Text>
                      </View>
                      <Text style={{ color: toWalletId === wallet.id ? '#FFFFFF' : t.textSecondary, fontSize: 12 }}>
                        {wallet.currency} {(balances[wallet.id!] ?? 0).toFixed(2)}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>

            {/* Amount */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: t.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>AMOUNT</Text>
              <TextInput
                style={{
                  backgroundColor: t.card,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderRadius: 12,
                  padding: 14,
                  color: t.textPrimary,
                  fontSize: 16,
                }}
                placeholder="0.00"
                placeholderTextColor={t.textSecondary}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                editable={!isSubmitting}
              />
              {fromWallet && (
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 6 }}>
                  Available: {fromWallet.currency} {(balances[fromWalletId!] ?? 0).toFixed(2)}
                </Text>
              )}
            </View>

            {/* Notes (Optional) */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: t.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>NOTES (OPTIONAL)</Text>
              <TextInput
                style={{
                  backgroundColor: t.card,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderRadius: 12,
                  padding: 14,
                  color: t.textPrimary,
                  fontSize: 14,
                  minHeight: 80,
                  textAlignVertical: 'top',
                }}
                placeholder="Add a note about this transfer..."
                placeholderTextColor={t.textSecondary}
                multiline
                value={notes}
                onChangeText={setNotes}
                editable={!isSubmitting}
              />
            </View>

            {/* Error */}
            {error ? (
              <View style={{ backgroundColor: '#FEE', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <Text style={{ color: '#C00', fontSize: 13 }}>{error}</Text>
              </View>
            ) : null}

            {/* Transfer Summary */}
            {fromWallet && toWallet && amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
              <View style={{ backgroundColor: t.card, borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 6 }}>Transfer Summary:</Text>
                <Text style={{ color: t.textPrimary, fontSize: 14 }}>
                  {fromWallet.currency} {parseFloat(amount).toFixed(2)} from{' '}
                  <Text style={{ fontWeight: '600' }}>{fromWallet.name}</Text> to{' '}
                  <Text style={{ fontWeight: '600' }}>{toWallet.name}</Text>
                </Text>
                {currenciesDiffer && convertedAmount !== null && (
                  <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 6 }}>
                    Recipient receives: {toWallet.currency} {convertedAmount.toFixed(2)}
                  </Text>
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={onClose}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  backgroundColor: t.card,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderRadius: 12,
                  padding: 16,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleTransfer}
                disabled={isSubmitting || !fromWalletId || !toWalletId || !amount}
                style={{
                  flex: 1,
                  backgroundColor: (!fromWalletId || !toWalletId || !amount) ? t.border : t.primary,
                  borderRadius: 12,
                  padding: 16,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                  {isSubmitting ? 'Transferring...' : 'Transfer'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
