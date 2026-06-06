// =============================================================================
// client/src/pages/MeetingDetailPage.tsx
// Full meeting view: summary, transcript, action items, decisions
// =============================================================================

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Text,
  Button,
  Spinner,
  Tab,
  TabList,
  Badge,
  Divider,
  makeStyles,
  tokens,
  Card,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
} from '@fluentui/react-components';
import {
  ArrowLeftRegular,
  DocumentTextRegular,
  CheckmarkCircleRegular,
  LightbulbRegular,
  PeopleRegular,
  CloudSyncRegular,
} from '@fluentui/react-icons';
import { meetingsApi } from '../api/meetingsApi';
import { plannerApi } from '../api/plannerApi';
import { formatMeetingTimestamp, formatDuration } from '@meetmind/shared';
import type { TranscriptSegment, ActionItem, Decision } from '@meetmind/shared';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalXL}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  body: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    padding: `0 ${tokens.spacingHorizontalXL}`,
  },
  tabContent: {
    flex: 1,
    overflow: 'auto',
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalXL,
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacingHorizontalL,
    marginBottom: tokens.spacingVerticalL,
  },
  infoCard: {
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  segmentRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  timestamp: {
    minWidth: '44px',
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    fontVariantNumeric: 'tabular-nums',
    paddingTop: '2px',
  },
  speakerName: {
    minWidth: '120px',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorBrandForeground1,
  },
  actionItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    marginBottom: tokens.spacingVerticalXS,
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  bulletList: {
    paddingLeft: tokens.spacingHorizontalL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
});

type TabValue = 'summary' | 'transcript' | 'actions' | 'decisions';

