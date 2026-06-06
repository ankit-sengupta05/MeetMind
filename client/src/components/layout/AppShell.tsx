// =============================================================================
// client/src/components/layout/AppShell.tsx
// Main app shell with Teams-native sidebar navigation + content outlet
// =============================================================================

import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  makeStyles,
  tokens,
  Text,
  Avatar,
  Tooltip,
  Divider,
} from '@fluentui/react-components';
import {
  GridRegular,
  VideoRegular,
  SearchRegular,
  TaskListSquareLtrRegular,
  SettingsRegular,
  BrainCircuitRegular,
} from '@fluentui/react-icons';
import { useAccount } from '@azure/msal-react';

const NAV_WIDTH = 64;

const useStyles = makeStyles({
  root: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  sidebar: {
    width: `${NAV_WIDTH}px`,
    minWidth: `${NAV_WIDTH}px`,
    backgroundColor: tokens.colorNeutralBackground3,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    gap: tokens.spacingVerticalXS,
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorBrandBackground,
    marginBottom: tokens.spacingVerticalM,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForeground2,
    textDecoration: 'none',
    transition: 'background-color 0.15s, color 0.15s',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1,
    },
  },
  navLinkActive: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
  },
  spacer: {
    flex: 1,
  },
  content: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
});

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function NavItem({ to, icon, label }: NavItemProps) {
  const styles = useStyles();
  return (
    <Tooltip content={label} relationship="label" positioning="after">
      <NavLink
        to={to}
        className={({ isActive }) =>
          `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
        }
      >
        {icon}
      </NavLink>
    </Tooltip>
  );
}

export function AppShell() {
  const styles = useStyles();
  const account = useAccount();

  return (
    <div className={styles.root}>
      {/* Sidebar */}
      <nav className={styles.sidebar}>
        {/* Logo */}
        <div className={styles.logoArea}>
          <BrainCircuitRegular fontSize={22} color="white" />
        </div>

        <NavItem to="/dashboard" icon={<GridRegular fontSize={20} />} label="Dashboard" />
        <NavItem to="/search" icon={<SearchRegular fontSize={20} />} label="Search Meetings" />
        <NavItem to="/actions" icon={<TaskListSquareLtrRegular fontSize={20} />} label="Action Items" />

        <Divider vertical={false} style={{ width: '80%', margin: '4px 0' }} />

        <NavItem to="/settings" icon={<SettingsRegular fontSize={20} />} label="Settings" />

        <div className={styles.spacer} />

        {/* User avatar */}
        <Tooltip content={account?.name ?? 'Account'} relationship="label" positioning="after">
          <Avatar
            name={account?.name}
            size={32}
            style={{ cursor: 'pointer' }}
          />
        </Tooltip>
      </nav>

      {/* Main content */}
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
