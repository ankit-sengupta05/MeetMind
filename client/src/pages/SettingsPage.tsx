// =============================================================================
// client/src/pages/SettingsPage.tsx
// User & tenant preference settings
// =============================================================================

import React from 'react';
import {
  Text,
  Switch,
  Select,
  Button,
  makeStyles,
  tokens,
  Divider,
  Field,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    padding: tokens.spacingVerticalXL,
    maxWidth: '640px',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacingVerticalS} 0`,
  },
});

export function SettingsPage() {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <div>
        <Text size={800} weight="semibold" block>Settings</Text>
        <Text size={400} style={{ color: tokens.colorNeutralForeground2 }}>
          Configure MeetMind preferences for your account
        </Text>
      </div>

      <Divider />

      {/* AI Behaviour */}
      <div className={styles.section}>
        <Text size={500} weight="semibold">AI Behaviour</Text>

        <div className={styles.row}>
          <div>
            <Text weight="semibold" block>Auto-generate summary</Text>
            <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
              Automatically run the summary agent after each meeting ends
            </Text>
          </div>
          <Switch defaultChecked />
        </div>

        <div className={styles.row}>
          <div>
            <Text weight="semibold" block>Auto-create Planner tasks</Text>
            <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
              Sync extracted action items to Microsoft Planner automatically
            </Text>
          </div>
          <Switch defaultChecked />
        </div>

        <div className={styles.row}>
          <div>
            <Text weight="semibold" block>Sentiment analysis</Text>
            <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
              Detect and display meeting sentiment in summaries
            </Text>
          </div>
          <Switch />
        </div>
      </div>

      <Divider />

      {/* Notifications */}
      <div className={styles.section}>
        <Text size={500} weight="semibold">Notifications</Text>

        <Field label="Digest frequency">
          <Select defaultValue="daily" style={{ maxWidth: 200 }}>
            <option value="off">Off</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </Select>
        </Field>

        <div className={styles.row}>
          <div>
            <Text weight="semibold" block>Email summary after meeting</Text>
            <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
              Send a summary email to all participants
            </Text>
          </div>
          <Switch defaultChecked />
        </div>
      </div>

      <Divider />

      {/* Data retention */}
      <div className={styles.section}>
        <Text size={500} weight="semibold">Data &amp; Privacy</Text>

        <Field label="Meeting data retention">
          <Select defaultValue="365" style={{ maxWidth: 200 }}>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="365">1 year</option>
            <option value="0">Forever</option>
          </Select>
        </Field>
      </div>

      <Button appearance="primary" style={{ alignSelf: 'flex-start' }}>
        Save Preferences
      </Button>
    </div>
  );
}
