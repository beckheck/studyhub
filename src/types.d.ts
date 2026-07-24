/// <reference types="vite/client" />
/// <reference types="wxt" />

import React from 'react';
import type { Item } from './items/models';

export type { Item };

interface BackgroundMessage_Tab {
  type: 'openStudyPortalTab';
  activeTab: string;
}

interface BackgroundMessage_TextSelected {
  type: 'textSelected';
  text: string;
  url: string;
  title: string;
  timestamp: number;
}

interface BackgroundMessage_Timer_Start {
  type: 'timer.start';
  courseId: string;
}

interface BackgroundMessage_Timer_Stop {
  type: 'timer.stop';
}

interface BackgroundMessage_Timer_Reset {
  type: 'timer.reset';
}

interface BackgroundMessage_Timer_GetState {
  type: 'timer.getState';
}

interface BackgroundMessage_Timer_UpdateState {
  type: 'timer.updateState';
  courseId?: string;
  technique?: string;
  note?: string;
  moodStart?: number;
  moodEnd?: number;
  audioEnabled?: boolean;
  audioVolume?: number;
  notificationsEnabled?: boolean;
  showCountdown?: boolean;
}

interface BackgroundMessage_Timer_BroadcastState {
  type: 'timer.broadcastState';
  state: BackgroundTimerState;
}

export type BackgroundMessage_Timer =
  | BackgroundMessage_Timer_Start
  | BackgroundMessage_Timer_Stop
  | BackgroundMessage_Timer_Reset
  | BackgroundMessage_Timer_GetState
  | BackgroundMessage_Timer_UpdateState
  | BackgroundMessage_Timer_BroadcastState;

export type BackgroundMessage = BackgroundMessage_Tab | BackgroundMessage_TextSelected | BackgroundMessage_Timer;

// Content script message interfaces
interface ContentScriptMessage_BlockSite {
  action: 'blockSite';
  language?: string;
}

interface ContentScriptMessage_UnblockSite {
  action: 'unblockSite';
}

interface ContentScriptMessage_CaptureSelection {
  action: 'captureSelection';
  selectedText?: string;
}

interface ContentScriptMessage_ToggleOverlay {
  action: 'toggleOverlay';
}

export type ContentScriptMessage =
  | ContentScriptMessage_BlockSite
  | ContentScriptMessage_UnblockSite
  | ContentScriptMessage_CaptureSelection
  | ContentScriptMessage_ToggleOverlay;

export type TimerPhase = 'focus' | 'break' | 'longBreak';

export interface BackgroundTimerState {
  running: boolean;
  elapsed: number;
  technique: string;
  moodStart: number;
  moodEnd: number;
  note: string;
  startTs?: number;
  courseId: string;
  phase: TimerPhase;
  phaseElapsed: number;
  phaseStartTs?: number;
  studyPhasesCompleted: number; // Counter for completed study phases
}

/**
 * Study session object representing a completed study session
 */
export interface StudySession {
  /** Unique identifier for the session */
  id: string;
  /** Id of the course in the courses array */
  courseId: string;
  /** Duration of the session in minutes */
  durationMin: number;
  /** Study technique used */
  technique: string;
  /** Start timestamp */
  startTs: number;
  /** End timestamp */
  endTs: number;
  /** Optional session notes */
  note?: string;
  /** Mood at the start of the session (1-5 scale) */
  moodStart?: number;
  /** Mood at the end of the session (1-5 scale) */
  moodEnd?: number;
}

/**
 * Session-specific task object for tracking tasks during a study session
 */
export interface StudySessionTask {
  /** Unique identifier for the task */
  id: string;
  /** Task title */
  title: string;
  /** Whether the task is completed */
  done: boolean;
  /** Creation timestamp */
  createdAt: number;
}

/**
 * Exam grade object for tracking grades
 */
export interface ExamGrade {
  /** ID of the exam this grade belongs to */
  examId: string;
  /** Grade value (1-7 scale) */
  grade: number;
}

/**
 * Weather location configuration object
 */
export interface WeatherLocation {
  /** Whether to use geolocation for weather */
  useGeolocation: boolean;
  /** City name for weather when not using geolocation */
  city: string;
}

/**
 * Weather configuration object containing API settings and location
 */
