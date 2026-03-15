import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarSkill } from '@agentorg/skills';

describe('CalendarSkill', () => {
  let skill: CalendarSkill;

  beforeEach(() => {
    skill = new CalendarSkill();
  });

  it('should have correct metadata', () => {
    expect(skill.id).toBe('calendar');
    expect(skill.name).toBe('Calendar');
    expect(skill.capabilities).toContain('schedule');
    expect(skill.capabilities).toContain('list');
    expect(skill.capabilities).toContain('cancel');
    expect(skill.capabilities).toContain('remind');
    expect(skill.capabilities).toContain('availability');
  });

  describe('schedule action', () => {
    it('should create an event and return an id', async () => {
      const result = await skill.execute('schedule', {
        title: 'Team Standup',
        start: '2026-03-16T09:00:00Z',
        end: '2026-03-16T09:30:00Z',
        attendees: ['alice@example.com', 'bob@example.com'],
      });

      expect(result.success).toBe(true);
      const data = result.data as { eventId: string; title: string };
      expect(data.eventId).toBeDefined();
      expect(data.title).toBe('Team Standup');
    });

    it('should reject events where end is before start', async () => {
      const result = await skill.execute('schedule', {
        title: 'Invalid Event',
        start: '2026-03-16T10:00:00Z',
        end: '2026-03-16T09:00:00Z',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('end');
    });

    it('should support optional description and location', async () => {
      const result = await skill.execute('schedule', {
        title: 'Offsite',
        start: '2026-03-20T10:00:00Z',
        end: '2026-03-20T17:00:00Z',
        description: 'Annual team offsite',
        location: 'Conference Room A',
      });

      expect(result.success).toBe(true);
      const data = result.data as { description: string; location: string };
      expect(data.description).toBe('Annual team offsite');
      expect(data.location).toBe('Conference Room A');
    });
  });

  describe('list action', () => {
    it('should return upcoming events', async () => {
      // Create a few events
      await skill.execute('schedule', {
        title: 'Event A',
        start: '2026-03-16T09:00:00Z',
        end: '2026-03-16T10:00:00Z',
      });
      await skill.execute('schedule', {
        title: 'Event B',
        start: '2026-03-17T14:00:00Z',
        end: '2026-03-17T15:00:00Z',
      });

      const result = await skill.execute('list', {
        from: '2026-03-16T00:00:00Z',
        to: '2026-03-18T00:00:00Z',
      });

      expect(result.success).toBe(true);
      const events = result.data as Array<{ title: string; start: string }>;
      expect(events.length).toBe(2);
      expect(events[0].title).toBe('Event A');
      expect(events[1].title).toBe('Event B');
    });

    it('should return empty array when no events in range', async () => {
      const result = await skill.execute('list', {
        from: '2026-04-01T00:00:00Z',
        to: '2026-04-02T00:00:00Z',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should filter events by date range', async () => {
      await skill.execute('schedule', {
        title: 'March Event',
        start: '2026-03-16T09:00:00Z',
        end: '2026-03-16T10:00:00Z',
      });
      await skill.execute('schedule', {
        title: 'April Event',
        start: '2026-04-10T14:00:00Z',
        end: '2026-04-10T15:00:00Z',
      });

      const result = await skill.execute('list', {
        from: '2026-04-01T00:00:00Z',
        to: '2026-04-30T00:00:00Z',
      });

      expect(result.success).toBe(true);
      const events = result.data as Array<{ title: string }>;
      expect(events.length).toBe(1);
      expect(events[0].title).toBe('April Event');
    });
  });

  describe('cancel action', () => {
    it('should cancel an existing event', async () => {
      const created = await skill.execute('schedule', {
        title: 'Doomed Meeting',
        start: '2026-03-16T09:00:00Z',
        end: '2026-03-16T10:00:00Z',
      });
      const eventId = (created.data as { eventId: string }).eventId;

      const result = await skill.execute('cancel', { eventId });

      expect(result.success).toBe(true);
      expect((result.data as { cancelled: boolean }).cancelled).toBe(true);
    });

    it('should return success: false for unknown event', async () => {
      const result = await skill.execute('cancel', { eventId: 'nonexistent' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should not show cancelled events in list', async () => {
      const created = await skill.execute('schedule', {
        title: 'Cancelled Meeting',
        start: '2026-03-16T09:00:00Z',
        end: '2026-03-16T10:00:00Z',
      });
      const eventId = (created.data as { eventId: string }).eventId;

      await skill.execute('cancel', { eventId });

      const result = await skill.execute('list', {
        from: '2026-03-16T00:00:00Z',
        to: '2026-03-17T00:00:00Z',
      });

      const events = result.data as Array<{ title: string }>;
      const titles = events.map((e) => e.title);
      expect(titles).not.toContain('Cancelled Meeting');
    });
  });

  describe('remind action', () => {
    it('should set a follow-up reminder for an event', async () => {
      const created = await skill.execute('schedule', {
        title: 'Follow-up Call',
        start: '2026-03-16T09:00:00Z',
        end: '2026-03-16T09:30:00Z',
      });
      const eventId = (created.data as { eventId: string }).eventId;

      const result = await skill.execute('remind', {
        eventId,
        remindAt: '2026-03-16T08:45:00Z',
        message: 'Prepare notes for follow-up call',
      });

      expect(result.success).toBe(true);
      const data = result.data as { reminderId: string; eventId: string; remindAt: string };
      expect(data.reminderId).toBeDefined();
      expect(data.eventId).toBe(eventId);
      expect(data.remindAt).toBe('2026-03-16T08:45:00Z');
    });

    it('should return success: false for unknown event', async () => {
      const result = await skill.execute('remind', {
        eventId: 'nonexistent',
        remindAt: '2026-03-16T08:00:00Z',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('availability action', () => {
    it('should return available when no conflicts', async () => {
      const result = await skill.execute('availability', {
        start: '2026-03-16T11:00:00Z',
        end: '2026-03-16T12:00:00Z',
      });

      expect(result.success).toBe(true);
      expect((result.data as { available: boolean }).available).toBe(true);
    });

    it('should return unavailable when there is a conflict', async () => {
      await skill.execute('schedule', {
        title: 'Busy Time',
        start: '2026-03-16T10:00:00Z',
        end: '2026-03-16T11:00:00Z',
      });

      const result = await skill.execute('availability', {
        start: '2026-03-16T10:30:00Z',
        end: '2026-03-16T11:30:00Z',
      });

      expect(result.success).toBe(true);
      const data = result.data as { available: boolean; conflicts: Array<{ title: string }> };
      expect(data.available).toBe(false);
      expect(data.conflicts.length).toBeGreaterThan(0);
      expect(data.conflicts[0].title).toBe('Busy Time');
    });

    it('should detect partial overlap', async () => {
      await skill.execute('schedule', {
        title: 'Morning Block',
        start: '2026-03-16T08:00:00Z',
        end: '2026-03-16T09:30:00Z',
      });

      // Query that overlaps by 30 minutes
      const result = await skill.execute('availability', {
        start: '2026-03-16T09:00:00Z',
        end: '2026-03-16T10:00:00Z',
      });

      expect(result.success).toBe(true);
      expect((result.data as { available: boolean }).available).toBe(false);
    });
  });

  describe('unknown action', () => {
    it('should return success: false for unknown action', async () => {
      const result = await skill.execute('reschedule', { eventId: '123' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions for all capabilities', () => {
      const tools = skill.getToolDefinitions();

      expect(tools.length).toBeGreaterThanOrEqual(4);
      const names = tools.map((t) => t.name);
      expect(names).toContain('calendar_schedule');
      expect(names).toContain('calendar_list');
      expect(names).toContain('calendar_cancel');
      expect(names).toContain('calendar_availability');

      for (const tool of tools) {
        expect(tool.description).toBeDefined();
        expect(tool.input_schema).toBeDefined();
        expect(tool.input_schema.type).toBe('object');
      }
    });
  });
});
