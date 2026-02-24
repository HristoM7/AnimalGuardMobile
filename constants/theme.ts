/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0f766e';
const tintColorDark = '#6ee7d8';

export const Colors = {
  light: {
    text: '#10231b',
    background: '#f4f8f5',
    surface: '#ffffff',
    surfaceAlt: '#eaf3ee',
    border: '#d5e3da',
    muted: '#5d7165',
    tint: tintColorLight,
    icon: '#6a8073',
    tabIconDefault: '#6a8073',
    tabIconSelected: tintColorLight,
    success: '#1f8a5b',
    warning: '#b7791f',
    danger: '#b00020',
  },
  dark: {
    text: '#e7f2eb',
    background: '#0f1714',
    surface: '#15201b',
    surfaceAlt: '#1b2a23',
    border: '#294036',
    muted: '#9db2a6',
    tint: tintColorDark,
    icon: '#9db2a6',
    tabIconDefault: '#9db2a6',
    tabIconSelected: tintColorDark,
    success: '#4cc38c',
    warning: '#e8b95b',
    danger: '#ff8e95',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
