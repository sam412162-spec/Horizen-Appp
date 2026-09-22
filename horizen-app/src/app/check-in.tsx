import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { Glass } from '@/components/Glass';
import { Icon } from '@/components/Icon';
import { MemberQR } from '@/components/MemberQR';
import { Txt } from '@/components/Txt';
import { CtaButton, EmptyState, ErrorState, Loading, Screen, ScreenHeader, Touchable } from '@/components/ui';
import { gym, type Visit } from '@/data';
import { useApp, useMember } from '@/state/AppState';
import { useAsync } from '@/state/useAsync';
import { colors, radius } from '@/theme';
import { dayShort, formatDuration, formatTime, relativeDayLabel } from '@/utils/date';

/**
 * Self check-in / check-out. Members tap to start and end a visit; the QR code
 * is what the door device will scan once it's connected to the backend.
 */
export default function CheckInScreen() {
  const member = useMember();
  const { dataVersion, notifyChanged } = useApp();
  const [busy, setBusy] = useState(false);

  const data = useAsync(
    () => Promise.all([gym.getCheckInStatus(member.id), gym.getVisits(member.id, 8), gym.getMembership(member.id)]),
    [member.id, dataVersion],
  );
  const [status, visits, membership] = data.data ?? [];
  const current = status?.current ?? null;
  const active = membership?.status === 'active';

  const run = async (action: 'in' | 'out') => {
    setBusy(true);
    try {
      if (action === 'in') await gym.checkIn(member.id);
      else await gym.checkOut(member.id);
      notifyChanged();
    } catch (e) {
      Alert.alert(action === 'in' ? 'Check-in failed' : 'Check-out failed', e instanceof Error ? e.message : '');
    } finally {
      setBusy(false);
    }
  };

  const confirmCheckOut = () => {
    if (Platform.OS === 'web') return void run('out');
    Alert.alert('Check out?', 'This ends your current visit.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Check out', onPress: () => void run('out') },
    ]);
  };

  return (
    <Screen withTabBar={false}>
      <ScreenHeader title="Check-in" />

      {data.error && (
        <View style={{ marginTop: 22 }}>
          <ErrorState error={data.error} onRetry={data.reload} />
        </View>
      )}
      {!data.data && data.loading && <Loading />}

      {status && membership && (
        <>
          {current ? (
            <Glass tone="dark" elevated="dark" style={{ marginTop: 22, padding: 22 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Txt weight="extrabold" size={15} color={colors.cream}>
                  You&apos;re checked in
                </Txt>
                <LivePill />
              </View>
              <Txt weight="medium" size={12.5} color={colors.onDarkLabel} style={{ marginTop: 4 }}>
                Since {formatTime(new Date(current.checkedInAt))}
              </Txt>
              <Elapsed since={current.checkedInAt} />
              <CtaButton label="CHECK OUT" loading={busy} onPress={confirmCheckOut} style={{ marginTop: 20 }} />
            </Glass>
          ) : (
            <Glass elevated style={{ marginTop: 22, padding: 22 }}>
              <Txt weight="extrabold" size={16}>
                {active ? 'Not checked in' : 'Membership expired'}
              </Txt>
              <Txt weight="medium" size={13} color={colors.mutedDeep} style={{ marginTop: 4, lineHeight: 19 }}>
                {active
                  ? 'Tap below when you arrive at the gym, and check out when you leave.'
                  : 'Renew your membership to check in again.'}
              </Txt>
              {active ? (
                <CtaButton
                  label="CHECK IN"
                  variant="dark"
                  loading={busy}
                  onPress={() => run('in')}
                  style={{ marginTop: 20 }}
                />
              ) : (
                <CtaButton
                  label="RENEW"
                  variant="dark"
                  onPress={() => router.push('/billing')}
                  style={{ marginTop: 20 }}
                />
              )}
            </Glass>
          )}

          <View style={{ marginTop: 12, flexDirection: 'row', gap: 12 }}>
            <Stat label="Visits this month" value={String(status.visitsThisMonth)} />
            <Stat label="Last visit" value={visits?.[0] ? relativeDayLabel(new Date(visits[0].checkedInAt)) : '—'} />
          </View>

          {active && (
            <Touchable
              onPress={() => router.push('/membership')}
              accessibilityRole="button"
              accessibilityLabel="Show door QR code"
            >
              <Glass
                elevated="soft"
                style={{ marginTop: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}
              >
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 14,
                    padding: 6,
                    backgroundColor: 'rgba(255,255,255,0.85)',
                  }}
                >
                  <MemberQR value={membership.checkInCode} size={48} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt weight="extrabold" size={14}>
                    At the door?
                  </Txt>
                  <Txt weight="medium" size={12} color={colors.muted} style={{ marginTop: 2 }}>
                    Show your QR code to the scanner
                  </Txt>
                </View>
                <Icon name="chevron" size={14} color={colors.chevron} strokeWidth={2.2} />
              </Glass>
            </Touchable>
          )}

          <Txt weight="extrabold" size={15} style={{ marginTop: 26 }}>
            Recent visits
          </Txt>
          <View style={{ marginTop: 12, gap: 10 }}>
            {visits?.map((v) => (
              <VisitRow key={v.id} visit={v} />
            ))}
            {visits?.length === 0 && <EmptyState text="Your visits will show here." />}
          </View>
        </>
      )}
    </Screen>
  );
}

