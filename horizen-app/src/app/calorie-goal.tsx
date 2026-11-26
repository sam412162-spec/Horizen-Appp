import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Glass } from '@/components/Glass';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { CtaButton, PillToggle, Screen, ScreenHeader, tapFeedback, Touchable } from '@/components/ui';
import { WeekBars } from '@/components/WeekBars';
import { gym } from '@/data';
import { useApp, useMember } from '@/state/AppState';
import { useAsync } from '@/state/useAsync';
import { colors } from '@/theme';
import { formatNumber } from '@/utils/date';

const CALORIE_GOAL = { min: 500, max: 5000, step: 100 } as const;
const PRESETS = [1500, 2000, 2500, 3000];

const clamp = (n: number) => Math.min(CALORIE_GOAL.max, Math.max(CALORIE_GOAL.min, n));

/** Daily active-calorie goal (500–5000 kcal, steps of 100). */
export default function CalorieGoalScreen() {
  const member = useMember();
  const { calorieGoal, setCalorieGoal } = useApp();
  const [goal, setGoal] = useState(calorieGoal);
  const [saving, setSaving] = useState(false);
  const progress = useAsync(() => gym.getProgress(member.id), [member.id]);

  const adjust = (delta: number) => {
    tapFeedback();
    setGoal((g) => clamp(g + delta));
  };

  const save = async () => {
    setSaving(true);
    try {
      await setCalorieGoal(goal);
      router.back();
    } catch (e) {
      Alert.alert('Could not save goal', e instanceof Error ? e.message : 'Please try again.');
      setSaving(false);
    }
  };

  const daysHit = progress.data?.weekCalories.filter((c) => c >= goal).length;

  return (
    <Screen withTabBar={false}>
      <ScreenHeader title="Calorie goal" />
      <Txt weight="medium" size={13.5} color={colors.muted} style={{ marginTop: 16, lineHeight: 20 }}>
        Set how many active calories you want to burn each day. Your weekly bars fill up against this goal.
      </Txt>

      <Glass elevated style={{ marginTop: 22, paddingVertical: 26, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <StepButton
            icon="minus"
            label="Decrease goal"
            disabled={goal <= CALORIE_GOAL.min}
            onPress={() => adjust(-CALORIE_GOAL.step)}
          />
          <View
            style={{ alignItems: 'center' }}
            accessible
            accessibilityLabel={`${goal} kilocalories per day`}
            accessibilityLiveRegion="polite"
          >
            <Txt weight="extrabold" size={44} tracking={-0.5} numeric style={{ lineHeight: 50 }}>
              {formatNumber(goal)}
            </Txt>
            <Txt weight="bold" size={12} tracking={1} color={colors.muted}>
              KCAL / DAY
            </Txt>
          </View>
          <StepButton
            icon="plus"
            label="Increase goal"
            disabled={goal >= CALORIE_GOAL.max}
            onPress={() => adjust(CALORIE_GOAL.step)}
          />
        </View>

        <View style={{ marginTop: 22, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
          {PRESETS.map((p) => (
            <PillToggle
              key={p}
              label={formatNumber(p)}
              active={goal === p}
              onPress={() => setGoal(p)}
              inactiveColor={colors.chipText}
            />
          ))}
        </View>
      </Glass>

      {progress.data && (
        <Glass elevated="soft" style={{ marginTop: 12, padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Txt weight="extrabold" size={15}>
              This week
            </Txt>
            <Txt weight="bold" size={11.5} color={colors.muted}>
              Goal hit {daysHit}/7 days
            </Txt>
          </View>
          <WeekBars calories={progress.data.weekCalories} todayIndex={progress.data.todayIndex} goal={goal} />
        </Glass>
      )}

      <CtaButton label="SAVE GOAL" variant="dark" loading={saving} onPress={save} style={{ marginTop: 24 }} />
    </Screen>
  );
}

function StepButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: 'minus' | 'plus';
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Touchable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={{ opacity: disabled ? 0.35 : 1 }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24, borderCurve: 'continuous',
          backgroundColor: colors.ink,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={18} color={colors.pink} strokeWidth={2.4} />
      </View>
    </Touchable>
  );
}
