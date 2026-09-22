import { View } from 'react-native';

import { colors } from '@/theme';
import { Txt } from './Txt';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Weekly calorie bars, each filled relative to the daily goal. */
export function WeekBars({ calories, todayIndex, goal }: { calories: number[]; todayIndex: number; goal: number }) {
  return (
    <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      {calories.map((kcal, i) => {
        const pct = Math.min(100, Math.round((kcal / goal) * 100));
        return (
          <View key={i} style={{ alignItems: 'center', gap: 8, width: 24 }}>
            <View
              style={{
                width: 9,
                height: 82,
                backgroundColor: 'rgba(255,255,255,0.55)',
                borderRadius: 100,
                justifyContent: 'flex-end',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: '100%',
                  borderRadius: 100,
                  height: `${pct}%`,
                  backgroundColor: i === todayIndex ? colors.ink : colors.rose,
                }}
              />
            </View>
            <Txt weight="extrabold" size={10} color={i === todayIndex ? colors.ink : colors.faint}>
              {DAY_LABELS[i]}
            </Txt>
          </View>
        );
      })}
    </View>
  );
}
