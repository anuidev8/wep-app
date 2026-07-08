/**
 * CRIT-6: Error severity classification
 * Distinguishes fatal vs recoverable errors
 */

export enum ErrorSeverity {
  FATAL = 'FATAL',           // Configuration error, can't recover
  RECOVERABLE = 'RECOVERABLE', // Network error, can retry
  WARNING = 'WARNING'         // Non-critical, log but continue
}

export interface CategorizedError {
  error: Error;
  severity: ErrorSeverity;
  category: string;
  code?: string;
  context?: Record<string, any>;
}

/**
 * CRIT-6: Categorize error by severity
 */
export function categorizeError(error: Error | any): CategorizedError {
  const errorMessage = error?.message || String(error);
  const errorCode = error?.code || error?.response?.status;
  
  // FATAL errors - can't recover
  if (errorMessage.includes('ConfigurationError') || 
      errorMessage.includes('package name mismatch') ||
      errorMessage.includes('SDK missing required method')) {
    return {
      error: error instanceof Error ? error : new Error(errorMessage),
      severity: ErrorSeverity.FATAL,
      category: 'CONFIGURATION',
      code: errorCode,
    };
  }
  
  // RECOVERABLE errors - can retry
  if (errorCode === 'ERR_NETWORK' || 
      errorCode === 'ECONNABORTED' ||
      errorCode === 'ETIMEDOUT' ||
      (errorCode >= 500 && errorCode < 600) ||
      errorCode === 408) {
    return {
      error: error instanceof Error ? error : new Error(errorMessage),
      severity: ErrorSeverity.RECOVERABLE,
      category: 'NETWORK',
      code: errorCode,
    };
  }
  
  // WARNING - non-critical
  return {
    error: error instanceof Error ? error : new Error(errorMessage),
    severity: ErrorSeverity.WARNING,
    category: 'UNKNOWN',
    code: errorCode,
  };
}
