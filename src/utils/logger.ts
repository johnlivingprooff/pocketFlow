/**
 * Logging utility for conditional logging in production
 * Logs are only output in development mode or when explicitly enabled
 */

import Constants from 'expo-constants';

// Check if we're in development mode
const isDevelopment = __DEV__;

// Environment variable to enable logging in production (for debugging)
const isLoggingEnabled = Constants.expoConfig?.extra?.enableLogging === true;

/**
 * Log a message (only in development or when explicitly enabled)
 * @param message Main log message
 * @param args Additional arguments to log
 */
export function log(message: string, ...args: any[]): void {
  if (isDevelopment || isLoggingEnabled) {
    console.log(message, ...args);
  }
}

/**
 * Log a warning (only in development or when explicitly enabled)
 * @param message Warning message
 * @param args Additional arguments to log
 */
export function warn(message: string, ...args: any[]): void {
  if (isDevelopment || isLoggingEnabled) {
    console.warn(message, ...args);
  }
}

/**
 * Log an error (always logs, even in production)
 * @param message Error message
 * @param args Additional arguments to log
 */
export function error(message: string, ...args: any[]): void {
  console.error(message, ...args);
}

/**
 * Log debug information (only in development)
 * @param message Debug message
 * @param args Additional arguments to log
 */
export function debug(message: string, ...args: any[]): void {
  if (isDevelopment) {
    console.debug(message, ...args);
  }
}
