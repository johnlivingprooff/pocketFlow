/**
 * Platform and Environment Detection Utilities
 * 
 * Provides utilities to detect JS engine, build type, and environment
 * for debugging release-specific issues.
 */

/**
 * Detect which JavaScript engine is running
 * @returns 'hermes' | 'jsc' | 'v8' | 'unknown'
 */
export function detectJSEngine(): 'hermes' | 'jsc' | 'v8' | 'unknown' {
  // Hermes detection (React Native)
  if (typeof HermesInternal !== 'undefined') {
    return 'hermes';
  }
  
  // JavaScriptCore detection (iOS)
  if (typeof nativePerformanceNow !== 'undefined' || typeof global.nativePerformanceNow !== 'undefined') {
    return 'jsc';
  }
  
  // V8 detection (Chrome, Node)
  if (typeof global.gc === 'function' || typeof (global as any).v8debug !== 'undefined') {
    return 'v8';
  }
  
  return 'unknown';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return __DEV__;
}

/**
 * Check if running in production/release mode
 */
export function isProduction(): boolean {
  return !__DEV__;
}

/**
 * Get detailed environment information
 */
export function getEnvironmentInfo() {
  return {
    jsEngine: detectJSEngine(),
    isDev: isDevelopment(),
    isProduction: isProduction(),
    timestamp: new Date().toISOString(),
    dateNowPrecision: Date.now(),
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
  };
}

/**
 * Log environment information (useful for debugging release builds)
 */
export function logEnvironmentInfo() {
  const info = getEnvironmentInfo();
  console.log('[ENV] Environment Info:', JSON.stringify(info, null, 2));
  return info;
}

/**
 * Check if a number is a safe integer (important for SQLite INTEGER types)
 */
export function isSafeInteger(value: any): boolean {
  return Number.isInteger(value) && Number.isSafeInteger(value);
}

/**
 * Ensure a value is a safe integer, useful for database IDs and order values
 */
export function toSafeInteger(value: any): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Math.floor(num);
}