function LivePill() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: 'rgba(245,203,203,0.25)',
        backgroundColor: 'rgba(245,203,203,0.14)',
        paddingHorizontal: 11,
        paddingVertical: 5,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.pink }} />
      <Txt weight="extrabold" size={10.5} tracking={2} color={colors.pink}>
        IN GYM
      </Txt>
    </View>
  );
}

/** Ticking hh:mm:ss since the visit started. */
function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  const text = `${pad(Math.floor(secs / 3600))}:${pad(Math.floor((secs % 3600) / 60))}:${pad(secs % 60)}`;
  return (
    <Txt
      weight="extrabold"
      size={44}
      tracking={1}
      color={colors.cream}
      style={{ marginTop: 16, lineHeight: 50, fontVariant: ['tabular-nums'] }}
      accessibilityLabel={`Time in gym ${formatDuration(Math.floor(secs / 60))}`}
    >
      {text}
    </Txt>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Glass elevated="soft" rounded={22} style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 16 }}>
      <Txt weight="bold" size={11} color={colors.muted}>
        {label}
      </Txt>
      <Txt weight="extrabold" size={20} style={{ marginTop: 3 }} numberOfLines={1}>
        {value}
      </Txt>
    </Glass>
  );
}

function VisitRow({ visit }: { visit: Visit }) {
  const start = new Date(visit.checkedInAt);
  const end = visit.checkedOutAt ? new Date(visit.checkedOutAt) : null;
  const minutes = end ? Math.round((end.getTime() - start.getTime()) / 60_000) : null;
  return (
    <Glass
      elevated="soft"
      rounded={radius.card}
      style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 14 }}
    >
      <View
        style={{
          width: 50,
          alignItems: 'center',
          gap: 2,
          backgroundColor: colors.pinkTile,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.6)',
          borderRadius: radius.md,
          paddingVertical: 11,
        }}
      >
        <Txt weight="extrabold" size={9} tracking={1.2} color={colors.roseDeep}>
          {dayShort(start)}
        </Txt>
        <Txt weight="extrabold" size={16}>
          {start.getDate()}
        </Txt>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt weight="extrabold" size={15}>
          {formatTime(start)} – {end ? formatTime(end) : 'now'}
        </Txt>
        <Txt weight="semibold" size={11.5} color={colors.faint}>
          {visit.source === 'device' ? 'Door scanner' : visit.source === 'staff' ? 'Front desk' : 'Self check-in'}
        </Txt>
      </View>
      {minutes !== null && (
        <Txt weight="bold" size={12.5} color={colors.muted}>
          {formatDuration(minutes)}
        </Txt>
      )}
    </Glass>
  );
}
