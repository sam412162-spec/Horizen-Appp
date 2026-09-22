import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';

import { PhotoCard } from '@/components/cards';
import { Glass } from '@/components/Glass';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import {
  EmptyState,
  ErrorState,
  IconButton,
  Loading,
  PillToggle,
  Screen,
  ScreenHeader,
  Touchable,
} from '@/components/ui';
import { gym, type Workout, type WorkoutCategory } from '@/data';
import { useMember } from '@/state/AppState';
import { useAsync } from '@/state/useAsync';
import { colors, fonts, radius } from '@/theme';

const FILTERS: ('All' | WorkoutCategory)[] = ['All', 'Strength', 'Cardio', 'Mobility', 'Core'];

// Guided workout playback isn't part of the design yet.
const startWorkout = (name: string) => Alert.alert(name, 'Guided workouts are coming soon.');

export default function WorkoutsScreen() {
  const member = useMember();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [search, setSearch] = useState('');
  const data = useAsync(() => Promise.all([gym.getRecommendedProgram(member.id), gym.getWorkouts()]), [member.id]);
  const [program, workouts] = data.data ?? [];

  const q = search.trim().toLowerCase();
  const visible = (workouts ?? []).filter(
    (w) => (filter === 'All' || w.category === filter) && (!q || w.name.toLowerCase().includes(q)),
  );

  return (
    <Screen>
      <ScreenHeader
        title="Workouts"
        onBack={() => router.navigate('/home')}
        right={<IconButton icon="calendar" label="My schedule" onPress={() => router.navigate('/schedule')} />}
      />

      <Glass
        fill="rgba(255,255,255,0.5)"
        borderColor={colors.glassBorderStrong}
        rounded={radius.pill}
        style={{
          marginTop: 18,
          paddingVertical: 13,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Icon name="search" size={15} color={colors.faint} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search workouts"
          placeholderTextColor={colors.faint}
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={{ flex: 1, padding: 0, fontFamily: fonts.semibold, fontSize: 13.5, color: colors.ink }}
          accessibilityLabel="Search workouts"
        />
      </Glass>

      <View style={{ marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {FILTERS.map((f) => (
          <PillToggle key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>

      {data.error && (
        <View style={{ marginTop: 24 }}>
          <ErrorState error={data.error} onRetry={data.reload} />
        </View>
      )}
      {data.loading && !data.data && <Loading />}

      {program && (
        <>
          <Txt weight="extrabold" size={15} style={{ marginTop: 24 }}>
            Recommended for you
          </Txt>
          <PhotoCard
            photo={program.photo}
            focus={{ top: '60%', left: '50%' }}
            minHeight={124}
            padding={24}
            scrim={['rgba(15,10,9,0.88)', 'rgba(15,10,9,0.88)', 'rgba(15,10,9,0.4)']}
            onPress={() => startWorkout(program.title.replace('\n', ' '))}
            style={{ marginTop: 12 }}
            accessibilityLabel={`${program.title.replace('\n', ' ')}, ${program.workoutCount} workouts`}
          >
            <View>
              <Txt weight="extrabold" size={21} tracking={-0.2} color={colors.cream} style={{ lineHeight: 25 }}>
                {program.title}
              </Txt>
              <Txt weight="semibold" size={12} color={colors.onDarkMuted} style={{ marginTop: 8 }}>
                {program.workoutCount} workouts
              </Txt>
            </View>
            <Glass
              tone="onPhoto"
              blur={20}
              fill="rgba(255,255,255,0.16)"
              borderColor="rgba(255,255,255,0.25)"
              rounded={19}
              style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="arrow" size={14} color={colors.cream} strokeWidth={2.5} />
            </Glass>
          </PhotoCard>
        </>
      )}

      {workouts && (
        <>
          <Txt weight="extrabold" size={15} style={{ marginTop: 26 }}>
            Popular workouts
          </Txt>
          <View style={{ marginTop: 12, gap: 10 }}>
            {visible.map((w) => (
              <WorkoutRow key={w.id} workout={w} />
            ))}
            {visible.length === 0 && <EmptyState text="No workouts match your search." />}
          </View>
        </>
      )}
    </Screen>
  );
}

function WorkoutRow({ workout: w }: { workout: Workout }) {
  return (
    <Touchable onPress={() => startWorkout(w.name)} accessibilityRole="button" accessibilityLabel={`Start ${w.name}`}>
      <Glass
        elevated="soft"
        rounded={22}
        style={{
          paddingVertical: 10,
          paddingLeft: 10,
          paddingRight: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 13,
        }}
      >
        <Image
          source={w.photo}
          style={{ width: 54, height: 54, borderRadius: 14, backgroundColor: '#161211' }}
          contentFit="cover"
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt weight="extrabold" size={14} numberOfLines={1}>
            {w.name}
          </Txt>
          <Txt weight="semibold" size={11.5} color={colors.muted}>
            {w.durationMin} min • {w.intensityLabel ?? w.category}
          </Txt>
        </View>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: colors.ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="play" size={11} color={colors.pink} />
        </View>
      </Glass>
    </Touchable>
  );
}
