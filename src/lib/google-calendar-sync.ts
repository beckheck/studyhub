import { EventRecurrence } from '@/items/event/modelSchema';
import { Item } from '@/items/models';

interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  recurrence?: string[];
}

export interface GoogleCalendarSyncResult {
  success: boolean;
  googleEventId?: string;
  error?: string;
  skipped?: boolean;
}

export interface SyncItemContext {
  accessToken: string;
  calendarId: string;
  syncEnabled: boolean;
  courses?: Record<string, string>;
  projects?: Record<string, string>;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function convertRecurrenceToRRule(recurrence: EventRecurrence): string {
  let rrule = `FREQ=${recurrence.frequency.toUpperCase()}`;

  if (recurrence.interval && recurrence.interval > 1) {
    rrule += `;INTERVAL=${recurrence.interval}`;
  }

  if (recurrence.byWeekday && recurrence.byWeekday.length > 0) {
    const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const byday = recurrence.byWeekday.map(d => days[d]).join(',');
    rrule += `;BYDAY=${byday}`;
  }

  if (recurrence.count) {
    rrule += `;COUNT=${recurrence.count}`;
  } else if (recurrence.until) {
    rrule += `;UNTIL=${formatDate(recurrence.until)}`;
  }

  return rrule;
}

export class GoogleCalendarSync {
  private apiBaseUrl = 'https://www.googleapis.com/calendar/v3';
  private retryDelays: number[];

  constructor(retryDelays: number[] = [1000, 2000, 4000]) {
    this.retryDelays = retryDelays;
  }

  /**
   * Syncs an item to Google Calendar. Creates the event for a new item and
   * updates it for an item that already carries a Google event id.
   */
  async syncItem(item: Item, ctx: SyncItemContext): Promise<GoogleCalendarSyncResult> {
    if (!ctx.syncEnabled || !ctx.accessToken || !ctx.calendarId) {
      return { success: false, skipped: true };
    }

    if (item.type === 'timetable') {
      return { success: false, skipped: true };
    }

    try {
      const googleEvent = this.convertItemToGoogleEvent(item, ctx);
      const existingId = item.googleCalendarEventId;
      const method = existingId ? 'PUT' : 'POST';
      const endpoint = existingId
        ? `/calendars/${ctx.calendarId}/events/${existingId}`
        : `/calendars/${ctx.calendarId}/events`;

      const response = await this.makeApiRequest(method, endpoint, googleEvent, ctx.accessToken);

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error?.message || 'Failed to sync item',
        };
      }

      if (existingId) {
        return { success: true, googleEventId: existingId };
      }

