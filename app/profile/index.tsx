import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  useColorScheme,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import * as ImagePicker from 'expo-image-picker';
import { useAlert } from '../../src/lib/hooks/useAlert';
import { ThemedAlert } from '../../src/components/ThemedAlert';
import { PlusIcon } from '../../src/assets/icons/PlusIcon';
import {
  createCloudAccount,
  deleteCloudAccount,
  signInCloudAccount,
  signOutCloudAccount,
} from '../../src/lib/services/cloud/authService';
import { acceptWalletInvitation } from '../../src/lib/services/cloud/sharedWalletService';

export default function ProfilePage() {
  const { themeMode, userInfo, setUserInfo } = useSettings();
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);
  const { alertConfig, showSuccessAlert, dismissAlert } = useAlert();
  const { inviteToken } = useLocalSearchParams<{ inviteToken?: string }>();
  const safeUser = userInfo ?? { name: 'pFlowr', profileImage: null };
  const [name, setName] = useState(safeUser.name);
  const [isEditing, setIsEditing] = useState(false);
  const [cloudEmail, setCloudEmail] = useState('');
  const [cloudPassword, setCloudPassword] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const profileImage = safeUser.profileImage;
  const { cloudSessionState, cloudUser } = useSettings();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setUserInfo({ profileImage: uri });
    }
  };

  const handleSave = () => {
    setUserInfo({ name });
    setIsEditing(false);
    showSuccessAlert('Success', 'Profile updated successfully');
  };

  const handleCancel = () => {
    setName(userInfo?.name || 'pFlowr');
    setIsEditing(false);
  };

  const handleRegister = async () => {
    setIsSubmittingAuth(true);
    try {
      await createCloudAccount({ email: cloudEmail.trim(), password: cloudPassword });
      showSuccessAlert('Account created', 'Cloud account is ready.');
    } catch {
      showSuccessAlert('Account error', 'Could not create account. Check email/password and try again.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleSignIn = async () => {
    setIsSubmittingAuth(true);
    try {
      await signInCloudAccount({ email: cloudEmail.trim(), password: cloudPassword });
      showSuccessAlert('Signed in', 'Cloud session active.');
    } catch {
      showSuccessAlert('Sign in failed', 'Invalid credentials or network error.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleSignOut = async () => {
    await signOutCloudAccount();
    showSuccessAlert('Signed out', 'Cloud session closed.');
  };

  const handleDeleteAccount = async () => {
    await deleteCloudAccount();
    showSuccessAlert('Account deleted', 'Cloud account removed.');
  };

  const handleAcceptPendingInvite = async () => {
    if (!inviteToken) return;
    setIsSubmittingInvite(true);
    try {
      await acceptWalletInvitation(inviteToken);
      showSuccessAlert('Invitation accepted', 'You have joined the shared wallet.');
      router.replace('/settings/shared-wallets');
    } catch {
      showSuccessAlert('Invite failed', 'Could not accept the invitation. It may be expired.');
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['left', 'right', 'top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: t.background }}
          contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800' }}>Profile</Text>
          {!isEditing ? (
            <TouchableOpacity 
              onPress={() => setIsEditing(true)}
              style={{ backgroundColor: t.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity 
                onPress={handleCancel}
                style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
              >
                <Text style={{ color: t.textPrimary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSave}
                style={{ backgroundColor: t.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Profile Picture Section */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <TouchableOpacity onPress={pickImage} style={{ position: 'relative' }}>
            {safeUser.profileImage ? (
              <Image 
                source={{ uri: safeUser.profileImage }} 
                style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: t.card }}
              />
            ) : (
              <View style={{ 
                width: 120, 
                height: 120, 
                borderRadius: 60, 
                backgroundColor: t.primary, 
                justifyContent: 'center', 
                alignItems: 'center',
                ...shadows.md 
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 48, fontWeight: '700' }}>
                  {name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ 
              position: 'absolute', 
              bottom: 0, 
              right: 0, 
              backgroundColor: t.primary, 
              width: 36, 
              height: 36, 
              borderRadius: 18,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 3,
              borderColor: t.background,
              ...shadows.sm
            }}>
              <PlusIcon size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 12 }}>
            Tap to change photo
          </Text>
        </View>

        {/* Personal Information */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>
            PERSONAL INFORMATION
          </Text>
          
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, overflow: 'hidden' }}>
            <View style={{ padding: 16 }}>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 6 }}>Full Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                editable={isEditing}
                placeholder="Enter your name"
                placeholderTextColor={t.textSecondary}
                style={{
                  color: t.textPrimary,
                  fontSize: 16,
                  fontWeight: '600',
                  padding: 0,
                }}
              />
            </View>
          </View>
        </View>

        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>CLOUD ACCOUNT</Text>
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 16 }}>
            {cloudSessionState === 'authenticated' && cloudUser ? (
              <>
                <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '700' }}>{cloudUser.email}</Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 4 }}>Status: {cloudUser.accountStatus}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                  <TouchableOpacity
                    onPress={handleSignOut}
                    style={{ flex: 1, borderRadius: 8, borderWidth: 1, borderColor: t.border, paddingVertical: 10, alignItems: 'center' }}
                  >
                    <Text style={{ color: t.textPrimary, fontWeight: '700' }}>Logout</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDeleteAccount}
                    style={{ flex: 1, borderRadius: 8, borderWidth: 1, borderColor: t.danger, paddingVertical: 10, alignItems: 'center' }}
                  >
                    <Text style={{ color: t.danger, fontWeight: '700' }}>Delete Account</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <TextInput
                  value={cloudEmail}
                  onChangeText={setCloudEmail}
                  placeholder="Email"
                  placeholderTextColor={t.textSecondary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={{ color: t.textPrimary, borderWidth: 1, borderColor: t.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, marginBottom: 10 }}
                />
                <TextInput
                  value={cloudPassword}
                  onChangeText={setCloudPassword}
                  placeholder="Password (min 8 chars)"
                  placeholderTextColor={t.textSecondary}
                  secureTextEntry
                  style={{ color: t.textPrimary, borderWidth: 1, borderColor: t.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, marginBottom: 10 }}
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={handleRegister}
                    disabled={isSubmittingAuth}
                    style={{ flex: 1, backgroundColor: t.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center', opacity: isSubmittingAuth ? 0.7 : 1 }}
                  >
                    {isSubmittingAuth ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Create Account</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSignIn}
                    disabled={isSubmittingAuth}
                    style={{ flex: 1, borderRadius: 8, borderWidth: 1, borderColor: t.border, paddingVertical: 10, alignItems: 'center', opacity: isSubmittingAuth ? 0.7 : 1 }}
                  >
                    <Text style={{ color: t.textPrimary, fontWeight: '700' }}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {inviteToken && cloudSessionState === 'authenticated' ? (
              <TouchableOpacity
                onPress={handleAcceptPendingInvite}
                disabled={isSubmittingInvite}
                style={{ marginTop: 12, borderRadius: 8, backgroundColor: t.success, paddingVertical: 10, alignItems: 'center', opacity: isSubmittingInvite ? 0.7 : 1 }}
              >
                {isSubmittingInvite ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Accept Pending Invitation</Text>}
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

    {/* Themed Alert Component */}
    <ThemedAlert
      visible={alertConfig.visible}
      title={alertConfig.title}
      message={alertConfig.message}
      buttons={alertConfig.buttons}
      onDismiss={dismissAlert}
      themeMode={effectiveMode}
      systemColorScheme={systemColorScheme || 'light'}
    />
    </SafeAreaView>
  );
}
