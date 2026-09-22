import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

/** Line icons lifted from the design (24×24 viewBox). */
export type IconName =
  | 'back'
  | 'chevron'
  | 'arrow'
  | 'bell'
  | 'filter'
  | 'calendar'
  | 'share'
  | 'bookmark'
  | 'search'
  | 'play'
  | 'crown'
  | 'settings'
  | 'eye'
  | 'check'
  | 'home'
  | 'dumbbell'
  | 'chart'
  | 'user'
  | 'flame'
  | 'clock'
  | 'card'
  | 'gift'
  | 'help'
  | 'qr'
  | 'minus'
  | 'plus'
  | 'logout'
  | 'target';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  filled?: boolean;
};

export function Icon({ name, size = 16, color = colors.ink, strokeWidth = 2, filled = false }: Props) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  // The wrapping View keeps the icon above absolutely positioned blur layers on web.
  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {renderIcon(name, common, color, filled)}
      </Svg>
    </View>
  );
}

function renderIcon(name: IconName, p: Record<string, unknown>, color: string, filled: boolean) {
  switch (name) {
    case 'back':
      return <Path {...p} d="M15 18l-6-6 6-6" />;
    case 'chevron':
      return <Path {...p} d="M9 6l6 6-6 6" />;
    case 'arrow':
      return <Path {...p} d="M5 12h14M13 6l6 6-6 6" />;
    case 'bell':
      return (
        <>
          <Path {...p} d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9" />
          <Path {...p} d="M10.3 20a2 2 0 0 0 3.4 0" />
        </>
      );
    case 'filter':
      return <Path {...p} d="M4 5h16l-6 7v6l-4 2v-8z" />;
    case 'calendar':
      return (
        <>
          <Rect {...p} x={3} y={5} width={18} height={16} rx={3} />
          <Path {...p} d="M3 10h18M8 3v4M16 3v4" />
        </>
      );
    case 'share':
      return (
        <>
          <Path {...p} d="M12 3v13M7 8l5-5 5 5" />
          <Path {...p} d="M5 14v6h14v-6" />
        </>
      );
    case 'bookmark':
      return <Path {...p} fill={filled ? color : 'none'} d="M6 3h12v18l-6-4-6 4z" />;
    case 'search':
      return (
        <>
          <Circle {...p} cx={11} cy={11} r={7} />
          <Path {...p} d="M20 20l-3.5-3.5" />
        </>
      );
    case 'play':
      return <Path fill={color} d="M8 5v14l11-7z" />;
    case 'crown':
      return <Path {...p} d="M3 8l4 4 5-7 5 7 4-4v9H3z" />;
    case 'settings':
      return (
        <>
          <Circle {...p} cx={12} cy={12} r={3} />
          <Path
            {...p}
            d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2z"
          />
        </>
      );
    case 'eye':
      return (
        <>
          <Path {...p} d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
          <Circle {...p} cx={12} cy={12} r={2.6} />
        </>
      );
    case 'check':
      return <Path {...p} d="M4 12l6 6L20 6" />;
    case 'home':
      return (
        <>
          <Path {...p} d="M3 10.5 12 3l9 7.5" />
          <Path {...p} d="M5 9.5V21h14V9.5" />
        </>
      );
    case 'dumbbell':
      return <Path {...p} d="M7 8v8M17 8v8M4 10v4M20 10v4M7 12h10" />;
    case 'chart':
      return <Path {...p} d="M5 21V13M12 21V6M19 21V10" />;
    case 'user':
      return (
        <>
          <Circle {...p} cx={12} cy={8} r={4} />
          <Path {...p} d="M4 21c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5" />
        </>
      );
    case 'flame':
      return (
        <Path
          {...p}
          d="M12 3c1 3-3 4.5-3 8a3 3 0 0 0 6 0c0-1.5-.8-2.5-.8-2.5S17 10 17 13a5 5 0 0 1-10 0c0-4.5 5-6 5-10z"
        />
      );
    case 'clock':
      return (
        <>
          <Circle {...p} cx={12} cy={12} r={9} />
          <Path {...p} d="M12 7v5l3 2" />
        </>
      );
    case 'card':
      return <Path {...p} d="M3 6h18v12H3zM3 10h18" />;
    case 'gift':
      return <Path {...p} d="M4 12v9h16v-9M2 7h20v5H2zM12 7v14M12 7c-2-4-7-4-7-1s5 1 7 1M12 7c2-4 7-4 7-1s-5 1-7 1" />;
    case 'help':
      return (
        <>
          <Circle {...p} cx={12} cy={12} r={9} />
          <Path {...p} d="M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.8.3-.9 1-.9 1.7M12 17h.01" />
        </>
      );
    case 'qr':
      return (
        <>
          <Rect {...p} x={3} y={3} width={7} height={7} rx={1.5} />
          <Rect {...p} x={14} y={3} width={7} height={7} rx={1.5} />
          <Rect {...p} x={3} y={14} width={7} height={7} rx={1.5} />
          <Path {...p} d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
        </>
      );
    case 'minus':
      return <Path {...p} d="M5 12h14" />;
    case 'plus':
      return <Path {...p} d="M12 5v14M5 12h14" />;
    case 'logout':
      return <Path {...p} d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />;
    case 'target':
      return (
        <>
          <Circle {...p} cx={12} cy={12} r={9} />
          <Circle {...p} cx={12} cy={12} r={5} />
          <Circle {...p} cx={12} cy={12} r={1} />
        </>
      );
  }
}
