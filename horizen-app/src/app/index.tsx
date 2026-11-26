import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CtaButton } from '@/components/ui';
import { brand } from '@/theme';

const cover = require('../../assets/images/cover.jpg');

/** Start screen: the "horizen — More than movement" brand cover. */
export default function StartScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <Image
        source={cover}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessibilityLabel="Horizen. More than movement."
      />
      <View style={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
        <CtaButton
          label="GET STARTED"
          variant="dark"
          onPress={() => router.push('/onboarding')}
          style={{ borderRadius: 18, paddingVertical: 16, paddingHorizontal: 22 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.terracotta },
  content: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 28 },
});
