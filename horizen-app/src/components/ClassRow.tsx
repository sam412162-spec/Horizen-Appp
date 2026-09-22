import { Image } from 'expo-image';
import { View } from 'react-native';

import type { ClassSession } from '@/data';
import { colors, radius } from '@/theme';
import { dayShort, formatTime } from '@/utils/date';
import { Glass } from './Glass';
import { Icon } from './Icon';
import { Txt } from './Txt';
import { tapFeedback, Touchable } from './ui';

/** Timetable row on the Classes screen. */
export function ClassRow({
  session,
  bookmarked,
  onToggleBookmark,
  onPress,
}: {
  session: ClassSession;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onPress: () => void;
}) {
  return (
    <Glass
      elevated="soft"
      rounded={radius.card}
      style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 14 }}
    >
      <Txt weight="extrabold" size={13} style={{ width: 46, textAlign: 'center' }}>
        {formatTime(new Date(session.startsAt))}
      </Txt>
      <Touchable
        onPress={onPress}
        style={{ flex: 1, gap: 2 }}
        accessibilityRole="button"
        accessibilityLabel={`${session.name} class details`}
      >
        <Txt weight="extrabold" size={15} numberOfLines={1}>
          {session.name}
        </Txt>
        <Txt weight="semibold" size={12} color={colors.muted}>
          {session.durationMin} min • {session.levelLabel}
        </Txt>
        <Txt weight="semibold" size={11.5} color={colors.faint}>
          Coach {session.coach.firstName}
        </Txt>
      </Touchable>
      <View style={{ width: 76, height: 66, borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#161211' }}>
        <Image source={session.photo} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        <Touchable
          onPress={() => {
            tapFeedback();
            onToggleBookmark();
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Bookmark class'}
          accessibilityState={{ selected: bookmarked }}
          style={{
            position: 'absolute',
            top: 5,
            right: 5,
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.5)',
            backgroundColor: bookmarked ? 'rgba(245,203,203,0.95)' : 'rgba(255,255,255,0.35)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="bookmark" size={11} color={bookmarked ? colors.ink : '#fff'} filled={bookmarked} />
        </Touchable>
      </View>
    </Glass>
  );
}

/** Row on the My schedule screen with a date tile. */
export function BookingRow({ session, onPress }: { session: ClassSession; onPress: () => void }) {
  const start = new Date(session.startsAt);
  return (
    <Touchable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${session.name} class details`}>
      <Glass
        elevated="soft"
        rounded={radius.card}
        style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 14 }}
      >
        <View
          style={{
            width: 50,
            alignItems: 'center',
            gap: 2,
            backgroundColor: colors.pinkTile,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.6)',
            borderRadius: radius.md,
            paddingVertical: 11,
          }}
        >
          <Txt weight="extrabold" size={9} tracking={1.2} color={colors.roseDeep}>
            {dayShort(start)}
          </Txt>
          <Txt weight="extrabold" size={16}>
            {start.getDate()}
          </Txt>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt weight="bold" size={12} color={colors.muted}>
            {formatTime(start)}
          </Txt>
          <Txt weight="extrabold" size={15} numberOfLines={1}>
            {session.name}
          </Txt>
          <Txt weight="semibold" size={11.5} color={colors.faint}>
            Coach {session.coach.firstName} • {session.durationMin} min
          </Txt>
        </View>
        <Image
          source={session.photo}
          style={{ width: 68, height: 60, borderRadius: radius.md, backgroundColor: '#161211' }}
          contentFit="cover"
        />
      </Glass>
    </Touchable>
  );
}
