import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, useColorScheme, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { theme } from '../theme/theme';
import { useSettings } from '../store/useStore';
import { CATEGORY_ICONS } from '../assets/icons/CategoryIcons';

export interface SelectOption {
  id: string | number;
  label: string;
  secondaryLabel?: string;
  icon?: string;
  indent?: number; // For hierarchy display (0 = parent, 1+ = children)
  isParent?: boolean; // Indicates if this is a parent category
}

interface SelectModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (option: SelectOption) => void;
  options: SelectOption[];
  selectedId?: string | number;
  title?: string;
  searchable?: boolean;
  multiline?: boolean;
  hierarchical?: boolean; // Enable hierarchy display
}

export function SelectModal({
  visible,
  onClose,
  onSelect,
  options,
  selectedId,
  title = 'Select',
  searchable = true,
  multiline = false,
  hierarchical = false,
}: SelectModalProps) {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettings();
  const effectiveMode = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const t = theme(effectiveMode);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;

    const query = searchQuery.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        (option.secondaryLabel && option.secondaryLabel.toLowerCase().includes(query))
    );
  }, [options, searchQuery]);

  const handleSelect = (option: SelectOption) => {
    // Don't allow selecting parent categories in hierarchical mode (unless explicitly set)
    if (hierarchical && option.isParent && option.indent === 0) {
      return;
    }
    onSelect(option);
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
      >
        <View style={{ backgroundColor: t.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' }}>
          {/* Header */}
          <View
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: t.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800' }}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: t.textSecondary, fontSize: 28, lineHeight: 28 }}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          {searchable && (
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search..."
                placeholderTextColor={t.textSecondary}
                style={{
                  backgroundColor: t.background,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: t.textPrimary,
                  fontSize: 14,
                }}
              />
            </View>
          )}

          {/* Options List */}
          <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
            {filteredOptions.length === 0 ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <Text style={{ color: t.textSecondary, fontSize: 14 }}>No options found</Text>
              </View>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.id === selectedId;
                const isDisabled = hierarchical && option.isParent && option.indent === 0;
                const indent = hierarchical ? (option.indent || 0) * 16 : 0;
                
                return (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => !isDisabled && handleSelect(option)}
                    disabled={isDisabled}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      marginLeft: indent,
                      backgroundColor: isSelected ? t.primary + '15' : isDisabled ? t.background + '60' : t.background,
                      borderWidth: 1,
                      borderColor: isSelected ? t.primary : t.border,
                      borderRadius: 8,
                      marginBottom: 8,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      opacity: isDisabled ? 0.6 : 1,
                    }}
                  >
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      {option.icon && (
                        <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
                          {typeof option.icon === 'string' && CATEGORY_ICONS[option.icon.toLowerCase() as keyof typeof CATEGORY_ICONS] 
                            ? React.createElement(CATEGORY_ICONS[option.icon.toLowerCase() as keyof typeof CATEGORY_ICONS], {
                                size: 20,
                                color: isSelected ? t.primary : isDisabled ? t.textSecondary : t.textPrimary,
                              })
                            : <Text style={{ fontSize: 20 }}>{option.icon}</Text>
                          }
                        </View>
                      )}
                      {hierarchical && (option.indent || 0) > 0 && (
                        <Text style={{ color: t.textSecondary, fontSize: 12, marginRight: 4 }}>↳</Text>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: isSelected ? t.primary : isDisabled ? t.textSecondary : t.textPrimary,
                            fontWeight: option.isParent ? '700' : '600',
                            fontSize: option.isParent ? 15 : 14,
                          }}
                          numberOfLines={multiline ? 0 : 1}
                        >
                          {option.label}
                        </Text>
                      </View>
                    </View>
                    {option.secondaryLabel && !isDisabled && (
                      <Text style={{ color: t.textSecondary, fontSize: 12, marginLeft: 8 }}>
                        {option.secondaryLabel}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
