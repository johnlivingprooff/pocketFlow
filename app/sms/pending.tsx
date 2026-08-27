import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { theme } from '@/theme/theme';
import { useSettings } from '@/store/useStore';
import { ThemedAlert } from '@/components/ThemedAlert';
import { useAlert } from '@/lib/hooks/useAlert';
import { formatCurrency } from '@/utils/formatCurrency';
import { getWallets } from '@/lib/db/wallets';
import { getParentCategories } from '@/lib/db/categories';
import type { Category } from '@/lib/db/categories';
import type { Wallet } from '@/types/wallet';
import {
  confirmPendingSms,
  getPendingSmsList,
  ignorePendingSms,
} from '@/lib/db/pendingTransactions';
import { invalidateTransactionCaches } from '@/lib/cache/queryCache';
import { refreshDerivedFinanceStateForWallets } from '@/lib/db/derivedState';
import { error as logError, log } from '@/utils/logger';
import type { PendingSmsTransaction, SmsProvider } from '@/types/smsTransaction';

const PROVIDER_LABELS: Record<SmsProvider, string> = {
  airtel_money: 'Airtel Money',
  tnm_mpamba: 'TNM Mpamba',
  bank: 'Bank',
};

function providerColor(provider: SmsProvider | null, t: ReturnType<typeof theme>): string {
  if (provider === 'airtel_money') return '#CC2B39';
  if (provider === 'tnm_mpamba') return '#00A8E8';
  return t.primary;
}

function formatDetectedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ConfirmDraft {
  pending: PendingSmsTransaction;
  walletId: number | null;
  type: 'income' | 'expense';
  amount: string;
  date: string;
  category: string | null;
  notes: string;
}

