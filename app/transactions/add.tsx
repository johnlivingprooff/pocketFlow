import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Platform, Modal, useColorScheme, KeyboardAvoidingView, Switch, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { addTransaction, transferBetweenWallets } from '../../src/lib/db/transactions';
import { CalendarModal } from '@/components/CalendarModal';
import { formatShortDate } from '../../src/utils/date';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { saveReceiptImage } from '../../src/lib/services/fileService';
import { Category } from '../../src/lib/db/categories';
import { useCategoriesHierarchy } from '../../src/lib/hooks/useCategoriesCache';
import * as CategoryIcons from '../../src/assets/icons/CategoryIcons';
import { useWallets } from '../../src/lib/hooks/useWallets';
import { RecurrenceFrequency } from '../../src/types/transaction';
import { Wallet } from '../../src/types/wallet';
import { ThemedAlert } from '../../src/components/ThemedAlert';
import { error as logError } from '../../src/utils/logger';

export default function AddTransactionScreen() {
  const router = useRouter();
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);
  const { wallets, balances } = useWallets();

  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [category, setCategory] = useState('');
  const [walletId, setWalletId] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [localUri, setLocalUri] = useState<string | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [categoryHierarchy, setCategoryHierarchy] = useState<Array<{ category: Category; children: Category[] }>>([]);
  const [toWalletId, setToWalletId] = useState<number | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('monthly');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(null);
  const [showRecurrenceEndDatePicker, setShowRecurrenceEndDatePicker] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: Array<{ text: string; onPress?: () => void }>;
  }>({ visible: false, title: '', message: '', buttons: [] });
  const [isSaving, setIsSaving] = useState(false);

  const displayCurrency = useMemo(() => {
    const selected = wallets.find((w) => w.id === walletId);
    return selected?.currency || defaultCurrency || 'MWK';
  }, [walletId, wallets, defaultCurrency]);

  const { loadCategoriesHierarchy } = useCategoriesHierarchy(type === 'transfer' ? undefined : (type as 'income' | 'expense'));

  useEffect(() => {
    if (wallets.length > 0 && !walletId) {
      setWalletId(wallets[0].id!);
    }
  }, [wallets, walletId]);

  useEffect(() => {
    if (type === 'transfer') {
      setCategory('');
      setIsRecurring(false);
      setRecurrenceEndDate(null);
      setRecurrenceFrequency('monthly');
      const firstOther = wallets.find((w) => w.id !== walletId);
      setToWalletId(firstOther ? firstOther.id! : null);
      return;
    }
    loadCategories(type);
  }, [type, walletId, wallets]);

  const loadCategories = async (selectedType: 'income' | 'expense') => {
    try {
      const hierarchy = await loadCategoriesHierarchy();
      setCategoryHierarchy(hierarchy);

      const flatCats: Category[] = [];
      hierarchy.forEach((h) => {
        flatCats.push(h.category);
        flatCats.push(...h.children);
      });

      if (flatCats.length > 0) {
        const hasCurrent = category && flatCats.some((c) => c.name === category);
        setCategory(hasCurrent ? category : flatCats[0].name);
      }
    } catch (err) {
      logError('Failed to load categories:', { error: err });
    }
  };

  const pickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });
      if (!res.canceled && res.assets?.[0]) {
        const asset = res.assets[0];
        const manip = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1000 } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        if (!manip.base64) {
          Alert.alert('Error', 'Failed to process image');
          return;
        }
        setImageBase64(manip.base64);
        setLocalUri(asset.uri);
      }
    } catch (error) {
      logError('Error picking image', { error });
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const res = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
      if (!res.canceled && res.assets?.[0]) {
        const asset = res.assets[0];
        const manip = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1000 } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        if (!manip.base64) {
          Alert.alert('Error', 'Failed to process photo');
          return;
        }
        setImageBase64(manip.base64);
        setLocalUri(asset.uri);
      }
    } catch (error) {
      logError('Error taking photo', { error });
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const removeImage = () => {
    setImageBase64(undefined);
    setLocalUri(undefined);
  };

  const getProjectedBalance = (wallet: Wallet) => {
    const numAmount = numericAmount;
    const currentBalance = balances[wallet.id!] ?? 0;
    const sourceWallet = wallets.find((w) => w.id === walletId);
    if (!sourceWallet) return currentBalance;

    if (type === 'transfer') {
      if (wallet.id === walletId) {
        return currentBalance - numAmount;
      }
      if (wallet.id === toWalletId) {
        const fromRate = sourceWallet.exchange_rate ?? 1.0;
        const toRate = wallet.exchange_rate ?? 1.0;
        const convertedAmount = numAmount * fromRate / toRate;
        return currentBalance + convertedAmount;
      }
      return currentBalance;
    }

    if (type === 'expense' && wallet.id === walletId) {
      return currentBalance - numAmount;
    }
    if (type === 'income' && wallet.id === walletId) {
      return currentBalance + numAmount;
    }
    return currentBalance;
  };

  const handleAmountInput = (value: string) => {
    const operators = ['+', '-', '×', '÷'];
    setAmount((prev) => {
      if (value === 'backspace') {
        return prev.slice(0, -1);
      }
      // Allow digits
      if (/^[0-9]$/.test(value)) {
        return `${prev}${value}`;
      }
      // Allow decimal point anywhere; evaluation will handle
      if (value === '.') {
        const lastNumber = prev.split(/[+×÷-]/).pop();
        if (lastNumber && lastNumber.includes('.')) {
          return prev;
        }
        return prev ? `${prev}${value}` : '0.';
      }
      // Allow operators + - × ÷, only if there's a preceding number
      if (operators.includes(value)) {
        if (!prev) return prev;
        const lastChar = prev.slice(-1);
        if (operators.includes(lastChar) || lastChar === '.') {
          return `${prev.slice(0, -1)}${value}`;
        }
        return `${prev}${value}`;
      }
      return prev;
    });
  };

  const evaluateExpression = (expr: string): number => {
    if (!expr) return 0;
    const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/');
    const trimmed = sanitized.replace(/([+\-*/.])+$/, '');
    if (!trimmed) return 0;
    try {
      if (/^[0-9+\-*/.\s]+$/.test(trimmed)) {
        // eslint-disable-next-line no-eval
        const result = eval(trimmed);
        return typeof result === 'number' && Number.isFinite(result) ? result : 0;
      }
      return 0;
    } catch {
      const fallback = parseFloat(trimmed);
      return Number.isFinite(fallback) ? fallback : 0;
    }
  };

  const numericAmount = useMemo(() => evaluateExpression(amount), [amount]);
  const isValidAmount = numericAmount > 0 && !Number.isNaN(numericAmount);

  const onSave = async () => {
    if (!isValidAmount) {
      setAlertConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please enter an amount greater than zero.',
        buttons: [{ text: 'OK' }]
      });
      return;
    }
    if (isSaving) return;
    setIsSaving(true);

    try {
      if (type === 'transfer') {
        if (!toWalletId) {
          setAlertConfig({
            visible: true,
            title: 'Validation Error',
            message: 'Please select a destination wallet.',
            buttons: [{ text: 'OK' }]
          });
          setIsSaving(false);
          return;
        }
        if (walletId === toWalletId) {
          setAlertConfig({
            visible: true,
            title: 'Validation Error',
            message: 'Choose a different wallet to transfer to.',
            buttons: [{ text: 'OK' }]
          });
          setIsSaving(false);
          return;
        }

        const fromBalance = balances[walletId] ?? 0;
        const EPSILON = 0.01;
        if (numericAmount > fromBalance + EPSILON) {
          setAlertConfig({
            visible: true,
            title: 'Insufficient Balance',
            message: 'The amount exceeds your wallet balance.',
            buttons: [{ text: 'OK' }]
          });
          setIsSaving(false);
          return;
        }

        try {
          await transferBetweenWallets(walletId, toWalletId, numericAmount, notes.trim() || undefined);
          router.back();
        } catch (err) {
          logError('[Transfer] Failed to complete transfer:', { error: err });
          setAlertConfig({
            visible: true,
            title: 'Transfer Failed',
            message: 'Failed to complete transfer. Please try again.',
            buttons: [{ text: 'OK' }]
          });
          setIsSaving(false);
        }
        return;
      }

      let receiptUri: string | undefined;
      try {
        if (imageBase64) {
          const filename = `receipt_${Date.now()}.jpg`;
          receiptUri = await saveReceiptImage(filename, imageBase64);
        }
      } catch (err) {
        logError('[Transaction] Error saving receipt:', { error: err });
        setAlertConfig({
          visible: true,
          title: 'Receipt Save Failed',
          message: 'Failed to save receipt image. Continue without receipt?',
          buttons: [
            { text: 'Cancel', onPress: () => setIsSaving(false) },
            {
              text: 'Continue',
              onPress: async () => {
                await saveTransactionWithoutReceipt();
              }
            }
          ]
        });
        return;
      }

      const finalAmount = type === 'expense' ? -Math.abs(numericAmount) : Math.abs(numericAmount);

      try {
        await addTransaction({
          wallet_id: walletId,
          type: type as 'income' | 'expense',
          amount: finalAmount,
          category,
          date: date.toISOString(),
          notes,
          receipt_uri: receiptUri,
          is_recurring: isRecurring,
          recurrence_frequency: isRecurring ? recurrenceFrequency : undefined,
          recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate.toISOString() : undefined
        });
        router.back();
      } catch (err: any) {
        logError('[Transaction] Failed to add transaction:', { error: err });
        let errorMessage = 'Failed to add transaction. Please try again.';
        if (err?.message?.includes('database')) {
          errorMessage = 'Database error occurred. Please restart the app and try again.';
        } else if (err?.message?.includes('timeout')) {
          errorMessage = 'Operation timed out. Please check your connection and try again.';
        } else if (err?.message?.includes('FOREIGN KEY constraint')) {
          errorMessage = 'Invalid wallet selected. Please select a different wallet.';
        }
        setAlertConfig({
          visible: true,
          title: 'Error',
          message: errorMessage,
          buttons: [{ text: 'OK' }]
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const saveTransactionWithoutReceipt = async () => {
    const finalAmount = type === 'expense' ? -Math.abs(numericAmount) : Math.abs(numericAmount);
    try {
      await addTransaction({
        wallet_id: walletId,
        type: type as 'income' | 'expense',
        amount: finalAmount,
        category,
        date: date.toISOString(),
        notes,
        receipt_uri: undefined,
        is_recurring: isRecurring,
        recurrence_frequency: isRecurring ? recurrenceFrequency : undefined,
        recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate.toISOString() : undefined
      });
      router.back();
    } catch (err) {
      logError('[Transaction] Failed to add transaction without receipt:', { error: err });
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Failed to add transaction. Please try again.',
        buttons: [{ text: 'OK' }]
      });
    } finally {
      setIsSaving(false);
    }
  };

  const transferSummary = () => {
    if (type !== 'transfer' || !walletId || !toWalletId || !isValidAmount) return null;
    const fromWallet = wallets.find((w) => w.id === walletId);
    const toWallet = wallets.find((w) => w.id === toWalletId);
    if (!fromWallet || !toWallet) return null;

    const currenciesDiffer = fromWallet.currency !== toWallet.currency;
    let convertedAmount = numericAmount;
    if (currenciesDiffer) {
      const fromRate = fromWallet.exchange_rate ?? 1.0;
      const toRate = toWallet.exchange_rate ?? 1.0;
      convertedAmount = numericAmount * fromRate / toRate;
    }

    return (
      <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 14, marginBottom: 12 }}>
        <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 6 }}>Transfer summary</Text>
        <Text style={{ color: t.textPrimary, fontSize: 14 }}>
          {fromWallet.currency} {numericAmount.toFixed(2)} from <Text style={{ fontWeight: '600' }}>{fromWallet.name}</Text> to <Text style={{ fontWeight: '600' }}>{toWallet.name}</Text>
        </Text>
        {currenciesDiffer && (
          <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 6 }}>
            Recipient receives: {toWallet.currency} {convertedAmount.toFixed(2)}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['left', 'right', 'top']}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: t.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <View style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 140 }}
            keyboardShouldPersistTaps="handled"
          >
            <TypeTabs current={type} onChange={setType} colors={t} />

            <AmountDisplay amount={amount} currency={displayCurrency} colors={t} evaluated={numericAmount} />

            <SectionLabel text="Tap to Select Wallet to Transact From" colors={t} />
            <WalletCarousel
              wallets={wallets}
              selectedId={walletId}
              onSelect={setWalletId}
              colors={t}
              projected={(wallet) => getProjectedBalance(wallet)}
            />

            {type === 'transfer' && (
              <>
                <SectionLabel text="Transfer to" colors={t} />
                <WalletCarousel
                  wallets={wallets.filter((w) => w.id !== walletId)}
                  selectedId={toWalletId || undefined}
                  onSelect={(id) => setToWalletId(id)}
                  colors={t}
                  projected={(wallet) => getProjectedBalance(wallet)}
                />
              </>
            )}

            {type !== 'transfer' && (
              <>
                <SectionLabel text="Category" colors={t} />
                <TouchableOpacity
                  onPress={() => setShowCategoryPicker(true)}
                  style={{
                    borderWidth: 1,
                    borderColor: t.border,
                    backgroundColor: t.card,
                    padding: 14,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                      {(() => {
                        const selectedCat = categoryHierarchy
                          .flatMap(h => [h.category, ...h.children])
                          .find(c => c.name === category);
                        const Icon = selectedCat ? resolveCategoryIcon(selectedCat.icon, type) : null;
                        return Icon ? <Icon width={22} height={22} color={t.primary} /> : <Text style={{ color: t.textSecondary }}>•</Text>;
                      })()}
                    </View>
                    <Text style={{ color: t.textPrimary, fontWeight: '600' }}>
                      {category || 'Select category'}
                    </Text>
                  </View>
                  <Text style={{ color: t.textSecondary }}>›</Text>
                </TouchableOpacity>
              </>
            )}

            <SectionLabel text="Date & Time" colors={t} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <RowButton label={formatShortDate(date)} onPress={() => setShowDatePicker(true)} colors={t} />
              </View>
              <View style={{ flex: 1 }}>
                <TimeInput date={date} onChange={(d) => setDate(d)} colors={t} />
              </View>
            </View>

            <SectionLabel text="Notes" colors={t} />
            <NotesInput value={notes} onChange={setNotes} colors={t} />

            {type !== 'transfer' && (
              <RecurrenceCard
                isRecurring={isRecurring}
                onToggle={setIsRecurring}
                frequency={recurrenceFrequency}
                onChangeFrequency={setRecurrenceFrequency}
                endDate={recurrenceEndDate}
                onSelectEndDate={() => setShowRecurrenceEndDatePicker(true)}
                onClearEndDate={() => setRecurrenceEndDate(null)}
                colors={t}
              />
            )}

            {type !== 'transfer' && (
              <ReceiptCard
                onPick={pickImage}
                onCapture={takePhoto}
                previewUri={localUri}
                onRemove={removeImage}
                colors={t}
              />
            )}

            {transferSummary()}
          </ScrollView>

          <View style={{ paddingHorizontal: 12, paddingBottom: 16, paddingTop: 10, backgroundColor: t.background, borderTopWidth: 1, borderTopColor: t.border }}>
            <Keypad onPress={handleAmountInput} colors={t} />
            <TouchableOpacity
              onPress={onSave}
              disabled={!isValidAmount || isSaving || (type === 'transfer' && !toWalletId)}
              style={{
                backgroundColor: !isValidAmount || isSaving || (type === 'transfer' && !toWalletId) ? t.border : t.primary,
                padding: 14,
                borderRadius: 12,
                marginTop: 12,
                ...shadows.sm,
                opacity: !isValidAmount || isSaving ? 0.7 : 1
              }}
            >
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '800' }}>
                {isSaving ? 'Saving...' : 'Save Transaction'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal visible={showCategoryPicker} transparent animationType="fade" onRequestClose={() => setShowCategoryPicker(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 }}>
            <View style={{ backgroundColor: t.card, borderRadius: 12, borderWidth: 1, borderColor: t.border, maxHeight: '80%' }}>
              {/* Header */}
              <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
                <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>Select Category</Text>
                
                {/* Search Bar */}
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.background, borderRadius: 8, borderWidth: 1, borderColor: t.border, paddingHorizontal: 12 }}>
                  <TextInput
                    placeholder="Search categories..."
                    placeholderTextColor={t.textSecondary}
                    value={categorySearchQuery}
                    onChangeText={setCategorySearchQuery}
                    style={{ flex: 1, paddingVertical: 10, color: t.textPrimary, fontSize: 14 }}
                  />
                  {categorySearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setCategorySearchQuery('')}>
                      <Text style={{ color: t.textSecondary, fontSize: 18 }}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Categories List */}
              <ScrollView showsVerticalScrollIndicator={false}>
                {categoryHierarchy
                  .filter(item => 
                    item.category.name.toLowerCase().includes(categorySearchQuery.toLowerCase()) ||
                    item.children.some(child => child.name.toLowerCase().includes(categorySearchQuery.toLowerCase()))
                  )
                  .map((item) => (
                    <View key={item.category.id}>
                      {item.category.name.toLowerCase().includes(categorySearchQuery.toLowerCase()) && (
                        <TouchableOpacity
                          onPress={() => {
                            setCategory(item.category.name);
                            setShowCategoryPicker(false);
                            setCategorySearchQuery('');
                          }}
                          style={{ padding: 16, backgroundColor: t.background, borderBottomWidth: 1, borderBottomColor: t.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                        >
                          <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                            {(() => { const Icon = resolveCategoryIcon(item.category.icon, type); return Icon ? <Icon width={22} height={22} color={category === item.category.name ? t.primary : t.accent} /> : <Text style={{ color: t.textSecondary }}>•</Text>; })()}
                          </View>
                          <Text style={{ color: category === item.category.name ? t.primary : t.textPrimary, fontSize: 16, fontWeight: '700', flex: 1 }}>
                            {item.category.name}
                          </Text>
                          {category === item.category.name && <Text style={{ color: t.primary, fontSize: 16 }}>✓</Text>}
                        </TouchableOpacity>
                      )}
                      {item.children
                        .filter(child => child.name.toLowerCase().includes(categorySearchQuery.toLowerCase()))
                        .map((child) => (
                          <TouchableOpacity
                            key={child.id}
                            onPress={() => {
                              setCategory(child.name);
                              setShowCategoryPicker(false);
                              setCategorySearchQuery('');
                            }}
                            style={{ paddingLeft: 40, paddingVertical: 12, paddingRight: 16, borderBottomWidth: 1, borderBottomColor: t.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                          >
                            <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                              {(() => { const Icon = resolveCategoryIcon(child.icon, type); return Icon ? <Icon width={20} height={20} color={category === child.name ? t.primary : t.accent} /> : <Text style={{ color: t.textSecondary }}>•</Text>; })()}
                            </View>
                            <Text style={{ color: category === child.name ? t.primary : t.textPrimary, fontSize: 14, fontWeight: category === child.name ? '700' : '500', flex: 1 }}>
                              {child.name}
                            </Text>
                            {category === child.name && <Text style={{ color: t.primary, fontSize: 14 }}>✓</Text>}
                          </TouchableOpacity>
                        ))}
                    </View>
                  ))}
                {categoryHierarchy.filter(item => 
                  item.category.name.toLowerCase().includes(categorySearchQuery.toLowerCase()) ||
                  item.children.some(child => child.name.toLowerCase().includes(categorySearchQuery.toLowerCase()))
                ).length === 0 && categorySearchQuery.length > 0 && (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: t.textSecondary, fontSize: 14 }}>No categories found</Text>
                  </View>
                )}
              </ScrollView>

              {/* Close Button */}
              <TouchableOpacity 
                onPress={() => {
                  setShowCategoryPicker(false);
                  setCategorySearchQuery('');
                }} 
                style={{ padding: 16, borderTopWidth: 1, borderTopColor: t.border, alignItems: 'center' }}
              >
                <Text style={{ color: t.primary, fontWeight: '700' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <CalendarModal
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          onSelectDate={(selectedDate: Date) => setDate(selectedDate)}
          selectedDate={date}
          maxDate={new Date()}
          title="Select Date"
        />

        <CalendarModal
          visible={showRecurrenceEndDatePicker}
          onClose={() => setShowRecurrenceEndDatePicker(false)}
          onSelectDate={(selectedDate: Date) => setRecurrenceEndDate(selectedDate)}
          selectedDate={recurrenceEndDate || date}
          minDate={date}
          title="Recurrence End Date"
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
    </SafeAreaView>
  );
}

type Colors = ReturnType<typeof theme>;

function SectionLabel({ text, colors }: { text: string; colors: Colors }) {
  return <Text style={{ color: colors.textSecondary, marginTop: 18, marginBottom: 8 }}>{text}</Text>;
}

function TypeTabs({ current, onChange, colors }: { current: 'income' | 'expense' | 'transfer'; onChange: (t: 'income' | 'expense' | 'transfer') => void; colors: Colors }) {
  const tabs: Array<{ key: 'expense' | 'income' | 'transfer'; label: string }> = [
    { key: 'expense', label: 'Expense' },
    { key: 'income', label: 'Income' },
    { key: 'transfer', label: 'Transfer' }
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          onPress={() => onChange(tab.key)}
          style={{
            flex: 1,
            backgroundColor: current === tab.key ? colors.primary : colors.card,
            borderWidth: 1,
            borderColor: current === tab.key ? colors.primary : colors.border,
            paddingVertical: 12,
            borderRadius: 14,
            alignItems: 'center'
          }}
        >
          <Text style={{ color: current === tab.key ? '#fff' : colors.textPrimary, fontWeight: '700', fontSize: 13 }}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function AmountDisplay({ amount, currency, colors, evaluated }: { amount: string; currency: string; colors: Colors; evaluated: number }) {
  const formatted = new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(evaluated || 0);
  const displayText = (evaluated || 0) >= 1e9 ? (evaluated || 0).toExponential(2) : formatted;
  return (
    <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 14, ...shadows.sm }}>
      <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>Amount</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.textSecondary, fontSize: 20 }}>{currency}</Text>
        <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '800' }} numberOfLines={1} ellipsizeMode="tail">{displayText}</Text>
      </View>
    </View>
  );
}

