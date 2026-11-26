import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { ClassRow } from '@/components/ClassRow';
import { Txt } from '@/components/Txt';
import {
  EmptyState,
  ErrorState,
  IconButton,
  Loading,
  Screen,
  ScreenHeader,
  tapFeedback,
  Touchable,
} from '@/components/ui';
import { gym, type ClassSession } from '@/data';
import { useApp } from '@/state/AppState';
import { useAsync } from '@/state/useAsync';
import { colors } from '@/theme';
import { addDays, dayShort, startOfDay } from '@/utils/date';

const DAYS_SHOWN = 5;

export default function ClassesScreen() {
  const { bookmarks, toggleBookmark } = useApp();
  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, i));
  }, []);
  const [dayIndex, setDayIndex] = useState(0);
  const day = days[dayIndex];

  const classes = useAsync(() => gym.getClassesForDay(day), [day.getTime()]);
  const morning = classes.data?.filter((c) => new Date(c.startsAt).getHours() < 12) ?? [];
  const evening = classes.data?.filter((c) => new Date(c.startsAt).getHours() >= 12) ?? [];

  const renderList = (list: ClassSession[]) => (
    <View style={{ marginTop: 12, gap: 10 }}>
      {list.map((c) => (
        <ClassRow
          key={c.id}
          session={c}
          bookmarked={bookmarks.has(c.id)}
          onToggleBookmark={() => toggleBookmark(c.id)}
          onPress={() => router.push(`/class/${c.id}`)}
        />
      ))}
    </View>
  );

  return (
    <Screen>
      <ScreenHeader
        title="Classes"
        onBack={() => router.navigate('/home')}
        right={
          <>
            <IconButton icon="filter" label="Filter classes" />
            <IconButton icon="calendar" label="My schedule" onPress={() => router.navigate('/schedule')} />
          </>
        }
      />

      <View style={{ marginTop: 22, flexDirection: 'row', gap: 8 }}>
        {days.map((d, i) => {
          const active = i === dayIndex;
          return (
            <Touchable
              key={d.getTime()}
              onPress={() => {
                tapFeedback();
                setDayIndex(i);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                flex: 1,
                borderRadius: 18, borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: active ? colors.inkSoft : colors.glassBorderStrong,
                backgroundColor: active ? colors.inkSoft : 'rgba(255,255,255,0.5)',
                paddingVertical: 13,
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Txt
                weight="extrabold"
                size={9.5}
                tracking={1.2}
                color={active ? colors.cream : colors.ink}
                style={{ opacity: 0.7 }}
              >
                {dayShort(d)}
              </Txt>
              <Txt weight="extrabold" size={17} color={active ? colors.cream : colors.ink}>
                {d.getDate()}
              </Txt>
            </Touchable>
          );
        })}
      </View>

      {classes.error && (
        <View style={{ marginTop: 26 }}>
          <ErrorState error={classes.error} onRetry={classes.reload} />
        </View>
      )}
      {classes.loading && !classes.data ? (
        <Loading />
      ) : (
        <View style={{ opacity: classes.loading ? 0.6 : 1 }}>
          {morning.length > 0 && (
            <>
              <Txt weight="extrabold" size={15} style={{ marginTop: 26 }}>
                Morning
              </Txt>
              {renderList(morning)}
            </>
          )}
          {evening.length > 0 && (
            <>
              <Txt weight="extrabold" size={15} style={{ marginTop: 26 }}>
                Evening
              </Txt>
              {renderList(evening)}
            </>
          )}
          {classes.data && classes.data.length === 0 && (
            <View style={{ marginTop: 26 }}>
              <EmptyState text="No classes scheduled for this day." />
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}
