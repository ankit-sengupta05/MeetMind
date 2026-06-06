// =============================================================================
// client/src/pages/LoginPage.tsx
// Login / SSO entry page shown when user is not authenticated
// =============================================================================

import React from 'react';
import { useMsal } from '@azure/msal-react';
import {
  Button,
  Text,
  makeStyles,
  tokens,
  Spinner,
} from '@fluentui/react-components';
import { BrainCircuitRegular } from '@fluentui/react-icons';
import { loginRequest } from '../config/msal';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: tokens.spacingVerticalXL,
    backgroundColor: tokens.colorNeutralBackground1,
    padding: tokens.spacingHorizontalXXL,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalXXL,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusXLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    maxWidth: '380px',
    width: '100%',
    boxShadow: tokens.shadow16,
  },
  logoRing: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    backgroundColor: tokens.colorBrandBackground,
  },
  tagline: {
    color: tokens.colorNeutralForeground2,
    textAlign: 'center',
  },
});

export function LoginPage() {
  const { instance, inProgress } = useMsal();
  const styles = useStyles();
  const isLoading = inProgress !== 'none';

  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.logoRing}>
          <BrainCircuitRegular fontSize={36} color="white" />
        </div>

        <Text size={700} weight="semibold">
          MeetMind
        </Text>

        <Text size={400} className={styles.tagline}>
          Your AI co-pilot that turns every meeting into searchable, actionable knowledge.
        </Text>

        {isLoading ? (
          <Spinner label="Signing in..." />
        ) : (
          <Button
            appearance="primary"
            size="large"
            onClick={handleLogin}
            style={{ width: '100%' }}
          >
            Sign in with Microsoft
          </Button>
        )}
      </div>
    </div>
  );
}
