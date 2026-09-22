import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Glass } from '@/components/Glass';
import { ProgressRing } from '@/components/ProgressRing';
import { Txt } from '@/components/Txt';
import { WeekBars } from '@/components/WeekBars';
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
import { gym, type ProgressSummary } from '@/data';
import { useApp, useMember } from '@/state/AppState';
import { useAsync } from '@/state/useAsync';
import { colors } from '@/theme';
import { formatDuration, formatNumber } from '@/utils/date';

const TABS = ['Overview', 'Workouts', 'Body'] as const;
type Tab = (typeof TABS)[number];

export default function ProgressScreen() {
  const member = useMember();
  const { calorieGoal, dataVersion } = useApp();
  const [tab, setTab] = useState<Tab>('Overview');
  const progress = useAsync(() => gym.getProgress(member.id), [member.id, dataVersion]);
  const p = progress.data;

  return (
    <Screen>
      <ScreenHeader
        title="My progress"
        onBack={() => router.navigate('/home')}
        right={<IconButton icon="calendar" label="My schedule" onPress={() => router.navigate('/schedule')} />}
      />

      <View style={{ marginTop: 20, flexDirection: 'row', gap: 6 }}>
        {TABS.map((t) => (
          <PillToggle
            key={t}
            label={t}
            active={tab === t}
            onPress={() => setTab(t)}
            inactiveColor={colors.chipText}
            padH={20}
            padV={10}
            size={12.5}
          />
        ))}
      </View>

      {progress.error && (
        <View style={{ marginTop: 24 }}>
          <ErrorState error={progress.error} onRetry={progress.reload} />
        </View>
      )}
      {!p && progress.loading && <Loading />}

      {p && tab === 'Body' && (
        <View style={{ marginTop: 24 }}>
          <EmptyState text="Body measurements from your gym assessments will show here." />
        </View>
      )}

      {p && tab !== 'Body' && (
        <>
          <Txt weight="extrabold" size={15} style={{ marginTop: 24 }}>
            This week
          </Txt>
          {tab === 'Overview' && <CaloriesCard p={p} goal={calorieGoal} />}

          <View style={{ marginTop: 12, flexDirection: 'row', gap: 12 }}>
            <RingCard
              label="Workouts"
              value={String(p.workoutsDone)}
              sub={`/${p.workoutsTarget} sessions`}
              pct={p.workoutsDone / p.workoutsTarget}
            />
            <RingCard
              label="Active time"
              value={formatDuration(p.activeMinutes)}
              sub={`/${formatDuration(p.activeMinutesTarget)}`}
              pct={p.activeMinutes / p.activeMinutesTarget}
            />
          </View>

          <Glass elevated="soft" style={{ marginTop: 12, padding: 20 }}>
            <Txt weight="bold" size={11.5} color={colors.muted}>
              This month
            </Txt>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 }}
            >
              <View>
                <Txt weight="extrabold" size={26}>
                  {p.monthChangePct >= 0 ? '+' : ''}
                  {p.monthChangePct}%
                </Txt>
                <Txt weight="semibold" size={10.5} color={colors.faint}>
                  vs last month
                </Txt>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 48 }}>
                {p.monthTrend.map((v, i) => (
                  <View
                    key={i}
                    style={{ width: 5, borderRadius: 100, backgroundColor: colors.rose, height: `${v}%` }}
                  />
                ))}
              </View>
            </View>
          </Glass>
        </>
      )}
    </Screen>
  );
}

function CaloriesCard({ p, goal }: { p: ProgressSummary; goal: number }) {
  const today = p.weekCalories[p.todayIndex] ?? 0;
  return (
    <Glass elevated style={{ marginTop: 12, padding: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Txt weight="bold" size={11.5} color={colors.muted}>
            Calories today
          </Txt>
          <Txt weight="extrabold" size={26} style={{ marginTop: 2 }}>
            {formatNumber(today)}{' '}
            <Txt weight="semibold" size={13} color={colors.faint}>
              kcal
            </Txt>
          </Txt>
        </View>
        <Touchable
          onPress={() => router.push('/calorie-goal')}
          accessibilityRole="button"
          accessibilityLabel={`Daily goal ${goal} kcal. Tap to change.`}
        >
          <View
            style={{
              backgroundColor: colors.pinkTile,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.6)',
              borderRadius: 14,
              paddingVertical: 9,
              paddingHorizontal: 14,
              alignItems: 'flex-end',
            }}
          >
            <Txt weight="extrabold" size={9.5} tracking={0.5} color={colors.muted}>
              GOAL ›
            </Txt>
            <Txt weight="extrabold" size={14} style={{ marginTop: 1 }}>
              {formatNumber(goal)}
            </Txt>
          </View>
        </Touchable>
      </View>
      <WeekBars calories={p.weekCalories} todayIndex={p.todayIndex} goal={goal} />
    </Glass>
  );
}

function RingCard({ label, value, sub, pct }: { label: string; value: string; sub: string; pct: number }) {
  return (
    <Glass
      elevated="soft"
      style={{
        flex: 1,
        paddingVertical: 18,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <View style={{ flexShrink: 1 }}>
        <Txt weight="bold" size={11.5} color={colors.muted}>
          {label}
        </Txt>
        <Txt
          weight="extrabold"
          size={21}
          style={{ marginTop: 2 }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {value}
        </Txt>
        <Txt weight="semibold" size={10.5} color={colors.faint}>
          {sub}
        </Txt>
      </View>
      <View style={{ flexShrink: 0 }}>
        <ProgressRing value={pct} />
      </View>
    </Glass>
  );
}