export interface WeatherConfig {
  /** API key for weather service */
  apiKey: string;
  /** Location configuration for weather */
  location: WeatherLocation;
}

/**
 * Weather data object for displaying current weather information
 */
export interface Weather {
  condition: string;
  temperature: number | string;
  location: string;
  description: string;
  icon?: string;
}

/**
 * Weather condition object for fallback simulation
 */
export interface WeatherCondition {
  condition: string;
  temp: number;
  icon: string;
  desc: string;
}

/**
 * OpenWeatherMap API response structure
 */
export interface OpenWeatherMapResponse {
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  main: {
    temp: number;
  };
  name: string;
}

/**
 * Soundtrack position type
 */
export type SoundtrackPosition = 'dashboard' | 'floating' | 'minimized' | 'off';


/**
 * Generic position interface for UI elements
 */
export interface Position {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
}

/**
 * Course object for degree planning
 */
export interface DegreeCourse {
  id: string;
  acronym: string;
  name: string;
  credits: string;
  prerequisites?: string;
  corequisites?: string;
  completed: boolean;
  finalGrade?: string;
}

/**
 * Course can be either a string or an object with a title
 */
export interface Course {
  id: string;
  title: string;
  emoji?: string;
  syllabusFileId?: string;
  links?: { label: string; url: string }[];
  contacts?: CourseContact[];
}

export interface CourseContact {
  name: string;
  role: string;
  email: string;
  phone?: string;
}

export type ProjectType = 'organization' | 'club' | 'research' | 'politics' | 'competition' | 'startup' | 'other';

export type ProjectVisualType = 'emoji' | 'icon';

export type ProjectIconName =
  | 'users'
  | 'building'
  | 'microscope'
  | 'vote'
  | 'megaphone'
  | 'book'
  | 'lightbulb'
  | 'rocket'
  | 'globe'
  | 'handshake';

export interface ProjectResource {
  label: string;
  url: string;
}

export interface ProjectMember {
  name: string;
  role: string;
  email: string;
}

/**
 * Project object for student organizations, clubs, research teams, and similar groups
 */
