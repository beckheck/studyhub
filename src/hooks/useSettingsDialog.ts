import AboutSettings from '@/components/settings/AboutSettings';
import AccentColorSettings from '@/components/settings/AccentColorSettings';
import BackgroundGradientSettings from '@/components/settings/BackgroundGradientSettings';
import BackgroundSettings from '@/components/settings/BackgroundSettings';
import CardOpacitySettings from '@/components/settings/CardOpacitySettings';
import CoursesSettings from '@/components/settings/CoursesSettings';
import CustomCursorSettings from '@/components/settings/CustomCursorSettings';
import DegreePlanSettings from '@/components/settings/DegreePlanSettings';
import FocusTimerSettings from '@/components/settings/FocusTimerSettings';
import GoogleCalendarSettings from '@/components/settings/GoogleCalendarSettings';
import HydrationSettings from '@/components/settings/HydrationSettings';
import SoundtrackSettings from '@/components/settings/SoundtrackSettings';
import WeatherApiSettings from '@/components/settings/WeatherApiSettings';
import {
  BookOpen,
  Brush,
  Calendar,
  Cloud,
  Droplets,
  GraduationCap,
  Image,
  Info,
  Layers,
  MousePointer,
  Music,
  Palette,
  Timer,
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface SettingsDialog {
  title: React.ReactNode;
  subtitle: string;
  Icon: (props: any) => React.ReactNode;
  Body: React.ComponentType;
}

export function useSettingsDialog() {
  const { t } = useTranslation('settings');
  const [activeDialog, setActiveDialog] = useState<string | null>(null);

  // Settings dialogs configuration
  const settingsDialogs = useMemo(
    () => ({
      about: {
        title: t('about.title'),
        subtitle: t('about.description'),
        Icon: Info,
        Body: AboutSettings,
      } as SettingsDialog,
      accentColor: {
        title: t('accentColor.title'),
        subtitle: t('accentColor.description'),
        Icon: Palette,
        Body: AccentColorSettings,
      } as SettingsDialog,
      background: {
        title: t('background.title'),
        subtitle: t('background.description'),
        Icon: Image,
        Body: BackgroundSettings,
      } as SettingsDialog,
      backgroundGradient: {
        title: t('backgroundGradient.title'),
        subtitle: t('backgroundGradient.description'),
        Icon: Brush,
        Body: BackgroundGradientSettings,
      } as SettingsDialog,
      cardOpacity: {
        title: t('cardOpacity.title'),
        subtitle: t('cardOpacity.description'),
        Icon: Layers,
        Body: CardOpacitySettings,
      } as SettingsDialog,
      courses: {
        title: t('courses.title'),
        subtitle: t('courses.description'),
        Icon: BookOpen,
        Body: CoursesSettings,
      } as SettingsDialog,
      customCursor: {
        title: t('customCursor.title'),
        subtitle: t('customCursor.description'),
        Icon: MousePointer,
        Body: CustomCursorSettings,
      } as SettingsDialog,
      degreePlan: {
        title: t('degreePlan.title'),
        subtitle: t('degreePlan.description'),
        Icon: GraduationCap,
        Body: DegreePlanSettings,
      } as SettingsDialog,
      focusTimer: {
        title: t('focusTimer.title'),
        subtitle: t('focusTimer.description'),
        Icon: Timer,
        Body: FocusTimerSettings,
      } as SettingsDialog,
      googleCalendar: {
        title: t('googleCalendar.title'),
        subtitle: t('googleCalendar.description'),
        Icon: Calendar,
        Body: GoogleCalendarSettings,
      } as SettingsDialog,
      hydration: {
        title: t('hydration.title'),
        subtitle: t('hydration.description'),
        Icon: Droplets,
        Body: HydrationSettings,
      } as SettingsDialog,
      soundtrack: {
        title: t('soundtrack.title'),
        subtitle: t('soundtrack.description'),
        Icon: Music,
        Body: SoundtrackSettings,
      } as SettingsDialog,
      weatherApi: {
        title: t('weatherApi.title'),
        subtitle: t('weatherApi.description'),
        Icon: Cloud,
        Body: WeatherApiSettings,
      } as SettingsDialog,
    }),
    [t]
  );

  const openDialog = useCallback((id: string) => {
    setActiveDialog(id);
  }, []);

  const closeDialog = useCallback(() => {
    setActiveDialog(null);
  }, []);

  // Find active dialog
  const currentDialog = useMemo(
    () => (activeDialog ? settingsDialogs[activeDialog] || null : null),
    [settingsDialogs, activeDialog]
  );

  return {
    activeDialog,
    openDialog,
    closeDialog,
    settingsDialogs,
    currentDialog,
  };
}
