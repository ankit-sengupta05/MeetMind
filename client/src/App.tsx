// =============================================================================
// client/src/App.tsx
// Root App Shell — Teams Context, MSAL Auth, Fluent theming, and Routing
// =============================================================================

import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { app as teamsApp } from '@microsoft/teams-js';
import {
  FluentProvider,
  teamsLightTheme,
  teamsDarkTheme,
  teamsHighContrastTheme,
  Spinner,
  makeStyles,
  tokens,
  TabList,
  Tab,
} from '@fluentui/react-components';

import { LiveMeeting } from './views/LiveMeeting';
import { History } from './views/History';
import { Search } from './views/Search';
import { Tasks } from './views/Tasks';
import { Settings } from './views/Settings';
import { MeetingSummary } from './views/MeetingSummary'; // We'll create a basic one

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
  },
  header: {
    padding: '0 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  content: {
    flexGrow: 1,
    overflow: 'auto',
    position: 'relative',
  },
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
  const { inProgress, instance } = useMsal();
  const styles = useStyles();

  useEffect(() => {
    if (!isAuthenticated && inProgress === 'none') {
      // In a real Teams Tab, we'd use teamsApp.authentication.authenticate()
      // For local dev with browser, standard redirect works.
      instance.loginRedirect().catch(console.error);
    }
  }, [isAuthenticated, inProgress, instance]);

  if (!isAuthenticated || inProgress !== 'none') {
    return (
      <div className={styles.loadingContainer}>
        <Spinner label="Authenticating..." size="large" />
      </div>
    );
  }

  return <>{children}</>;
}

export function App() {
  const [theme, setTheme] = useState(teamsLightTheme);
  const [isTeamsInitialized, setIsTeamsInitialized] = useState(false);
  const styles = useStyles();
  const location = useLocation();

  useEffect(() => {
    teamsApp.initialize().then(() => {
      setIsTeamsInitialized(true);
      teamsApp.getContext().then(context => {
        switch (context.app.theme) {
          case 'dark':
            setTheme(teamsDarkTheme);
            break;
          case 'contrast':
            setTheme(teamsHighContrastTheme);
            break;
          default:
            setTheme(teamsLightTheme);
            break;
        }
      });
      
      teamsApp.registerOnThemeChangeHandler((themeString) => {
        if (themeString === 'dark') setTheme(teamsDarkTheme);
        else if (themeString === 'contrast') setTheme(teamsHighContrastTheme);
        else setTheme(teamsLightTheme);
      });
    }).catch(() => {
      // Fallback for browser testing without Teams context
      setIsTeamsInitialized(true);
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme(teamsDarkTheme);
      }
    });
  }, []);

  if (!isTeamsInitialized) {
    return null; // Wait for Teams context to apply correct theme before rendering FluentProvider
  }

  // Derive active tab from path
  const currentPath = location.pathname;
  let activeTab = 'history';
  if (currentPath.includes('live')) activeTab = 'live';
  else if (currentPath.includes('search')) activeTab = 'search';
  else if (currentPath.includes('tasks')) activeTab = 'tasks';
  else if (currentPath.includes('settings')) activeTab = 'settings';

  return (
    <FluentProvider theme={theme} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <AuthGuard>
        <div className={styles.container}>
          <div className={styles.header}>
            <TabList selectedValue={activeTab}>
              <Tab value="live" ><Link to="/live" style={{ color: 'inherit', textDecoration: 'none' }}>Live Meeting</Link></Tab>
              <Tab value="history" ><Link to="/history" style={{ color: 'inherit', textDecoration: 'none' }}>History</Link></Tab>
              <Tab value="search" ><Link to="/search" style={{ color: 'inherit', textDecoration: 'none' }}>Search</Link></Tab>
              <Tab value="tasks" ><Link to="/tasks" style={{ color: 'inherit', textDecoration: 'none' }}>Tasks</Link></Tab>
              <Tab value="settings" ><Link to="/settings" style={{ color: 'inherit', textDecoration: 'none' }}>Settings</Link></Tab>
            </TabList>
          </div>
          <div className={styles.content}>
            <Routes>
              <Route path="/" element={<Navigate to="/history" replace />} />
              <Route path="/live" element={<LiveMeeting />} />
              <Route path="/history" element={<History />} />
              <Route path="/meetings/:id" element={<MeetingSummary />} />
              <Route path="/search" element={<Search />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/history" replace />} />
            </Routes>
          </div>
        </div>
      </AuthGuard>
    </FluentProvider>
  );
}
