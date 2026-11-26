import { router } from 'expo-router';
import { Alert, View } from 'react-native';

import { InvoiceRow, showPaymentResult } from '@/components/billing';
import { Glass } from '@/components/Glass';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import {
  CtaButton,
  EmptyState,
  ErrorState,
  Loading,
  Screen,
  ScreenHeader,
  StatusPill,
  Touchable,
} from '@/components/ui';
import { gym } from '@/data';
import { useApp, useMember } from '@/state/AppState';
import { useAsync } from '@/state/useAsync';
import { usePayment } from '@/state/usePayment';
import { colors } from '@/theme';
import { formatLongDate } from '@/utils/date';
import { formatMoney } from '@/utils/money';

export default function BillingScreen() {
  const member = useMember();
  const { dataVersion } = useApp();
  const { pay, paying } = usePayment();
  const data = useAsync(
    () => Promise.all([gym.getBilling(member.id), gym.getInvoices(member.id), gym.getMembership(member.id)]),
    [member.id, dataVersion],
  );
  const [billing, invoices, membership] = data.data ?? [];
  // Pay the oldest unpaid invoice first.
  const nextUnpaid = invoices?.filter((i) => i.status !== 'paid').at(-1);

  const payNow = async () => {
    if (!nextUnpaid) return;
    try {
      const result = await pay({ kind: 'invoice', invoiceId: nextUnpaid.id });
      showPaymentResult(result, `${formatMoney(nextUnpaid.amount)} received. Thank you!`);
    } catch (e) {
      Alert.alert('Payment failed', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  return (
    <Screen withTabBar={false}>
      <ScreenHeader title="Membership & billing" />

      {data.error && (
        <View style={{ marginTop: 22 }}>
          <ErrorState error={data.error} onRetry={data.reload} />
        </View>
      )}
      {!data.data && data.loading && <Loading />}

      {billing && membership && invoices && (
        <>
          <Glass tone="dark" elevated="dark" style={{ marginTop: 22, padding: 20, gap: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexShrink: 1 }}>
                <Txt weight="extrabold" size={15} color={colors.cream}>
                  {billing.plan.name}
                </Txt>
                <Txt weight="medium" size={12.5} color={colors.onDarkLabel} style={{ marginTop: 3 }}>
                  {formatMoney(billing.plan.price)} / {billing.plan.interval}
                </Txt>
              </View>
              <StatusPill active={membership.status === 'active'} />
            </View>
            {billing.nextPaymentAt && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="calendar" size={14} color={colors.pink} />
                  <Txt weight="medium" size={12.5} color={colors.onDarkLabel}>
                    Next payment
                  </Txt>
                </View>
                <Txt weight="bold" size={12.5} color={colors.cream}>
                  {formatLongDate(billing.nextPaymentAt)}
                </Txt>
              </View>
            )}
            <Touchable
              onPress={() => router.push('/plans')}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Txt weight="extrabold" size={12.5} tracking={1.5} color={colors.pink}>
                CHANGE PLAN
              </Txt>
              <Icon name="chevron" size={14} color={colors.pink} strokeWidth={2.2} />
            </Touchable>
          </Glass>

          {billing.balance.amount > 0 && nextUnpaid ? (
            <Glass elevated borderColor="rgba(170,113,85,0.5)" style={{ marginTop: 12, padding: 20 }}>
              <Txt weight="bold" size={11.5} color={colors.muted}>
                Amount due
              </Txt>
              <Txt weight="extrabold" size={28} style={{ marginTop: 2 }}>
                {formatMoney(billing.balance)}
              </Txt>
              <Txt
                weight="semibold"
                size={12}
                color={nextUnpaid.status === 'overdue' ? colors.alert : colors.muted}
                style={{ marginTop: 2 }}
              >
                {nextUnpaid.status === 'overdue' ? 'Overdue since' : 'Due'} {formatLongDate(nextUnpaid.dueAt)}
              </Txt>
              <CtaButton label="PAY NOW" variant="dark" loading={paying} onPress={payNow} style={{ marginTop: 18 }} />
            </Glass>
          ) : (
            <Glass
              elevated="soft"
              style={{ marginTop: 12, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <View style={iconTile}>
                <Icon name="check" size={15} />
              </View>
              <Txt weight="bold" size={13.5}>
                You&apos;re all paid up
              </Txt>
            </Glass>
          )}

          <Glass
            elevated="soft"
            style={{ marginTop: 12, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View style={iconTile}>
              <Icon name="card" size={15} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt weight="bold" size={13.5}>
                {billing.paymentMethod?.label ?? 'No payment method saved'}
              </Txt>
              <Txt weight="medium" size={11.5} color={colors.faint} style={{ marginTop: 2 }}>
                Saved securely by our payment provider
              </Txt>
            </View>
          </Glass>

          <Txt weight="extrabold" size={15} style={{ marginTop: 26 }}>
            Payment history
          </Txt>
          <View style={{ marginTop: 12, gap: 10 }}>
            {invoices.map((inv) => (
              <InvoiceRow key={inv.id} invoice={inv} />
            ))}
            {invoices.length === 0 && <EmptyState text="No invoices yet." />}
          </View>
        </>
      )}
    </Screen>
  );
}

const iconTile = {
  width: 36,
  height: 36,
  borderRadius: 12,
  backgroundColor: colors.pinkTile,
  alignItems: 'center',
  justifyContent: 'center',
} as const;
