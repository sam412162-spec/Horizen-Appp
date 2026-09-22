import { View } from 'react-native';

import { Glass } from '@/components/Glass';
import { Icon } from '@/components/Icon';
import { MemberQR } from '@/components/MemberQR';
import { Txt } from '@/components/Txt';
import { ErrorState, Loading, Screen, ScreenHeader, StatusPill } from '@/components/ui';
import { gym } from '@/data';
import { useMember } from '@/state/AppState';
import { useAsync } from '@/state/useAsync';
import { colors, radius } from '@/theme';
import { formatLongDate } from '@/utils/date';

/** Full-size check-in QR plus membership details. */
export default function MembershipScreen() {
  const member = useMember();
  const { data: membership, error, loading, reload } = useAsync(() => gym.getMembership(member.id), [member.id]);
  const active = membership?.status === 'active';

  return (
    <Screen withTabBar={false}>
      <ScreenHeader title="Membership" />

      {error && (
        <View style={{ marginTop: 22 }}>
          <ErrorState error={error} onRetry={reload} />
        </View>
      )}
      {loading && !membership && <Loading />}

      {membership && (
        <>
          <Glass elevated style={{ marginTop: 22, padding: 22, alignItems: 'center' }}>
            <Txt weight="extrabold" size={16}>
              Check-in
            </Txt>
            <Txt weight="medium" size={12.5} color={colors.mutedDeep} style={{ marginTop: 3 }}>
              {active ? 'Scan this code at the front desk' : 'Renew your membership to check in'}
            </Txt>

            <View
              style={{
                marginTop: 20,
                padding: 18,
                borderRadius: radius.card,
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.95)',
                opacity: active ? 1 : 0.25,
              }}
              accessible
              accessibilityLabel={`Check-in QR code for member ${member.memberNumber}`}
            >
              <MemberQR value={membership.checkInCode} size={210} />
            </View>

            <Txt weight="extrabold" size={20} style={{ marginTop: 20 }}>
              {member.firstName} {member.lastName}
            </Txt>
            <Txt weight="bold" size={12} tracking={1.5} color={colors.muted} style={{ marginTop: 4 }}>
              MEMBER {member.memberNumber}
            </Txt>
          </Glass>

          <Glass tone="dark" elevated="dark" style={{ marginTop: 14, padding: 20, gap: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt weight="extrabold" size={15} color={colors.cream}>
                {membership.planName}
              </Txt>
              <StatusPill active={active} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="crown" size={14} color={colors.pink} />
                <Txt weight="medium" size={12.5} color={colors.onDarkLabel}>
                  {active ? 'Valid until' : 'Expired on'}
                </Txt>
              </View>
              <Txt weight="bold" size={12.5} color={colors.cream}>
                {formatLongDate(membership.validUntil)}
              </Txt>
            </View>
          </Glass>

          <Txt
            weight="medium"
            size={11.5}
            color={colors.faint}
            style={{ marginTop: 14, textAlign: 'center', lineHeight: 17 }}
          >
            Tip: turn your screen brightness up if the scanner struggles to read the code.
          </Txt>
        </>
      )}
    </Screen>
  );
}