export interface Project {
  id: string;
  title: string;
  type: ProjectType;
  memberCount: number;
  visualType: ProjectVisualType;
  emoji: string;
  iconName: ProjectIconName;
  summary: string;
  notes: string;
  teamMembers: readonly ProjectMember[];
  yourRoles: readonly string[];
  resources: readonly ProjectResource[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Course record entry for tracking daily notes and activities
 */
export interface CourseRecord {
  /** Unique identifier for the record */
  id: string;
  /** Course ID this record belongs to */
  courseId: string;
  /** Date of the record (YYYY-MM-DD format) */
  date: string;
  /** Content/notes for this record */
  content: string;
  /** Type of record entry */
  type: 'note' | 'attendance' | 'homework' | 'lecture' | 'lab' | 'other';
  /** Optional mood/rating for the day (1-5) */
  mood?: number;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Color theme for light and dark modes
 */
export interface ColorTheme {
  light: string;
  dark: string;
}

/**
 * Opacity theme for light and dark modes
 */
export interface OpacityTheme {
  light: number;
  dark: number;
}

/**
 * Theme-specific properties for application state
 */
export interface ThemeState {
  darkMode: boolean;
  bgImage: string;
  customCursor: string;
  accentColor: ColorTheme;
  cardOpacity: OpacityTheme;
  gradientEnabled: boolean;
  gradientStart: ColorTheme;
  gradientMiddle: ColorTheme;
  gradientEnd: ColorTheme;
}

/**
 * Data transfer functionality for settings export/import
 */
export interface DataTransfer {
  exportData: () => void;
  importData: (file: File) => Promise<boolean>;
}

/**
 * Mood emoji configuration object
 */
export interface MoodEmoji {
  emoji: string;
  color: string;
  word: string;
}

/**
 * Mood percentages for tracking daily mood breakdown
 */
export interface MoodPercentages {
  [key: string]: number;
}

/**
 * Monthly mood data for calendar tracking
 */
export interface MonthlyMood {
  percentages: MoodPercentages;
  gradient: string;
  totalPercentage: number;
  savedAt: number;
}

/**
 * Monthly moods collection organized by date
 */
export interface MonthlyMoods {
  [dateString: string]: MonthlyMood;
}

/**
 * Daily hydration data for calendar tracking
 */
export interface DailyHydration {
  intake: number;
  goal: number;
  unit: 'metric' | 'imperial';
  useCups: boolean;
  savedAt: number;
}

/**
 * Daily hydration collection organized by date
 */
export interface DailyHydrations {
  [dateString: string]: DailyHydration;
}

/**
 * Mood emojis collection for customization
 */
export interface MoodEmojis {
  [key: string]: MoodEmoji;
}

/**
 * Weekly goal object for planner week view
 */
export interface WeeklyGoal {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  color?: string;
}

/**
 * Hydration settings for water tracking
 */
export interface HydrationSettings {
  useCups: boolean;
  cupSizeML: number;
  cupSizeOZ: number;
  dailyGoalML: number;
  dailyGoalOZ: number;
  unit: 'metric' | 'imperial';
}

/**
 * Focus timer configuration for study sessions
 */
export interface FocusTimerConfig {
  audioEnabled: boolean;
  audioVolume: number;
  notificationsEnabled: boolean;
  showCountdown: boolean;
  blockingStrategy: 'blacklist' | 'whitelist' | 'disabled';
  sites: string;
}

/**
 * Wellness data object for tracking user wellness metrics
 */
export interface Wellness {
  water: number;
  gratitude: string;
  moodPercentages: Record<string, number>;
  hasInteracted: boolean;
  monthlyMoods: MonthlyMoods;
  showWords: boolean;
  moodEmojis: MoodEmojis;
  hydrationSettings: HydrationSettings;
  dailyHydration: DailyHydrations;
}

/**
 * Calendar view state for mood tracking
 */
export interface CalendarView {
  year: number;
  month: number;
}

/**
 * Semester object for degree planning
 */
export interface Semester {
  id: string | number;
  name?: string;
  number?: number;
  courses: DegreeCourse[];
}

/**
 * Degree plan object for tracking academic progress
 */
export interface DegreePlan {
  name: string;
  semesters: Semester[];
  completedCourses: string[];
}

/**
 * Soundtrack configuration object
 */
export interface Soundtrack {
  /** Embed URL for soundtrack (Spotify/YouTube) */
  embed: string;
  /** Position of the soundtrack player */
  position: SoundtrackPosition;
}

/**
 * Google Calendar configuration object
 */
export interface GoogleCalendarConfig {
  /** OAuth access token */
  accessToken?: string;
  /** OAuth refresh token */
  refreshToken?: string;
  /** Token expiration timestamp */
  tokenExpiresAt?: number;
  /** Selected Google Calendar ID */
  calendarId?: string;
  /** List of available calendars */
  calendars?: Array<{ id: string; summary: string }>;
  /** Whether sync is enabled */
  syncEnabled: boolean;
}

/**
 * Dashboard widget layout configuration
 */
export interface DashboardState {
  widgetVisibility: Record<string, boolean>;
  widgetOrder: string[];
  widgetCollapsed: Record<string, boolean>;
}

/**
 * Complete application state interface
 */
/**
 * File attachment metadata
 */
export interface FileAttachmentMetadata {
  id: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  uploadedAt: number;
}

/**
 * Stored file attachment with data
 */
export interface StoredFileAttachment extends FileAttachmentMetadata {
  fileData: string; // base64 data
}

/**
 * File attachment store structure
 */
export interface FileAttachmentStore {
  files: Record<string, StoredFileAttachment>;
  metadata: Record<string, FileAttachmentMetadata>;
}

export interface AppState {
  examGrades: ExamGrade[];
  sessions: StudySession[];
  sessionTasks: StudySessionTask[];
  weeklyGoals: WeeklyGoal[];
  items: Item[];
  courses: Course[];
  projects: Project[];
  selectedCourseId: string;
  theme: ThemeState;
  soundtrack: Soundtrack;
  weather: WeatherConfig;
  googleCalendar: GoogleCalendarConfig;
  degreePlan: DegreePlan;
  wellness: Wellness;
  fileAttachments: FileAttachmentStore;
  dashboard: DashboardState;
  activeTabsByMode: Record<string, string>;
  focusTimer: FocusTimerConfig;
  courseRecords: CourseRecord[];
}

export interface AppTab {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}
