import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
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
  ScrollView,
} from 'react-native';

import { api } from '../../src/lib/api';
import { colors, spacing, radius, typography } from '../../src/theme';

const PROMPT_SUGGESTIONS = [
  'A lone astronaut walking on Mars at sunset, cinematic 4K',
  'Neon-lit Tokyo street in the rain, slow motion',
  'An ancient dragon soaring over snowy mountains at dawn',
  'Time-lapse of a blooming flower in a forest, macro lens',
  'Abstract colorful paint swirling in water, close-up',
];

const MAX_CHARS = 500;

export default function CreateScreen() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const charPct = prompt.length / MAX_CHARS;
  const isReady = !loading && prompt.trim().length >= 5;

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (trimmed.length < 5) {
      Alert.alert('Describe your video', 'Please enter at least 5 characters.');
      return;
    }

    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await api.videos.generate({ prompt: trimmed });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPrompt('');
      Alert.alert(
        'Generating!',
        'Your video is being created. Check the Library tab in a moment.',
        [{ text: 'View Library', onPress: () => router.push('/(tabs)/') }],
      );
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = err instanceof Error ? err.message : 'Failed to start generation';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>What do you{'\n'}want to see?</Text>
          <Text style={styles.subtitle}>
            Describe your scene in detail — the more vivid, the better.
          </Text>
        </View>

        {/* Prompt input */}
        <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
          <TextInput
            style={styles.input}
            placeholder={'A cinematic shot of a golden sunset\nover the Pacific Ocean…'}
            placeholderTextColor={colors.textMuted}
            value={prompt}
            onChangeText={setPrompt}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            multiline
            maxLength={MAX_CHARS}
            textAlignVertical="top"
            keyboardAppearance="dark"
          />
          {/* Char counter + thin progress bar */}
          <View style={styles.inputFooter}>
            <View style={styles.charBarTrack}>
              <View
                style={[
                  styles.charBarFill,
                  {
                    width: `${Math.min(charPct * 100, 100)}%`,
                    backgroundColor:
                      charPct > 0.9
                        ? colors.error
                        : charPct > 0.5
                          ? colors.amber
                          : colors.textMuted,
                  },
                ]}
              />
            </View>
            <Text style={[styles.charCount, charPct > 0.9 && { color: colors.error }]}>
              {prompt.length}/{MAX_CHARS}
            </Text>
          </View>
        </View>

        {/* Generate button */}
        <TouchableOpacity
          style={[styles.generateButton, !isReady && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={!isReady}
          activeOpacity={0.82}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.loadingDot,
                    { opacity: 0.4 + i * 0.3, transform: [{ scale: 1 + i * 0.15 }] },
                  ]}
                />
              ))}
              <Text style={styles.generateButtonText}>Generating…</Text>
            </View>
          ) : (
            <Text style={styles.generateButtonText}>Generate Video</Text>
          )}
        </TouchableOpacity>

        {/* Prompt suggestions */}
        <View style={styles.suggestionsSection}>
          <View style={styles.suggestionsLabelRow}>
            <View style={styles.suggestionsAccent} />
            <Text style={styles.suggestionsLabel}>NEED INSPIRATION?</Text>
          </View>
          {PROMPT_SUGGESTIONS.map((suggestion) => (
            <TouchableOpacity
              key={suggestion}
              style={styles.suggestionChip}
              onPress={() => setPrompt(suggestion)}
              activeOpacity={0.7}
            >
              <View style={styles.chipArrow}>
                <Text style={styles.chipArrowText}>↗</Text>
              </View>
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    padding: spacing['2xl'],
    gap: spacing['2xl'],
    paddingBottom: spacing['4xl'],
  },
  header: {
    gap: spacing.s,
    paddingTop: spacing.xs,
  },
  title: {
    ...typography.displayL,
    color: colors.textPrimary,
    lineHeight: 36,
  },
  subtitle: {
    ...typography.bodyM,
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: 2,
  },
  inputWrap: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.l,
    overflow: 'hidden',
  },
  inputWrapFocused: {
    borderColor: colors.amber,
  },
  input: {
    paddingHorizontal: spacing.l,
    paddingTop: spacing.l,
    paddingBottom: spacing.m,
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 130,
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.m,
    gap: spacing.m,
  },
  charBarTrack: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    borderRadius: 1,
    overflow: 'hidden',
  },
  charBarFill: {
    height: '100%',
    borderRadius: 1,
  },
  charCount: {
    ...typography.caption,
    color: colors.textMuted,
    minWidth: 40,
    textAlign: 'right',
  },
  generateButton: {
    backgroundColor: colors.amber,
    borderRadius: radius.l,
    paddingVertical: 19,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    opacity: 0.35,
  },
  generateButtonText: {
    color: colors.black,
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.black,
  },
  suggestionsSection: {
    gap: spacing.m,
  },
  suggestionsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: 2,
  },
  suggestionsAccent: {
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.amber,
  },
  suggestionsLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.m,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
  },
  chipArrow: {
    marginTop: 1,
  },
  chipArrowText: {
    color: colors.amber,
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionText: {
    ...typography.bodyM,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
});
