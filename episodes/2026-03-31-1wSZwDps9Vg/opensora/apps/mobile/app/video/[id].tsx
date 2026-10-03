import type { Video as VideoType } from '@opea/shared';
import { useLocalSearchParams, router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../src/lib/api';
import { colors, spacing, radius, typography } from '../../src/theme';

export default function VideoPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [video, setVideo] = useState<VideoType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void api.videos
      .get(id)
      .then((v) => {
        setVideo(v);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        Alert.alert('Error', 'Could not load video.');
      });
  }, [id]);

  const player = useVideoPlayer(video?.url ? { uri: video.url } : null, (p) => {
    p.loop = true;
    p.play();
  });

  const handleShare = async () => {
    if (!video?.url) return;
    await Share.share({
      message: `Check out this AI video I made with OpenSora: ${video.url}`,
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.amber} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (!video) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Video not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Close button — top left */}
      <TouchableOpacity
        style={[styles.closeButton, { top: insets.top + 12 }]}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      {/* Video */}
      <View style={styles.videoContainer}>
        {video.url ? (
          <VideoView player={player} style={styles.video} contentFit="contain" nativeControls />
        ) : (
          <View style={styles.noVideo}>
            <Text style={styles.noVideoText}>Video unavailable</Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
        {/* Amber accent rule */}
        <View style={styles.footerAccentBar} />

        <Text style={styles.prompt} numberOfLines={3}>
          {video.prompt}
        </Text>

        <View style={styles.metaRow}>
          {video.durationSeconds != null && (
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>{video.durationSeconds}s</Text>
            </View>
          )}
          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeText}>AI Generated</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.82}>
          <Text style={styles.shareButtonText}>Share Video</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.black,
    gap: spacing.l,
  },
  loadingText: {
    ...typography.bodyS,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.bodyM,
    color: colors.textMuted,
  },
  backButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.m,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.m,
  },
  backButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    position: 'absolute',
    left: spacing.l,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  closeButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.black,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  noVideo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noVideoText: {
    ...typography.bodyM,
    color: colors.textMuted,
  },
  footer: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.xl,
    backgroundColor: colors.bg,
    gap: spacing.m,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerAccentBar: {
    width: 24,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.amber,
    marginBottom: 2,
  },
  prompt: {
    ...typography.bodyL,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  metaBadge: {
    paddingHorizontal: spacing.m,
    paddingVertical: 4,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaBadgeText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '500',
  },
  shareButton: {
    backgroundColor: colors.amber,
    borderRadius: radius.m,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  shareButtonText: {
    color: colors.black,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
