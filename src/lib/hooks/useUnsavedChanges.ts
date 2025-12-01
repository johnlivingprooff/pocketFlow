import { useEffect, useCallback } from 'react';
import { Alert, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Hook to detect and warn about unsaved changes before navigation
 * @param hasUnsavedChanges - Boolean indicating if there are unsaved changes
 * @param message - Custom message to show in the alert (optional)
 */
export function useUnsavedChanges(
  hasUnsavedChanges: boolean,
  message: string = 'You have unsaved changes. Are you sure you want to leave?'
) {
  const router = useRouter();

  const showAlert = useCallback((onProceed: () => void) => {
    Alert.alert(
      'Unsaved changes detected',
      message,
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Proceed', style: 'destructive', onPress: onProceed }
      ],
      { cancelable: true }
    );
  }, [message]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    // Handle Android hardware back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      showAlert(() => router.back());
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, [hasUnsavedChanges, showAlert, router]);

  // Return a function that can be called to prompt before navigation
  const promptBeforeLeaving = useCallback((onProceed?: () => void) => {
    if (hasUnsavedChanges) {
      showAlert(onProceed || (() => router.back()));
    } else {
      onProceed ? onProceed() : router.back();
    }
  }, [hasUnsavedChanges, showAlert, router]);

  return { promptBeforeLeaving };
}

