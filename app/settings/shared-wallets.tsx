import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { theme } from '@/theme/theme';
import { useSettings } from '@/store/useStore';
import { listSharedWallets } from '@/lib/services/cloud/sharedWalletService';

type SharedWalletRow = {
  id: string;
  name: string;
  role: 'owner' | 'member';
  memberCount: number;
  syncStatus: 'synced' | 'syncing' | 'error';
};

export default function SharedWalletsHubScreen() {
  const { cloudSessionState, themeMode } = useSettings();
  const systemColorScheme = useColorScheme();
  const mode = themeMode === 'system' ? systemColorScheme || 'light' : themeMode;
  const t = theme(mode);
  const router = useRouter();

  const [wallets, setWallets] = useState<SharedWalletRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (cloudSessionState !== 'authenticated') {
      setWallets([]);
      return;
    }

    setLoading(true);
    try {
      const rows = await listSharedWallets();
      setWallets(rows);
    } finally {
      setLoading(false);
    }
  }, [cloudSessionState]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['left', 'right', 'top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 20, gap: 12 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={t.primary} />}
      >
        {cloudSessionState !== 'authenticated' ? (
          <View style={{ backgroundColor: t.card, borderRadius: 12, borderWidth: 1, borderColor: t.border, padding: 16 }}>
            <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>Sign in required</Text>
            <Text style={{ color: t.textSecondary, fontSize: 13, marginBottom: 12 }}>
              Shared wallets are linked to your cloud account.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/profile')}
              style={{ backgroundColor: t.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Go to Profile</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {cloudSessionState === 'authenticated' && wallets.length === 0 && !loading ? (
          <View style={{ backgroundColor: t.card, borderRadius: 12, borderWidth: 1, borderColor: t.border, padding: 16 }}>
            <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>No shared wallets yet</Text>
            <Text style={{ color: t.textSecondary, fontSize: 13 }}>
              Enable sharing from a wallet details page, then invite members.
            </Text>
          </View>
        ) : null}

        {wallets.map((wallet) => (
          <TouchableOpacity
            key={wallet.id}
            onPress={() => router.push({ pathname: '/settings/shared-wallets/[id]', params: { id: wallet.id } })}
            style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              padding: 14,
              gap: 6,
            }}
          >
            <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700' }}>{wallet.name}</Text>
            <Text style={{ color: t.textSecondary, fontSize: 12 }}>
              {wallet.memberCount} members • {wallet.role === 'owner' ? 'Owner' : 'Member'} • {wallet.syncStatus}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
