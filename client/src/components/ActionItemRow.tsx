// =============================================================================
// client/src/components/ActionItemRow.tsx
// Renders a single action item row with assignee and status toggle
// =============================================================================

import React from 'react';
import { TableRow, TableCell, TableCellLayout, Avatar, Badge, Switch } from '@fluentui/react-components';
import { ActionItem } from '@meetmind/shared';
import { format } from 'date-fns';

interface ActionItemRowProps {
  item: ActionItem;
  onStatusToggle?: (id: string, isDone: boolean) => void;
  showMeetingLink?: boolean;
  meetingTitle?: string;
}

export function ActionItemRow({ item, onStatusToggle, showMeetingLink, meetingTitle }: ActionItemRowProps) {
  const isDone = item.status === 'completed';
  const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && !isDone;

  return (
    <TableRow>
      <TableCell>
        {onStatusToggle && (
          <Switch checked={isDone} onChange={(e, data) => onStatusToggle(item.id, data.checked)} />
        )}
      </TableCell>
      <TableCell>
        <TableCellLayout truncate title={item.title}>
          <span style={{ textDecoration: isDone ? 'line-through' : 'none', fontWeight: isOverdue ? 'bold' : 'normal', color: isOverdue ? 'var(--colorPaletteRedForeground1)' : 'inherit' }}>
            {item.title}
          </span>
        </TableCellLayout>
      </TableCell>
      {showMeetingLink && meetingTitle && (
        <TableCell>
           <TableCellLayout truncate>{meetingTitle}</TableCellLayout>
        </TableCell>
      )}
      <TableCell>
        <TableCellLayout media={<Avatar name={item.assigneeName || 'Unassigned'} size={24} />}>
          {item.assigneeName || 'Unassigned'}
        </TableCellLayout>
      </TableCell>
      <TableCell>
        {item.dueDate ? format(new Date(item.dueDate), 'MMM d, yyyy') : '-'}
      </TableCell>
      <TableCell>
        <Badge appearance="filled" color={isDone ? 'success' : 'warning'}>
          {item.status}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
