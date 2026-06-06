// =============================================================================
// client/src/pages/SearchPage.tsx
// Natural-language semantic search across all meeting knowledge
// =============================================================================

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Input,
  Button,
  Text,
  Spinner,
  Card,
  CardHeader,
  Badge,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { SearchRegular, SparkleRegular } from '@fluentui/react-icons';
import { searchApi } from '../api/searchApi';
import type { SearchResult } from '@meetmind/shared';

const useStyles = makeStyles({
  root: {
    padding: tokens.spacingVerticalXL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    maxWidth: '800px',
  },
  searchBar: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },
  searchInput: {
    flex: 1,
  },
  answerCard: {
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px solid ${tokens.colorBrandStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  resultList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  snippet: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  meta: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center',
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

export function SearchPage() {
  const styles = useStyles();
  const [query, setQuery] = useState('');

  const { mutate: search, data, isPending, error } = useMutation({
    mutationFn: (q: string) => searchApi.search({ query: q, hybridSearch: true, top: 10 }),
  });

  const handleSearch = () => {
    if (query.trim()) search(query.trim());
  };

  return (
    <div className={styles.root}>
      <div>
        <Text size={800} weight="semibold" block>Search Meetings</Text>
        <Text size={400} style={{ color: tokens.colorNeutralForeground2 }}>
          Ask anything about your past meetings in natural language
        </Text>
      </div>

      {/* Search bar */}
      <div className={styles.searchBar}>
        <Input
          className={styles.searchInput}
          size="large"
          placeholder='e.g. "What did we decide about the Q3 roadmap?"'
          value={query}
          onChange={(_, d) => setQuery(d.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          contentBefore={<SearchRegular />}
        />
        <Button
          appearance="primary"
          size="large"
          onClick={handleSearch}
          disabled={isPending || !query.trim()}
          icon={isPending ? <Spinner size="tiny" /> : <SparkleRegular />}
        >
          Search
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Text style={{ color: tokens.colorPaletteRedForeground1 }}>
          Search failed. Please try again.
        </Text>
      )}

      {/* Semantic answer */}
      {data?.semanticAnswers?.[0] && (
        <div className={styles.answerCard}>
          <Text size={200} weight="semibold" style={{ color: tokens.colorBrandForeground1 }} block>
            ✦ AI Answer
          </Text>
          <Text size={300}>{data.semanticAnswers[0].text}</Text>
        </div>
      )}

      {/* Results */}
      {data && (
        <>
          <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
            {data.total} result{data.total !== 1 ? 's' : ''} · {data.durationMs}ms
          </Text>
          <div className={styles.resultList}>
            {data.results.map((r: SearchResult) => (
              <Card key={r.meetingId}>
                <CardHeader
                  header={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Text weight="semibold">{r.title}</Text>
                      <Badge shape="rounded" color="informative">{r.type}</Badge>
                    </div>
                  }
                  description={
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <Text className={styles.snippet}
                        dangerouslySetInnerHTML={{ __html: r.snippet }}
                      />
                      <div className={styles.meta}>
                        <span>{new Date(r.meetingDate).toLocaleDateString()}</span>
                        {r.participants.length > 0 && (
                          <span>· {r.participants.slice(0, 3).join(', ')}</span>
                        )}
                        <span style={{ marginLeft: 'auto' }}>
                          Score: {r.score.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  }
                />
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