export function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const styles = useStyles();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabValue>('summary');

  const { data: meeting, isLoading } = useQuery({
    queryKey: ['meeting', id],
    queryFn: () => meetingsApi.getById(id!),
    enabled: !!id,
  });

  const syncMutation = useMutation({
    mutationFn: () => plannerApi.syncMeeting(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meeting', id] }),
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Spinner label="Loading meeting…" size="large" />
      </div>
    );
  }

  if (!meeting) {
    return <Text style={{ padding: tokens.spacingVerticalXL }}>Meeting not found.</Text>;
  }

  return (
    <div className={styles.root}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <Button
          icon={<ArrowLeftRegular />}
          appearance="subtle"
          onClick={() => navigate('/dashboard')}
        />
        <div style={{ flex: 1 }}>
          <Text size={600} weight="semibold" block>{meeting.title}</Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
            {new Date(meeting.startTime).toLocaleString()}
            {meeting.durationSeconds && ` · ${formatDuration(meeting.durationSeconds)}`}
            {` · ${meeting.participants.length} participants`}
          </Text>
        </div>
        <Badge
          color={meeting.status === 'completed' ? 'success' : 'informative'}
          shape="rounded"
          size="large"
        >
          {meeting.status.replace('_', ' ')}
        </Badge>
        <Button
          icon={<CloudSyncRegular />}
          appearance="secondary"
          disabled={syncMutation.isPending}
          onClick={() => syncMutation.mutate()}
        >
          {syncMutation.isPending ? 'Syncing…' : 'Sync to Planner'}
        </Button>
      </div>

      {/* Tab navigation */}
      <div className={styles.body}>
        <TabList
          selectedValue={activeTab}
          onTabSelect={(_, d) => setActiveTab(d.value as TabValue)}
          style={{ paddingTop: tokens.spacingVerticalS }}
        >
          <Tab value="summary" icon={<LightbulbRegular />}>Summary</Tab>
          <Tab value="transcript" icon={<DocumentTextRegular />}>Transcript</Tab>
          <Tab value="actions" icon={<CheckmarkCircleRegular />}>
            Action Items
            {meeting.actionItems?.length ? (
              <Badge size="small" color="brand" style={{ marginLeft: 4 }}>
                {meeting.actionItems.length}
              </Badge>
            ) : null}
          </Tab>
          <Tab value="decisions" icon={<PeopleRegular />}>Decisions</Tab>
        </TabList>

        <Divider />

        {/* Tab content */}
        <div className={styles.tabContent}>
          {activeTab === 'summary' && <SummaryTab meeting={meeting} />}
          {activeTab === 'transcript' && <TranscriptTab segments={meeting.transcript ?? []} />}
          {activeTab === 'actions' && <ActionsTab items={meeting.actionItems ?? []} />}
          {activeTab === 'decisions' && <DecisionsTab decisions={meeting.decisions ?? []} />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryTab({ meeting }: { meeting: ReturnType<typeof Object.create> }) {
  const styles = useStyles();
  const s = meeting.summary;
  if (!s) return <Text style={{ color: tokens.colorNeutralForeground2 }}>Summary not yet generated. Run the post-meeting agent to generate one.</Text>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL }}>
      <Card>
        <Text size={500} weight="semibold" block style={{ marginBottom: 8 }}>TL;DR</Text>
        <Text>{s.headline}</Text>
      </Card>
      <Card>
        <Text size={500} weight="semibold" block style={{ marginBottom: 8 }}>Overview</Text>
        <Text>{s.overview}</Text>
      </Card>
      <div className={styles.summaryGrid}>
        <div className={styles.infoCard}>
          <Text size={400} weight="semibold" block style={{ marginBottom: 8 }}>Key Points</Text>
          <ul className={styles.bulletList}>
            {s.keyPoints.map((p: string, i: number) => <li key={i}><Text size={300}>{p}</Text></li>)}
          </ul>
        </div>
        <div className={styles.infoCard}>
          <Text size={400} weight="semibold" block style={{ marginBottom: 8 }}>Next Steps</Text>
          <ul className={styles.bulletList}>
            {s.nextSteps.map((p: string, i: number) => <li key={i}><Text size={300}>{p}</Text></li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

function TranscriptTab({ segments }: { segments: TranscriptSegment[] }) {
  const styles = useStyles();
  if (segments.length === 0) return <Text style={{ color: tokens.colorNeutralForeground2 }}>No transcript available yet.</Text>;

  return (
    <div>
      {segments.map((seg) => (
        <div key={seg.id} className={styles.segmentRow}>
          <span className={styles.timestamp}>{formatMeetingTimestamp(seg.startTime)}</span>
          <span className={styles.speakerName}>{seg.speakerName}</span>
          <Text size={300} style={{ flex: 1 }}>{seg.text}</Text>
          {seg.tags?.map((tag) => (
            <Badge key={tag.type} color="warning" shape="rounded" size="small">
              {tag.label}
            </Badge>
          ))}
        </div>
      ))}
    </div>
  );
}

function ActionsTab({ items }: { items: ActionItem[] }) {
  const styles = useStyles();
  if (items.length === 0) return <Text style={{ color: tokens.colorNeutralForeground2 }}>No action items extracted yet.</Text>;

  const PRIORITY_COLOR: Record<string, 'success' | 'warning' | 'danger' | 'informative'> = {
    low: 'success', medium: 'informative', high: 'warning', urgent: 'danger',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS }}>
      {items.map((item) => (
        <div key={item.id} className={styles.actionItem}>
          <CheckmarkCircleRegular
            fontSize={18}
            color={item.status === 'completed' ? tokens.colorPaletteGreenForeground1 : tokens.colorNeutralForeground3}
          />
          <div style={{ flex: 1 }}>
            <Text weight="semibold" block>{item.title}</Text>
            {item.description && <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>{item.description}</Text>}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {item.assigneeName && <Text size={200}>👤 {item.assigneeName}</Text>}
              {item.dueDate && <Text size={200}>📅 {new Date(item.dueDate).toLocaleDateString()}</Text>}
              <Badge color={PRIORITY_COLOR[item.priority]} shape="rounded" size="small">{item.priority}</Badge>
              {item.plannerTaskId && <Badge color="success" shape="rounded" size="small">In Planner</Badge>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DecisionsTab({ decisions }: { decisions: Decision[] }) {
  if (decisions.length === 0) return <Text style={{ color: tokens.colorNeutralForeground2 }}>No decisions extracted yet.</Text>;

  return (
    <Accordion multiple collapsible>
      {decisions.map((d) => (
        <AccordionItem key={d.id} value={d.id}>
          <AccordionHeader>
            <Text weight="semibold">{d.title}</Text>
          </AccordionHeader>
          <AccordionPanel>
            <Text size={300} block>{d.description}</Text>
            {d.rationale && <Text size={200} style={{ color: tokens.colorNeutralForeground2, marginTop: 8 }} block>Rationale: {d.rationale}</Text>}
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
