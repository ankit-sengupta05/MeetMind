// =============================================================================
// client/src/views/MeetingSummary.tsx
// Full meeting detail view
// =============================================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Title1, Title3, Spinner, makeStyles, tokens, Button, Table, TableHeader, TableRow, TableHeaderCell, TableBody } from '@fluentui/react-components';
import { ArrowLeftRegular } from '@fluentui/react-icons';
import { useMsal } from '@azure/msal-react';
import axios from 'axios';
import { Meeting } from '@meetmind/shared';
import { ActionItemRow } from '../components/ActionItemRow';
import { TranscriptSegment } from '../components/TranscriptSegment';

const useStyles = makeStyles({
  container: {
    padding: '24px',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  section: {
    backgroundColor: tokens.colorNeutralBackground1,
    padding: '24px',
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow2,
    marginBottom: '24px',
  },
  transcriptSection: {
    marginTop: '32px',
  }
});

export function MeetingSummary() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const styles = useStyles();
  const { instance, accounts } = useMsal();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeeting = async () => {
      setLoading(true);
      try {
        const response = await instance.acquireTokenSilent({
          scopes: ['api://meetmind/MeetMind.ReadWrite'],
          account: accounts[0]
        });
        
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
        const res = await axios.get(`${apiBase}/api/v1/meetings/${id}`, {
          headers: { Authorization: `Bearer ${response.accessToken}` }
        });
        
        setMeeting(res.data);
      } catch (error) {
        console.error('Failed to fetch meeting details', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchMeeting();
  }, [id, instance, accounts]);

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center' }}><Spinner label="Loading meeting..." /></div>;
  }

  if (!meeting) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>Meeting not found.</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button icon={<ArrowLeftRegular />} appearance="subtle" onClick={() => navigate('/history')}>Back</Button>
        <Title1>{meeting.title}</Title1>
      </div>

      {meeting.summary && (
        <div className={styles.section}>
          <Title3>Executive Summary</Title3>
          <p><strong>{meeting.summary.headline}</strong></p>
          <p>{meeting.summary.overview}</p>
        </div>
      )}

      {meeting.decisions && meeting.decisions.length > 0 && (
        <div className={styles.section}>
          <Title3>Decisions</Title3>
          <ul>
            {meeting.decisions.map(d => (
              <li key={d.id}><strong>{d.title}</strong>: {d.description}</li>
            ))}
          </ul>
        </div>
      )}

      {meeting.actionItems && meeting.actionItems.length > 0 && (
        <div className={styles.section}>
          <Title3>Action Items</Title3>
          <Table style={{ marginTop: '16px' }}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell style={{ width: '50px' }}></TableHeaderCell>
                <TableHeaderCell>Task</TableHeaderCell>
                <TableHeaderCell>Assignee</TableHeaderCell>
                <TableHeaderCell>Due Date</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meeting.actionItems.map(item => (
                <ActionItemRow key={item.id} item={item} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {meeting.transcript && meeting.transcript.length > 0 && (
        <div className={styles.transcriptSection}>
          <Title3>Transcript</Title3>
          <div style={{ marginTop: '16px' }}>
            {meeting.transcript.map((seg, i) => {
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
            })}
          </div>
        </div>
      )}
    </div>
  );
}
