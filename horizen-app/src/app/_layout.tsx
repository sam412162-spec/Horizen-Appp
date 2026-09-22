import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { Manrope_800ExtraBold } from '@expo-google-fonts/manrope/800ExtraBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider, useApp } from '@/state/AppState';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const ready = fontsLoaded || !!fontError;

  // The splash screen stays up until fonts are loaded and the saved session is checked (see RootStack).
  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <RootStack />
      </AppProvider>
    </SafeAreaProvider>
  );
}

function RootStack() {
  const { member, sessionChecked } = useApp();
  const signedIn = !!member;

  useEffect(() => {
    if (sessionChecked) SplashScreen.hideAsync().catch(() => {});
  }, [sessionChecked]);

  if (!sessionChecked) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgMid } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="index" options={{ contentStyle: { backgroundColor: '#161211' } }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="login" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="class/[id]" options={{ contentStyle: { backgroundColor: colors.ink } }} />
        <Stack.Screen name="membership" />
        <Stack.Screen name="calorie-goal" />
        <Stack.Screen name="check-in" />
        <Stack.Screen name="billing" />
        <Stack.Screen name="plans" />
      </Stack.Protected>
    </Stack>
  );
}
