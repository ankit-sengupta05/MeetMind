// =============================================================================
// client/src/components/SearchResultCard.tsx
// Renders a Semantic Search result with highlighted snippets
// =============================================================================

import React from 'react';
import { Card, CardHeader, Text, Button, makeStyles, tokens } from '@fluentui/react-components';
import { SearchResult } from '@meetmind/shared'; // Shared interface
import { Link } from 'react-router-dom';

const useStyles = makeStyles({
  card: {
    marginBottom: '16px',
    width: '100%',
  },
  snippet: {
    padding: '12px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    fontStyle: 'italic',
    marginTop: '8px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '12px',
  }
});

interface SearchResultCardProps {
  result: SearchResult;
}

export function SearchResultCard({ result }: SearchResultCardProps) {
  const styles = useStyles();

  return (
    <Card className={styles.card}>
      <CardHeader
        header={<Text weight="semibold" size={400}>{result.title}</Text>}
        description={<Text size={200}>Relevance Score: {result.score.toFixed(2)}</Text>}
      />
      
      <div className={styles.snippet}>
        <Text>"{result.snippet}..."</Text>
      </div>

      <div className={styles.footer}>
        <Link to={`/meetings/${result.meetingId}`} style={{ textDecoration: 'none' }}>
          <Button appearance="primary">View Meeting</Button>
        </Link>
      </div>
    </Card>
  );
}
