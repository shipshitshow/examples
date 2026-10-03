import { router } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../src/lib/auth';
import { getCustomerInfo, isProSubscriber } from '../../src/lib/purchases';
import { colors, spacing, radius, typography } from '../../src/theme';

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [isPro, setIsPro] = useState(false);
  const [proExpiryDate, setProExpiryDate] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const pro = await isProSubscriber();
      setIsPro(pro);

      if (pro) {
        const info = await getCustomerInfo();
        const entitlement = info?.entitlements.active['pro'];
        if (entitlement?.expirationDate) {
          setProExpiryDate(
            new Date(entitlement.expirationDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
          );
        }
      }
    })();
  }, []);

  const initial = user?.email?.[0]?.toUpperCase() ?? '?';
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—';

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const handleUpgrade = useCallback(() => {
    router.push('/paywall');
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top > 0 ? spacing.l : spacing['2xl'],
          paddingBottom: insets.bottom + spacing['3xl'],
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar + identity */}
      <View style={styles.hero}>
        <View style={[styles.avatarRing, isPro && styles.avatarRingPro]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{initial}</Text>
          </View>
        </View>
        <Text style={styles.email}>{user?.email ?? '—'}</Text>
        <Text style={styles.memberSince}>Member since {memberSince}</Text>
        {isPro && (
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        )}
      </View>

      {/* Subscription card */}
      {isPro ? (
        <View style={styles.proCard}>
          <View style={styles.proCardHeader}>
            <View style={styles.proIconWrap}>
              <View style={styles.sparkDot} />
            </View>
            <Text style={styles.proCardTitle}>Pro Plan</Text>
          </View>
          <Text style={styles.proCardDesc}>
            Unlimited AI video generations with priority queue.
          </Text>
          {proExpiryDate !== null && <Text style={styles.proExpiry}>Renews {proExpiryDate}</Text>}
        </View>
      ) : (
        <View style={styles.creditsCard}>
          <View style={styles.creditsHeader}>
            <View style={styles.creditsIconWrap}>
              <View style={styles.sparkDot} />
            </View>
            <Text style={styles.creditsTitle}>Free Credits</Text>
          </View>
          <View style={styles.creditsMeter}>
            <Text style={styles.creditsNumber}>10</Text>
            <Text style={styles.creditsUnit}>remaining</Text>
          </View>
          <View style={styles.creditsMeterBar}>
            <View style={styles.creditsMeterFill} />
          </View>
          <Text style={styles.creditsNote}>10 free AI video generations included.</Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={handleUpgrade}
            activeOpacity={0.85}
          >
            <Text style={styles.upgradeButtonText}>Upgrade to Pro — Unlimited</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Account details */}
      <View style={styles.detailsCard}>
        <Text style={styles.detailsHeading}>Account</Text>
        <StatRow label="Email" value={user?.email ?? '—'} />
        <View style={styles.detailsDivider} />
        <StatRow label="Plan" value={isPro ? 'Pro' : 'Free'} />
        <View style={styles.detailsDivider} />
        <StatRow label="Member since" value={memberSince} />
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* App version */}
      <Text style={styles.appVersion}>OpenSora v0.1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing['2xl'],
    gap: spacing.l,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.s,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.s,
    backgroundColor: colors.amberSubtle,
  },
  avatarRingPro: {
    borderWidth: 3,
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#1c1810',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    ...typography.displayM,
    color: colors.amber,
  },
  email: {
    ...typography.headingM,
    color: colors.textPrimary,
  },
  memberSince: {
    ...typography.bodyS,
    color: colors.textMuted,
  },
  proBadge: {
    backgroundColor: colors.amberSubtle,
    borderWidth: 1,
    borderColor: colors.amberGlow,
    borderRadius: radius.full,
    paddingHorizontal: spacing.m,
    paddingVertical: 3,
  },
  proBadgeText: {
    ...typography.label,
    color: colors.amber,
  },
  proCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.amberGlow,
    borderRadius: radius.l,
    padding: spacing.xl,
    gap: spacing.s,
  },
  proCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  proIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.amberSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.amber,
  },
  proCardTitle: {
    ...typography.label,
    color: colors.amber,
  },
  proCardDesc: {
    ...typography.bodyS,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  proExpiry: {
    ...typography.caption,
    color: colors.textMuted,
  },
  creditsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.amberGlow,
    borderRadius: radius.l,
    padding: spacing.xl,
    gap: spacing.s,
  },
  creditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: 2,
  },
  creditsIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.amberSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditsTitle: {
    ...typography.label,
    color: colors.amber,
  },
  creditsMeter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.s,
  },
  creditsNumber: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -1.5,
  },
  creditsUnit: {
    ...typography.bodyM,
    color: colors.textMuted,
  },
  creditsMeterBar: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: 4,
  },
  creditsMeterFill: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.amber,
    borderRadius: 2,
  },
  creditsNote: {
    ...typography.bodyS,
    color: colors.textMuted,
    lineHeight: 18,
  },
  upgradeButton: {
    backgroundColor: colors.amber,
    borderRadius: radius.m,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: spacing.s,
  },
  upgradeButtonText: {
    color: colors.black,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.1,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.l,
    padding: spacing.xl,
    gap: spacing.m,
  },
  detailsHeading: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: 2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    ...typography.bodyM,
    color: colors.textSecondary,
  },
  statValue: {
    ...typography.bodyM,
    color: colors.textPrimary,
    fontWeight: '500',
    maxWidth: '55%',
    textAlign: 'right',
  },
  detailsDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    borderRadius: radius.m,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.05)',
    marginTop: spacing.s,
  },
  signOutText: {
    color: colors.error,
    fontWeight: '600',
    fontSize: 15,
  },
  appVersion: {
    ...typography.caption,
    color: colors.textDisabled,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
