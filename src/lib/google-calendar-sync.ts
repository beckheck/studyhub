import { ItemEvent } from '@/items/event/modelSchema';
import { EventRecurrence } from '@/items/event/modelSchema';
import { ItemTask } from '@/items/task/modelSchema';
import { ItemExam } from '@/items/exam/modelSchema';
import { Item } from '@/items/models';
import { googleOAuthManager } from './google-oauth';

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
  courseName?: string;
  projectName?: string;
}

export class GoogleCalendarSync {
  private apiBaseUrl = 'https://www.googleapis.com/calendar/v3';
  private retryDelays = [1000, 2000, 4000]; // Exponential backoff
  private retryAttempts = 0;

  /**
   * Converts ItemEvent to Google Calendar event format
   */
  convertItemToGoogleEvent(event: ItemEvent, courseName?: string, projectName?: string): GoogleCalendarEvent {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Build description with metadata
    const descriptionParts: string[] = [];

    if (event.notes) {
      descriptionParts.push(event.notes);
      descriptionParts.push(''); // Add blank line
    }

    // Add metadata
    const metadata: string[] = [];

    // Type
    metadata.push(`📌 Type: Event`);

    // Course or Project
    if (courseName) {
      metadata.push(`📚 Course: ${courseName}`);
    } else if (projectName) {
      metadata.push(`🎯 Project: ${projectName}`);
    }

    // Location
    if (event.location) {
      metadata.push(`📍 Location: ${event.location}`);
    }

    if (metadata.length > 0) {
      descriptionParts.push(metadata.join('\n'));
    }

    const googleEvent: GoogleCalendarEvent = {
      summary: event.title,
      description: descriptionParts.join('\n') || undefined,
      location: event.location,
      start: event.isAllDay
        ? { date: this.formatDate(event.startsAt) }
        : { dateTime: event.startsAt.toISOString(), timeZone },
      end: event.isAllDay
        ? { date: this.formatDate(this.addDays(event.endsAt, 1)) }
        : { dateTime: event.endsAt.toISOString(), timeZone },
    };

    // Add recurrence rule if present
    if (event.recurrence) {
      googleEvent.recurrence = [this.convertRecurrenceToRRule(event.recurrence)];
    }

    return googleEvent;
  }

