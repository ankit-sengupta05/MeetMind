// =============================================================================
// client/src/views/History.tsx
// Dashboard showing grid of past meetings
// =============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Title3, Spinner, makeStyles, tokens, Button } from '@fluentui/react-components';
import { ArrowClockwiseRegular } from '@fluentui/react-icons';
import { useMsal } from '@azure/msal-react';
import { Meeting } from '@meetmind/shared';
import axios from 'axios';
import { MeetingCard } from '../components/MeetingCard';

const useStyles = makeStyles({
  container: {
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
  },
  empty: {
    padding: '48px',
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  }
});

export function History() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { instance, accounts } = useMsal();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const response = await instance.acquireTokenSilent({
        scopes: ['api://meetmind/MeetMind.ReadWrite'],
        account: accounts[0]
      });
      
      // Assume API endpoint is passed in Vite env
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const res = await axios.get(`${apiBase}/api/v1/meetings`, {
        headers: { Authorization: `Bearer ${response.accessToken}` }
      });
      
      setMeetings(res.data.items || []);
    } catch (error) {
      console.error('Failed to fetch meetings', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [instance, accounts]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title3>Meeting History</Title3>
        <Button icon={<ArrowClockwiseRegular />} onClick={fetchMeetings} appearance="subtle">Refresh</Button>
      </div>

      {loading ? (
        <Spinner label="Loading meetings..." />
      ) : meetings.length > 0 ? (
        <div className={styles.grid}>
          {meetings.map((m) => (
            <MeetingCard
              key={m.id}
              meeting={m}
              onClick={() => navigate(`/meetings/${m.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          No past meetings found.
        </div>
      )}
    </div>
  );
}
