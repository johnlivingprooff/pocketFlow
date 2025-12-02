import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { theme as getTheme } from '../theme/theme';

interface ThemedAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>;
  onDismiss?: () => void;
  themeMode: 'light' | 'dark' | 'system';
  systemColorScheme?: 'light' | 'dark';
}

export function ThemedAlert({
  visible,
  title,
  message,
  buttons = [{ text: 'OK' }],
  onDismiss,
  themeMode,
  systemColorScheme = 'light'
}: ThemedAlertProps) {
  const t = getTheme(themeMode, systemColorScheme);

  const handleButtonPress = (button: typeof buttons[0]) => {
    button.onPress?.();
    onDismiss?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16
      }}>
        <View style={{
          backgroundColor: t.card,
          borderRadius: 16,
          padding: 20,
          width: '100%',
          maxWidth: 320,
          borderWidth: 1,
          borderColor: t.border
        }}>
          <Text style={{
            color: t.textPrimary,
            fontSize: 18,
            fontWeight: '800',
            marginBottom: 12
          }}>
            {title}
          </Text>
          <Text style={{
            color: t.textSecondary,
            fontSize: 14,
            marginBottom: 20,
            lineHeight: 20
          }}>
            {message}
          </Text>
          <View style={{
            flexDirection: buttons.length > 2 ? 'column' : 'row',
            gap: 8,
            justifyContent: 'flex-end'
          }}>
            {buttons.map((button, index) => {
              const isDestructive = button.style === 'destructive';
              const isCancel = button.style === 'cancel';
              
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleButtonPress(button)}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 8,
                    backgroundColor: isDestructive ? '#E74C3C' : isCancel ? t.card : t.accent,
                    borderWidth: isCancel ? 1 : 0,
                    borderColor: isCancel ? t.border : 'transparent',
                    flex: buttons.length > 2 ? 1 : 0,
                    minWidth: buttons.length <= 2 ? 80 : undefined
                  }}
                >
                  <Text style={{
                    color: isCancel ? t.textPrimary : '#FFFFFF',
                    fontSize: 14,
                    fontWeight: '700',
                    textAlign: 'center'
                  }}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
