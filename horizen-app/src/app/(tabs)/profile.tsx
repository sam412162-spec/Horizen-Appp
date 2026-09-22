import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Alert, Platform, View } from 'react-native';

import { MembershipCard } from '@/components/cards';
import { Glass } from '@/components/Glass';
import { Icon, type IconName } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { IconButton, Loading, Screen, Touchable } from '@/components/ui';
import { gym } from '@/data';
import { useApp, useMember } from '@/state/AppState';
import { useAsync } from '@/state/useAsync';
import { colors } from '@/theme';
import { formatNumber } from '@/utils/date';

type MenuItem = { icon: IconName; name: string; href?: Href; detail?: string };

const comingSoon = (what: string) => Alert.alert(what, 'This section is coming soon.');

export default function ProfileScreen() {
  const member = useMember();
  const { signOut, calorieGoal } = useApp();
  const membership = useAsync(() => gym.getMembership(member.id), [member.id]);

  const menu: MenuItem[] = [
    { icon: 'user', name: 'My profile' },
    { icon: 'card', name: 'Membership & billing', href: '/billing' },
    { icon: 'qr', name: 'Check-in & visits', href: '/check-in' },
    { icon: 'calendar', name: 'My bookings', href: '/schedule' },
    { icon: 'chart', name: 'My stats', href: '/progress' },
    { icon: 'target', name: 'Daily calorie goal', href: '/calorie-goal', detail: `${formatNumber(calorieGoal)} kcal` },
    { icon: 'gift', name: 'Refer a friend' },
    { icon: 'help', name: 'Help & support' },
  ];

  const confirmSignOut = () => {
    if (Platform.OS === 'web') return void signOut();
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <IconButton icon="settings" label="Settings" size={16} onPress={() => comingSoon('Settings')} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 6 }}>
        <Image
          source={member.avatar}
          style={{
            width: 66,
            height: 66,
            borderRadius: 33,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.8)',
            backgroundColor: colors.pinkTile,
          }}
          contentFit="cover"
          contentPosition={{ top: '15%', left: '50%' }}
        />
        <View>
          <Txt weight="extrabold" size={26} tracking={-0.3} accessibilityRole="header">
            {member.firstName}
          </Txt>
          <Txt weight="bold" size={12.5} color={colors.muted} style={{ marginTop: 1 }}>
            Level {member.level}
          </Txt>
        </View>
      </View>

      <View style={{ marginTop: 20 }}>
        {membership.data ? (
          <MembershipCard membership={membership.data} variant="profile" onPress={() => router.push('/membership')} />
        ) : (
          <Loading />
        )}
      </View>

      <Glass elevated="soft" style={{ marginTop: 16, paddingVertical: 4, paddingHorizontal: 20 }}>
        {menu.map((m, i) => (
          <Touchable
            key={m.name}
            onPress={() => (m.href ? router.push(m.href) : comingSoon(m.name))}
            accessibilityRole="button"
            pressedStyle={{ opacity: 0.65 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingVertical: 15,
              minHeight: 44,
              borderBottomWidth: i === menu.length - 1 ? 0 : 1,
              borderBottomColor: 'rgba(255,255,255,0.5)',
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: colors.pinkTile,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={m.icon} size={14} />
            </View>
            <Txt weight="bold" size={13.5} style={{ flex: 1 }}>
              {m.name}
            </Txt>
            {m.detail && (
              <Txt weight="bold" size={12} color={colors.muted}>
                {m.detail}
              </Txt>
            )}
            <Icon name="chevron" size={13} color={colors.chevron} strokeWidth={2.2} />
          </Touchable>
        ))}
      </Glass>

      <Touchable
        onPress={confirmSignOut}
        accessibilityRole="button"
        style={{ marginTop: 18, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 }}
      >
        <Icon name="logout" size={14} color={colors.muted} />
        <Txt weight="extrabold" size={12.5} color={colors.muted}>
          Sign out
        </Txt>
      </Touchable>
    </Screen>
  );
}
