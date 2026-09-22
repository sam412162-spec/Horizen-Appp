import { Alert, View } from 'react-native';

import type { Invoice, InvoiceStatus, PaymentResult } from '@/data';
import { colors, radius } from '@/theme';
import { formatLongDate } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import { Glass } from './Glass';
import { Txt } from './Txt';

const STATUS: Record<InvoiceStatus, { label: string; fg: string; bg: string }> = {
  paid: { label: 'PAID', fg: colors.chipText, bg: 'rgba(255,255,255,0.6)' },
  due: { label: 'DUE', fg: colors.roseDeep, bg: colors.pinkTile },
  overdue: { label: 'OVERDUE', fg: colors.alert, bg: 'rgba(232,144,144,0.2)' },
  failed: { label: 'FAILED', fg: colors.alert, bg: 'rgba(232,144,144,0.2)' },
};

export function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const s = STATUS[invoice.status];
  return (
    <Glass
      elevated="soft"
      rounded={radius.card}
      style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Txt weight="extrabold" size={14} numberOfLines={1}>
          {invoice.description}
        </Txt>
        <Txt weight="semibold" size={11.5} color={colors.faint}>
          {invoice.status === 'paid' && invoice.paidAt
            ? `Paid ${formatLongDate(new Date(invoice.paidAt))}`
            : `Due ${formatLongDate(invoice.dueAt)}`}
        </Txt>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 5 }}>
        <Txt weight="extrabold" size={14}>
          {formatMoney(invoice.amount)}
        </Txt>
        <View style={{ borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: s.bg }}>
          <Txt weight="extrabold" size={9} tracking={1.2} color={s.fg}>
            {s.label}
          </Txt>
        </View>
      </View>
    </Glass>
  );
}

export function showPaymentResult(result: PaymentResult, successMessage: string) {
  const messages: Record<PaymentResult, [string, string]> = {
    paid: ['Payment successful', successMessage],
    pending: ['Payment processing', 'We’ll update your account as soon as the payment clears.'],
    cancelled: ['Payment cancelled', 'No money was taken.'],
    failed: ['Payment failed', 'Please try again or use a different card.'],
  };
  const [title, body] = messages[result];
  Alert.alert(title, body);
}
