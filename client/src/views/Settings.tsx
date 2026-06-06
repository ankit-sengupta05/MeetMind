// =============================================================================
// client/src/views/Settings.tsx
// Basic settings placeholder
// =============================================================================

import React from 'react';
import { Title3, makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    padding: '24px',
  },
});

export function Settings() {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <Title3>Settings</Title3>
      <p style={{ marginTop: '16px' }}>Manage your MeetMind Copilot preferences here.</p>
    </div>
  );
}
