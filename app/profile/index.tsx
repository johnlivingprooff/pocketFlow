import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, Alert, useColorScheme } from 'react-native';
import { useSettings } from '../../src/store/useStore';
import { theme, shadows } from '../../src/theme/theme';
import * as ImagePicker from 'expo-image-picker';
import { exportData, importData } from '../../src/lib/services/fileService';

export default function ProfilePage() {
  const { themeMode, userInfo, setUserInfo } = useSettings();
  const systemColorScheme = useColorScheme();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);
  const safeUser = userInfo ?? { name: 'User', email: '', phone: '', profileImage: null };
  const [name, setName] = useState(safeUser.name);
  const [email, setEmail] = useState(safeUser.email);
  const [phone, setPhone] = useState(safeUser.phone);
  const [isEditing, setIsEditing] = useState(false);
  const profileImage = safeUser.profileImage;

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
    setUserInfo({ name, email, phone });
    setIsEditing(false);
    Alert.alert('Success', 'Profile updated successfully');
  };

  const handleCancel = () => {
    setName(userInfo.name);
    setEmail(userInfo.email);
    setPhone(userInfo.phone);
    setIsEditing(false);
  };

  const handleExport = async () => {
    try {
      Alert.alert('Export', 'Export feature will create a backup file');
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleImport = async () => {
    try {
      Alert.alert('Import', 'Import feature will restore from backup file');
    } catch (error) {
      Alert.alert('Error', 'Failed to import data');
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.background }}>
      <View style={{ padding: 16 }}>
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
              <Text style={{ fontSize: 18 }}>📷</Text>
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
            {/* Name */}
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
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

            {/* Email */}
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 6 }}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                editable={isEditing}
                placeholder="Enter your email"
                placeholderTextColor={t.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  color: t.textPrimary,
                  fontSize: 16,
                  fontWeight: '600',
                  padding: 0,
                }}
              />
            </View>

            {/* Phone */}
            <View style={{ padding: 16 }}>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 6 }}>Phone</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                editable={isEditing}
                placeholder="Enter your phone number"
                placeholderTextColor={t.textSecondary}
                keyboardType="phone-pad"
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

        {/* Data Management */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>
            DATA MANAGEMENT
          </Text>
          
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, overflow: 'hidden' }}>
            <TouchableOpacity 
              onPress={handleExport}
              style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: t.border }}
            >
              <View>
                <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Export Data</Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>
                  Download all your data
                </Text>
              </View>
              <Text style={{ fontSize: 20 }}>📤</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleImport}
              style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <View>
                <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Import Data</Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>
                  Restore from backup
                </Text>
              </View>
              <Text style={{ fontSize: 20 }}>📥</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <TouchableOpacity onPress={pickImage}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: t.accent }}
              />
            ) : (
              <View style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: t.accent,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 3,
                borderColor: t.accent
              }}>
                <Text style={{ color: t.background, fontSize: 48, fontWeight: '700' }}>{name.charAt(0)}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage} style={{ marginTop: 12 }}>
            <Text style={{ color: t.accent, fontSize: 14, fontWeight: '600' }}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Information */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Personal Information</Text>
          
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: t.textSecondary, fontSize: 14, marginBottom: 8 }}>Name</Text>
            <TextInput
              style={{
                backgroundColor: t.card,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 8,
                padding: 12,
                color: t.textPrimary,
                fontSize: 16
              }}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={t.textSecondary}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: t.textSecondary, fontSize: 14, marginBottom: 8 }}>Email</Text>
            <TextInput
              style={{
                backgroundColor: t.card,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 8,
                padding: 12,
                color: t.textPrimary,
                fontSize: 16
              }}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={t.textSecondary}
              keyboardType="email-address"
            />
          </View>
        </View>

        {/* Data Management */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Data Management</Text>
          
          <TouchableOpacity
            onPress={handleExport}
            style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12
            }}
          >
            <View>
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Export Data</Text>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Save backup as JSON file</Text>
            </View>
            <Text style={{ color: t.accent, fontSize: 20 }}>📤</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleImport}
            style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <View>
              <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>Import Data</Text>
              <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Restore from backup file</Text>
            </View>
            <Text style={{ color: t.accent, fontSize: 20 }}>📥</Text>
          </TouchableOpacity>
        </View>

        {/* Account Preferences */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Account Preferences</Text>
          
          <View style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            padding: 16
          }}>
            <Text style={{ color: t.textSecondary, fontSize: 14, marginBottom: 8 }}>Member since</Text>
            <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>January 2024</Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={{
            backgroundColor: t.accent,
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 32
          }}
        >
          <Text style={{ color: t.background, fontSize: 16, fontWeight: '700' }}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
