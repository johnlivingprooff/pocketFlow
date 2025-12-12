import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CUSTOM_EMOJIS_KEY = '@pocketFlow:customEmojis';

interface EmojiPickerProps {
  selectedEmoji: string;
  onEmojiSelected: (emoji: string) => void;
  themeColors: {
    background: string;
    card: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
    primary: string;
    accent: string;
  };
}

const DEFAULT_EMOJIS = [
  '🍔', '🍕', '🚗', '🏠', '🛒', '💊', '🎬', '📚',
  '💰', '💼', '📈', '🎁', '👕', '✈️', '🎓', '💳',
  '⚡', '💧', '🔧', '🌾', '🏭', '🚌', '📱', '🏥',
  '⛽', '🏦', '📊', '🎯', '🏪', '🍽️', '🎮', '🏋️',
];

/**
 * Validates if a string contains only emoji characters
 * Rejects text, numbers, and mixed content
 */
const isValidEmoji = (input: string): boolean => {
  if (!input || input.trim().length === 0) return false;
  
  // Remove whitespace
  const trimmed = input.trim();
  
  // Check if it's purely emoji (Unicode emoji pattern)
  // This regex matches emoji characters and rejects regular text/numbers
  const emojiRegex = /^[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Presentation}]+$/u;
  
  // Also check it's not just whitespace or regular characters
  const hasOnlyEmoji = emojiRegex.test(trimmed);
  const hasNoLettersOrDigits = !/[a-zA-Z0-9]/.test(trimmed);
  
  return hasOnlyEmoji && hasNoLettersOrDigits && trimmed.length <= 4; // Max 4 chars for emoji combinations
};

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ 
  selectedEmoji, 
  onEmojiSelected, 
  themeColors 
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [customEmoji, setCustomEmoji] = useState('');
  const [error, setError] = useState('');
  const [customEmojis, setCustomEmojis] = useState<string[]>([]);

  // Load custom emojis from AsyncStorage on mount
  useEffect(() => {
    loadCustomEmojis();
  }, []);

  const loadCustomEmojis = async () => {
    try {
      const stored = await AsyncStorage.getItem(CUSTOM_EMOJIS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCustomEmojis(parsed);
      }
    } catch (error) {
      console.error('Failed to load custom emojis:', error);
    }
  };

  const saveCustomEmojis = async (emojis: string[]) => {
    try {
      await AsyncStorage.setItem(CUSTOM_EMOJIS_KEY, JSON.stringify(emojis));
    } catch (error) {
      console.error('Failed to save custom emojis:', error);
    }
  };

  const handleCustomEmojiSubmit = async () => {
    if (isValidEmoji(customEmoji)) {
      const trimmedEmoji = customEmoji.trim();
      
      // Add to custom emojis list if not already present
      if (!customEmojis.includes(trimmedEmoji) && !DEFAULT_EMOJIS.includes(trimmedEmoji)) {
        const updatedEmojis = [...customEmojis, trimmedEmoji];
        setCustomEmojis(updatedEmojis);
        await saveCustomEmojis(updatedEmojis);
      }
      
      // Auto-select the newly added emoji
      onEmojiSelected(trimmedEmoji);
      
      setCustomEmoji('');
      setError('');
      setModalVisible(false);
    } else {
      setError('Please enter only emoji characters (no text or numbers)');
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    onEmojiSelected(emoji);
  };

  // Combine default and custom emojis
  const allEmojis = [...DEFAULT_EMOJIS, ...customEmojis];

  return (
    <View>
      {/* Emoji Grid */}
      <View style={styles.emojiGrid}>
        {allEmojis.map((emoji, index) => (
          <TouchableOpacity
            key={`${emoji}-${index}`}
            onPress={() => handleEmojiSelect(emoji)}
            style={[
              styles.emojiButton,
              {
                backgroundColor: selectedEmoji === emoji ? themeColors.primary : themeColors.card,
                borderColor: selectedEmoji === emoji ? themeColors.primary : themeColors.border,
              }
            ]}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </TouchableOpacity>
        ))}
        
        {/* Add Custom Emoji Button */}
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={[
            styles.emojiButton,
            styles.addButton,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.primary,
              borderStyle: 'dashed',
            }
          ]}
        >
          <Text style={[styles.addButtonText, { color: themeColors.primary }]}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Custom Emoji Input Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModalVisible(false);
          setCustomEmoji('');
          setError('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
              Add Custom Emoji
            </Text>
            <Text style={[styles.modalDescription, { color: themeColors.textSecondary }]}>
              Enter an emoji (text and numbers not allowed)
            </Text>

            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: themeColors.background,
                  borderColor: error ? '#EF4444' : themeColors.border,
                  color: themeColors.textPrimary,
                }
              ]}
              value={customEmoji}
              onChangeText={(text) => {
                setCustomEmoji(text);
                if (error) setError('');
              }}
              placeholder="Type emoji here..."
              placeholderTextColor={themeColors.textSecondary}
              autoFocus
              maxLength={4}
            />

            {error && (
              <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setCustomEmoji('');
                  setError('');
                }}
                style={[styles.modalButton, { backgroundColor: themeColors.background }]}
              >
                <Text style={[styles.modalButtonText, { color: themeColors.textPrimary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleCustomEmojiSubmit}
                style={[styles.modalButton, { backgroundColor: themeColors.accent }]}
              >
                <Text style={[styles.modalButtonText, { color: themeColors.background }]}>
                  Add
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emojiButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 28,
  },
  addButton: {
    borderWidth: 2,
  },
  addButtonText: {
    fontSize: 32,
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