function WalletCarousel({ wallets, selectedId, onSelect, colors, projected }: { wallets: Wallet[]; selectedId?: number | null; onSelect: (id: number) => void; colors: Colors; projected: (wallet: Wallet) => number; }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 12, gap: 12 }} style={{ marginBottom: 12 }} scrollEventThrottle={16}>
      {wallets.map((wallet) => {
        const isActive = selectedId === wallet.id;
        return (
          <TouchableOpacity
            key={wallet.id}
            onPress={() => onSelect(wallet.id!)}
            style={{
              backgroundColor: isActive ? colors.primary : colors.card,
              borderWidth: 1.5,
              borderColor: isActive ? colors.primary : colors.border,
              borderRadius: 14,
              padding: 14,
              minWidth: 150,
              ...shadows.sm
            }}
          >
            <Text style={{ color: isActive ? '#fff' : colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
              {wallet.name}
            </Text>
            <Text style={{ color: isActive ? '#fff' : colors.textPrimary, fontSize: 18, fontWeight: '800' }}>
              {formatCurrency(projected(wallet), wallet.currency)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function RowButton({ label, onPress, colors }: { label: string; onPress: () => void; colors: Colors }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        padding: 14,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{label}</Text>
      <Text style={{ color: colors.textSecondary }}>›</Text>
    </TouchableOpacity>
  );
}

function TimeInput({ date, onChange, colors }: { date: Date; onChange: (d: Date) => void; colors: Colors }) {
  const [showPicker, setShowPicker] = useState(false);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const display = `${hh}:${mm}`;

  return (
    <View>
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          padding: 14,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Time</Text>
        <Text style={{ color: colors.textSecondary }}>{display}</Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          is24Hour={true}
          onChange={(e, selectedDate) => {
            setShowPicker(Platform.OS === 'ios');
            if (selectedDate) {
              onChange(selectedDate);
            }
          }}
        />
      )}
    </View>
  );
}

function NotesInput({ value, onChange, colors }: { value: string; onChange: (v: string) => void; colors: Colors }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="Add a note"
      placeholderTextColor={colors.textTertiary}
      multiline
      numberOfLines={4}
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        color: colors.textPrimary,
        borderRadius: 12,
        padding: 12,
        minHeight: 80,
        textAlignVertical: 'top'
      }}
    />
  );
}

function RecurrenceCard({ isRecurring, onToggle, frequency, onChangeFrequency, endDate, onSelectEndDate, onClearEndDate, colors }: { isRecurring: boolean; onToggle: (v: boolean) => void; frequency: RecurrenceFrequency; onChangeFrequency: (f: RecurrenceFrequency) => void; endDate: Date | null; onSelectEndDate: () => void; onClearEndDate: () => void; colors: Colors }) {
  return (
    <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginTop: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700' }}>Recurring</Text>
        <Switch value={isRecurring} onValueChange={onToggle} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
      </View>
      {isRecurring && (
        <>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 10 }}>This transaction will repeat automatically.</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {(['daily', 'weekly', 'monthly', 'yearly'] as RecurrenceFrequency[]).map((freq) => {
              const active = frequency === freq;
              return (
                <TouchableOpacity
                  key={freq}
                  onPress={() => onChangeFrequency(freq)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: active ? colors.primary : colors.background,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border
                  }}
                >
                  <Text style={{ color: active ? '#fff' : colors.textPrimary, fontWeight: '700', textTransform: 'capitalize', fontSize: 12 }}>{freq}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={{ color: colors.textSecondary, marginBottom: 6, fontSize: 13 }}>End date (optional)</Text>
          <TouchableOpacity
            onPress={onSelectEndDate}
            style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, padding: 12, borderRadius: 10 }}
          >
            <Text style={{ color: colors.textPrimary }}>
              {endDate ? formatShortDate(endDate) : 'No end date (recurs indefinitely)'}
            </Text>
          </TouchableOpacity>
          {endDate && (
            <TouchableOpacity onPress={onClearEndDate} style={{ marginTop: 6 }}>
              <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '700' }}>Clear end date</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

function ReceiptCard({ onPick, onCapture, previewUri, onRemove, colors }: { onPick: () => void; onCapture: () => void; previewUri?: string; onRemove: () => void; colors: Colors }) {
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Receipt (optional)</Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity onPress={onPick} style={{ flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: 10 }}>
          <Text style={{ color: colors.textPrimary, textAlign: 'center', fontWeight: '700' }}>Choose Image</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onCapture} style={{ flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: 10 }}>
          <Text style={{ color: colors.textPrimary, textAlign: 'center', fontWeight: '700' }}>Take Photo</Text>
        </TouchableOpacity>
      </View>
      {previewUri && (
        <View style={{ position: 'relative', marginTop: 12 }}>
          <Image source={{ uri: previewUri }} style={{ width: '100%', height: 200, borderRadius: 12 }} />
          <TouchableOpacity
            onPress={onRemove}
            style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 16, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>×</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function Keypad({ onPress, colors }: { onPress: (value: string) => void; colors: Colors }) {
  const keys = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '.', '0', 'backspace', '+'];
  return (
    <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 8, ...shadows.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {keys.map((key) => {
          const isNumber = /^[0-9]$/.test(key);
          return (
            <TouchableOpacity
              key={key}
              onPress={() => onPress(key)}
              style={{
                width: '25%',
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: isNumber ? 12 : 0,
                borderWidth: isNumber ? 1 : 0,
                borderColor: isNumber ? colors.border : 'transparent',
                backgroundColor: isNumber ? colors.background : 'transparent',
                marginVertical: isNumber ? 4 : 0
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>
                {key === 'backspace' ? '⌫' : key}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function resolveCategoryIcon(iconName?: string, currentType?: 'income' | 'expense' | 'transfer') {
  if (!iconName) {
    if (currentType === 'income') return (CategoryIcons as any).MoneyReciveIcon;
    if (currentType === 'expense') return (CategoryIcons as any).MoneySendIcon;
    return null;
  }

  // Try direct lookup first
  let IconComp = (CategoryIcons as any)[iconName];
  if (IconComp) return IconComp;

  // Try by category name (e.g., "Salary/Wages" -> CATEGORY_ICONS['Salary'])
  const categoryName = iconName.split('/')[0].trim(); // Get first part before slash if exists
  IconComp = (CategoryIcons as any)[categoryName];
  if (IconComp) return IconComp;

  // Try lowercase version (e.g., "Electricity" -> "electricity")
  IconComp = (CategoryIcons as any)[iconName.toLowerCase()];
  if (IconComp) return IconComp;

  // Fallback by type if string not found
  if (currentType === 'income') return (CategoryIcons as any).MoneyReciveIcon;
  if (currentType === 'expense') return (CategoryIcons as any).MoneySendIcon;
  return null;
}
