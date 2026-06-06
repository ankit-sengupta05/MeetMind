// =============================================================================
// client/src/components/TranscriptSegment.tsx
// Displays a single line of transcript with speaker, time, and optional tags
// =============================================================================

import React from 'react';
import { makeStyles, tokens, Avatar, Text } from '@fluentui/react-components';
import { TagBadge, TagBadgeVariant } from './TagBadge';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    gap: '12px',
    padding: '8px 0',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  time: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  tags: {
    display: 'flex',
    gap: '4px',
    marginTop: '4px',
  }
});

interface TranscriptSegmentProps {
  speakerName: string;
  text: string;
  timestamp: string; // e.g. "12:04"
  tags?: { type: TagBadgeVariant; label?: string }[];
}

export function TranscriptSegment({ speakerName, text, timestamp, tags }: TranscriptSegmentProps) {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <Avatar name={speakerName} size={32} />
      <div className={styles.content}>
        <div className={styles.header}>
          <Text weight="semibold">{speakerName}</Text>
          <Text className={styles.time}>{timestamp}</Text>
        </div>
        <Text>{text}</Text>
        {tags && tags.length > 0 && (
          <div className={styles.tags}>
            {tags.map((tag, i) => (
              <TagBadge key={i} variant={tag.type} label={tag.label} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
