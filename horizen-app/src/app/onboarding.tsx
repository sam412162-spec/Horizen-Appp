import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/AmbientBackground';
import { Glass } from '@/components/Glass';
import { Icon, type IconName } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { CtaButton, IconButton, Touchable } from '@/components/ui';
import { photos } from '@/data/mock/sampleData';
import { colors, radius, shadow } from '@/theme';

const SLIDES: { key: string; title: string; body: string; icon: IconName; photo: number }[] = [
  {
    key: 'classes',
    title: 'Book classes\nin seconds',
    body: 'Browse the timetable, save your favourites and reserve your spot with one tap.',
    icon: 'calendar',
    photo: photos.coach,
  },
  {
    key: 'progress',
    title: 'See your\nprogress',
    body: 'Calories, active time and workouts — all in one place, measured against your goals.',
    icon: 'chart',
    photo: photos.gym,
  },
  {
    key: 'checkin',
    title: 'Check in with\nyour phone',
    body: 'Your membership QR code lives in the app. Just scan at the front desk.',
    icon: 'qr',
    photo: photos.gym,
  },
];

/** Three-step intro shown after "Get started", before sign-in. */
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList>(null);
  const last = index === SLIDES.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const next = () => {
    if (last) router.replace('/login');
    else list.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  return (
    <View style={{ flex: 1 }}>
      <AmbientBackground />
      <View style={[styles.topBar, { paddingTop: insets.top + 14 }]}>
        <IconButton icon="back" label="Back" onPress={() => router.back()} />
        <Touchable onPress={() => router.replace('/login')} hitSlop={12} accessibilityRole="button">
          <Txt weight="extrabold" size={12.5} color={colors.muted}>
            Skip
          </Txt>
        </Touchable>
      </View>

      <FlatList
        ref={list}
        data={SLIDES}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(s) => s.key}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={{ width, paddingHorizontal: 28, paddingTop: 22 }}>
            <View style={[styles.hero, shadow.dark]}>
              <Image source={item.photo} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient colors={['rgba(15,10,9,0.05)', 'rgba(15,10,9,0.55)']} style={StyleSheet.absoluteFill} />
              <Glass tone="onPhoto" blur={30} fill="rgba(255,255,255,0.16)" rounded={20} style={styles.heroIcon}>
                <Icon name={item.icon} size={26} color={colors.cream} strokeWidth={1.8} />
              </Glass>
            </View>
            <Txt weight="extrabold" size={30} tracking={-0.3} style={{ marginTop: 30, lineHeight: 35 }}>
              {item.title}
            </Txt>
            <Txt weight="medium" size={14.5} color={colors.muted} style={{ marginTop: 12, lineHeight: 22 }}>
              {item.body}
            </Txt>
          </View>
        )}
      />

      <View style={{ paddingHorizontal: 28, paddingBottom: insets.bottom + 24 }}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <CtaButton label={last ? 'CONTINUE' : 'NEXT'} variant="dark" onPress={next} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hero: {
    height: 300,
    borderRadius: radius.panel, borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: '#161211',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'flex-end',
    padding: 18,
  },
  heroIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 22 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(23,18,15,0.18)' },
  dotActive: { width: 22, backgroundColor: colors.ink },
});
