import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGoogleCalendar, useItems } from '@/hooks/useStore';
import { useAppState } from '@/hooks/useStore';
import { useTranslation } from 'react-i18next';
import { googleOAuthManager } from '@/lib/google-oauth';
import { googleCalendarSync } from '@/lib/google-calendar-sync';
import { Loader2, LogOut, Upload, Download } from 'lucide-react';
import { Item } from '@/items/models';

export default function GoogleCalendarSettings() {
  const { t } = useTranslation('settings');
  const { googleCalendar, setGoogleCalendarConfig, setCalendars, setSelectedCalendar, setSyncEnabled, clearGoogleCalendar } =
    useGoogleCalendar();
  const appState = useAppState();
  const { addItem } = useItems();
  const [loading, setLoading] = useState(false);
  const [bulkExporting, setBulkExporting] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle OAuth connection
  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log('Starting OAuth flow...');
      const tokenState = await googleOAuthManager.startOAuthFlow();

      console.log('OAuth flow result:', tokenState);

      if (!tokenState) {
        setError(t('googleCalendar.errors.userCancelled'));
        setLoading(false);
        return;
      }

      console.log('Token state received, storing...');
      // Store tokens
      setGoogleCalendarConfig({
        accessToken: tokenState.accessToken,
        refreshToken: tokenState.refreshToken,
        tokenExpiresAt: tokenState.expiresAt,
        syncEnabled: true,
      });

      // Fetch calendars
      console.log('Fetching calendars...');
      const calendars = await googleCalendarSync.fetchCalendars(tokenState.accessToken);
      console.log('Calendars fetched:', calendars);

      if (calendars && calendars.length > 0) {
        setCalendars(calendars);
        setSelectedCalendar(calendars[0].id);
        setSuccessMessage(t('googleCalendar.connected'));
      } else {
        setError(t('googleCalendar.errors.noCalendars'));
      }
    } catch (err) {
      console.error('OAuth error:', err);
      setError(err instanceof Error ? err.message : t('googleCalendar.errors.connectionFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);

    try {
      if (googleCalendar.accessToken) {
        await googleOAuthManager.revokeToken(googleCalendar.accessToken);
      }

      clearGoogleCalendar();
      setSuccessMessage(t('googleCalendar.disconnected'));
    } catch (err) {
      console.error('Disconnect error:', err);
      setError(t('googleCalendar.errors.disconnectFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk export
  const handleBulkExport = async () => {
    if (!googleCalendar.accessToken || !googleCalendar.calendarId) return;

    setBulkExporting(true);
    setError(null);
    setSuccessMessage(null);
    setBulkProgress({ current: 0, total: appState.items.length });

    try {
      // Create course and project maps
      const coursesMap: Record<string, string> = {};
      appState.courses.forEach(c => {
        coursesMap[c.id] = c.title;
      });

      const projectsMap: Record<string, string> = {};
      appState.projects.forEach(p => {
        projectsMap[p.id] = p.title;
      });

      const results = await googleCalendarSync.bulkSyncItems(
        appState.items as unknown as Item[],
        {
          accessToken: googleCalendar.accessToken,
          calendarId: googleCalendar.calendarId,
          syncEnabled: googleCalendar.syncEnabled,
          courses: coursesMap,
          projects: projectsMap,
        },
        (current, total) => {
          setBulkProgress({ current, total });
        }
      );

      if (results.success > 0) {
        setSuccessMessage(
          `✅ Successfully exported ${results.success} item${results.success !== 1 ? 's' : ''} to Google Calendar${
            results.failed > 0 ? ` (${results.failed} failed)` : ''
          }`
        );
      }

      if (results.failed > 0) {
        setError(`❌ Failed to export ${results.failed} item${results.failed !== 1 ? 's' : ''}. Check console for details.`);
        console.error('Bulk export errors:', results.errors);
      }
    } catch (err) {
      console.error('Bulk export error:', err);
      setError(err instanceof Error ? err.message : 'Failed to export items');
    } finally {
      setBulkExporting(false);
      setBulkProgress({ current: 0, total: 0 });
    }
  };

  const handleBulkImport = async () => {
    if (!googleCalendar.accessToken || !googleCalendar.calendarId) return;

    setBulkImporting(true);
    setError(null);
    setSuccessMessage(null);
    setBulkProgress({ current: 0, total: 0 });

    try {
      // Fetch events from exactly 30 days ago and into the future
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 30);
      const events = await googleCalendarSync.fetchEventsFromCalendar(
        googleCalendar.accessToken,
        googleCalendar.calendarId,
        timeMin
      );
      
      setBulkProgress({ current: 0, total: events.length });

      if (events.length === 0) {
        setSuccessMessage('No events found to import.');
        setBulkImporting(false);
        return;
      }

      let importedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        setBulkProgress({ current: i + 1, total: events.length });

        // Skip events without start time
        if (!ev.start || (!ev.start.dateTime && !ev.start.date)) {
          skippedCount++;
          continue;
        }

        const isAllDay = !!ev.start.date;
        const startsAt = isAllDay ? new Date(ev.start.date) : new Date(ev.start.dateTime);
        const endsAt = ev.end ? (isAllDay ? new Date(ev.end.date) : new Date(ev.end.dateTime)) : startsAt;

        // Skip duplicates
        // Match by title, date, or if it already has googleCalendarEventId matching ev.id in our local state
        const isDuplicate = appState.items.some(item => {
          if (item.type !== 'event' && item.type !== 'task' && item.type !== 'exam') return false;
          const i = item as any;
          return i.googleCalendarEventId === ev.id || 
          (i.title === ev.summary && i.startsAt && new Date(i.startsAt).toISOString() === startsAt.toISOString());
        });

        if (isDuplicate) {
          skippedCount++;
          continue;
        }

        // Add to our items
        addItem({
          type: 'event',
          title: ev.summary || 'Untitled Event',
          courseId: undefined,
          projectId: undefined,
          startsAt,
          endsAt,
          isAllDay,
          notes: ev.description || '',
          location: ev.location || '',
          googleCalendarEventId: ev.id,
          isDeleted: false,
        } as any);

        importedCount++;
      }

      setSuccessMessage(
        `✅ Successfully imported ${importedCount} item${importedCount !== 1 ? 's' : ''} from Google Calendar` +
        (skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : '')
      );
    } catch (err) {
      console.error('Bulk import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import items');
    } finally {
      setBulkImporting(false);
      setBulkProgress({ current: 0, total: 0 });
    }
  };

  const isConnected = !!googleCalendar.accessToken;

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      {isConnected ? (
        <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
          <p className="text-green-800 dark:text-green-200 text-sm font-medium">✓ {t('googleCalendar.status.connected')}</p>
        </div>
      ) : (
        <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm">{t('googleCalendar.status.notConnected')}</p>
        </div>
      )}

      {/* Error Message */}
      {error && <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg text-red-800 dark:text-red-200 text-sm">{error}</div>}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg text-green-800 dark:text-green-200 text-sm">
          {successMessage}
        </div>
      )}

      {/* Connection Button */}
      {!isConnected ? (
        <Button onClick={handleConnect} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('googleCalendar.connecting')}
            </>
          ) : (
            t('googleCalendar.connectButton')
          )}
        </Button>
      ) : (
        <>
          {/* Calendar Selection */}
          {googleCalendar.calendars && googleCalendar.calendars.length > 0 && (
            <div>
              <Label htmlFor="calendar-select">{t('googleCalendar.selectCalendar')}</Label>
              <Select value={googleCalendar.calendarId || ''} onValueChange={setSelectedCalendar}>
                <SelectTrigger id="calendar-select" className="mt-2">
                  <SelectValue placeholder={t('googleCalendar.selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {googleCalendar.calendars.map(cal => (
                    <SelectItem key={cal.id} value={cal.id}>
                      {cal.summary}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-200 mb-2">{t('googleCalendar.syncInfo.title')}</p>
            <ul className="text-blue-700 dark:text-blue-300 text-xs space-y-1 ml-4 list-disc">
              <li>{t('googleCalendar.syncInfo.auto')}</li>
              <li>{t('googleCalendar.syncInfo.updates')}</li>
              <li>{t('googleCalendar.syncInfo.deletes')}</li>
            </ul>
          </div>

          {/* Bulk Export Button */}
          <Button
            onClick={handleBulkExport}
            disabled={bulkExporting || bulkImporting || appState.items.length === 0}
            variant="outline"
            className="w-full"
          >
            {bulkExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('googleCalendar.bulkExporting', {
                  defaultValue: `Exporting (${bulkProgress.current}/${bulkProgress.total})`
                })}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {t('googleCalendar.bulkExport', {
                  defaultValue: `Export All Items to Google Calendar (${appState.items.length})`
                })}
              </>
            )}
          </Button>

          {/* Bulk Import Button */}
          <Button
            onClick={handleBulkImport}
            disabled={bulkImporting || bulkExporting}
            variant="outline"
            className="w-full"
          >
            {bulkImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('googleCalendar.bulkImporting', {
                  defaultValue: `Importing (${bulkProgress.current}/${bulkProgress.total})`
                })}
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                {t('googleCalendar.bulkImport', {
                  defaultValue: `Import Items from Google Calendar`
                })}
              </>
            )}
          </Button>

          {/* Disconnect Button */}
          <Button onClick={handleDisconnect} disabled={loading} variant="destructive" className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('googleCalendar.disconnecting')}
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4 mr-2" />
                {t('googleCalendar.disconnectButton')}
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
