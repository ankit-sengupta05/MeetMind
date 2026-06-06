// =============================================================================
// client/src/components/MeetingCard.tsx
// Dashboard card representing a single meeting
// =============================================================================

import React from 'react';
import { Card, CardHeader, CardPreview, Text, AvatarGroup, AvatarGroupItem, Badge, makeStyles, tokens } from '@fluentui/react-components';
import { CalendarLtrRegular, CheckmarkCircleRegular } from '@fluentui/react-icons';
import { Meeting } from '@meetmind/shared';
import { format } from 'date-fns';

const useStyles = makeStyles({
  card: {
    width: '320px',
    maxWidth: '100%',
    cursor: 'pointer',
  },
  statsRow: {
    display: 'flex',
    gap: '8px',
    padding: '12px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  }
});

interface MeetingCardProps {
  meeting: Meeting;
  onClick: () => void;
}

export function MeetingCard({ meeting, onClick }: MeetingCardProps) {
  const styles = useStyles();
  
  const dateStr = meeting.startTime ? format(new Date(meeting.startTime), 'MMM d, yyyy h:mm a') : 'Unknown Date';
  const actionCount = meeting.actionItems?.length || 0;
  const decisionCount = meeting.decisions?.length || 0;

  return (
    <Card className={styles.card} onClick={onClick} orientation="vertical">
      <CardHeader
        header={<Text weight="semibold" size={400}>{meeting.title}</Text>}
        description={<Text size={200}><CalendarLtrRegular /> {dateStr}</Text>}
      />
      
      <CardPreview style={{ padding: '0 12px 12px' }}>
        <AvatarGroup layout="stack" size={32}>
          {meeting.participants?.map(p => (
            <AvatarGroupItem key={p.id} name={p.displayName} title={p.displayName} />
          ))}
        </AvatarGroup>
      </CardPreview>

      <div className={styles.statsRow}>
        {actionCount > 0 && (
          <Badge color="warning" appearance="tint" icon={<CheckmarkCircleRegular />}>
            {actionCount} Actions
          </Badge>
        )}
        {decisionCount > 0 && (
          <Badge color="brand" appearance="tint">
            {decisionCount} Decisions
          </Badge>
        )}
      </div>
    </Card>
  );
}