      const createdEvent = await response.json();
      return {
        success: true,
        googleEventId: createdEvent.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Deletes the Google event backing an item, when the item has one.
   */
  async deleteItem(item: Item, ctx: SyncItemContext): Promise<GoogleCalendarSyncResult> {
    if (item.type === 'timetable' || !item.googleCalendarEventId) {
      return { success: false, skipped: true };
    }

    return this.deleteEvent(item.googleCalendarEventId, ctx.accessToken, ctx.calendarId);
  }

  async deleteEvent(
    eventId: string,
    accessToken: string,
    calendarId: string
  ): Promise<GoogleCalendarSyncResult> {
    try {
      const response = await this.makeApiRequest(
        'DELETE',
        `/calendars/${calendarId}/events/${eventId}`,
        null,
        accessToken
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error?.message || 'Failed to delete event',
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Syncs a batch of items. Each item goes through syncItem, so existing
   * items are updated instead of duplicated.
   */
  async bulkSyncItems(
    items: Item[],
    ctx: SyncItemContext,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      onProgress?.(i + 1, items.length);

      const result = await this.syncItem(item, ctx);

      if (result.success) {
        results.success++;
      } else if (!result.skipped) {
        results.failed++;
        results.errors.push(`${item.title}: ${result.error || 'Unknown error'}`);
      }
    }

    return results;
  }

  async fetchCalendars(
    accessToken: string
  ): Promise<Array<{ id: string; summary: string }> | null> {
    try {
      const response = await this.makeApiRequest(
        'GET',
        '/users/me/calendarList',
        null,
        accessToken
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      // Filter to only calendars with writer access
      const writableCalendars =
        data.items
          ?.filter((cal: any) => cal.accessRole === 'owner' || cal.accessRole === 'writer')
          .map((cal: any) => ({
            id: cal.id,
            summary: cal.summary,
          })) || [];

      return writableCalendars;
    } catch (error) {
      return null;
    }
  }

  async fetchEventsFromCalendar(
    accessToken: string,
    calendarId: string,
    timeMin?: Date
  ): Promise<any[]> {
    try {
      let endpoint = `/calendars/${calendarId}/events?singleEvents=true&orderBy=startTime&maxResults=500`;

      if (timeMin) {
        endpoint += `&timeMin=${timeMin.toISOString()}`;
      }

      const response = await this.makeApiRequest('GET', endpoint, null, accessToken);

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      return [];
    }
  }

  // Private helper methods

  private async makeApiRequest(
    method: string,
    endpoint: string,
    body: any,
    accessToken: string,
    retryCount = 0
  ): Promise<Response> {
    const url = `${this.apiBaseUrl}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      if (retryCount < this.retryDelays.length) {
        const delay = this.retryDelays[retryCount];
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeApiRequest(method, endpoint, body, accessToken, retryCount + 1);
      }

      throw error;
    }
  }

  private convertItemToGoogleEvent(item: Item, ctx: SyncItemContext): GoogleCalendarEvent {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Build description with metadata
    const descriptionParts: string[] = [];

    if (item.notes) {
      descriptionParts.push(item.notes);
      descriptionParts.push(''); // Add blank line
    }

    const courseName = item.courseId ? ctx.courses?.[item.courseId] : undefined;
    const projectName = item.projectId ? ctx.projects?.[item.projectId] : undefined;
    const metadata: string[] = [];
    const pushMetadata = () => {
      if (metadata.length > 0) {
        descriptionParts.push(metadata.join('\n'));
      }
    };
    const description = () => descriptionParts.join('\n') || undefined;

    switch (item.type) {
      case 'event': {
        metadata.push(`📌 Type: Event`);

        if (courseName) {
          metadata.push(`📚 Course: ${courseName}`);
        } else if (projectName) {
          metadata.push(`🎯 Project: ${projectName}`);
        }

        if (item.location) {
          metadata.push(`📍 Location: ${item.location}`);
        }

        pushMetadata();

        const googleEvent: GoogleCalendarEvent = {
          summary: item.title,
          description: description(),
          location: item.location,
          start: item.isAllDay
            ? { date: formatDate(item.startsAt) }
            : { dateTime: item.startsAt.toISOString(), timeZone },
          end: item.isAllDay
            ? { date: formatDate(addDays(item.endsAt, 1)) }
            : { dateTime: item.endsAt.toISOString(), timeZone },
        };

        // Add recurrence rule if present
        if (item.recurrence) {
          googleEvent.recurrence = [convertRecurrenceToRRule(item.recurrence)];
        }

        return googleEvent;
      }
      case 'task': {
        metadata.push(`📌 Type: Task`);

        if (courseName) {
          metadata.push(`📚 Course: ${courseName}`);
        } else if (projectName) {
          metadata.push(`🎯 Project: ${projectName}`);
        }

        if (item.priority) {
          metadata.push(`⚡ Priority: ${item.priority.toUpperCase()}`);
        }

        pushMetadata();

        return {
          summary: item.title,
          description: description(),
          start: { dateTime: item.dueAt.toISOString(), timeZone },
          end: { dateTime: new Date(item.dueAt.getTime() + 60 * 60 * 1000).toISOString(), timeZone },
        };
      }
      case 'exam': {
        metadata.push(`📌 Type: Exam`);

        if (courseName) {
          metadata.push(`📚 Course: ${courseName}`);
        } else if (projectName) {
          metadata.push(`🎯 Project: ${projectName}`);
        }

        if (item.weight) {
          metadata.push(`⚖️ Weight: ${item.weight}%`);
        }

        pushMetadata();

        return {
          summary: item.title,
          description: description(),
          start: { dateTime: item.startsAt.toISOString(), timeZone },
          end: { dateTime: new Date(item.startsAt.getTime() + 2 * 60 * 60 * 1000).toISOString(), timeZone },
        };
      }
      case 'timetable': {
        // syncItem skips timetable items before this converter runs
        throw new Error('Timetable items cannot be converted to a Google Calendar event');
      }
    }
  }
}

export const googleCalendarSync = new GoogleCalendarSync();
