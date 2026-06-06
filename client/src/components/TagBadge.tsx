// =============================================================================
// client/src/components/TagBadge.tsx
// Badge component for tagging transcript segments (decisions, actions, blockers)
// =============================================================================

import React from 'react';
import { Badge } from '@fluentui/react-components';

export type TagBadgeVariant = 'decision' | 'action_item' | 'blocker' | 'key_point';

interface TagBadgeProps {
  variant: TagBadgeVariant;
  label?: string;
}

export function TagBadge({ variant, label }: TagBadgeProps) {
  switch (variant) {
    case 'decision':
      return <Badge color="brand" appearance="filled">{label || 'Decision'}</Badge>;
    case 'action_item':
      return <Badge color="warning" appearance="filled">{label || 'Action Item'}</Badge>;
    case 'blocker':
      return <Badge color="danger" appearance="filled">{label || 'Blocker'}</Badge>;
    case 'key_point':
      return <Badge color="informative" appearance="filled">{label || 'Key Point'}</Badge>;
    default:
      return <Badge appearance="outline">{label || 'Tag'}</Badge>;
  }
}
