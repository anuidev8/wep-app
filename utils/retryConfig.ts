/**
 * CRIT-5: Network retry configuration with jitter
 * HIGH-5: Distinguishes retryable vs non-retryable errors
 * HIGH-17: Respects Retry-After header for 429 errors
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  jitterPercent: number;
}

export const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  jitterPercent: 25, // ±25% jitter
};

/**
 * CRIT-5: Calculate backoff delay with jitter
 * Prevents thundering herd problem by randomizing retry times
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig = defaultRetryConfig
): number {
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt - 1);
  
  // Add random jitter: ±jitterPercent% of delay
  const jitter = exponentialDelay * (config.jitterPercent / 100) * (Math.random() * 2 - 1);
  
  const delay = exponentialDelay + jitter;
  
  // Cap at maxDelay
  return Math.min(Math.max(delay, 0), config.maxDelay);
}

/**
 * HIGH-5: Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Network errors - always retry
  if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
    return true;
  }
  
  const status = error.response?.status;
  
  // 5xx errors - retry (server errors)
  if (status >= 500 && status < 600) {
    return true;
  }
  
  // 408 Request Timeout - retry
  if (status === 408) {
    return true;
  }
  
  // 429 Rate Limit - retry but respect retry-after header
  if (status === 429) {
    return true; // But use special handling
  }
  
  // 4xx errors - don't retry (client errors)
  return false;
}

/**
 * HIGH-17: Get retry delay respecting Retry-After header
 */
export function getRetryDelay(
  error: any,
  attempt: number,
  config: RetryConfig = defaultRetryConfig
): number {
  // If 429 and Retry-After header present, use it
  if (error.response?.status === 429) {
    const retryAfter = error.response.headers['retry-after'];
    if (retryAfter) {
      const delay = parseInt(retryAfter) * 1000; // Convert to milliseconds
      return Math.min(delay, config.maxDelay);
    }
  }
  
  // Otherwise use exponential backoff with jitter
  return calculateBackoffDelay(attempt, config);
}
