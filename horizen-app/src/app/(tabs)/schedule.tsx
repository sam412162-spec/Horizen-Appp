import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BookingRow } from '@/components/ClassRow';
import { Glass } from '@/components/Glass';
import { Txt } from '@/components/Txt';
import {
  CtaButton,
  EmptyState,
  ErrorState,
  IconButton,
  Loading,
  Screen,
  ScreenHeader,
  tapFeedback,
  Touchable,
} from '@/components/ui';
import { gym, type BookingFilter } from '@/data';
import { useApp, useMember } from '@/state/AppState';
import { useAsync } from '@/state/useAsync';
import { colors, radius } from '@/theme';

export default function ScheduleScreen() {
  const member = useMember();
  const { dataVersion } = useApp();
  const [tab, setTab] = useState<BookingFilter>('upcoming');
  const bookings = useAsync(() => gym.getBookings(member.id, tab), [member.id, tab, dataVersion]);

  return (
    <Screen>
      <ScreenHeader
        title="My schedule"
        onBack={() => router.navigate('/home')}
        right={<IconButton icon="calendar" label="Class timetable" onPress={() => router.navigate('/classes')} />}
      />

      <Glass
        fill="rgba(255,255,255,0.35)"
        borderColor="rgba(255,255,255,0.55)"
        rounded={radius.pill}
        style={{ marginTop: 20, flexDirection: 'row', padding: 4, gap: 4 }}
      >
        {(['upcoming', 'past'] as const).map((t) => {
          const active = tab === t;
          return (
            <Touchable
              key={t}
              onPress={() => {
                tapFeedback();
                setTab(t);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[
                { flex: 1, borderRadius: radius.pill, paddingVertical: 11, alignItems: 'center' },
                active && {
                  backgroundColor: 'rgba(255,255,255,0.85)',
                  shadowColor: '#3C1E1E',
                  shadowOpacity: 0.1,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 1,
                },
              ]}
            >
              <Txt weight="extrabold" size={13}>
                {t === 'upcoming' ? 'Upcoming' : 'Past'}
              </Txt>
            </Touchable>
          );
        })}
      </Glass>

      <Txt weight="extrabold" size={15} style={{ marginTop: 24 }}>
        {tab === 'upcoming' ? 'Coming up' : 'Recently attended'}
      </Txt>

      <View style={{ marginTop: 12, gap: 10 }}>
        {bookings.error && <ErrorState error={bookings.error} onRetry={bookings.reload} />}
        {bookings.loading && !bookings.data && <Loading />}
        {bookings.data?.map((s) => (
          <BookingRow key={s.id} session={s} onPress={() => router.push(`/class/${s.id}`)} />
        ))}
        {bookings.data?.length === 0 && (
          <EmptyState text={tab === 'upcoming' ? 'No upcoming bookings yet.' : 'No past classes yet.'} />
        )}
      </View>

      <CtaButton
        label="VIEW FULL SCHEDULE"
        compact
        onPress={() => router.navigate('/classes')}
        style={{ marginTop: 24, backgroundColor: 'rgba(198,173,157,0.85)', borderColor: 'rgba(255,255,255,0.5)' }}
      />
      <Txt weight="medium" size={11} color={colors.faint} style={{ marginTop: 10, textAlign: 'center' }}>
        Tap a class to see details or cancel.
      </Txt>
    </Screen>
  );
}
