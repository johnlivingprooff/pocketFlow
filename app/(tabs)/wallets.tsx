import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Image, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallets } from '../../src/lib/hooks/useWallets';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import { WalletCard } from '../../src/components/WalletCard';
import { TransferModal } from '../../src/components/TransferModal';
import { transferBetweenWallets } from '../../src/lib/db/transactions';
import { Link, useRouter } from 'expo-router';
import { invalidateWalletCaches } from '../../src/lib/cache/queryCache';
import { Platform, Linking } from 'react-native';
import { webSharedWalletsOnlyFilter } from '../../src/lib/platform/webGuards';
import { AppOnlyBlock, WebAuthWall } from '../../src/components/web/AppOnlyBlock';

export default function WalletsList() {
  const { wallets, balances, loading, refresh } = useWallets();
  const { themeMode, userInfo, setUserInfo, cloudSessionState } = useSettings();
  const systemColorScheme = useColorScheme();
  const t = theme(themeMode, systemColorScheme || 'light');
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const isWeb = Platform.OS === 'web';
  const displayWallets = isWeb ? webSharedWalletsOnlyFilter(wallets) : wallets;
  const hiddenCount = isWeb ? wallets.length - displayWallets.length : 0;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Clear wallet caches to force fresh data fetch
      invalidateWalletCaches();
      await refresh();
      console.log('Wallets refreshed - cache cleared');
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
    if (!searchQuery.trim()) return displayWallets;
    const query = searchQuery.toLowerCase();
    return displayWallets.filter(wallet => 
      wallet.name.toLowerCase().includes(query) ||
      wallet.currency.toLowerCase().includes(query)
    );
  }, [displayWallets, searchQuery]);

  const showSearch = displayWallets.length > 10;

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
        {/* Web: auth mandatory for shared wallets; personal wallets hidden */}
        {isWeb && cloudSessionState !== 'authenticated' ? (
          <View style={{ marginBottom: 16, paddingTop: 20 }}>
            <WebAuthWall onPress={() => router.push('/profile' as never)} />
          </View>
        ) : null}
        {isWeb && hiddenCount > 0 ? (
          <View style={{ marginBottom: 16 }}>
            <AppOnlyBlock
              title={`${hiddenCount} personal wallet${hiddenCount === 1 ? '' : 's'} hidden on the web`}
              message="Personal (non-shared) wallets stay on-device and are only available in the mobile app. On the web you only see and edit shared wallets."
              showDownloadCTA={false}
            />
          </View>
        ) : null}
        {/* Header Section */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingTop: 20 }}>
          <View>
            <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>{isWeb ? 'Shared wallets' : 'Wallets'}</Text>
              <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 4 }}>
                {displayWallets.length === 0 ? (isWeb ? 'No shared wallets yet – create one after signing in' : 'Manage your payment methods') : `${displayWallets.length} wallet${displayWallets.length !== 1 ? 's' : ''}${isWeb ? ' (shared only)' : ''}`}
              </Text>
          </View>
          <Link href="/profile" asChild>
            <TouchableOpacity style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', ...shadows.sm }}>
              {userInfo?.profileImage ? (
                <Image source={{ uri: userInfo.profileImage }} style={{ width: 48, height: 48, borderRadius: 24 }} onError={() => setUserInfo({ profileImage: null })} />
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
                    type={wallet.type}
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
        
        {/* Action Buttons Row */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 12 }}>
          {/* Transfer Button — hidden on web unless at least 2 shared wallets */}
          {displayWallets.length >= 2 && (
            <TouchableOpacity
              onPress={() => setTransferModalVisible(true)}
              style={{
                flex: 1,
                backgroundColor: t.accent,
                borderRadius: 12,
                padding: 12,
                alignItems: 'center',
                justifyContent: 'center',
                ...shadows.sm,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '300' }}>⇄</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Transfer</Text>
              </View>
            </TouchableOpacity>
          )}
          
          {/* Create Wallet Button — on web this must be a shared wallet (requires account) */}
          <Link href={isWeb ? "/settings/shared-wallets" as never : "/wallets/create" as never} asChild>
            <TouchableOpacity style={{ 
              flex: 1,
              backgroundColor: t.card, 
              borderWidth: 2, 
              borderColor: t.primary, 
              borderStyle: 'dashed',
              borderRadius: 12, 
              padding: 12, 
              alignItems: 'center',
              justifyContent: 'center',
              ...shadows.sm
            }}>
              <Text style={{ color: t.primary, fontSize: 20, fontWeight: '300', marginBottom: 2 }}>+</Text>
              <Text style={{ color: t.primary, fontSize: 13, fontWeight: '600' }}>{isWeb ? 'New Shared Wallet' : 'New Wallet'}</Text>
            </TouchableOpacity>
          </Link>
        </View>
        {isWeb ? (
          <View style={{ marginBottom: 12 }}>
            <AppOnlyBlock
              title="Need a personal wallet?"
              message="Personal wallets are intentionally app-only for offline privacy. Install the Android/iOS app to create and manage them."
              showDownloadCTA={true}
            />
          </View>
        ) : null}
      </ScrollView>

      {/* Transfer Modal */}
      <TransferModal
        visible={transferModalVisible}
        onClose={() => setTransferModalVisible(false)}
        wallets={wallets}
        balances={balances}
        onTransfer={handleTransfer}
        themeMode={themeMode}
      />
    </SafeAreaView>
  );
}
