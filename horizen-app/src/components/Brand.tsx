import { Image } from 'expo-image';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme';
import { Txt } from './Txt';

const wordmark = require('../../assets/images/logo-wordmark.png');
const WORDMARK_RATIO = 755 / 236;

/** Official "horizen — More than movement" wordmark (ink, transparent background). */
export function Wordmark({ width }: { width: number }) {
  return (
    <Image
      source={wordmark}
      style={{ width, height: width / WORDMARK_RATIO }}
      contentFit="contain"
      accessibilityLabel="Horizen Gym"
    />
  );
}

/** The O-with-two-waves mark. */
export function WaveMark({ size = 26, color = colors.cream }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2.6} />
      <Path
        d="M6.5 10.5c1.4-1.5 2.8-1.5 4.1 0s2.7 1.5 4.1 0 2.2-1.1 2.8-.6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M6.5 14.6c1.4-1.5 2.8-1.5 4.1 0s2.7 1.5 4.1 0 2.2-1.1 2.8-.6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Light "H◎RIZEN" lockup used over photography. */
export function LightLockup() {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityLabel="Horizen"
    >
      <Txt weight="extrabold" size={32} tracking={11} color={colors.cream}>
        H
      </Txt>
      <View style={{ marginLeft: 1, marginRight: 9 }}>
        <WaveMark size={26} />
      </View>
      <Txt weight="extrabold" size={32} tracking={11} color={colors.cream}>
        RIZEN
      </Txt>
    </View>
  );
}
