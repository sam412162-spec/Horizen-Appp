import { router } from 'expo-router';
import { View } from 'react-native';

import { Wordmark } from '@/components/Brand';
import { MembershipCard, PhotoCard } from '@/components/cards';
import { Glass } from '@/components/Glass';
import { Icon, type IconName } from '@/components/Icon';
import { MemberQR } from '@/components/MemberQR';
import { Txt } from '@/components/Txt';
import { ArrowBadge, ErrorState, IconButton, Loading, Screen, SectionHeader, Touchable } from '@/components/ui';
import { gym } from '@/data';
import { useApp, useMember } from '@/state/AppState';
import { useAsync } from '@/state/useAsync';
import { colors } from '@/theme';
import { formatDuration, formatNumber, formatTime, greeting, relativeDayLabel } from '@/utils/date';

export default function HomeScreen() {
  const member = useMember();
  const { dataVersion } = useApp();

  const home = useAsync(
    () =>
      Promise.all([
        gym.getMembership(member.id),
        gym.getTodayOverview(member.id),
        gym.getNextClass(member.id),
        gym.getCheckInStatus(member.id),
      ]),
    [member.id, dataVersion],
  );
  const [membership, overview, nextClass, checkIn] = home.data ?? [];
  const inGym = checkIn?.current;

  const stats: { icon: IconName; label: string; value: string; sub: string }[] = overview
    ? [
        { icon: 'dumbbell', label: 'Workouts', value: String(overview.workoutsThisWeek), sub: 'This week' },
        { icon: 'flame', label: 'Calories', value: formatNumber(overview.caloriesToday), sub: 'kcal' },
        { icon: 'clock', label: 'Active time', value: formatDuration(overview.activeMinutesToday), sub: 'Today' },
      ]
    : [];

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Wordmark width={131} />
        <IconButton icon="bell" label="Notifications" size={17} />
      </View>

      <View style={{ marginTop: 24 }}>
        <Txt weight="semibold" size={15} color={colors.muted}>
          {greeting()}
        </Txt>
        <Txt weight="extrabold" size={31} tracking={-0.3}>
          {member.firstName} 👋
        </Txt>
        <Txt weight="medium" size={13.5} color={colors.muted} style={{ marginTop: 4 }}>
          Let&apos;s keep your momentum going.
        </Txt>
      </View>

      {home.error && (
        <View style={{ marginTop: 22 }}>
          <ErrorState error={home.error} onRetry={home.reload} />
        </View>
      )}
      {!home.data && home.loading && <Loading />}

      {membership && (
        <>
          {/* Check-in */}
          <Touchable
            onPress={() => router.push('/check-in')}
            accessibilityRole="button"
            accessibilityLabel="Check in or out"
          >
            <Glass
              elevated
              style={{
                marginTop: 22,
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <View>
                <Txt weight="extrabold" size={16}>
                  Check-in
                </Txt>
                <Txt weight="medium" size={12.5} color={colors.mutedDeep} style={{ marginTop: 3 }}>
                  {inGym ? `Checked in since ${formatTime(new Date(inGym.checkedInAt))}` : 'Scan to check-in'}
                </Txt>
                <View style={{ marginTop: 16 }}>
                  <ArrowBadge size={32} />
                </View>
              </View>
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 18,
                  padding: 9,
                  backgroundColor: 'rgba(255,255,255,0.85)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.9)',
                }}
              >
                <MemberQR value={membership.checkInCode} size={76} />
              </View>
            </Glass>
          </Touchable>

          <View style={{ marginTop: 14 }}>
            <MembershipCard membership={membership} variant="home" onPress={() => router.push('/membership')} />
          </View>
        </>
      )}

      {overview && (
        <>
          <SectionHeader
            title="Today's overview"
            action="View all"
            onAction={() => router.navigate('/progress')}
            style={{ marginTop: 28 }}
          />
          <View style={{ marginTop: 12, flexDirection: 'row', gap: 10 }}>
            {stats.map((st) => (
              <Glass
                key={st.label}
                elevated="soft"
                rounded={22}
                style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 14 }}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 10,
                    backgroundColor: colors.pinkSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={st.icon} size={14} />
                </View>
                <Txt weight="bold" size={10.5} color={colors.muted} style={{ marginTop: 12 }}>
                  {st.label}
                </Txt>
                <Txt
                  weight="extrabold"
                  size={20}
                  style={{ marginTop: 3, lineHeight: 22 }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {st.value}
                </Txt>
                <Txt weight="semibold" size={10} color={colors.faint} style={{ marginTop: 2 }}>
                  {st.sub}
                </Txt>
              </Glass>
            ))}
          </View>
        </>
      )}

      {nextClass && (
        <>
          <SectionHeader
            title="Upcoming class"
            action="View all"
            onAction={() => router.navigate('/schedule')}
            style={{ marginTop: 28 }}
          />
          <PhotoCard
            photo={nextClass.photo}
            focus={{ top: '25%', left: '50%' }}
            onPress={() => router.push(`/class/${nextClass.id}`)}
            style={{ marginTop: 12 }}
            accessibilityLabel={`${nextClass.name}, ${relativeDayLabel(new Date(nextClass.startsAt))} at ${formatTime(new Date(nextClass.startsAt))}`}
          >
            <View style={{ gap: 3 }}>
              <Txt weight="extrabold" size={17} color={colors.cream}>
                {nextClass.name}
              </Txt>
              <Txt weight="medium" size={12.5} color={colors.onDarkMuted}>
                {relativeDayLabel(new Date(nextClass.startsAt))} • {formatTime(new Date(nextClass.startsAt))}
              </Txt>
              <Txt weight="medium" size={12} color={colors.onDarkFaint}>
                with Coach {nextClass.coach.firstName}
              </Txt>
            </View>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.pinkButton,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="arrow" size={15} strokeWidth={2.5} />
            </View>
          </PhotoCard>
        </>
      )}
    </Screen>
  );
}
