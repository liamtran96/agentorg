import { randomUUID } from 'node:crypto';
import type { Skill, SkillResult, ToolDefinition } from './base.js';

interface CalendarEvent {
  eventId: string;
  title: string;
  start: string;
  end: string;
  attendees?: string[];
  description?: string;
  location?: string;
  cancelled: boolean;
}

interface Reminder {
  reminderId: string;
  eventId: string;
  remindAt: string;
  message?: string;
}

/**
 * Calendar skill — in-memory calendar with scheduling, listing, cancellation,
 * reminders, and availability checking.
 */
export class CalendarSkill implements Skill {
  readonly id = 'calendar';
  readonly name = 'Calendar';
  readonly description = 'Schedule, list, cancel events and check availability';
  readonly version = '0.1.0';
  capabilities = ['schedule', 'list', 'cancel', 'remind', 'availability'];

  private events: Map<string, CalendarEvent> = new Map();
  private reminders: Map<string, Reminder> = new Map();

  async execute(action: string, params: Record<string, unknown>): Promise<SkillResult> {
    switch (action) {
      case 'schedule':
        return this.schedule(params);
      case 'list':
        return this.list(params);
      case 'cancel':
        return this.cancel(params);
      case 'remind':
        return this.remind(params);
      case 'availability':
        return this.checkAvailability(params);
      default:
        return { success: false, data: null, error: `Unknown action: ${action}` };
    }
  }

  private async schedule(params: Record<string, unknown>): Promise<SkillResult> {
    const start = params.start as string;
    const end = params.end as string;

    if (new Date(end) <= new Date(start)) {
      return { success: false, data: null, error: 'Event end must be after start' };
    }

    const eventId = randomUUID();
    const event: CalendarEvent = {
      eventId,
      title: params.title as string,
      start,
      end,
      attendees: params.attendees as string[] | undefined,
      description: params.description as string | undefined,
      location: params.location as string | undefined,
      cancelled: false,
    };

    this.events.set(eventId, event);

    return {
      success: true,
      data: {
        eventId,
        title: event.title,
        start: event.start,
        end: event.end,
        ...(event.description && { description: event.description }),
        ...(event.location && { location: event.location }),
        ...(event.attendees && { attendees: event.attendees }),
      },
    };
  }

  private async list(params: Record<string, unknown>): Promise<SkillResult> {
    const from = new Date(params.from as string);
    const to = new Date(params.to as string);

    const events = Array.from(this.events.values())
      .filter((e) => {
        if (e.cancelled) return false;
        const eventStart = new Date(e.start);
        const eventEnd = new Date(e.end);
        // Event overlaps with the range
        return eventStart < to && eventEnd > from;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .map((e) => ({
        eventId: e.eventId,
        title: e.title,
        start: e.start,
        end: e.end,
        ...(e.description && { description: e.description }),
        ...(e.location && { location: e.location }),
        ...(e.attendees && { attendees: e.attendees }),
      }));

    return { success: true, data: events };
  }

  private async cancel(params: Record<string, unknown>): Promise<SkillResult> {
    const eventId = params.eventId as string;
    const event = this.events.get(eventId);

    if (!event) {
      return { success: false, data: null, error: `Event ${eventId} not found` };
    }

    event.cancelled = true;
    return { success: true, data: { cancelled: true, eventId } };
  }

  private async remind(params: Record<string, unknown>): Promise<SkillResult> {
    const eventId = params.eventId as string;
    const event = this.events.get(eventId);

    if (!event) {
      return { success: false, data: null, error: `Event ${eventId} not found` };
    }

    const reminderId = randomUUID();
    const reminder: Reminder = {
      reminderId,
      eventId,
      remindAt: params.remindAt as string,
      message: params.message as string | undefined,
    };

    this.reminders.set(reminderId, reminder);

    return {
      success: true,
      data: {
        reminderId,
        eventId,
        remindAt: reminder.remindAt,
        ...(reminder.message && { message: reminder.message }),
      },
    };
  }

  private async checkAvailability(params: Record<string, unknown>): Promise<SkillResult> {
    const start = new Date(params.start as string);
    const end = new Date(params.end as string);

    const conflicts = Array.from(this.events.values())
      .filter((e) => {
        if (e.cancelled) return false;
        const eventStart = new Date(e.start);
        const eventEnd = new Date(e.end);
        // Check for overlap
        return eventStart < end && eventEnd > start;
      })
      .map((e) => ({
        eventId: e.eventId,
        title: e.title,
        start: e.start,
        end: e.end,
      }));

    return {
      success: true,
      data: {
        available: conflicts.length === 0,
        conflicts,
      },
    };
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'calendar_schedule',
        description: 'Schedule a new calendar event',
        input_schema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Event title' },
            start: { type: 'string', description: 'Start time (ISO 8601)' },
            end: { type: 'string', description: 'End time (ISO 8601)' },
            attendees: { type: 'array', description: 'List of attendee emails' },
            description: { type: 'string', description: 'Event description' },
            location: { type: 'string', description: 'Event location' },
          },
          required: ['title', 'start', 'end'],
        },
      },
      {
        name: 'calendar_list',
        description: 'List events within a date range',
        input_schema: {
          type: 'object',
          properties: {
            from: { type: 'string', description: 'Range start (ISO 8601)' },
            to: { type: 'string', description: 'Range end (ISO 8601)' },
          },
          required: ['from', 'to'],
        },
      },
      {
        name: 'calendar_cancel',
        description: 'Cancel an existing event',
        input_schema: {
          type: 'object',
          properties: {
            eventId: { type: 'string', description: 'Event ID to cancel' },
          },
          required: ['eventId'],
        },
      },
      {
        name: 'calendar_remind',
        description: 'Set a reminder for an event',
        input_schema: {
          type: 'object',
          properties: {
            eventId: { type: 'string', description: 'Event ID' },
            remindAt: { type: 'string', description: 'When to send reminder (ISO 8601)' },
            message: { type: 'string', description: 'Reminder message' },
          },
          required: ['eventId', 'remindAt'],
        },
      },
      {
        name: 'calendar_availability',
        description: 'Check availability for a time slot',
        input_schema: {
          type: 'object',
          properties: {
            start: { type: 'string', description: 'Start time (ISO 8601)' },
            end: { type: 'string', description: 'End time (ISO 8601)' },
          },
          required: ['start', 'end'],
        },
      },
    ];
  }
}
