import { Image, type ImageContentPosition } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { ImageRef, Membership } from '@/data';
import { colors, radius, shadow } from '@/theme';
import { formatLongDate } from '@/utils/date';
import { Glass } from './Glass';
import { Icon } from './Icon';
import { Txt } from './Txt';
import { StatusPill, Touchable } from './ui';

/** Dark photo card with a left-to-right scrim (Upcoming class, Recommended). */
export function PhotoCard({
  photo,
  onPress,
  children,
  focus = 'center',
  minHeight,
  padding = 22,
  scrim = ['rgba(15,10,9,0.9)', 'rgba(15,10,9,0.9)', 'rgba(15,10,9,0.5)'],
  style,
  accessibilityLabel,
}: {
  photo: ImageRef;
  onPress?: () => void;
  children: ReactNode;
  focus?: ImageContentPosition;
  minHeight?: number;
  padding?: number;
  scrim?: [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  return (
    <Touchable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.photoCard, { minHeight, padding }, shadow.dark, style]}
    >
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius.panel, borderCurve: 'continuous', overflow: 'hidden' }]}>
        <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={focus} />
        <LinearGradient
          colors={scrim}
          locations={scrim.length === 3 ? [0, 0.3, 1] : undefined}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      {children}
    </Touchable>
  );
}

/** Dark frosted membership card (Home + Profile). */
export function MembershipCard({
  membership,
  variant,
  onPress,
}: {
  membership: Membership;
  variant: 'home' | 'profile';
  onPress?: () => void;
}) {
  const active = membership.status === 'active';
  const validUntil = formatLongDate(membership.validUntil);

  return (
    <Touchable onPress={onPress} accessibilityRole="button" accessibilityLabel="Membership details">
      <Glass tone="dark" elevated="dark" style={{ padding: 20 }}>
        {variant === 'home' ? (
          <>
            <View style={styles.rowBetween}>
              <Txt weight="extrabold" size={15} color={colors.cream}>
                Membership
              </Txt>
              <StatusPill active={active} />
            </View>
            <View style={[styles.rowBetween, { marginTop: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="crown" size={14} color={colors.pink} />
                <Txt weight="medium" size={12.5} color={colors.onDarkLabel}>
                  {active ? 'Valid until' : 'Expired on'}
                </Txt>
              </View>
              <Txt weight="bold" size={12.5} color={colors.cream}>
                {validUntil}
              </Txt>
            </View>
          </>
        ) : (
          <View style={styles.rowBetween}>
            <View style={{ gap: 8 }}>
              <Txt weight="extrabold" size={15} color={colors.cream}>
                Membership
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Icon name="crown" size={13} color={colors.pink} />
                <Txt weight="medium" size={12} color={colors.onDarkLabel}>
                  {active ? 'Valid until' : 'Expired on'} {validUntil}
                </Txt>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <StatusPill active={active} small />
              <Icon name="chevron" size={14} color="#8a7c78" strokeWidth={2.2} />
            </View>
          </View>
        )}
      </Glass>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  photoCard: {
    borderRadius: radius.panel, borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: '#161211',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
