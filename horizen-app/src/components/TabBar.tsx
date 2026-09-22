import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, shadow } from '@/theme';
import { Glass } from './Glass';
import { Icon, type IconName } from './Icon';
import { Txt } from './Txt';
import { tapFeedback, Touchable } from './ui';

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'home', label: 'Home', icon: 'home' },
  { name: 'classes', label: 'Classes', icon: 'calendar' },
  { name: 'workouts', label: 'Workouts', icon: 'dumbbell' },
  { name: 'progress', label: 'Progress', icon: 'chart' },
  { name: 'profile', label: 'Profile', icon: 'user' },
];

/** Floating frosted pill tab bar. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: insets.bottom > 0 ? Math.max(insets.bottom - 10, 12) : 16,
      }}
    >
      <Glass
        blur={60}
        fill={colors.glassStrong}
        borderColor="rgba(255,255,255,0.75)"
        rounded={32}
        style={[{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10 }, shadow.tabBar]}
      >
        {TABS.map((tab) => {
          const focused = activeName === tab.name;
          const color = focused ? colors.ink : colors.inactive;
          return (
            <Touchable
              key={tab.name}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                tapFeedback();
                const route = state.routes.find((r) => r.name === tab.name);
                const event = route
                  ? navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
                  : undefined;
                if (!focused && !event?.defaultPrevented) navigation.navigate(tab.name);
              }}
              style={{ flex: 1, alignItems: 'center', gap: 4, minHeight: 48, paddingTop: 7 }}
              pressedStyle={{ opacity: 0.6 }}
            >
              <Icon name={tab.icon} size={20} color={color} />
              <Txt weight="extrabold" size={9.5} tracking={0.2} color={color}>
                {tab.label}
              </Txt>
            </Touchable>
          );
        })}
      </Glass>
    </View>
  );
}
