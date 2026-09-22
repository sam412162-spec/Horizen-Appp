import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { colors } from '@/theme';

/**
 * Soft pink canvas with three blurred colour blobs behind every light screen.
 * CSS `filter: blur()` isn't available on all platforms, so the blobs are
 * drawn as radial gradients that fade to transparent.
 */
export function AmbientBackground() {
  const { width: W, height: H } = useWindowDimensions();
  const blobs = [
    { id: 'a', cx: W - 50, cy: 60, r: 230, color: 'rgb(245,180,180)', opacity: 0.55 },
    { id: 'b', cx: 20, cy: 450, r: 220, color: 'rgb(229,79,80)', opacity: 0.16 },
    { id: 'c', cx: W - 50, cy: H - 60, r: 200, color: 'rgb(245,203,203)', opacity: 0.6 },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[colors.bgTop, colors.bgMid, colors.bgBottom]}
        locations={[0, 0.45, 1]}
        start={{ x: 0.37, y: 0 }}
        end={{ x: 0.63, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          {blobs.map((b) => (
            <RadialGradient key={b.id} id={b.id} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={b.color} stopOpacity={b.opacity} />
              <Stop offset="0.45" stopColor={b.color} stopOpacity={b.opacity * 0.75} />
              <Stop offset="1" stopColor={b.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {blobs.map((b) => (
          <Circle key={b.id} cx={b.cx} cy={b.cy} r={b.r} fill={`url(#${b.id})`} />
        ))}
      </Svg>
    </View>
  );
}
