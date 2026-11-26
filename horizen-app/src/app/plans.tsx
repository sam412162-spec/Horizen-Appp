import { router } from 'expo-router';
import { Alert, Platform, View } from 'react-native';

import { showPaymentResult } from '@/components/billing';
import { Glass } from '@/components/Glass';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { CtaButton, ErrorState, Loading, Screen, ScreenHeader } from '@/components/ui';
import { gym, type Plan } from '@/data';
import { useApp, useMember } from '@/state/AppState';
import { useAsync } from '@/state/useAsync';
import { usePayment } from '@/state/usePayment';
import { colors, radius } from '@/theme';
import { formatMoney } from '@/utils/money';

export default function PlansScreen() {
  const member = useMember();
  const { dataVersion } = useApp();
  const { pay, paying } = usePayment();
  const data = useAsync(() => Promise.all([gym.getPlans(), gym.getBilling(member.id)]), [member.id, dataVersion]);
  const [plans, billing] = data.data ?? [];

  const switchTo = async (plan: Plan) => {
    try {
      const result = await pay({ kind: 'plan', planId: plan.id });
      showPaymentResult(result, `You're now on ${plan.name}.`);
      if (result === 'paid') router.back();
    } catch (e) {
      Alert.alert('Payment failed', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const confirm = (plan: Plan) => {
    const message = `${formatMoney(plan.price)} / ${plan.interval}. You'll be taken to our secure payment page.`;
    if (Platform.OS === 'web') return void switchTo(plan);
    Alert.alert(`Switch to ${plan.name}?`, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', onPress: () => void switchTo(plan) },
    ]);
  };

  return (
    <Screen withTabBar={false}>
      <ScreenHeader title="Plans" />
      <Txt weight="medium" size={13.5} color={colors.muted} style={{ marginTop: 16, lineHeight: 20 }}>
        Choose the membership that fits your training. You can change it any time.
      </Txt>

      {data.error && (
        <View style={{ marginTop: 22 }}>
          <ErrorState error={data.error} onRetry={data.reload} />
        </View>
      )}
      {!data.data && data.loading && <Loading />}

      <View style={{ marginTop: 20, gap: 12 }}>
        {plans?.map((plan) => {
          const current = plan.id === billing?.plan.id;
          return (
            <Glass
              key={plan.id}
              tone={current ? 'dark' : 'light'}
              elevated={current ? 'dark' : 'soft'}
              style={{ padding: 20 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flexShrink: 1 }}>
                  <Txt weight="extrabold" size={16} color={current ? colors.cream : colors.ink}>
                    {plan.name}
                  </Txt>
                  <Txt
                    weight="extrabold"
                    size={24}
                    color={current ? colors.cream : colors.ink}
                    style={{ marginTop: 4 }}
                  >
                    {formatMoney(plan.price)}
                    <Txt weight="semibold" size={12.5} color={current ? colors.onDarkLabel : colors.faint}>
                      {' '}
                      / {plan.interval}
                    </Txt>
                  </Txt>
                </View>
                {current && (
                  <View
                    style={{
                      borderRadius: radius.pill,
                      borderWidth: 1,
                      borderColor: 'rgba(198,173,157,0.25)',
                      backgroundColor: 'rgba(198,173,157,0.14)',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    <Txt weight="extrabold" size={10} tracking={2} color={colors.pink}>
                      CURRENT
                    </Txt>
                  </View>
                )}
              </View>
              <View style={{ marginTop: 14, gap: 8 }}>
                {plan.perks.map((perk) => (
                  <View key={perk} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon name="check" size={13} color={current ? colors.pink : colors.roseDeep} strokeWidth={2.5} />
                    <Txt weight="semibold" size={13} color={current ? colors.onDarkMuted : colors.chipText}>
                      {perk}
                    </Txt>
                  </View>
                ))}
              </View>
              {!current && (
                <CtaButton
                  label="CHOOSE PLAN"
                  variant="dark"
                  compact
                  loading={paying}
                  onPress={() => confirm(plan)}
                  style={{ marginTop: 18 }}
                />
              )}
            </Glass>
          );
        })}
      </View>
    </Screen>
  );
}
