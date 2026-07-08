import { Capacitor } from '@capacitor/core';
import { CapacitorHttp, HttpOptions, HttpResponse } from '@capacitor/core';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * HTTP client utility that uses CapacitorHttp for native platforms (iOS/Android)
 * to bypass CORS restrictions, and falls back to axios for web development.
 * 
 * This solves CORS issues when making requests to external APIs like systeme.io
 */

interface HttpClientResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

/**
 * Check if we're running on a native platform
 */
const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Transform URL to use Vite proxy for web development
 * This converts https://api.systeme.io/api/* to /api/systeme/*
 */
const transformUrlForWeb = (url: string): string => {
  if (isNativePlatform()) {
    return url; // No transformation needed for native
  }
  
  // Check if URL is for systeme.io API
  if (url.includes('api.systeme.io')) {
    // Replace https://api.systeme.io/api with /api/systeme
    return url.replace(/https?:\/\/api\.systeme\.io\/api/g, '/api/systeme');
  }
  
  return url;
};

/**
 * Convert CapacitorHttp response to a consistent format
 */
const normalizeCapacitorResponse = <T>(response: HttpResponse): HttpClientResponse<T> => {
  return {
    data: response.data as T,
    status: response.status,
    headers: response.headers as Record<string, string>,
  };
};

/**
 * Convert axios response to a consistent format
 */
const normalizeAxiosResponse = <T>(response: AxiosResponse<T>): HttpClientResponse<T> => {
  return {
    data: response.data,
    status: response.status,
    headers: response.headers as Record<string, string>,
  };
};

/**
 * Make an HTTP GET request
 */
export const httpGet = async <T = any>(
  url: string,
  config?: {
    headers?: Record<string, string>;
    params?: Record<string, string>;
  }
): Promise<HttpClientResponse<T>> => {
  if (isNativePlatform()) {
    // Use CapacitorHttp for native platforms (bypasses CORS)
    const options: HttpOptions = {
      url,
      headers: config?.headers || {},
      params: config?.params || {},
    };
    const response = await CapacitorHttp.get(options);
    return normalizeCapacitorResponse<T>(response);
  } else {
    // Use axios for web (with Vite proxy in development)
    const proxiedUrl = transformUrlForWeb(url);
    const axiosConfig: AxiosRequestConfig = {
      headers: config?.headers,
      params: config?.params,
    };
    const response = await axios.get<T>(proxiedUrl, axiosConfig);
    return normalizeAxiosResponse<T>(response);
  }
};

/**
 * Make an HTTP POST request
 */
export const httpPost = async <T = any>(
  url: string,
  data?: any,
  config?: {
    headers?: Record<string, string>;
  }
): Promise<HttpClientResponse<T>> => {
  if (isNativePlatform()) {
    // Use CapacitorHttp for native platforms
    const options: HttpOptions = {
      url,
      headers: config?.headers || {},
      data,
    };
    const response = await CapacitorHttp.post(options);
    return normalizeCapacitorResponse<T>(response);
  } else {
    // Use axios for web (with Vite proxy in development)
    const proxiedUrl = transformUrlForWeb(url);
    const axiosConfig: AxiosRequestConfig = {
      headers: config?.headers,
    };
    const response = await axios.post<T>(proxiedUrl, data, axiosConfig);
    return normalizeAxiosResponse<T>(response);
  }
};

/**
 * Make an HTTP PATCH request
 */
export const httpPatch = async <T = any>(
  url: string,
  data?: any,
  config?: {
    headers?: Record<string, string>;
  }
): Promise<HttpClientResponse<T>> => {
  if (isNativePlatform()) {
    // Use CapacitorHttp for native platforms
    const options: HttpOptions = {
      url,
      method: 'PATCH',
      headers: config?.headers || {},
      data,
    };
    const response = await CapacitorHttp.request(options);
    return normalizeCapacitorResponse<T>(response);
  } else {
    // Use axios for web (with Vite proxy in development)
    const proxiedUrl = transformUrlForWeb(url);
    const axiosConfig: AxiosRequestConfig = {
      headers: config?.headers,
    };
    const response = await axios.patch<T>(proxiedUrl, data, axiosConfig);
    return normalizeAxiosResponse<T>(response);
  }
};

/**
 * Make an HTTP DELETE request
 */
export const httpDelete = async <T = any>(
  url: string,
  config?: {
    headers?: Record<string, string>;
  }
): Promise<HttpClientResponse<T>> => {
  if (isNativePlatform()) {
    // Use CapacitorHttp for native platforms
    const options: HttpOptions = {
      url,
      headers: config?.headers || {},
    };
    const response = await CapacitorHttp.delete(options);
    return normalizeCapacitorResponse<T>(response);
  } else {
    // Use axios for web (with Vite proxy in development)
    const proxiedUrl = transformUrlForWeb(url);
    const axiosConfig: AxiosRequestConfig = {
      headers: config?.headers,
    };
    const response = await axios.delete<T>(proxiedUrl, axiosConfig);
    return normalizeAxiosResponse<T>(response);
  }
};

/**
 * Make a generic HTTP request
 */
export const httpRequest = async <T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  config?: {
    headers?: Record<string, string>;
    params?: Record<string, string>;
    data?: any;
  }
): Promise<HttpClientResponse<T>> => {
  if (isNativePlatform()) {
    // Use CapacitorHttp for native platforms
    const options: HttpOptions = {
      url,
      method,
      headers: config?.headers || {},
      params: config?.params,
      data: config?.data,
    };
    const response = await CapacitorHttp.request(options);
    return normalizeCapacitorResponse<T>(response);
  } else {
    // Use axios for web (with Vite proxy in development)
    const proxiedUrl = transformUrlForWeb(url);
    const axiosConfig: AxiosRequestConfig = {
      url: proxiedUrl,
      method,
      headers: config?.headers,
      params: config?.params,
      data: config?.data,
    };
    const response = await axios.request<T>(axiosConfig);
    return normalizeAxiosResponse<T>(response);
  }
};
