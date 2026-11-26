import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { AmbientBackground } from '@/components/AmbientBackground';
import { Wordmark } from '@/components/Brand';
import { Glass } from '@/components/Glass';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { CtaButton, IconButton, Touchable } from '@/components/ui';
import { useApp } from '@/state/AppState';
import { colors, fonts, radius, shadow } from '@/theme';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signInWithGoogle } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'email' | 'google' | null>(null);
  const missing = error !== null;

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setBusy('email');
    try {
      await signIn(email, password);
      // The auth guard in the root layout swaps to the tabs automatically.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed.');
      setBusy(null);
    }
  };

  const google = async () => {
    setBusy('google');
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign in failed.');
      setBusy(null);
    }
  };

  const comingSoon = (what: string) =>
    Alert.alert(what, 'Please ask the Horizen front desk for help while this is being set up.');

  return (
    <View style={{ flex: 1 }}>
      <AmbientBackground />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 14,
            paddingBottom: insets.bottom + 28,
            paddingHorizontal: 28,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <IconButton
            icon="back"
            label="Back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />

          <View style={{ marginTop: 26 }}>
            <Wordmark width={192} />
          </View>

          <Txt weight="extrabold" size={28} tracking={-0.3} style={{ marginTop: 22 }} accessibilityRole="header">
            Welcome back
          </Txt>
          <Txt weight="medium" size={14} color={colors.muted} style={{ marginTop: 5 }}>
            Sign in to continue your training.
          </Txt>

          <Glass elevated rounded={radius.panel} style={{ marginTop: 28, padding: 14, gap: 10 }}>
            <Glass
              tone="input"
              rounded={radius.md}
              borderColor={missing && !email.trim() ? colors.alertBorder : undefined}
              style={[styles.field, { borderWidth: 1.5 }]}
            >
              <Txt weight="extrabold" size={10} tracking={1} color={colors.label}>
                EMAIL
              </Txt>
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setError(null);
                }}
                placeholder="you@example.com"
                placeholderTextColor={colors.faint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="username"
                returnKeyType="next"
                style={styles.input}
                accessibilityLabel="Email"
              />
            </Glass>

            <Glass
              tone="input"
              rounded={radius.md}
              borderColor={missing && !password ? colors.alertBorder : undefined}
              style={[styles.field, { borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 12 }]}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Txt weight="extrabold" size={10} tracking={1} color={colors.label}>
                  PASSWORD
                </Txt>
                <TextInput
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setError(null);
                  }}
                  placeholder="••••••••"
                  placeholderTextColor={colors.faint}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={submit}
                  style={styles.input}
                  accessibilityLabel="Password"
                />
              </View>
              <Touchable
                onPress={() => setShowPw((v) => !v)}
                hitSlop={10}
                accessibilityLabel={showPw ? 'Hide password' : 'Show password'}
              >
                <Icon name="eye" size={17} color={colors.label} strokeWidth={1.8} />
              </Touchable>
            </Glass>
          </Glass>

          {error && (
            <Txt
              weight="bold"
              size={12.5}
              color={colors.alert}
              selectable
              style={{ marginTop: 12 }}
              accessibilityLiveRegion="polite"
            >
              {error}
            </Txt>
          )}

          <View style={{ alignItems: 'flex-end', marginTop: 12 }}>
            <Touchable onPress={() => comingSoon('Forgot password')} hitSlop={8}>
              <Txt weight="extrabold" size={12.5}>
                Forgot password?
              </Txt>
            </Touchable>
          </View>

          <CtaButton
            label="SIGN IN"
            variant="dark"
            loading={busy === 'email'}
            onPress={submit}
            style={{ marginTop: 20 }}
          />

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Txt weight="extrabold" size={11} tracking={1} color={colors.label}>
              OR
            </Txt>
            <View style={styles.orLine} />
          </View>

          <Touchable onPress={google} disabled={!!busy} accessibilityRole="button">
            <Glass
              fill="rgba(255,255,255,0.5)"
              borderColor={colors.glassBorderStrong}
              rounded={radius.lg}
              style={styles.google}
            >
              <GoogleG />
              <Txt weight="extrabold" size={13} tracking={0.3}>
                {busy === 'google' ? 'Signing in…' : 'Continue with Google'}
              </Txt>
            </Glass>
          </Touchable>

          <View style={{ flex: 1, minHeight: 26 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            <Txt weight="semibold" size={13} color={colors.muted}>
              New to Horizen?{' '}
            </Txt>
            <Touchable onPress={() => comingSoon('Join Horizen')} hitSlop={8}>
              <Txt weight="extrabold" size={13}>
                Join now
              </Txt>
            </Touchable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function GoogleG() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.06-1.4-.18-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4z"
      />
      <Path
        fill="#34A853"
        d="M12 21.5c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.9 5.9 0 0 1-5.5-4H3.2v2.6A10 10 0 0 0 12 21.5z"
      />
      <Path fill="#FBBC05" d="M6.5 13.6a6 6 0 0 1 0-3.8V7.2H3.2a10 10 0 0 0 0 9z" />
      <Path fill="#EA4335" d="M12 6.4c1.5 0 2.8.5 3.8 1.5L18.7 5A10 10 0 0 0 3.2 7.2l3.3 2.6A5.9 5.9 0 0 1 12 6.4z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  field: { paddingVertical: 12, paddingHorizontal: 17, gap: 3 },
  input: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: colors.ink,
    padding: 0,
    minHeight: 22,
  },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 26, marginBottom: 22 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.hairline },
  google: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...shadow.soft,
  },
});
