// =============================================================================
// client/src/pages/ActionItemsPage.tsx
// Cross-meeting action items board
// =============================================================================

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Text,
  Badge,
  Spinner,
  Select,
  makeStyles,
  tokens,
  Checkbox,
} from '@fluentui/react-components';
import { meetingsApi } from '../api/meetingsApi';
import type { ActionItem, Meeting } from '@meetmind/shared';

const useStyles = makeStyles({
  root: {
    padding: tokens.spacingVerticalXL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    maxWidth: '900px',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderBottom: `2px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  td: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    verticalAlign: 'middle',
  },
});

const PRIORITY_COLOR: Record<string, 'success' | 'warning' | 'danger' | 'informative'> = {
  low: 'success', medium: 'informative', high: 'warning', urgent: 'danger',
};

export function ActionItemsPage() {
  const styles = useStyles();
  const [filter, setFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => meetingsApi.list({ page: 1, pageSize: 100 }),
  });

  const allItems: Array<ActionItem & { meetingTitle: string }> =
    (data?.items ?? []).flatMap((m: Meeting) =>
      (m.actionItems ?? []).map((a) => ({ ...a, meetingTitle: m.title }))
    );

  const filtered = filter === 'all'
    ? allItems
    : allItems.filter((a) => a.status === filter || a.priority === filter);

  return (
    <div className={styles.root}>
      <div>
        <Text size={800} weight="semibold" block>Action Items</Text>
        <Text size={400} style={{ color: tokens.colorNeutralForeground2 }}>
          All action items across your meetings
        </Text>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <Select
          value={filter}
          onChange={(_, d) => setFilter(d.value)}
          style={{ minWidth: 160 }}
        >
          <option value="all">All items</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="urgent">Urgent priority</option>
          <option value="high">High priority</option>
        </Select>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
        </Text>
      </div>

      {isLoading && <Spinner label="Loading action items…" />}

      {!isLoading && filtered.length === 0 && (
        <Text style={{ color: tokens.colorNeutralForeground2 }}>No action items found.</Text>
      )}

      {filtered.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th} style={{ width: 32 }}></th>
              <th className={styles.th}>Title</th>
              <th className={styles.th}>Meeting</th>
              <th className={styles.th}>Assignee</th>
              <th className={styles.th}>Due</th>
              <th className={styles.th}>Priority</th>
              <th className={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td className={styles.td}>
                  <Checkbox checked={item.status === 'completed'} />
                </td>
                <td className={styles.td}>
                  <Text size={300} weight={item.status !== 'completed' ? 'semibold' : 'regular'}
                    style={{ textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>
                    {item.title}
                  </Text>
                </td>
                <td className={styles.td}>
                  <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
                    {item.meetingTitle}
                  </Text>
                </td>
                <td className={styles.td}>
                  <Text size={200}>{item.assigneeName ?? '—'}</Text>
                </td>
                <td className={styles.td}>
                  <Text size={200}>
                    {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—'}
                  </Text>
                </td>
                <td className={styles.td}>
                  <Badge color={PRIORITY_COLOR[item.priority] ?? 'informative'} shape="rounded" size="small">
                    {item.priority}
                  </Badge>
                </td>
                <td className={styles.td}>
                  <Badge
                    color={item.status === 'completed' ? 'success' : 'informative'}
                    shape="rounded"
                    size="small"
                  >
                    {item.status.replace('_', ' ')}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
