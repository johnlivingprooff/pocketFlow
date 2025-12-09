/**
 * Logging utility for conditional logging in production
 * Logs are only output in development mode or when explicitly enabled
 * 
 * Features:
 * - Operation correlation IDs for tracing
 * - Structured logging with context
 * - Metrics collection for observability
 */

import Constants from 'expo-constants';

// Check if we're in development mode
const isDevelopment = __DEV__;

// Environment variable to enable logging in production (for debugging)
const isLoggingEnabled = Constants.expoConfig?.extra?.enableLogging === true;

/**
 * Generate a unique operation ID for tracing
 * Format: op_<timestamp>_<random>
 */
export function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Log entry interface for structured logging
 */
export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  operationId?: string;
  context?: Record<string, any>;
}

/**
 * Log a message with optional structured context
 * @param message Main log message
 * @param context Additional context data
 * @param operationId Optional operation ID for tracing
 */
export function log(message: string, context?: Record<string, any>, operationId?: string): void {
  if (isDevelopment || isLoggingEnabled) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      operationId,
      context,
    };
    
    // In development, use pretty print
    if (isDevelopment) {
      console.log(message, context || '');
    } else {
      // In production with logging enabled, use structured format
      console.log(JSON.stringify(entry));
    }
  }
}

/**
 * Log a warning with optional structured context
 * @param message Warning message
 * @param context Additional context data
 * @param operationId Optional operation ID for tracing
 */
export function warn(message: string, context?: Record<string, any>, operationId?: string): void {
  if (isDevelopment || isLoggingEnabled) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      operationId,
      context,
    };
    
    if (isDevelopment) {
      console.warn(message, context || '');
    } else {
      console.warn(JSON.stringify(entry));
    }
  }
}

/**
 * Log an error with optional structured context (always logs, even in production)
 * @param message Error message
 * @param context Additional context data (can include error object)
 * @param operationId Optional operation ID for tracing
 */
export function error(message: string, context?: Record<string, any>, operationId?: string): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    message,
    operationId,
    context,
  };
  
  if (isDevelopment) {
    console.error(message, context || '');
  } else {
    console.error(JSON.stringify(entry));
  }
}

/**
 * Log debug information (only in development)
 * @param message Debug message
 * @param context Additional context data
 * @param operationId Optional operation ID for tracing
 */
export function debug(message: string, context?: Record<string, any>, operationId?: string): void {
  if (isDevelopment) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      message,
      operationId,
      context,
    };
    console.debug(message, context || '');
  }
}

/**
 * Simple metrics collector for observability
 */
class MetricsCollector {
  private metrics: Map<string, number> = new Map();
  
  /**
   * Increment a counter metric
   */
  increment(metricName: string, value: number = 1): void {
    const current = this.metrics.get(metricName) || 0;
    this.metrics.set(metricName, current + value);
  }
  
  /**
   * Get current value of a metric
   */
  get(metricName: string): number {
    return this.metrics.get(metricName) || 0;
  }
  
  /**
   * Get all metrics
   */
  getAll(): Record<string, number> {
    const result: Record<string, number> = {};
    this.metrics.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  
  /**
   * Reset a specific metric
   */
  reset(metricName: string): void {
    this.metrics.delete(metricName);
  }
  
  /**
   * Reset all metrics
   */
  resetAll(): void {
    this.metrics.clear();
  }
}

// Global metrics collector instance
export const metrics = new MetricsCollector();
