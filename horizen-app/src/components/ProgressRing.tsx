import Svg, { Circle } from 'react-native-svg';

import { colors } from '@/theme';

/** Donut ring: dark arc on a frosted track (design: 46px, 6.5px stroke). */
export function ProgressRing({ value, size = 46, stroke = 6.5 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="rgba(255,255,255,0.6)"
        strokeWidth={stroke}
        fill="rgba(251,243,238,0.95)"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={colors.ink}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${c * pct} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}
