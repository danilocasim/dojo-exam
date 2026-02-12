/**
 * Admin portal theme — matches mobile app AWS Modern Color Palette
 */
export const colors = {
  // Base
  background: '#232F3E',
  surface: '#1A2332',
  surfaceRaised: '#1F2937',
  surfaceHover: '#374151',
  border: '#374151',
  borderLight: 'rgba(255, 255, 255, 0.08)',

  // Text
  heading: '#F9FAFB',
  body: '#D1D5DB',
  muted: '#9CA3AF',
  subtle: '#6B7280',

  // Brand
  primary: '#FF9900',
  primaryHover: '#EC7211',
  primaryMuted: 'rgba(255, 153, 0, 0.15)',
  primaryText: '#FFB84D',

  // Semantic
  success: '#10B981',
  successMuted: 'rgba(16, 185, 129, 0.15)',
  successText: '#6EE7B7',

  error: '#EF4444',
  errorMuted: 'rgba(239, 68, 68, 0.15)',
  errorText: '#FCA5A5',

  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  warningText: '#FCD34D',

  info: '#3B82F6',
  infoMuted: 'rgba(59, 130, 246, 0.15)',
  infoText: '#93C5FD',

  // Status badges
  draft: { bg: 'rgba(107, 114, 128, 0.2)', text: '#9CA3AF' },
  pending: { bg: 'rgba(245, 158, 11, 0.15)', text: '#FCD34D' },
  approved: { bg: 'rgba(16, 185, 129, 0.15)', text: '#6EE7B7' },
  archived: { bg: 'rgba(239, 68, 68, 0.12)', text: '#FCA5A5' },

  // Difficulty
  easy: '#10B981',
  medium: '#F59E0B',
  hard: '#EF4444',
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
} as const;

export const shadow = {
  sm: '0 1px 3px rgba(0, 0, 0, 0.3)',
  md: '0 4px 12px rgba(0, 0, 0, 0.3)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.4)',
} as const;

export const font = {
  sans: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif",
  mono: "'SF Mono', 'Fira Code', Consolas, monospace",
} as const;
