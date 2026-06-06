// =============================================================================
// client/src/api/apiClient.ts
// Axios instance with MSAL token injection
// =============================================================================

import axios, { type AxiosInstance } from 'axios';
import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';
import { msalConfig, apiScope } from '../config/msal';

const msalInstance = new PublicClientApplication(msalConfig);

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env['VITE_API_BASE_URL'] ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// Request interceptor – attach Bearer token from MSAL
apiClient.interceptors.request.use(async (config) => {
  try {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) return config;

    const tokenResponse = await msalInstance.acquireTokenSilent({
      scopes: [apiScope],
      account: accounts[0],
    });

    config.headers['Authorization'] = `Bearer ${tokenResponse.accessToken}`;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      await msalInstance.acquireTokenPopup({ scopes: [apiScope] });
    }
  }
  return config;
});

// Response interceptor – normalise errors
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const message =
      error.response?.data?.error ?? error.message ?? 'Unknown API error';
    return Promise.reject(new Error(message));
  }
);
