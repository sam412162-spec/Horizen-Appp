import { Text, type TextProps } from 'react-native';

import { colors, fonts, type FontWeight } from '@/theme';

type Props = TextProps & {
  weight?: FontWeight;
  size?: number;
  color?: string;
  /** Letter spacing in px (same unit as the design's CSS). */
  tracking?: number;
};

/** Manrope text. React Native needs a distinct font family per weight. */
export function Txt({ weight = 'bold', size = 14, color = colors.ink, tracking, style, ...rest }: Props) {
  return (
    <Text {...rest} style={[{ fontFamily: fonts[weight], fontSize: size, color, letterSpacing: tracking }, style]} />
  );
}
