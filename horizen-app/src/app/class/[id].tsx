import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, Platform, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/Glass';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { CtaButton, IconButton, Loading, tapFeedback, Touchable } from '@/components/ui';
import { gym } from '@/data';
import { useApp } from '@/state/AppState';
import { useAsync } from '@/state/useAsync';
import { colors, radius } from '@/theme';
import { formatTime, relativeDayLabel } from '@/utils/date';

export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { bookedIds, toggleBooking } = useApp();
  const [busy, setBusy] = useState(false);
  const [openedAt] = useState(() => Date.now());

  const { data: session, loading, error } = useAsync(() => gym.getClassSession(id), [id]);
  const booked = session ? bookedIds.has(session.id) : false;
  const start = session ? new Date(session.startsAt) : null;
  const whenLabel = start ? `${relativeDayLabel(start).toUpperCase()} ${formatTime(start)}` : '';
  const isPast = start ? start.getTime() < openedAt : false;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/classes'));

  const onBook = async () => {
    if (!session) return;
    const run = async () => {
      setBusy(true);
      try {
        await toggleBooking(session.id);
      } catch (e) {
        Alert.alert('Booking failed', e instanceof Error ? e.message : 'Please try again.');
      } finally {
        setBusy(false);
      }
    };
    if (!booked) return run();
    if (Platform.OS === 'web') return run();
    Alert.alert('Cancel booking?', `${session.name} • ${whenLabel.toLowerCase()}`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel booking', style: 'destructive', onPress: run },
    ]);
  };

  const onShare = () => {
    if (!session || !start) return;
    Share.share({
      message: `Join me for ${session.name} at Horizen Gym — ${relativeDayLabel(start)} ${formatTime(start)}.`,
    }).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.ink }}>
      <StatusBar style="light" />
      <Image
        source={session?.photo}
        style={[StyleSheet.absoluteFill, { height }]}
        contentFit="cover"
        contentPosition={{ top: '20%', left: '50%' }}
      />
      <LinearGradient
        colors={['rgba(15,10,9,0.55)', 'rgba(15,10,9,0.35)', 'rgba(15,10,9,0.92)', 'rgba(15,10,9,0.97)']}
        locations={[0, 0.3, 0.62, 1]}
        style={[StyleSheet.absoluteFill, { height }]}
      />

      <ScrollView
        contentContainerStyle={{
          minHeight: height,
          paddingTop: insets.top + 14,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="back" label="Back" dark onPress={goBack} />
          <Txt weight="extrabold" size={16} color={colors.cream}>
            Class details
          </Txt>
          <IconButton icon="share" label="Share class" dark onPress={session ? onShare : undefined} />
        </View>

        <View style={{ flex: 1, minHeight: 190 }} />

        {loading && <Loading dark />}
        {!loading && (error || !session) && (
          <Txt weight="bold" size={14} color={colors.onDarkMuted}>
            {error?.message ?? 'This class could not be found.'}
          </Txt>
        )}

        {session && start && (
          <>
            <Txt
              weight="extrabold"
              size={36}
              tracking={-0.3}
              color={colors.cream}
              style={{ lineHeight: 39 }}
              accessibilityRole="header"
            >
              {session.name.replace(' ', '\n')}
            </Txt>

            <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {session.tags.map((tag) => (
                <Glass
                  key={tag}
                  tone="onPhoto"
                  blur={25}
                  fill="rgba(255,255,255,0.12)"
                  borderColor="rgba(255,255,255,0.18)"
                  rounded={radius.pill}
                  style={{ paddingVertical: 8, paddingHorizontal: 15 }}
                >
                  <Txt weight="bold" size={11.5} color={colors.cream}>
                    {tag}
                  </Txt>
                </Glass>
              ))}
            </View>

            <Txt weight="extrabold" size={16} color={colors.cream} style={{ marginTop: 24 }}>
              About this class
            </Txt>
            <Txt weight="medium" size={13.5} color={colors.onDarkMuted} style={{ marginTop: 8, lineHeight: 22 }}>
              {session.description}
            </Txt>

            <Glass
              tone="onPhoto"
              blur={30}
              fill="rgba(255,255,255,0.08)"
              borderColor="rgba(255,255,255,0.14)"
              rounded={22}
              style={{
                marginTop: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingVertical: 14,
                paddingHorizontal: 16,
              }}
            >
              <Image
                source={session.coach.photo}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.3)',
                }}
                contentFit="cover"
                contentPosition={{ top: '15%', left: '50%' }}
              />
              <View style={{ gap: 1 }}>
                <Txt weight="bold" size={10.5} tracking={1} color={colors.onDarkFaint}>
                  COACH
                </Txt>
                <Txt weight="extrabold" size={15} color={colors.cream}>
                  {session.coach.fullName}
                </Txt>
                <Txt weight="medium" size={12} color={colors.onDarkMuted}>
                  {session.coach.title}
                </Txt>
              </View>
            </Glass>

            {isPast && !booked ? (
              <Txt weight="bold" size={12.5} color={colors.onDarkFaint} style={{ marginTop: 24, textAlign: 'center' }}>
                This class has already started.
              </Txt>
            ) : booked ? (
              <Touchable
                onPress={() => {
                  tapFeedback();
                  onBook();
                }}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={`Booked ${whenLabel}. Tap to cancel.`}
                style={styles.booked}
              >
                <Icon name="check" size={15} color={colors.pink} strokeWidth={2.5} />
                <Txt weight="extrabold" size={13} tracking={2.5} color={colors.pink}>
                  BOOKED — {whenLabel}
                </Txt>
              </Touchable>
            ) : (
              <CtaButton label="BOOK CLASS" loading={busy} onPress={onBook} style={{ marginTop: 24 }} />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  booked: {
    marginTop: 24,
    width: '100%',
    paddingVertical: 17,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(198,173,157,0.6)',
    backgroundColor: 'rgba(198,173,157,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
});
