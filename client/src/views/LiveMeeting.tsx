// =============================================================================
// client/src/views/LiveMeeting.tsx
// Real-time meeting panel for Teams in-meeting experience
// =============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  makeStyles, tokens, Title3, Text, Button, Spinner, 
  Card, Divider, Avatar
} from '@fluentui/react-components';
import { RecordRegular, StopRegular } from '@fluentui/react-icons';
import { useMsal } from '@azure/msal-react';
import { app as teamsApp } from '@microsoft/teams-js';
import axios from 'axios';
import { Meeting, TranscriptSegment as TSegment, ActionItem, Decision } from '@meetmind/shared';
import { TranscriptSegment } from '../components/TranscriptSegment';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
  },
  mainPanel: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  header: {
    padding: '16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  transcriptArea: {
    flexGrow: 1,
    padding: '16px',
    overflowY: 'auto',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  sidebar: {
    width: '320px',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  sidebarSection: {
    flex: '1 1 50%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarSectionHeader: {
    padding: '16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1Hover,
  },
  sidebarList: {
    padding: '12px',
    overflowY: 'auto',
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: tokens.colorPaletteRedForeground1,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: '32px',
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  }
});

export function LiveMeeting() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { instance, accounts } = useMsal();
  
  const [meetingContext, setMeetingContext] = useState<any>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TSegment[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Attempt to get Teams meeting context
    teamsApp.getContext().then(ctx => {
      if (ctx.meeting && ctx.meeting.id) {
        setMeetingContext(ctx.meeting);
        setMeetingId(ctx.meeting.id);
      } else {
        // Mock fallback for local dev
        setMeetingId('mock-live-meeting-123');
      }
    }).catch(() => {
      setMeetingId('mock-live-meeting-123'); // Browser fallback
    });
  }, []);

  // Poll for transcript updates
  useEffect(() => {
    if (!meetingId) return;

    const fetchLiveUpdates = async () => {
      try {
        const response = await instance.acquireTokenSilent({
          scopes: ['api://meetmind/MeetMind.ReadWrite'],
          account: accounts[0]
        });
        
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
        const res = await axios.get(`${apiBase}/api/v1/meetings/${meetingId}`, {
          headers: { Authorization: `Bearer ${response.accessToken}` }
        });
        
        const m: Meeting = res.data;
        setTranscript(m.transcript || []);
        setActions(m.actionItems || []);
        setDecisions(m.decisions || []);
      } catch (error) {
        // Ignore 404s if the meeting hasn't been created yet
      }
    };

    fetchLiveUpdates(); // Initial fetch
    const interval = setInterval(fetchLiveUpdates, 5000); // Poll every 5s
    
    return () => clearInterval(interval);
  }, [meetingId, instance, accounts]);

  const handleEndAndProcess = async () => {
    if (!meetingId) return;
    setIsProcessing(true);
    
    try {
      const response = await instance.acquireTokenSilent({
        scopes: ['api://meetmind/MeetMind.ReadWrite'],
        account: accounts[0]
      });
      
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      // Trigger analysis
      await axios.post(`${apiBase}/api/v1/meetings/${meetingId}/analyze`, {}, {
        headers: { Authorization: `Bearer ${response.accessToken}` }
      });
      
      // Redirect to summary
      navigate(`/meetings/${meetingId}`);
    } catch (error) {
      console.error('Failed to process meeting', error);
      setIsProcessing(false);
    }
  };

  if (!meetingId) {
    return <div className={styles.emptyState}><Spinner label="Connecting to meeting context..." /></div>;
  }

  return (
    <div className={styles.container}>
      {/* LEFT: Transcript Feed */}
      <div className={styles.mainPanel}>
        <div className={styles.header}>
          <div className={styles.liveIndicator}>
            <RecordRegular />
            Live Transcript
          </div>
          <Button 
            appearance="primary" 
            icon={isProcessing ? <Spinner size="extra-tiny" /> : <StopRegular />}
            onClick={handleEndAndProcess}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'End & Process'}
          </Button>
        </div>
        
        <div className={styles.transcriptArea}>
          {transcript.length > 0 ? (
            transcript.map((seg, i) => {
              const minutes = Math.floor(seg.startTime / 60);
              const seconds = Math.floor(seg.startTime % 60);
              const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
              return (
                <TranscriptSegment 
                  key={seg.id || i}
                  speakerName={seg.speakerName}
                  text={seg.text}
                  timestamp={timeStr}
                  tags={seg.tags}
                />
              );
            })
          ) : (
            <div className={styles.emptyState}>Waiting for transcription to start...</div>
          )}
        </div>
      </div>

      {/* RIGHT: Live Extractions Sidebar */}
      <div className={styles.sidebar}>
        
        {/* Action Items */}
        <div className={styles.sidebarSection}>
          <div className={styles.sidebarSectionHeader}>
            <Title3>Action Items</Title3>
          </div>
          <div className={styles.sidebarList}>
            {actions.length > 0 ? (
              actions.map((a, i) => (
                <Card key={i} size="small">
                  <Text weight="semibold">{a.title}</Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <Avatar name={a.assigneeName || 'Unassigned'} size={20} />
                    <Text size={200}>{a.assigneeName || 'Unassigned'}</Text>
                  </div>
                </Card>
              ))
            ) : (
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>No action items extracted yet.</Text>
            )}
          </div>
        </div>
        
        <Divider />

        {/* Decisions */}
        <div className={styles.sidebarSection}>
          <div className={styles.sidebarSectionHeader}>
            <Title3>Decisions</Title3>
          </div>
          <div className={styles.sidebarList}>
            {decisions.length > 0 ? (
              decisions.map((d, i) => (
                <Card key={i} size="small">
                  <Text weight="semibold">{d.title}</Text>
                  <Text size={200}>{d.description}</Text>
                </Card>
              ))
            ) : (
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>No decisions logged yet.</Text>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
