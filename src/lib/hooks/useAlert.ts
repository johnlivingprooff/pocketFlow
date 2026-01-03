import { useState, useCallback } from 'react';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive' | 'success';
}

export interface AlertConfig {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
}

export function useAlert() {
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  const showAlert = useCallback((
    title: string,
    message: string,
    buttons?: AlertButton[]
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons: buttons || [{ text: 'OK' }],
    });
  }, []);

  const showErrorAlert = useCallback((title: string, message: string) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons: [{ text: 'OK' }],
    });
  }, []);

  const showSuccessAlert = useCallback((title: string, message: string, onDismiss?: () => void) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons: [{
        text: 'OK',
        onPress: onDismiss,
      }],
    });
  }, []);

  const showConfirmAlert = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons: [
        {
          text: 'Cancel',
          onPress: onCancel,
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: onConfirm,
          style: 'destructive',
        },
      ],
    });
  }, []);

  const dismissAlert = useCallback(() => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  }, []);

  return {
    alertConfig,
    showAlert,
    showErrorAlert,
    showSuccessAlert,
    showConfirmAlert,
    dismissAlert,
    setAlertConfig,
  };
}
