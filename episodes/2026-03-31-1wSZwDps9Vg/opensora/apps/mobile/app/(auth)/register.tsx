import { Link } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';

import { api } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { colors, spacing, radius, typography } from '../../src/theme';

export default function RegisterScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const { accessToken, user } = await api.auth.register({ email, password });
      await signIn(accessToken, user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      Alert.alert('Registration failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.ambientGlow} />

        <View style={styles.logoBlock}>
          <View style={styles.accentBar} />
          <Text style={styles.logo}>
            <Text style={styles.logoAmber}>Open</Text>
            <Text style={styles.logoWhite}>Sora</Text>
          </Text>
          <Text style={styles.tagline}>Start creating for free</Text>
        </View>

        {/* Free tier callout */}
        <View style={styles.freeBadge}>
          <View style={styles.freeDot} />
          <Text style={styles.freeBadgeText}>10 free AI video generations — no card required</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, emailFocused && styles.inputFocused]}
            placeholder="Email address"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            keyboardType="email-address"
            autoCapitalize="none"
            keyboardAppearance="dark"
          />
          <TextInput
            style={[styles.input, passwordFocused && styles.inputFocused]}
            placeholder="Password (min. 8 characters)"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            secureTextEntry
            keyboardAppearance="dark"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonLoading]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.82}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[styles.loadingDot, { opacity: 0.5 + i * 0.25 }]} />
                ))}
              </View>
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>HAVE AN ACCOUNT?</Text>
          <View style={styles.dividerLine} />
        </View>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.switchButton} activeOpacity={0.75}>
            <Text style={styles.switchText}>Sign in</Text>
          </TouchableOpacity>
        </Link>

        <Text style={styles.legalNote}>
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  ambientGlow: {
    position: 'absolute',
    top: -80,
    left: '50%',
    marginLeft: -120,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.amberSubtle,
  },
  logoBlock: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
    gap: spacing.s,
  },
  accentBar: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.amber,
    marginBottom: spacing.s,
  },
  logo: {
    ...typography.displayXL,
  },
  logoAmber: {
    color: colors.amber,
  },
  logoWhite: {
    color: colors.textPrimary,
  },
  tagline: {
    ...typography.bodyM,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    backgroundColor: colors.amberSubtle,
    borderWidth: 1,
    borderColor: colors.amberGlow,
    borderRadius: radius.m,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    marginBottom: spacing['2xl'],
  },
  freeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.amber,
  },
  freeBadgeText: {
    ...typography.bodyS,
    color: colors.amber,
    flex: 1,
  },
  form: {
    gap: spacing.m,
    marginBottom: spacing['2xl'],
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    paddingHorizontal: spacing.l,
    paddingVertical: 15,
    color: colors.textPrimary,
    fontSize: 16,
  },
  inputFocused: {
    borderColor: colors.amber,
    backgroundColor: '#1a1a1d',
  },
  button: {
    backgroundColor: colors.amber,
    borderRadius: radius.m,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: spacing.s,
  },
  buttonLoading: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.black,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  loadingRow: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    height: 20,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.black,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    marginBottom: spacing.l,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.label,
    color: colors.textMuted,
  },
  switchButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.m,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  switchText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  legalNote: {
    ...typography.caption,
    color: colors.textDisabled,
    textAlign: 'center',
    lineHeight: 17,
  },
});
