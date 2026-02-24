import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { theme } from '@/theme/theme';
import { useSettings } from '@/store/useStore';
import {
  createWalletInvitation,
  getSharedWalletDetails,
  getSharedWalletMembers,
  removeWalletMember,
} from '@/lib/services/cloud/sharedWalletService';
import * as Clipboard from 'expo-clipboard';

type WalletState = {
  id: string;
  name: string;
  shareId: string | null;
  role: 'owner' | 'member';
  memberCount: number;
  syncStatus: 'synced' | 'syncing' | 'error';
};

type MemberState = {
  userId: string;
  email: string;
  role: 'owner' | 'member';
  joinedAt: string;
};

export default function SharedWalletDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { themeMode } = useSettings();
  const systemColorScheme = useColorScheme();
  const mode = themeMode === 'system' ? systemColorScheme || 'light' : themeMode;
  const t = theme(mode);

  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [members, setMembers] = useState<MemberState[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    try {
      const [walletData, memberData] = await Promise.all([
        getSharedWalletDetails(id),
        getSharedWalletMembers(id),
      ]);
      setWallet(walletData);
      setMembers(memberData);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleInvite = async () => {
    if (!id) return;
    const invite = await createWalletInvitation(id);
    await Clipboard.setStringAsync(invite.inviteLink);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!id) return;
    await removeWalletMember(id, userId);
    await load();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['left', 'right', 'top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 20, gap: 12 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={t.primary} />}
      >
        {wallet ? (
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 14 }}>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>{wallet.name}</Text>
            <Text style={{ color: t.textSecondary, marginTop: 6, fontSize: 12 }}>
              {wallet.memberCount} members • {wallet.role} • {wallet.syncStatus}
            </Text>
            {wallet.role === 'owner' ? (
              <TouchableOpacity
                onPress={handleInvite}
                style={{ marginTop: 12, backgroundColor: t.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Copy Invite Link</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {members.map((member) => (
          <View
            key={member.userId}
            style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700' }}>{member.email}</Text>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>{member.role}</Text>
            </View>
            {wallet?.role === 'owner' && member.role !== 'owner' ? (
              <TouchableOpacity
                onPress={() => handleRemoveMember(member.userId)}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: t.border }}
              >
                <Text style={{ color: t.textPrimary, fontWeight: '700' }}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