  /**
   * Syncs new event to Google Calendar
   */
  async syncNewEvent(
    event: ItemEvent,
    accessToken: string,
    calendarId: string,
    courseName?: string,
    projectName?: string
  ): Promise<GoogleCalendarSyncResult> {
    try {
      console.log('Converting event to Google format:', event.title);
      const googleEvent = this.convertItemToGoogleEvent(event, courseName, projectName);
      console.log('Google event format:', googleEvent);

      console.log('Making API request to create event...');
      const response = await this.makeApiRequest(
        'POST',
        `/calendars/${calendarId}/events`,
        googleEvent,
        accessToken
      );

      console.log('API response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('API error response:', error);
        return {
          success: false,
          error: error.error?.message || 'Failed to create event',
        };
      }

      const createdEvent = await response.json();
      console.log('Event created successfully with ID:', createdEvent.id);
      return {
        success: true,
        googleEventId: createdEvent.id,
      };
    } catch (error) {
      console.error('Error syncing new event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Updates event on Google Calendar
   */
  async updateEvent(
    event: ItemEvent,
    accessToken: string,
    calendarId: string,
    courseName?: string,
    projectName?: string
  ): Promise<GoogleCalendarSyncResult> {
    if (!event.googleCalendarEventId) {
      return {
        success: false,
        error: 'No Google Calendar event ID found',
      };
    }

    try {
      const googleEvent = this.convertItemToGoogleEvent(event, courseName, projectName);
      const response = await this.makeApiRequest(
        'PUT',
        `/calendars/${calendarId}/events/${event.googleCalendarEventId}`,
        googleEvent,
        accessToken
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error?.message || 'Failed to update event',
        };
      }

      return { success: true, googleEventId: event.googleCalendarEventId };
    } catch (error) {
      console.error('Error updating event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Syncs task to Google Calendar
   */
  async syncTaskToGoogle(
    task: ItemTask,
    accessToken: string,
    calendarId: string,
    isUpdate: boolean,
    courseName?: string,
    projectName?: string
  ): Promise<GoogleCalendarSyncResult> {
    try {
      const googleEvent = this.convertTaskToGoogleEvent(task, courseName, projectName);

      if (isUpdate && task.googleCalendarEventId) {
        const response = await this.makeApiRequest(
          'PUT',
          `/calendars/${calendarId}/events/${task.googleCalendarEventId}`,
          googleEvent,
          accessToken
        );

        if (!response.ok) {
          const error = await response.json();
          return { success: false, error: error.error?.message || 'Failed to update task' };
        }

        return { success: true, googleEventId: task.googleCalendarEventId };
      } else {
        const response = await this.makeApiRequest(
          'POST',
          `/calendars/${calendarId}/events`,
          googleEvent,
          accessToken
        );

        if (!response.ok) {
          const error = await response.json();
          return { success: false, error: error.error?.message || 'Failed to create task' };
        }

        const createdEvent = await response.json();
        return { success: true, googleEventId: createdEvent.id };
      }
    } catch (error) {
      console.error('Error syncing task:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Syncs exam to Google Calendar
   */
  async syncExamToGoogle(
    exam: ItemExam,
    accessToken: string,
    calendarId: string,
    isUpdate: boolean,
    courseName?: string,
    projectName?: string
  ): Promise<GoogleCalendarSyncResult> {
    try {
      const googleEvent = this.convertExamToGoogleEvent(exam, courseName, projectName);

      if (isUpdate && exam.googleCalendarEventId) {
        const response = await this.makeApiRequest(
          'PUT',
          `/calendars/${calendarId}/events/${exam.googleCalendarEventId}`,
          googleEvent,
          accessToken
        );

        if (!response.ok) {
          const error = await response.json();
          return { success: false, error: error.error?.message || 'Failed to update exam' };
        }

        return { success: true, googleEventId: exam.googleCalendarEventId };
      } else {
        const response = await this.makeApiRequest(
          'POST',
          `/calendars/${calendarId}/events`,
          googleEvent,
          accessToken
        );

        if (!response.ok) {
          const error = await response.json();
          return { success: false, error: error.error?.message || 'Failed to create exam' };
        }

        const createdEvent = await response.json();
        return { success: true, googleEventId: createdEvent.id };
      }
    } catch (error) {
      console.error('Error syncing exam:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
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
      console.error('Error deleting event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async syncItem(item: Item, ctx: SyncItemContext): Promise<GoogleCalendarSyncResult> {
    if (!ctx.syncEnabled || !ctx.accessToken || !ctx.calendarId) {
      return { success: false, skipped: true };
    }

    if (item.type === 'timetable') {
      return { success: false, skipped: true };
    }

    if (item.type === 'event') {
      const event = item as ItemEvent;
      if (event.googleCalendarEventId) {
        return this.updateEvent(event, ctx.accessToken, ctx.calendarId, ctx.courseName, ctx.projectName);
      }
      return this.syncNewEvent(event, ctx.accessToken, ctx.calendarId, ctx.courseName, ctx.projectName);
    }

    if (item.type === 'task') {
      const task = item as ItemTask;
      const isUpdate = !!task.googleCalendarEventId;
      return this.syncTaskToGoogle(
        task,
        ctx.accessToken,
        ctx.calendarId,
        isUpdate,
        ctx.courseName,
        ctx.projectName
      );
    }

    if (item.type === 'exam') {
      const exam = item as ItemExam;
      const isUpdate = !!exam.googleCalendarEventId;
      return this.syncExamToGoogle(
        exam,
        ctx.accessToken,
        ctx.calendarId,
        isUpdate,
        ctx.courseName,
        ctx.projectName
      );
    }

    return { success: false, skipped: true };
  }

  async deleteItem(item: Item, ctx: SyncItemContext): Promise<GoogleCalendarSyncResult> {
    if (item.type !== 'event') {
      return { success: false, skipped: true };
    }

    const event = item as ItemEvent;
    if (!event.googleCalendarEventId) {
      return { success: false, skipped: true };
    }

    return this.deleteEvent(event.googleCalendarEventId, ctx.accessToken, ctx.calendarId);
  }

  /**
   * Syncs multiple items to Google Calendar
   */
  async bulkSyncItems(
    items: Item[],
    accessToken: string,
    calendarId: string,
    coursesMap: Record<string, string>,
    projectsMap: Record<string, string>,
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

      try {
        const courseName = item.courseId ? coursesMap[item.courseId] : undefined;
        const projectName = item.projectId ? projectsMap[item.projectId] : undefined;

        let googleEvent: GoogleCalendarEvent;

        if (item.type === 'event') {
          const event = item as ItemEvent;
          googleEvent = this.convertItemToGoogleEvent(event, courseName, projectName);
        } else if (item.type === 'task') {
          const task = item as ItemTask;
          googleEvent = this.convertTaskToGoogleEvent(task, courseName, projectName);
        } else if (item.type === 'exam') {
          const exam = item as ItemExam;
          googleEvent = this.convertExamToGoogleEvent(exam, courseName, projectName);
        } else {
          continue;
        }

        const response = await this.makeApiRequest('POST', `/calendars/${calendarId}/events`, googleEvent, accessToken);

        if (response.ok) {
          results.success++;
        } else {
          results.failed++;
          const error = await response.json();
          results.errors.push(`${item.title}: ${error.error?.message || 'Unknown error'}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`${item.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }
  async fetchCalendars(
    accessToken: string
  ): Promise<Array<{ id: string; summary: string }> | null> {
    try {
      console.log('Fetching user calendars...');
      const response = await this.makeApiRequest(
        'GET',
        '/users/me/calendarList',
        null,
        accessToken
      );

      if (!response.ok) {
        console.error('Failed to fetch calendars');
        return null;
      }

      const data = await response.json();
      console.log('All calendars:', data.items);

      // Filter to only calendars with writer access
      const writableCalendars = data.items
        ?.filter((cal: any) => {
          const isWritable = cal.accessRole === 'owner' || cal.accessRole === 'writer';
          console.log(`Calendar "${cal.summary}" - access: ${cal.accessRole}, writable: ${isWritable}`);
          return isWritable;
        })
        .map((cal: any) => ({
          id: cal.id,
          summary: cal.summary,
        })) || [];

      console.log('Writable calendars:', writableCalendars);
      return writableCalendars;
    } catch (error) {
      console.error('Error fetching calendars:', error);
      return null;
    }
  }

  async fetchEventsFromCalendar(
    accessToken: string,
    calendarId: string,
    timeMin?: Date
  ): Promise<any[]> {
    try {
      console.log(`Fetching events from calendar ${calendarId}...`);
      let endpoint = `/calendars/${calendarId}/events?singleEvents=true&orderBy=startTime&maxResults=500`;
      
      if (timeMin) {
        endpoint += `&timeMin=${timeMin.toISOString()}`;
      }

      const response = await this.makeApiRequest(
        'GET',
        endpoint,
        null,
        accessToken
      );

      if (!response.ok) {
        console.error('Failed to fetch events');
        return [];
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }

  // Private helper methods

  private async makeApiRequest(
    method: string,
    endpoint: string,
    body: any,
    accessToken: string
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

    console.log('Making API request:', { method, url, hasBody: !!body });

    try {
      const response = await fetch(url, options);
      console.log('API response received:', { status: response.status, statusText: response.statusText });
      return response;
    } catch (error) {
      console.error('API request failed:', error);
      // Retry with exponential backoff
      if (this.retryAttempts < this.retryDelays.length) {
        const delay = this.retryDelays[this.retryAttempts];
        this.retryAttempts++;

        console.log(`Retrying after ${delay}ms (attempt ${this.retryAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeApiRequest(method, endpoint, body, accessToken);
      }

      throw error;
    } finally {
      this.retryAttempts = 0;
    }
  }

  private convertRecurrenceToRRule(recurrence: EventRecurrence): string {
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
      const untilDate = this.formatDate(recurrence.until);
      rrule += `;UNTIL=${untilDate}`;
    }

    return rrule;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private convertTaskToGoogleEvent(task: ItemTask, courseName?: string, projectName?: string): GoogleCalendarEvent {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Build description
    const descriptionParts: string[] = [];

    if (task.notes) {
      descriptionParts.push(task.notes);
      descriptionParts.push('');
    }

    const metadata: string[] = [];
    metadata.push(`📌 Type: Task`);

    if (courseName) {
      metadata.push(`📚 Course: ${courseName}`);
    } else if (projectName) {
      metadata.push(`🎯 Project: ${projectName}`);
    }

    if (task.priority) {
      metadata.push(`⚡ Priority: ${task.priority.toUpperCase()}`);
    }

    if (metadata.length > 0) {
      descriptionParts.push(metadata.join('\n'));
    }

    return {
      summary: task.title,
      description: descriptionParts.join('\n') || undefined,
      start: { dateTime: task.dueAt.toISOString(), timeZone },
      end: { dateTime: new Date(task.dueAt.getTime() + 60 * 60 * 1000).toISOString(), timeZone },
    };
  }

  private convertExamToGoogleEvent(exam: ItemExam, courseName?: string, projectName?: string): GoogleCalendarEvent {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Build description
    const descriptionParts: string[] = [];

    if (exam.notes) {
      descriptionParts.push(exam.notes);
      descriptionParts.push('');
    }

    const metadata: string[] = [];
    metadata.push(`📌 Type: Exam`);

    if (courseName) {
      metadata.push(`📚 Course: ${courseName}`);
    } else if (projectName) {
      metadata.push(`🎯 Project: ${projectName}`);
    }

    if (exam.weight) {
      metadata.push(`⚖️ Weight: ${exam.weight}%`);
    }

    if (metadata.length > 0) {
      descriptionParts.push(metadata.join('\n'));
    }

    return {
      summary: exam.title,
      description: descriptionParts.join('\n') || undefined,
      start: { dateTime: exam.startsAt.toISOString(), timeZone },
      end: { dateTime: new Date(exam.startsAt.getTime() + 2 * 60 * 60 * 1000).toISOString(), timeZone },
    };
  }
}

export const googleCalendarSync = new GoogleCalendarSync();
