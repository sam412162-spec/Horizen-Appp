import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadow, space } from '@/theme';
import { AmbientBackground } from './AmbientBackground';
import { Glass } from './Glass';
import { Icon, type IconName } from './Icon';
import { Txt } from './Txt';

export function tapFeedback() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

/** Pressable with a subtle press-in scale/opacity, matching the design's hover states. */
export function Touchable({
  style,
  pressedStyle,
  children,
  ...rest
}: PressableProps & { style?: StyleProp<ViewStyle>; pressedStyle?: ViewStyle; children?: ReactNode }) {
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [style, pressed && (pressedStyle ?? { opacity: 0.8, transform: [{ scale: 0.985 }] })]}
    >
      {children}
    </Pressable>
  );
}

/** 40px round glass button used in headers. */
export function IconButton({
  icon,
  onPress,
  dark = false,
  size = 15,
  label,
}: {
  icon: IconName;
  onPress?: () => void;
  dark?: boolean;
  size?: number;
  label: string;
}) {
  return (
    <Touchable onPress={onPress} disabled={!onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}>
      <Glass
        tone={dark ? 'onPhoto' : 'light'}
        fill={dark ? 'rgba(255,255,255,0.14)' : colors.glassStrong}
        borderColor={dark ? 'rgba(255,255,255,0.2)' : colors.glassBorderStrong}
        blur={dark ? 30 : 0}
        rounded={20}
        style={styles.iconButton}
      >
        <Icon
          name={icon}
          size={size}
          color={dark ? colors.cream : colors.ink}
          strokeWidth={icon === 'back' ? 2.2 : 1.8}
        />
      </Glass>
    </Touchable>
  );
}

/** Small round badge containing an arrow. */
export function ArrowBadge({
  size = 28,
  bg = colors.ink,
  fg = colors.pink,
}: {
  size?: number;
  bg?: string;
  fg?: string;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="arrow" size={Math.round(size * 0.46)} color={fg} strokeWidth={2.5} />
    </View>
  );
}

type CtaVariant = 'pink' | 'dark';

/** Full-width call to action: uppercase label left, arrow badge right. */
export function CtaButton({
  label,
  onPress,
  variant = 'pink',
  loading = false,
  compact = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: CtaVariant;
  loading?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const dark = variant === 'dark';
  return (
    <Touchable
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.cta,
        compact && { paddingVertical: 15 },
        dark
          ? { backgroundColor: colors.inkSoft, ...shadow.dark, shadowOpacity: 0.25 }
          : { backgroundColor: colors.pinkButton, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
        style,
      ]}
    >
      <Txt weight="extrabold" size={compact ? 12.5 : 13} tracking={2.5} color={dark ? colors.pink : colors.ink}>
        {label}
      </Txt>
      {loading ? (
        <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={dark ? colors.pink : colors.ink} />
        </View>
      ) : (
        <ArrowBadge
          size={compact ? 26 : 28}
          bg={dark ? colors.pink : colors.ink}
          fg={dark ? colors.ink : colors.pink}
        />
      )}
    </Touchable>
  );
}

/** Selectable pill used for filters, progress tabs etc. */
export function PillToggle({
  label,
  active,
  onPress,
  inactiveColor = colors.muted,
  padH = 17,
  padV = 9,
  size = 12,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  inactiveColor?: string;
  padH?: number;
  padV?: number;
  size?: number;
}) {
  return (
    <Touchable
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: active ? colors.inkSoft : colors.glassBorderStrong,
        backgroundColor: active ? colors.inkSoft : 'rgba(255,255,255,0.5)',
        paddingHorizontal: padH,
        paddingVertical: padV,
      }}
    >
      <Txt weight="extrabold" size={size} color={active ? colors.cream : inactiveColor}>
        {label}
      </Txt>
    </Touchable>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
  style,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }, style]}>
      <Txt weight="extrabold" size={16}>
        {title}
      </Txt>
      {action && (
        <Touchable onPress={onAction} hitSlop={10} accessibilityRole="link">
          <Txt weight="bold" size={12} color={colors.muted}>
            {action}
          </Txt>
        </Touchable>
      )}
    </View>
  );
}

/** Back button + title on the left, optional actions on the right. */
export function ScreenHeader({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/home')));
  return (
    <View style={styles.header}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
        <IconButton icon="back" label="Back" onPress={goBack} />
        <Txt weight="extrabold" size={21} numberOfLines={1} accessibilityRole="header">
          {title}
        </Txt>
      </View>
      {right ? <View style={{ flexDirection: 'row', gap: 8 }}>{right}</View> : null}
    </View>
  );
}

/** Scrollable page with safe-area top padding and room for the floating tab bar. */
export function Screen({
  children,
  withTabBar = true,
  contentStyle,
}: {
  children: ReactNode;
  withTabBar?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <AmbientBackground />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          {
            paddingTop: insets.top + space.pageTop,
            paddingHorizontal: space.page,
            paddingBottom: withTabBar ? space.tabBarClearance + insets.bottom / 2 : insets.bottom + 32,
          },
          contentStyle,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function Loading({ dark = false }: { dark?: boolean }) {
  return (
    <View style={{ paddingVertical: 28, alignItems: 'center' }}>
      <ActivityIndicator color={dark ? colors.pink : colors.ink} />
    </View>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <Glass style={{ padding: 20, alignItems: 'center' }} rounded={radius.card}>
      <Txt weight="semibold" size={13} color={colors.muted} style={{ textAlign: 'center' }}>
        {text}
      </Txt>
    </Glass>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <Glass style={{ padding: 18, gap: 10 }} rounded={radius.card}>
      <Txt weight="bold" size={13} color={colors.alert}>
        {error.message}
      </Txt>
      {onRetry && (
        <Touchable onPress={onRetry} accessibilityRole="button">
          <Txt weight="extrabold" size={12.5}>
            Try again
          </Txt>
        </Touchable>
      )}
    </Glass>
  );
}

/** Round status pill (ACTIVE / EXPIRED) for dark membership cards. */
export function StatusPill({ active, small = false }: { active: boolean; small?: boolean }) {
  const c = active ? colors.pink : colors.expired;
  return (
    <View
      style={{
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: active ? 'rgba(198,173,157,0.25)' : 'rgba(170,113,85,0.25)',
        backgroundColor: active ? 'rgba(198,173,157,0.14)' : 'rgba(170,113,85,0.14)',
        paddingHorizontal: small ? 10 : 11,
        paddingVertical: 5,
      }}
    >
      <Txt weight="extrabold" size={small ? 10 : 10.5} tracking={2} color={c}>
        {active ? 'ACTIVE' : 'EXPIRED'}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    width: '100%',
    paddingVertical: 17,
    paddingHorizontal: 24,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
