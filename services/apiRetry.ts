import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { isRetryableError, getRetryDelay, defaultRetryConfig, RetryConfig } from '../utils/retryConfig';

/**
 * CRIT-5: Retry interceptor with jitter and error type checking
 * HIGH-12: Request deduplication for retries
 * HIGH-17: Respects Retry-After header
 */
export function createRetryInterceptor(config: RetryConfig = defaultRetryConfig) {
  // HIGH-12: Request deduplication
  const requestFingerprints = new Map<string, number>();
  
  return async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number };
    
    // Don't retry if already retried or not retryable
    if (originalRequest._retry || !isRetryableError(error)) {
      return Promise.reject(error);
    }
    
    // HIGH-12: Only retry GET requests (safe to retry)
    if (originalRequest.method?.toUpperCase() !== 'GET') {
      return Promise.reject(error);
    }
    
    // Initialize retry count
    originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
    
    // Check if max retries exceeded
    if (originalRequest._retryCount > config.maxRetries) {
      return Promise.reject(error);
    }
    
    // HIGH-12: Request deduplication
    const fingerprint = `${originalRequest.method}-${originalRequest.url}-${JSON.stringify(originalRequest.params)}`;
    const lastRetry = requestFingerprints.get(fingerprint) || 0;
    const now = Date.now();
    
    // If same request retried within last second, skip
    if (now - lastRetry < 1000) {
      return Promise.reject(error);
    }
    requestFingerprints.set(fingerprint, now);
    
    // CRIT-5: Calculate delay with jitter
    const delay = getRetryDelay(error, originalRequest._retryCount, config);
    
    console.log(`[ApiRetry] Retrying request (attempt ${originalRequest._retryCount}/${config.maxRetries}) after ${delay}ms`);
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Mark as retried
    originalRequest._retry = true;
    
    // Retry request
    return axios(originalRequest);
  };
}
