import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export interface BiometricCheckResult {
  isAvailable: boolean;
  biometricType: string;
  error?: string;
}

/**
 * Check if biometric authentication is available on the device
 */
export async function checkBiometricAvailability(): Promise<BiometricCheckResult> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();

    if (!compatible) {
      return {
        isAvailable: false,
        biometricType: 'none',
        error: 'Biometric hardware not available on this device',
      };
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();

    if (!enrolled) {
      return {
        isAvailable: false,
        biometricType: 'none',
        error: 'No biometric credentials enrolled. Please set up biometrics in device settings.',
      };
    }

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    let biometricType = 'Biometric';

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometricType = 'Iris Recognition';
    }

    return {
      isAvailable: true,
      biometricType,
    };
  } catch (error) {
    return {
      isAvailable: false,
      biometricType: 'none',
      error: 'Error checking biometric availability',
    };
  }
}

/**
 * Authenticate user with biometrics
 */
export async function authenticateWithBiometrics(
  promptMessage: string = 'Authenticate to access PocketFlow',
  options: { cancelLabel?: string; disableDeviceFallback?: boolean } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: options.disableDeviceFallback ?? false,
      cancelLabel: options.cancelLabel || 'Cancel',
    });

    if (result.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: result.error === 'user_cancel'
          ? 'Authentication cancelled'
          : 'Authentication failed',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'An error occurred during authentication',
    };
  }
}

/**
 * Check if biometric authentication should be required
 * Based on last auth time and session timeout (5 minutes)
 */
export function shouldRequireAuth(lastAuthTime: number | null): boolean {
  if (!lastAuthTime) return true;

  const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
  const now = Date.now();

  return (now - lastAuthTime) > SESSION_TIMEOUT;
}
