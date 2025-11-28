import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';
import { addTransaction } from '../../src/lib/db/transactions';
import { yyyyMmDd } from '../../src/utils/date';
import { saveReceiptImage } from '../../src/lib/services/fileService';

export default function AddTransactionScreen() {
  const router = useRouter();
  const { themeMode, defaultCurrency } = useSettings();
  const t = theme(themeMode);

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString());
  const [category, setCategory] = useState('Food');
  const [walletId, setWalletId] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [localUri, setLocalUri] = useState<string | undefined>(undefined);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });
    if (!res.canceled && res.assets?.[0]) {
      const asset = res.assets[0];
      const manip = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: 1000 } }], { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      setImageBase64(manip.base64);
      setLocalUri(asset.uri);
    }
  };

  const takePhoto = async () => {
    const res = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
    if (!res.canceled && res.assets?.[0]) {
      const asset = res.assets[0];
      const manip = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: 1000 } }], { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      setImageBase64(manip.base64);
      setLocalUri(asset.uri);
    }
  };

  const onSave = async () => {
    let receiptUri: string | undefined = undefined;
    if (imageBase64) {
      const filename = `${yyyyMmDd()}/${amount || '0'}_receipt_${Date.now()}.jpg`;
      receiptUri = await saveReceiptImage(filename, imageBase64);
    }
    await addTransaction({ wallet_id: walletId, type, amount: parseFloat(amount || '0'), category, date, notes, receipt_uri: receiptUri });
    router.back();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: t.textSecondary }}>Type</Text>
      <TextInput value={type} onChangeText={(v) => setType(v as any)} style={{ borderWidth: 1, borderColor: t.border, padding: 10, color: t.textPrimary, borderRadius: 8, marginBottom: 12 }} />

      <Text style={{ color: t.textSecondary }}>Amount ({defaultCurrency})</Text>
      <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={{ borderWidth: 1, borderColor: t.border, padding: 10, color: t.textPrimary, borderRadius: 8, marginBottom: 12 }} />

      <Text style={{ color: t.textSecondary }}>Date</Text>
      <TextInput value={date} onChangeText={setDate} style={{ borderWidth: 1, borderColor: t.border, padding: 10, color: t.textPrimary, borderRadius: 8, marginBottom: 12 }} />

      <Text style={{ color: t.textSecondary }}>Category</Text>
      <TextInput value={category} onChangeText={setCategory} style={{ borderWidth: 1, borderColor: t.border, padding: 10, color: t.textPrimary, borderRadius: 8, marginBottom: 12 }} />

      <Text style={{ color: t.textSecondary }}>Wallet ID</Text>
      <TextInput value={String(walletId)} onChangeText={(v) => setWalletId(Number(v))} keyboardType="number-pad" style={{ borderWidth: 1, borderColor: t.border, padding: 10, color: t.textPrimary, borderRadius: 8, marginBottom: 12 }} />

      <Text style={{ color: t.textSecondary }}>Notes</Text>
      <TextInput value={notes} onChangeText={setNotes} style={{ borderWidth: 1, borderColor: t.border, padding: 10, color: t.textPrimary, borderRadius: 8, marginBottom: 12 }} />

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <TouchableOpacity onPress={pickImage} style={{ backgroundColor: t.card, padding: 10, borderRadius: 8 }}>
          <Text style={{ color: t.textPrimary }}>Pick Image</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={takePhoto} style={{ backgroundColor: t.card, padding: 10, borderRadius: 8 }}>
          <Text style={{ color: t.textPrimary }}>Take Photo</Text>
        </TouchableOpacity>
      </View>
      {localUri ? <Image source={{ uri: localUri }} style={{ width: 160, height: 160, marginBottom: 12 }} /> : null}

      <TouchableOpacity onPress={onSave} style={{ backgroundColor: t.accent, padding: 12, borderRadius: 10 }}>
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Save Transaction</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
