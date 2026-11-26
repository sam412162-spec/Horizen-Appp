import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow } from '@/theme';

type Tone = 'light' | 'input' | 'dark' | 'onPhoto';

const tones: Record<Tone, { bg: string; border: string; tint: 'light' | 'dark' }> = {
  light: { bg: colors.glass, border: colors.glassBorder, tint: 'light' },
  input: { bg: colors.glassInput, border: 'rgba(255,255,255,0.8)', tint: 'light' },
  dark: { bg: colors.inkGlass, border: 'rgba(255,255,255,0.12)', tint: 'dark' },
  onPhoto: { bg: 'rgba(255,255,255,0.1)', border: 'rgba(255,255,255,0.16)', tint: 'dark' },
};

type Props = {
  children?: ReactNode;
  tone?: Tone;
  /**
   * Backdrop blur intensity (0–100). Only worth it when the card sits over a
   * photo or scrolling content — over the flat canvas it looks the same
   * without the cost. Android falls back to the translucent fill.
   */
  blur?: number;
  /** Override the translucent fill colour. */
  fill?: string;
  borderColor?: string;
  rounded?: number;
  elevated?: boolean | 'soft' | 'dark';
  style?: StyleProp<ViewStyle>;
};

export function Glass({
  children,
  tone = 'light',
  blur = 0,
  fill,
  borderColor,
  rounded = radius.panel,
  elevated = false,
  style,
}: Props) {
  const t = tones[tone];
  const useBlur = blur > 0 && process.env.EXPO_OS !== 'android';
  const elevation =
    elevated === 'soft' ? shadow.soft : elevated === 'dark' ? shadow.dark : elevated ? shadow.card : undefined;

  return (
    <View
      style={[
        {
          borderRadius: rounded, borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: borderColor ?? t.border,
          backgroundColor: useBlur ? 'transparent' : (fill ?? t.bg),
        },
        elevation,
        style,
      ]}
    >
      {useBlur && (
        <View style={[StyleSheet.absoluteFill, { borderRadius: rounded, borderCurve: 'continuous', overflow: 'hidden' }]} pointerEvents="none">
          <BlurView intensity={blur} tint={t.tint} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: fill ?? t.bg }]} />
        </View>
      )}
      {children}
    </View>
  );
}
