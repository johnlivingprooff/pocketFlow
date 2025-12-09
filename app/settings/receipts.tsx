import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, useColorScheme, Image, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../../src/theme/theme';
import { useSettings } from '../../src/store/useStore';
import { exec } from '../../src/lib/db';
import * as FileSystem from 'expo-file-system/legacy';

interface ReceiptItem {
  id: number;
  receipt_uri: string;
  category: string;
  amount: number;
  date: string;
}

export default function ReceiptsGalleryScreen() {
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettings();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);

  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const receiptData = await exec<ReceiptItem>(
        `SELECT id, receipt_uri, category, amount, date 
         FROM transactions 
         WHERE receipt_uri IS NOT NULL AND receipt_uri != ''
         ORDER BY date DESC`
      );
      setReceipts(receiptData);
    } catch (error) {
      console.error('Error loading receipts:', error);
      Alert.alert('Error', 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReceipt = (receipt: ReceiptItem) => {
    Alert.alert(
      'Delete Receipt',
      'Are you sure you want to delete this receipt? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete file
              if (receipt.receipt_uri) {
                try {
                  await FileSystem.deleteAsync(receipt.receipt_uri);
                } catch (e) {
                  console.warn('Could not delete file:', e);
                }
              }

              // Clear receipt_uri from transaction
              await exec(
                `UPDATE transactions SET receipt_uri = NULL WHERE id = ?`,
                [receipt.id]
              );

              setReceipts(receipts.filter(r => r.id !== receipt.id));
              setShowPreview(false);
              Alert.alert('Success', 'Receipt deleted');
            } catch (error) {
              console.error('Error deleting receipt:', error);
              Alert.alert('Error', 'Failed to delete receipt');
            }
          },
        },
      ]
    );
  };

  const renderReceiptThumbnail = (receipt: ReceiptItem) => (
    <TouchableOpacity
      key={receipt.id}
      onPress={() => {
        setSelectedReceipt(receipt);
        setShowPreview(true);
      }}
      style={{
        flex: 1,
        margin: 8,
        backgroundColor: t.card,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: t.border,
      }}
    >
      <Image
        source={{ uri: receipt.receipt_uri }}
        style={{ width: '100%', height: 150 }}
      />
      <View style={{ padding: 8 }}>
        <Text style={{ color: t.textPrimary, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
          {receipt.category}
        </Text>
        <Text style={{ color: t.textSecondary, fontSize: 11, marginTop: 2 }}>
          {new Date(receipt.date).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['left', 'right', 'top']} style={{ flex: 1, backgroundColor: t.background }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: t.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: t.primary, fontSize: 28 }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>Receipts Gallery</Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={t.primary} />
        </View>
      ) : receipts.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📸</Text>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
            No Receipts
          </Text>
          <Text style={{ color: t.textSecondary, fontSize: 14, textAlign: 'center' }}>
            Receipts attached to transactions will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={receipts}
          numColumns={2}
          renderItem={({ item }) => renderReceiptThumbnail(item)}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 8, paddingBottom: 40 }}
        />
      )}

      {/* Receipt Preview Modal */}
      {selectedReceipt && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: showPreview ? 'rgba(0,0,0,0.95)' : 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: showPreview ? 1000 : -1,
          }}
        >
          {showPreview && (
            <>
              {/* Close Button */}
              <TouchableOpacity
                onPress={() => {
                  setShowPreview(false);
                  setSelectedReceipt(null);
                }}
                style={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  zIndex: 1001,
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 28, fontWeight: '300' }}>✕</Text>
              </TouchableOpacity>

              {/* Image */}
              <Image
                source={{ uri: selectedReceipt.receipt_uri }}
                style={{ width: '90%', height: '70%', borderRadius: 12 }}
                resizeMode="contain"
              />

              {/* Bottom Actions */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 20,
                  left: 20,
                  right: 20,
                  flexDirection: 'row',
                  gap: 12,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    setShowPreview(false);
                    handleDeleteReceipt(selectedReceipt);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    backgroundColor: 'rgba(255,59,48,0.8)',
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowPreview(false);
                    setSelectedReceipt(null);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Close</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
