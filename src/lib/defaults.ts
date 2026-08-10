import type { FocusTimerConfig, MoodEmojis } from '@/types'

export const DEFAULT_MOOD_EMOJIS: MoodEmojis = {
  angry: { emoji: '😠', color: '#ff6b6b', word: 'Angry' },
  sad: { emoji: '😔', color: '#ff9f43', word: 'Sad' },
  neutral: { emoji: '😐', color: '#f7dc6f', word: 'Neutral' },
  happy: { emoji: '🙂', color: '#45b7d1', word: 'Happy' },
  excited: { emoji: '😁', color: '#10ac84', word: 'Excited' },
}

export const DEFAULT_HYDRATION_SETTINGS = {
  useCups: true,
  cupSizeML: 250,
  cupSizeOZ: 8.5,
  dailyGoalML: 2000,
  dailyGoalOZ: 67.6,
  unit: 'metric' as const,
}

export const DEFAULT_FOCUS_TIMER_CONFIG: FocusTimerConfig = {
  audioEnabled: true,
  audioVolume: 0.6,
  notificationsEnabled: true,
  showCountdown: false,
  blockingStrategy: 'disabled',
  sites: [
    '4chan.org',
    'amazon.com',
    'buzzfeed.com',
    'discord.com',
    'disneyplus.com',
    'facebook.com',
    'instagram.com',
    'netflix.com',
    'pinterest.com',
    'primevideo.com',
    'reddit.com',
    'steampowered.com',
    'telegram.org',
    'tiktok.com',
    'twitch.tv',
    'whatsapp.com',
    'x.com',
    'youtube.com',
  ].join('\n'),
}
