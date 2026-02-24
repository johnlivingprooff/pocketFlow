import React, { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@/theme/theme';
import { useSettings } from '@/store/useStore';
import { acceptWalletInvitation } from '@/lib/services/cloud/sharedWalletService';

export default function InviteAcceptScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { cloudSessionState, themeMode } = useSettings();
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  const mode = themeMode === 'system' ? systemColorScheme || 'light' : themeMode;
  const t = theme(mode);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'done' | 'error'>('idle');

  const handleAccept = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await acceptWalletInvitation(token);
      setStatus('done');
    } catch {
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['left', 'right', 'top']}>
      <View style={{ flex: 1, padding: 16, paddingTop: 20, justifyContent: 'center' }}>
        <View style={{ backgroundColor: t.card, borderColor: t.border, borderWidth: 1, borderRadius: 12, padding: 16 }}>
          <Text style={{ color: t.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 8 }}>Wallet Invitation</Text>
          {cloudSessionState !== 'authenticated' ? (
            <>
              <Text style={{ color: t.textSecondary, marginBottom: 12 }}>Sign in to accept this invitation.</Text>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/profile', params: { inviteToken: token } })}
                style={{ backgroundColor: t.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Go to Profile</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={{ color: t.textSecondary, marginBottom: 12 }}>
                Accept to join the shared wallet. Invitation links are one-time use.
              </Text>
              <TouchableOpacity
                onPress={handleAccept}
                disabled={loading || status === 'done'}
                style={{ backgroundColor: t.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Accept Invitation</Text>}
              </TouchableOpacity>
              {status === 'done' ? <Text style={{ color: t.success, marginTop: 10 }}>Invitation accepted.</Text> : null}
              {status === 'error' ? <Text style={{ color: t.danger, marginTop: 10 }}>Could not accept invitation.</Text> : null}
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