export default function PendingSmsScreen() {
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = useMemo(
    () => theme(themeMode, systemColorScheme || 'light'),
    [themeMode, systemColorScheme]
  );
  const { alertConfig, showErrorAlert, showSuccessAlert, showConfirmAlert, dismissAlert } =
    useAlert();

  const [pending, setPending] = useState<PendingSmsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [draft, setDraft] = useState<ConfirmDraft | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await getPendingSmsList('pending');
      setPending(list);
    } catch (err: unknown) {
      logError('[SmsPending] Failed to load pending list', { error: err });
      showErrorAlert('Load Failed', 'Could not load pending SMS entries.');
    } finally {
      setLoading(false);
    }
  }, [showErrorAlert]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    void getWallets()
      .then(setWallets)
      .catch((err: unknown) => logError('[SmsPending] Failed to load wallets', { error: err }));
  }, []);

  const openConfirm = async (entry: PendingSmsTransaction) => {
    if (wallets.length === 0) {
      const list = await getWallets();
      setWallets(list);
    }
    setDraft({
      pending: entry,
      walletId: entry.suggested_wallet_id ?? wallets[0]?.id ?? null,
      type: entry.type ?? 'expense',
      amount: entry.amount != null ? String(entry.amount) : '',
      date: entry.occurred_at ?? new Date().toISOString().slice(0, 10),
      category: null,
      notes: '',
    });
    const typeCategories = await getParentCategories(entry.type ?? 'expense').catch(() => []);
    setCategories(typeCategories);
  };

  const handleConfirm = async () => {
    if (!draft) return;
    if (draft.walletId == null) {
      showErrorAlert('Wallet Required', 'Choose a wallet before confirming.');
      return;
    }
    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showErrorAlert('Invalid Amount', 'Enter a valid amount greater than zero.');
      return;
    }

    setBusy(true);
    try {
      const transactionId = await confirmPendingSms(draft.pending.id as number, {
        walletId: draft.walletId,
        amount,
        type: draft.type,
        category: draft.category ?? undefined,
        date: draft.date,
        notes: draft.notes.trim() || undefined,
      });

      if (transactionId == null) {
        showErrorAlert('Confirm Failed', 'Could not create the transaction.');
        return;
      }

      invalidateTransactionCaches();
      refreshDerivedFinanceStateForWallets([draft.walletId]).catch((err: unknown) =>
        logError('[SmsPending] Derived state refresh failed', { error: err })
      );

      log('[SmsPending] Confirmed SMS entry as transaction', { id: transactionId });
      setDraft(null);
      await load();
      showSuccessAlert('Transaction Added', 'The SMS entry was added to your transactions.');
    } catch (err: unknown) {
      logError('[SmsPending] Confirm failed', { error: err });
      showErrorAlert('Confirm Failed', 'Could not confirm the entry. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleIgnore = (entry: PendingSmsTransaction) => {
    showConfirmAlert(
      'Ignore Entry',
      'This entry will be discarded and never become a transaction.',
      async () => {
        try {
          await ignorePendingSms(entry.id as number);
          await load();
        } catch (err: unknown) {
          logError('[SmsPending] Ignore failed', { error: err });
          showErrorAlert('Ignore Failed', 'Could not discard the entry.');
        }
      }
    );
  };

  const selectedWallet = wallets.find((wallet) => wallet.id === draft?.walletId);

  const renderEntry = ({ item }: { item: PendingSmsTransaction }) => {
    const color = providerColor(item.provider, t);
    const isIncome = item.type === 'income';
    return (
      <View style={StyleSheet.flatten([styles.entryCard, { backgroundColor: t.card, borderColor: t.border }]) as any}>
        <View style={styles.entryHeader}>
          <View
            style={StyleSheet.flatten([
              styles.directionBadge,
              {
                backgroundColor: isIncome ? `${t.success}18` : `${t.danger}18`,
              },
            ]) as any}
          >
            <Text style={{ color: isIncome ? t.success : t.danger, fontSize: 18, fontWeight: '800' }}>
              {isIncome ? '+' : '−'}
            </Text>
          </View>
          <View style={styles.entryHeaderText}>
            <View style={styles.entryTitleRow}>
              <Text style={StyleSheet.flatten([styles.entryAmount, { color: isIncome ? t.success : t.danger }]) as any}>
                {formatCurrency(item.amount ?? 0, selectedWallet?.currency ?? defaultCurrency)}
              </Text>
              {item.provider && (
                <View style={StyleSheet.flatten([styles.providerBadge, { backgroundColor: `${color}18`, borderColor: `${color}44` }]) as any}>
                  <Text style={StyleSheet.flatten([styles.providerBadgeText, { color }]) as any}>{PROVIDER_LABELS[item.provider]}</Text>
                </View>
              )}
            </View>
            <Text style={StyleSheet.flatten([styles.entryMeta, { color: t.textSecondary }]) as any}>
              {item.reference ? `Ref ${item.reference} · ` : ''}
              {item.occurred_at ?? formatDetectedAt(item.detected_at)}
            </Text>
          </View>
        </View>

        <Text style={StyleSheet.flatten([styles.entryBody, { color: t.textSecondary }]) as any} numberOfLines={3}>
          {item.body}
        </Text>

        <View style={styles.entryActions}>
          <TouchableOpacity
            onPress={() => void openConfirm(item)}
            style={StyleSheet.flatten([styles.confirmButton, { backgroundColor: t.primary }]) as any}
          >
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleIgnore(item)}
            style={StyleSheet.flatten([styles.ignoreButton, { borderColor: t.border }]) as any}
          >
            <Text style={StyleSheet.flatten([styles.ignoreButtonText, { color: t.textSecondary }]) as any}>Ignore</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={StyleSheet.flatten([styles.container, { backgroundColor: t.background }]) as any} edges={['left', 'right', 'top']}>
      {loading && pending.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={{ color: t.textSecondary }}>Loading...</Text>
        </View>
      ) : pending.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={StyleSheet.flatten([styles.emptyTitle, { color: t.textPrimary }]) as any}>Nothing to review</Text>
          <Text style={StyleSheet.flatten([styles.emptySubtitle, { color: t.textSecondary }]) as any}>
            Transaction SMS detected by pocketFlow will appear here for confirmation.
          </Text>
        </View>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEntry}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      {draft && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setDraft(null)}>
          <View style={styles.modalOverlay}>
            <View style={StyleSheet.flatten([styles.modalContainer, { backgroundColor: t.card, borderColor: t.border }]) as any}>
              <Text style={StyleSheet.flatten([styles.modalTitle, { color: t.textPrimary }]) as any}>Confirm Entry</Text>
              <Text style={StyleSheet.flatten([styles.modalSubtitle, { color: t.textSecondary }]) as any} numberOfLines={2}>
                {draft.pending.body}
              </Text>

              <Text style={StyleSheet.flatten([styles.fieldLabel, { color: t.textSecondary }]) as any}>Wallet</Text>
              <View style={styles.chipRow}>
                {wallets.length === 0 ? (
                  <Text style={{ color: t.danger, fontSize: 12 }}>
                    No wallets found — create one first.
                  </Text>
                ) : (
                  wallets.map((wallet) => {
                    const selected = wallet.id === draft.walletId;
                    return (
                      <TouchableOpacity
                        key={wallet.id}
                        onPress={() => setDraft({ ...draft, walletId: wallet.id ?? null })}
                        style={StyleSheet.flatten([
                          styles.chip,
                          { borderColor: selected ? t.primary : t.border },
                          selected && { backgroundColor: `${t.primary}14` },
                        ]) as any}
                      >
                        <Text style={{ color: selected ? t.primary : t.textPrimary, fontWeight: selected ? '700' : '500' }}>
                          {wallet.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              <Text style={StyleSheet.flatten([styles.fieldLabel, { color: t.textSecondary }]) as any}>Type</Text>
              <View style={styles.chipRow}>
                {(['income', 'expense'] as const).map((type) => {
                  const selected = draft.type === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => {
                        setDraft({ ...draft, type });
                        void getParentCategories(type)
                          .then(setCategories)
                          .catch(() => setCategories([]));
                      }}
                      style={StyleSheet.flatten([
                        styles.chip,
                        { borderColor: selected ? t.primary : t.border },
                        selected && { backgroundColor: `${t.primary}14` },
                      ]) as any}
                    >
                      <Text style={{ color: selected ? t.primary : t.textPrimary, fontWeight: selected ? '700' : '500' }}>
                        {type === 'income' ? 'Income' : 'Expense'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <Text style={StyleSheet.flatten([styles.fieldLabel, { color: t.textSecondary }]) as any}>Amount</Text>
                  <TextInput
                    value={draft.amount}
                    onChangeText={(amount) => setDraft({ ...draft, amount })}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={t.textTertiary}
                    style={StyleSheet.flatten([styles.textInput, { backgroundColor: t.background, borderColor: t.border, color: t.textPrimary }]) as any}
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={StyleSheet.flatten([styles.fieldLabel, { color: t.textSecondary }]) as any}>Date (YYYY-MM-DD)</Text>
                  <TextInput
                    value={draft.date}
                    onChangeText={(date) => setDraft({ ...draft, date })}
                    placeholder="2026-08-11"
                    placeholderTextColor={t.textTertiary}
                    autoCapitalize="none"
                    style={StyleSheet.flatten([styles.textInput, { backgroundColor: t.background, borderColor: t.border, color: t.textPrimary }]) as any}
                  />
                </View>
              </View>

              <Text style={StyleSheet.flatten([styles.fieldLabel, { color: t.textSecondary }]) as any}>Category</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryPicker(true)}
                style={StyleSheet.flatten([styles.textInput, { backgroundColor: t.background, borderColor: t.border, justifyContent: 'center' }]) as any}
              >
                <Text style={{ color: draft.category ? t.textPrimary : t.textTertiary }}>
                  {draft.category ?? 'Uncategorized'}
                </Text>
              </TouchableOpacity>

              <Text style={StyleSheet.flatten([styles.fieldLabel, { color: t.textSecondary }]) as any}>Notes (optional)</Text>
              <TextInput
                value={draft.notes}
                onChangeText={(notes) => setDraft({ ...draft, notes })}
                placeholder="e.g. Groceries at Shoprite"
                placeholderTextColor={t.textTertiary}
                style={StyleSheet.flatten([styles.textInput, { backgroundColor: t.background, borderColor: t.border, color: t.textPrimary }]) as any}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => setDraft(null)}
                  style={StyleSheet.flatten([styles.cancelButton, { borderColor: t.border }]) as any}
                  disabled={busy}
                >
                  <Text style={{ color: t.textSecondary, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void handleConfirm()}
                  style={StyleSheet.flatten([styles.saveButton, { backgroundColor: busy ? t.border : t.primary }]) as any}
                  disabled={busy}
                >
                  <Text style={styles.saveButtonText}>{busy ? 'Saving...' : 'Confirm'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {showCategoryPicker && draft && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowCategoryPicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={StyleSheet.flatten([styles.categoryModal, { backgroundColor: t.card, borderColor: t.border }]) as any}>
              <Text style={StyleSheet.flatten([styles.modalTitle, { color: t.textPrimary }]) as any}>Select Category</Text>
              <FlatList
                data={categories}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setDraft({ ...draft, category: item.name });
                      setShowCategoryPicker(false);
                    }}
                    style={StyleSheet.flatten([styles.categoryItem, { borderBottomColor: t.border }]) as any}
                  >
                    <Text style={{ color: t.textPrimary, fontWeight: '600' }}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                onPress={() => {
                  setDraft({ ...draft, category: null });
                  setShowCategoryPicker(false);
                }}
                style={StyleSheet.flatten([styles.cancelButton, { borderTopWidth: 1, borderTopColor: t.border }]) as any}
              >
                <Text style={{ color: t.textSecondary, fontWeight: '600' }}>No category</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      <ThemedAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={dismissAlert}
        themeMode={themeMode}
        systemColorScheme={systemColorScheme || 'light'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  entryCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  entryHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  directionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryHeaderText: {
    flex: 1,
    gap: 2,
  },
  entryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  entryAmount: {
    fontSize: 17,
    fontWeight: '800',
  },
  providerBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  providerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  entryMeta: {
    fontSize: 11,
  },
  entryBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  entryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  ignoreButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ignoreButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 10,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldHalf: {
    flex: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButton: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  categoryModal: {
    borderRadius: 20,
    borderWidth: 1,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  categoryItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
});
