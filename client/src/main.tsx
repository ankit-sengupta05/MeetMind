// =============================================================================
// client/src/main.tsx
// React root – wraps app with MSAL, Fluent UI, React Query, Router
// =============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { FluentProvider, teamsLightTheme, teamsDarkTheme } from '@fluentui/react-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter } from 'react-router-dom';
import { app as teamsApp } from '@microsoft/teams-js';

import { msalConfig } from './config/msal';
import { App } from './App';
import './styles/global.css';

const msalInstance = new PublicClientApplication(msalConfig);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,       // 2 min stale time
      gcTime: 1000 * 60 * 10,          // 10 min garbage collect
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

async function bootstrap() {
  // Initialize Teams SDK (no-ops outside Teams context)
  try {
    await teamsApp.initialize();
  } catch {
    // Running outside Teams (e.g. local browser) – fine
  }

  // Detect Teams dark mode preference
  let useDarkTheme = false;
  try {
    const ctx = await teamsApp.getContext();
    useDarkTheme = ctx.app?.theme === 'dark' || ctx.app?.theme === 'contrast';
  } catch {
    useDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  const theme = useDarkTheme ? teamsDarkTheme : teamsLightTheme;

  const root = ReactDOM.createRoot(document.getElementById('root')!);
  root.render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <QueryClientProvider client={queryClient}>
          <FluentProvider theme={theme}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </FluentProvider>
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </MsalProvider>
    </React.StrictMode>
  );
}

bootstrap().catch(console.error);
