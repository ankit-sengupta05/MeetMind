// =============================================================================
// client/src/App.tsx
// Root component – handles auth guard, routing, and layout
// =============================================================================

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import {
  Spinner,
  makeStyles,
  tokens,
} from '@fluentui/react-components';

import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MeetingDetailPage } from './pages/MeetingDetailPage';
import { SearchPage } from './pages/SearchPage';
import { ActionItemsPage } from './pages/ActionItemsPage';
import { SettingsPage } from './pages/SettingsPage';

const useStyles = makeStyles({
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress } = useMsal();
  const styles = useStyles();

  if (inProgress !== 'none') {
    return (
      <div className={styles.loadingContainer}>
        <Spinner label="Signing in to MeetMind..." size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <AuthGuard>
            <AppShell />
          </AuthGuard>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="meetings/:id" element={<MeetingDetailPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="actions" element={<ActionItemsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
