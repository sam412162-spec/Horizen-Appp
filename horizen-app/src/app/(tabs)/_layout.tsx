import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="home"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="classes" />
      <Tabs.Screen name="workouts" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="profile" />
      {/* Reached from Home / Profile; shows the tab bar but has no tab of its own. */}
      <Tabs.Screen name="schedule" options={{ href: null }} />
    </Tabs>
  );
}
