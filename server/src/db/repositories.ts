// =============================================================================
// server/src/db/repositories.ts
// CRUD repository pattern for Cosmos DB entities
// =============================================================================

import { getMeetingsContainer } from './cosmosClient.js';
import { Meeting, ActionItem, CreateMeetingDto, UpdateMeetingDto } from '@meetmind/shared';
import { v4 as uuidv4 } from 'uuid';

export class MeetingRepository {
  /**
   * Retrieves a single meeting by its ID and tenant partition key.
   * @param id The meeting ID
   * @param tenantId The partition key
   * @returns The Meeting document, or null if not found
   */
  static async getById(id: string, tenantId: string): Promise<Meeting | null> {
    const container = await getMeetingsContainer();
    try {
      const { resource } = await container.item(id, tenantId).read<Meeting>();
      return resource ?? null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Creates a new meeting record.
   * @param dto Data transfer object containing initial meeting info
   * @param tenantId The partition key
   * @returns The created Meeting document
   */
  static async create(dto: CreateMeetingDto, tenantId: string): Promise<Meeting> {
    const container = await getMeetingsContainer();
    const now = new Date().toISOString();
    const meeting: Meeting = {
      id: uuidv4(),
      partitionKey: tenantId,
      title: dto.title,
      type: dto.type,
      status: 'scheduled',
      startTime: dto.startTime,
      organizer: dto.organizer,
      participants: dto.participants ?? [],
      createdAt: now,
      updatedAt: now,
    };
    if (dto.description !== undefined) meeting.description = dto.description;
    if (dto.metadata !== undefined) meeting.metadata = dto.metadata;

    const { resource } = await container.items.create(meeting);
    return resource as Meeting;
  }

  /**
   * Updates an existing meeting record.
   * @param id The meeting ID
   * @param tenantId The partition key
   * @param dto Partial update payload
   * @returns The updated Meeting document
   */
  static async update(id: string, tenantId: string, dto: UpdateMeetingDto): Promise<Meeting> {
    const container = await getMeetingsContainer();
    const { resource: existing } = await container.item(id, tenantId).read<Meeting>();
    if (!existing) {
      throw new Error(`Meeting ${id} not found`);
    }

    const updated: Meeting = {
      ...existing,
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    
    // Cosmos replace handles entire document replacement
    const { resource } = await container.item(id, tenantId).replace(updated);
    return resource as Meeting;
  }

  /**
   * Lists meetings for a specific tenant, with optional status filter.
   * @param tenantId The partition key
   * @param status Optional meeting status filter
   */
  static async list(tenantId: string, status?: string): Promise<Meeting[]> {
    const container = await getMeetingsContainer();
    let query = 'SELECT * FROM c WHERE c.partitionKey = @tenantId';
    const parameters = [{ name: '@tenantId', value: tenantId }];

    if (status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: status });
    }

    const { resources } = await container.items.query<Meeting>({ query, parameters }).fetchAll();
    return resources;
  }
}

export class ActionItemRepository {
  /**
   * Retrieves all action items for a given meeting.
   * @param meetingId The meeting ID
   * @param tenantId The partition key (since ActionItems are stored in Meeting)
   */
  static async getByMeetingId(meetingId: string, tenantId: string): Promise<ActionItem[]> {
    const meeting = await MeetingRepository.getById(meetingId, tenantId);
    if (!meeting) return [];
    return meeting.actionItems ?? [];
  }

  /**
   * Adds a new action item to a meeting.
   * @param meetingId The meeting ID
   * @param tenantId The partition key
   * @param actionItem The action item payload
   */
  static async create(meetingId: string, tenantId: string, actionItem: Omit<ActionItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ActionItem> {
    const meeting = await MeetingRepository.getById(meetingId, tenantId);
    if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

    const now = new Date().toISOString();
    const newItem: ActionItem = {
      ...actionItem,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    const actionItems = meeting.actionItems ?? [];
    actionItems.push(newItem);

    const updatedMeeting: Meeting = {
      ...meeting,
      actionItems,
      updatedAt: now,
    };

    const container = await getMeetingsContainer();
    await container.item(meetingId, tenantId).replace(updatedMeeting);
    
    return newItem;
  }

  /**
   * Updates an action item within a meeting.
   * @param meetingId The meeting ID
   * @param tenantId The partition key
   * @param actionItemId The action item ID
   * @param updates Partial updates to apply
   */
  static async update(meetingId: string, tenantId: string, actionItemId: string, updates: Partial<ActionItem>): Promise<ActionItem> {
    const meeting = await MeetingRepository.getById(meetingId, tenantId);
    if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

    const actionItems = meeting.actionItems ?? [];
    const index = actionItems.findIndex((a) => a.id === actionItemId);
    if (index === -1) throw new Error(`ActionItem ${actionItemId} not found`);

    const updatedItem = {
      ...actionItems[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    actionItems[index] = updatedItem;

    const container = await getMeetingsContainer();
    await container.item(meetingId, tenantId).replace({
      ...meeting,
      actionItems,
      updatedAt: new Date().toISOString(),
    });

    return updatedItem;
  }
}
