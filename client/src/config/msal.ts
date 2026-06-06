// =============================================================================
// client/src/config/msal.ts
// MSAL browser configuration for Azure AD SSO
// =============================================================================

import type { Configuration, PopupRequest } from '@azure/msal-browser';
import { LogLevel } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env['VITE_AZURE_AD_CLIENT_ID'] as string,
    authority: `https://login.microsoftonline.com/${import.meta.env['VITE_AZURE_AD_TENANT_ID']}`,
    redirectUri: import.meta.env['VITE_REDIRECT_URI'] as string ?? window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'sessionStorage',   // sessionStorage is safer in Teams iframes
    storeAuthStateInCookie: false,
    secureCookies: true,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        if (import.meta.env.DEV) {
          console.log(`[MSAL][${LogLevel[level]}] ${message}`);
        }
      },
      logLevel: import.meta.env.DEV ? LogLevel.Info : LogLevel.Error,
    },
  },
};

/** Scopes requested on login and for API calls */
export const loginRequest: PopupRequest = {
  scopes: [
    'openid',
    'profile',
    'User.Read',
    'Tasks.ReadWrite',
    'Calendars.Read',
    'OnlineMeetings.Read',
  ],
};

/** Scope for calling our own MeetMind API backend */
export const apiScope = `api://${import.meta.env['VITE_AZURE_AD_CLIENT_ID']}/MeetMind.ReadWrite`;
