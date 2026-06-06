// =============================================================================
// client/src/views/Tasks.tsx
// Global task dashboard for open action items
// =============================================================================

import React, { useState, useEffect } from 'react';
import { Title3, Spinner, makeStyles, tokens, Table, TableHeader, TableRow, TableHeaderCell, TableBody } from '@fluentui/react-components';
import { useMsal } from '@azure/msal-react';
import { ActionItem } from '@meetmind/shared';
import axios from 'axios';
import { ActionItemRow } from '../components/ActionItemRow';

const useStyles = makeStyles({
  container: {
    padding: '24px',
  },
  tableWrapper: {
    marginTop: '24px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow2,
    overflow: 'hidden',
  },
  empty: {
    padding: '48px',
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  }
});

// Since the API doesn't have a global "get all my tasks" endpoint out of the box
// we'll fetch all meetings and aggregate tasks assigned to the user.
export function Tasks() {
  const styles = useStyles();
  const { instance, accounts } = useMsal();
  const [tasks, setTasks] = useState<{item: ActionItem, meetingTitle: string}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const response = await instance.acquireTokenSilent({
          scopes: ['api://meetmind/MeetMind.ReadWrite'],
          account: accounts[0]
        });
        
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
        const res = await axios.get(`${apiBase}/api/v1/meetings`, {
          headers: { Authorization: `Bearer ${response.accessToken}` }
        });
        
        const allTasks: {item: ActionItem, meetingTitle: string}[] = [];
        const userEmail = accounts[0]?.username;

        res.data.items.forEach((m: any) => {
          if (m.actionItems) {
            m.actionItems.forEach((ai: ActionItem) => {
              if (ai.assigneeEmail === userEmail || ai.assigneeName === accounts[0]?.name) {
                allTasks.push({ item: ai, meetingTitle: m.title });
              }
            });
          }
        });

        // Sort by due date (oldest first)
        allTasks.sort((a, b) => {
          if (!a.item.dueDate) return 1;
          if (!b.item.dueDate) return -1;
          return new Date(a.item.dueDate).getTime() - new Date(b.item.dueDate).getTime();
        });

        setTasks(allTasks);
      } catch (error) {
        console.error('Failed to fetch tasks', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [instance, accounts]);

  const handleStatusToggle = async (taskId: string, isDone: boolean) => {
    // Optimistic UI update
    setTasks(prev => prev.map(t => 
      t.item.id === taskId 
        ? { ...t, item: { ...t.item, status: isDone ? 'completed' : 'in_progress' } } 
        : t
    ));

    // In a real app, we'd hit an endpoint like PATCH /api/v1/meetings/:meetingId/actions/:actionId
    // to update the status in Cosmos and Planner.
  };

  return (
    <div className={styles.container}>
      <Title3>My Action Items</Title3>
      
      {loading ? (
        <Spinner label="Loading tasks..." style={{ marginTop: '24px' }} />
      ) : tasks.length > 0 ? (
        <div className={styles.tableWrapper}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell style={{ width: '50px' }} />
                <TableHeaderCell>Task</TableHeaderCell>
                <TableHeaderCell>Source Meeting</TableHeaderCell>
                <TableHeaderCell>Assignee</TableHeaderCell>
                <TableHeaderCell>Due Date</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map(t => (
                <ActionItemRow 
                  key={t.item.id} 
                  item={t.item} 
                  meetingTitle={t.meetingTitle}
                  showMeetingLink={true}
                  onStatusToggle={handleStatusToggle} 
                />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className={styles.empty}>
          You have no open action items! 🎉
        </div>
      )}
    </div>
  );
}
