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

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    // Handle Android hardware back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (hasUnsavedChanges) {
        Alert.alert(
          'Uncommitted changes detected',
          message,
          [
            { text: 'Stay', style: 'cancel' },
            { text: 'Proceed', style: 'destructive', onPress: () => router.back() }
          ],
          { cancelable: true }
        );
        return true; // Prevent default back behavior
      }
      return false;
    });

    return () => backHandler.remove();
  }, [hasUnsavedChanges, message, router]);

  // Return a function that can be called to prompt before navigation
  const promptBeforeLeaving = useCallback(() => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Uncommitted changes detected',
        message,
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Proceed', style: 'destructive', onPress: () => router.back() }
        ],
        { cancelable: true }
      );
    } else {
      router.back();
    }
  }, [hasUnsavedChanges, message, router]);

  return { promptBeforeLeaving };
}
