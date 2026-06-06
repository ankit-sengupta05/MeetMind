// =============================================================================
// client/src/views/Search.tsx
// Natural language semantic search across all meetings
// =============================================================================

import React, { useState } from 'react';
import { Title3, Input, Button, Spinner, makeStyles, tokens } from '@fluentui/react-components';
import { SearchRegular } from '@fluentui/react-icons';
import { useMsal } from '@azure/msal-react';
import axios from 'axios';
import { SearchResultCard } from '../components/SearchResultCard';
import { SearchResultItem } from '../../../server/src/services/search';

const useStyles = makeStyles({
  container: {
    padding: '24px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  searchBox: {
    display: 'flex',
    gap: '8px',
    marginTop: '24px',
    marginBottom: '32px',
  },
  input: {
    flexGrow: 1,
  },
  results: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  empty: {
    textAlign: 'center',
    padding: '48px',
    color: tokens.colorNeutralForeground3,
  },
  examples: {
    marginTop: '24px',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  }
});

export function Search() {
  const styles = useStyles();
  const { instance, accounts } = useMsal();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent, presetQuery?: string) => {
    if (e) e.preventDefault();
    const q = presetQuery || query;
    if (!q.trim()) return;

    if (presetQuery) setQuery(presetQuery);

    setLoading(true);
    setHasSearched(true);
    try {
      const response = await instance.acquireTokenSilent({
        scopes: ['api://meetmind/MeetMind.ReadWrite'],
        account: accounts[0]
      });
      
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const res = await axios.get(`${apiBase}/api/v1/meetings/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${response.accessToken}` }
      });
      
      setResults(res.data.results || []);
    } catch (error) {
      console.error('Search failed', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Title3>Semantic Search</Title3>
      
      <form onSubmit={handleSearch} className={styles.searchBox}>
        <Input 
          className={styles.input}
          size="large"
          placeholder="What did we decide about the pricing model?" 
          value={query}
          onChange={(e, data) => setQuery(data.value)}
          contentBefore={<SearchRegular />}
        />
        <Button size="large" appearance="primary" type="submit" disabled={!query.trim() || loading}>
          Search
        </Button>
      </form>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Spinner label="Searching across meetings..." />
        </div>
      ) : hasSearched ? (
        results.length > 0 ? (
          <div className={styles.results}>
            <p>Found {results.length} relevant results</p>
            {results.map((r, i) => (
              <SearchResultCard key={`${r.meetingId}-${i}`} result={r} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            No results found for "{query}". Try rephrasing your question.
          </div>
        )
      ) : (
        <div className={styles.empty}>
          <p>Ask a question in natural language to search across all your past meeting transcripts, decisions, and summaries.</p>
          <div className={styles.examples}>
            <Button appearance="subtle" onClick={() => handleSearch(undefined, "What are the action items for the Q3 launch?")}>
              "What are the action items for the Q3 launch?"
            </Button>
            <Button appearance="subtle" onClick={() => handleSearch(undefined, "Why did we delay the API release?")}>
              "Why did we delay the API release?"
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
