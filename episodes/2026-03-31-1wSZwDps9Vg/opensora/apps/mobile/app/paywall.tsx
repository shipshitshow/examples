import { router } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import type { PurchasesOffering } from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getOfferings, purchaseProPackage, restorePurchases } from '../src/lib/purchases';
import { colors, spacing, radius, typography } from '../src/theme';

const FEATURES = [
  { label: 'Unlimited AI video generations' },
  { label: 'Priority generation queue' },
  { label: 'All aspect ratios & durations' },
  { label: 'Early access to new models' },
  { label: 'No watermark on exports' },
];

function CheckIcon() {
  return (
    <View style={styles.checkCircle}>
      <View style={styles.checkMark} />
    </View>
  );
}

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    void getOfferings().then((o) => {
      setOffering(o);
      setLoading(false);
    });
  }, []);

  const handlePurchase = useCallback(async () => {
    if (!offering) return;
    setPurchasing(true);
    try {
      const success = await purchaseProPackage(offering);
      if (success) {
        Alert.alert('Welcome to Pro!', 'Your subscription is now active.', [
          { text: 'Get Started', onPress: () => router.back() },
        ]);
      }
    } catch {
      Alert.alert('Purchase failed', 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  }, [offering]);

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    try {
      const success = await restorePurchases();
      if (success) {
        Alert.alert('Restored!', 'Your Pro subscription has been restored.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Nothing to restore', 'No active Pro subscription found.');
      }
    } catch {
      Alert.alert('Restore failed', 'Something went wrong. Please try again.');
    } finally {
      setRestoring(false);
    }
  }, []);

  const proPackage = offering?.availablePackages[0];
  const priceString = proPackage?.product.priceString ?? '$9.99';
  const period = proPackage?.product.subscriptionPeriod ?? 'P1M';
  const periodLabel = period === 'P1Y' ? '/ year' : '/ month';

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + spacing['2xl'] }]}>
      {/* Close button */}
      <TouchableOpacity
        style={[styles.closeButton, { top: insets.top + spacing.s }]}
        onPress={() => router.back()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing['4xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>PRO</Text>
            </View>
          </View>
          <Text style={styles.headline}>Unlimited AI Videos</Text>
          <Text style={styles.subheadline}>
            Create as many cinematic AI videos as you want, with priority processing and early
            access to the latest models.
          </Text>
        </View>

        {/* Feature list */}
        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <CheckIcon />
              <Text style={styles.featureText}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* Price card */}
        {loading ? (
          <ActivityIndicator color={colors.amber} style={styles.loader} />
        ) : (
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{priceString}</Text>
              <Text style={styles.pricePeriod}>{periodLabel}</Text>
            </View>
            <Text style={styles.priceNote}>Cancel anytime • No hidden fees</Text>
          </View>
        )}
      </ScrollView>

      {/* CTA */}
      <View style={[styles.footer, { paddingHorizontal: spacing['2xl'] }]}>
        <TouchableOpacity
          style={[styles.ctaButton, (purchasing || loading) && styles.ctaDisabled]}
          onPress={() => void handlePurchase()}
          disabled={purchasing || loading || !offering}
          activeOpacity={0.85}
        >
          {purchasing ? (
            <ActivityIndicator color={colors.black} />
          ) : (
            <Text style={styles.ctaText}>
              Start Pro — {priceString}
              {periodLabel}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={() => void handleRestore()}
          disabled={restoring}
        >
          {restoring ? (
            <ActivityIndicator color={colors.textMuted} size="small" />
          ) : (
            <Text style={styles.restoreText}>Restore purchases</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.legalText}>
          Payment will be charged to your App Store / Google Play account. Subscription
          automatically renews unless cancelled at least 24 hours before the end of the period.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  closeButton: {
    position: 'absolute',
    right: spacing['2xl'],
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing['2xl'],
    gap: spacing['2xl'],
  },
  hero: {
    gap: spacing.m,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  badge: {
    backgroundColor: colors.amberSubtle,
    borderWidth: 1,
    borderColor: colors.amberGlow,
    borderRadius: radius.full,
    paddingHorizontal: spacing.m,
    paddingVertical: 4,
  },
  badgeText: {
    ...typography.label,
    color: colors.amber,
  },
  headline: {
    ...typography.displayL,
    color: colors.textPrimary,
  },
  subheadline: {
    ...typography.bodyM,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  featureList: {
    gap: spacing.m,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.amberSubtle,
    borderWidth: 1,
    borderColor: colors.amberGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.amber,
  },
  featureText: {
    ...typography.bodyM,
    color: colors.textPrimary,
    flex: 1,
  },
  priceCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.amberGlow,
    borderRadius: radius.l,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.s,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.s,
  },
  price: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  pricePeriod: {
    ...typography.bodyM,
    color: colors.textSecondary,
  },
  priceNote: {
    ...typography.bodyS,
    color: colors.textMuted,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  footer: {
    gap: spacing.m,
    paddingTop: spacing.l,
  },
  ctaButton: {
    backgroundColor: colors.amber,
    borderRadius: radius.m,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    color: colors.black,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.s,
  },
  restoreText: {
    ...typography.bodyS,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  legalText: {
    ...typography.caption,
    color: colors.textDisabled,
    textAlign: 'center',
    lineHeight: 16,
  },
});
