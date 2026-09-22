import QRCode from 'react-native-qrcode-svg';

import { colors } from '@/theme';

/** Check-in QR code for the member's membership. */
export function MemberQR({ value, size }: { value: string; size: number }) {
  return <QRCode value={value} size={size} color={colors.ink} backgroundColor="transparent" ecl="M" />;
}
