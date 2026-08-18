import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#17211B',
    background: '#F5F7F5',
    surface: '#FFFFFF',
    backgroundElement: '#E9EEEA',
    backgroundSelected: '#DDE7DF',
    textSecondary: '#617066',
    primary: '#1D6B43',
    primaryMuted: '#E1F2E8',
    border: '#DCE4DE',
  },
  dark: {
    text: '#F3F7F4',
    background: '#111612',
    surface: '#19201B',
    backgroundElement: '#242D26',
    backgroundSelected: '#303B33',
    textSecondary: '#A9B6AD',
    primary: '#65C78D',
    primaryMuted: '#1C3D2A',
    border: '#2D3930',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'system-ui',
    serif: 'Georgia',
    rounded: 'system-ui',
    mono: 'ui-monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  medium: 12,
  large: 20,
  pill: 999,
} as const;

export const MaxContentWidth = 800;
