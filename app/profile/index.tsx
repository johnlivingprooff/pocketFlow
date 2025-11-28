import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, Alert } from 'react-native';
import { useSettings } from '../../src/store/useStore';
import { theme } from '../../src/theme/theme';
import * as ImagePicker from 'expo-image-picker';
import { exportData, importData } from '../../src/lib/services/fileService';

export default function ProfilePage() {
  const { themeMode } = useSettings();
  const t = theme(themeMode);
  const [name, setName] = useState('User');
  const [email, setEmail] = useState('user@example.com');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
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
        <Text style={{ color: t.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 32 }}>Profile</Text>

        {/* Profile Picture Section */}
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
