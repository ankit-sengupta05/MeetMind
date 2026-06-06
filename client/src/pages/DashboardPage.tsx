// =============================================================================
// client/src/pages/DashboardPage.tsx
// Meeting dashboard – recent meetings list + quick stats
// =============================================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Text,
  Button,
  Spinner,
  Badge,
  makeStyles,
  tokens,
  Card,
  CardHeader,
  CardPreview,
} from '@fluentui/react-components';
import {
  AddRegular,
  VideoRegular,
  CheckmarkCircleRegular,
  ClockRegular,
  PeopleRegular,
} from '@fluentui/react-icons';
import { meetingsApi } from '../api/meetingsApi';
import { formatDuration } from '@meetmind/shared';
import type { Meeting } from '@meetmind/shared';

const useStyles = makeStyles({
  root: {
    padding: tokens.spacingVerticalXL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    maxWidth: '960px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: tokens.spacingHorizontalM,
  },
  statCard: {
    padding: tokens.spacingVerticalM,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  meetingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  meetingCard: {
    cursor: 'pointer',
    transition: 'box-shadow 0.15s',
    ':hover': {
      boxShadow: tokens.shadow8,
    },
  },
  meetingMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground2,
  },
  statusBadge: {
    marginLeft: 'auto',
  },
});

const STATUS_COLOR: Record<string, 'brand' | 'success' | 'warning' | 'danger' | 'informative'> = {
  scheduled: 'informative',
  in_progress: 'brand',
  processing: 'warning',
  completed: 'success',
  failed: 'danger',
};

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const styles = useStyles();
  return (
    <div className={styles.statCard}>
      {icon}
      <Text size={600} weight="semibold">{value}</Text>
      <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>{label}</Text>
    </div>
  );
}

export function DashboardPage() {
  const styles = useStyles();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => meetingsApi.list({ page: 1, pageSize: 20 }),
  });

  const meetings: Meeting[] = data?.items ?? [];
  const completedCount = meetings.filter((m) => m.status === 'completed').length;

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <Text size={800} weight="semibold" block>Dashboard</Text>
          <Text size={400} style={{ color: tokens.colorNeutralForeground2 }}>
            Your meeting knowledge hub
          </Text>
        </div>
        <Button
          appearance="primary"
          icon={<AddRegular />}
          onClick={() => navigate('/meetings/new')}
        >
          New Meeting
        </Button>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <StatCard
          icon={<VideoRegular fontSize={20} color={tokens.colorBrandForeground1} />}
          label="Total Meetings"
          value={String(meetings.length)}
        />
        <StatCard
          icon={<CheckmarkCircleRegular fontSize={20} color={tokens.colorPaletteGreenForeground1} />}
          label="Summarised"
          value={String(completedCount)}
        />
        <StatCard
          icon={<ClockRegular fontSize={20} color={tokens.colorPaletteYellowForeground1} />}
          label="In Progress"
          value={String(meetings.filter((m) => m.status === 'in_progress').length)}
        />
        <StatCard
          icon={<PeopleRegular fontSize={20} color={tokens.colorPaletteLilacForeground2} />}
          label="Action Items"
          value={String(meetings.reduce((acc, m) => acc + (m.actionItems?.length ?? 0), 0))}
        />
      </div>

      {/* Meeting list */}
      <Text size={500} weight="semibold">Recent Meetings</Text>

      {isLoading && <Spinner label="Loading meetings..." />}
      {error && <Text style={{ color: tokens.colorPaletteRedForeground1 }}>Failed to load meetings.</Text>}

      <div className={styles.meetingList}>
        {meetings.map((meeting) => (
          <Card
            key={meeting.id}
            className={styles.meetingCard}
            onClick={() => navigate(`/meetings/${meeting.id}`)}
          >
            <CardHeader
              header={<Text weight="semibold">{meeting.title}</Text>}
              description={
                <div className={styles.meetingMeta}>
                  <VideoRegular fontSize={14} />
                  <Text size={200}>{new Date(meeting.startTime).toLocaleString()}</Text>
                  {meeting.durationSeconds && (
                    <Text size={200}>· {formatDuration(meeting.durationSeconds)}</Text>
                  )}
                  <Text size={200}>· {meeting.participants.length} participants</Text>
                  <Badge
                    className={styles.statusBadge}
                    color={STATUS_COLOR[meeting.status] ?? 'informative'}
                    shape="rounded"
                  >
                    {meeting.status.replace('_', ' ')}
                  </Badge>
                </div>
              }
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
