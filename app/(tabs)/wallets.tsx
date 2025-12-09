import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Image, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallets } from '../../src/lib/hooks/useWallets';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { WalletCard } from '../../src/components/WalletCard';
import { TransferModal } from '../../src/components/TransferModal';
import { transferBetweenWallets } from '../../src/lib/db/transactions';
import { Link } from 'expo-router';

export default function WalletsList() {
  const { wallets, balances, loading, refresh } = useWallets();
  const { themeMode, userInfo } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.error('Error refreshing wallets:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTransfer = async (fromWalletId: number, toWalletId: number, amount: number, notes?: string) => {
    await transferBetweenWallets(fromWalletId, toWalletId, amount, notes);
    // The useWallets hook will automatically refresh via useFocusEffect when modal closes
  };

  // Filter wallets based on search query
  const filteredWallets = useMemo(() => {
    if (!searchQuery.trim()) return wallets;
    const query = searchQuery.toLowerCase();
    return wallets.filter(wallet => 
      wallet.name.toLowerCase().includes(query) ||
      wallet.currency.toLowerCase().includes(query)
    );
  }, [wallets, searchQuery]);

  const showSearch = wallets.length > 10;

  return (
    <SafeAreaView edges={['left', 'right', 'top']} style={{ flex: 1, backgroundColor: t.background }}>
      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 0 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={t.primary}
            colors={[t.primary]}
          />
        }
      >
        {/* Header Section */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingTop: 20 }}>
          <View>
            <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>Wallets</Text>
              <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 4 }}>
                {wallets.length === 0 ? 'Manage your payment methods' : `${wallets.length} wallet${wallets.length !== 1 ? 's' : ''}`}
              </Text>
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

        {/* Search Bar - Only visible when > 10 wallets */}
        {showSearch && (
          <View style={{ marginBottom: 16 }}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search wallets..."
              placeholderTextColor={t.textSecondary}
              style={{
                backgroundColor: t.card,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 12,
                padding: 12,
                fontSize: 15,
                color: t.textPrimary,
              }}
            />
          </View>
        )}

        {/* Wallet Cards */}
        {filteredWallets.length > 0 ? (
          <View style={{ gap: 15, marginBottom: 16 }}>
            {filteredWallets.map((wallet) => (
              <Link key={wallet.id} href={`/wallets/${wallet.id}`} asChild>
                <TouchableOpacity activeOpacity={0.8}>
                  <WalletCard
                    name={wallet.name}
                    balance={balances[wallet.id!] ?? 0}
                    currency={wallet.currency}
                    color={wallet.color}
                    mode={effectiveMode}
                  />
                </TouchableOpacity>
              </Link>
            ))}
          </View>
        ) : searchQuery.trim() ? (
          <View style={{ 
            backgroundColor: t.card, 
            borderRadius: 12, 
            padding: 24, 
            alignItems: 'center',
            marginBottom: 16,
          }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
            <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>No wallets found</Text>
            <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 4 }}>Try a different search term</Text>
          </View>
        ) : null}
        
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
