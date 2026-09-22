import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LightLockup } from '@/components/Brand';
import { Glass } from '@/components/Glass';
import { Txt } from '@/components/Txt';
import { CtaButton } from '@/components/ui';
import { photos } from '@/data/mock/sampleData';
import { colors } from '@/theme';

/** Start screen — "More than a gym. A community." */
export default function StartScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Image source={photos.gym} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient
        colors={['rgba(15,10,9,0.5)', 'rgba(15,10,9,0.1)', 'rgba(15,10,9,0.75)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.content, { paddingTop: insets.top + 100, paddingBottom: insets.bottom + 24 }]}>
        <LightLockup />
        <View style={{ flex: 1 }} />

        <Glass
          tone="dark"
          blur={40}
          fill="rgba(20,14,12,0.45)"
          borderColor="rgba(255,255,255,0.14)"
          rounded={28}
          style={{ padding: 24 }}
        >
          <Txt weight="extrabold" size={32} tracking={0.3} color={colors.cream} style={{ lineHeight: 36.5 }}>
            MORE THAN{'\n'}A GYM.{'\n'}
            <Txt weight="extrabold" size={32} tracking={0.3} color="#F3C4C4">
              A COMMUNITY.
            </Txt>
          </Txt>
          <Txt weight="medium" size={14.5} color="#D8CBC7" style={{ marginTop: 14, lineHeight: 22.5 }}>
            Train. Grow. Belong. Welcome to Horizen.
          </Txt>
          <CtaButton
            label="GET STARTED"
            onPress={() => router.push('/onboarding')}
            style={{ marginTop: 22, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 22 }}
          />
        </Glass>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#161211' },
  content: { flex: 1, paddingHorizontal: 28 },
});
