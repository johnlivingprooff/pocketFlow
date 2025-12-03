import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallets } from '../../src/lib/hooks/useWallets';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { WalletCard } from '../../src/components/WalletCard';
import { TransferModal } from '../../src/components/TransferModal';
import { transferBetweenWallets } from '../../src/lib/db/transactions';
import { Link } from 'expo-router';

export default function WalletsList() {
  const { wallets, balances, loading } = useWallets();
  const { themeMode, userInfo } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');
  const [transferModalVisible, setTransferModalVisible] = useState(false);

  const handleTransfer = async (fromWalletId: number, toWalletId: number, amount: number, notes?: string) => {
    await transferBetweenWallets(fromWalletId, toWalletId, amount, notes);
    // The useWallets hook will automatically refresh via useFocusEffect when modal closes
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        {/* Header Section */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingTop: 20 }}>
          <View>
            <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>Wallets</Text>
            <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 4 }}>Manage your payment methods</Text>
          </View>
          <Link href="/profile" asChild>
            <TouchableOpacity style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', ...shadows.sm }}>
              {userInfo?.profileImage ? (
                <Image source={{ uri: userInfo.profileImage }} style={{ width: 48, height: 48, borderRadius: 24 }} />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
                  {(userInfo?.name || 'U').charAt(0).toUpperCase()}
                </Text>
              )}
            </TouchableOpacity>
          </Link>
        </View>
        {/* Wallet Cards */}
        {wallets.map((w) => (
          <Link key={w.id} href={`/wallets/${w.id}`} asChild>
            <TouchableOpacity style={{ marginBottom: 12 }}>
              <WalletCard name={w.name} balance={balances[w.id!] ?? 0} currency={w.currency} color={w.color} mode={themeMode} />
            </TouchableOpacity>
          </Link>
        ))}
        
        {/* Transfer Button */}
        {wallets.length >= 2 && (
          <TouchableOpacity
            onPress={() => setTransferModalVisible(true)}
            style={{
              backgroundColor: t.accent,
              borderRadius: 16,
              padding: 18,
              alignItems: 'center',
              marginTop: 8,
              marginBottom: 12,
              ...shadows.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '300' }}>⇄</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Transfer Between Wallets</Text>
            </View>
          </TouchableOpacity>
        )}
        
        {/* Create Wallet Button */}
        <Link href="/wallets/create" asChild>
          <TouchableOpacity style={{ 
            backgroundColor: t.card, 
            borderWidth: 2, 
            borderColor: t.primary, 
            borderStyle: 'dashed',
            borderRadius: 16, 
            padding: 20, 
            alignItems: 'center',
            marginTop: 8,
            ...shadows.sm
          }}>
            <Text style={{ color: t.primary, fontSize: 24, fontWeight: '300', marginBottom: 4 }}>+</Text>
            <Text style={{ color: t.primary, fontSize: 14, fontWeight: '600' }}>Create New Wallet</Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>

      {/* Transfer Modal */}
      <TransferModal
        visible={transferModalVisible}
        onClose={() => setTransferModalVisible(false)}
        wallets={wallets}
        balances={balances}
        onTransfer={handleTransfer}
        mode={themeMode}
      />
    </SafeAreaView>
  );
}
