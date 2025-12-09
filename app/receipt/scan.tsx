import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';
import { saveReceiptImage } from '../../src/lib/services/fileService';

export default function ReceiptScan() {
  const { themeMode } = useSettings();
  const t = theme(themeMode);
  const [localUri, setLocalUri] = useState<string | undefined>();
  const [savedUri, setSavedUri] = useState<string | undefined>();

  const pickOrCapture = async () => {
    try {
      const res = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
      if (!res.canceled && res.assets?.[0]) {
        const asset = res.assets[0];
        const manip = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: 1000 } }], { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true });
        if (!manip.base64) {
          Alert.alert('Error', 'Failed to process image');
          return;
        }
        setLocalUri(asset.uri);
        const uri = await saveReceiptImage(`scan_${Date.now()}.jpg`, manip.base64);
        setSavedUri(uri);
        Alert.alert('Success', 'Receipt saved successfully');
      }
    } catch (error) {
      console.error('Error in receipt scan:', error);
      Alert.alert('Error', 'Failed to save receipt. Please try again.');
    }
  };

  return (
    <SafeAreaView edges={['left', 'right', 'top']} style={{ flex: 1, backgroundColor: t.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20 }}>
        <TouchableOpacity onPress={pickOrCapture} style={{ backgroundColor: t.accent, padding: 12, borderRadius: 10 }}>
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Capture Receipt</Text>
        </TouchableOpacity>
        {localUri ? <Image source={{ uri: localUri }} style={{ width: 200, height: 200, marginTop: 12 }} /> : null}
        {savedUri ? <Text style={{ color: t.textSecondary, marginTop: 8 }}>Saved at: {savedUri}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
