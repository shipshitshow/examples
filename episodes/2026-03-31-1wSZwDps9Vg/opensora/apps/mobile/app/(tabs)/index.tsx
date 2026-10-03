import type { Video } from '@opea/shared';
import { Image } from 'expo-image';
import { useFocusEffect, router } from 'expo-router';
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import { api } from '../../src/lib/api';
import { colors, spacing, radius, typography } from '../../src/theme';

function StatusBadge({ status }: { status: Video['status'] }) {
  const config: Record<string, { label: string; fg: string; bg: string }> = {
    completed: { label: 'Done', fg: colors.success, bg: 'rgba(34,197,94,0.12)' },
    processing: { label: 'Processing', fg: colors.amber, bg: colors.amberSubtle },
    pending: { label: 'Queued', fg: colors.amber, bg: colors.amberSubtle },
    failed: { label: 'Failed', fg: colors.error, bg: 'rgba(239,68,68,0.12)' },
  };
  const { label, fg, bg } = config[status] ?? {
    label: status,
    fg: colors.textMuted,
    bg: colors.surface,
  };

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: fg }]} />
      <Text style={[styles.badgeLabel, { color: fg }]}>{label}</Text>
    </View>
  );
}

function VideoCard({ video }: { video: Video }) {
  const isPlayable = video.status === 'completed';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={isPlayable ? 0.75 : 1}
      onPress={() =>
        isPlayable ? router.push({ pathname: '/video/[id]', params: { id: video.id } }) : undefined
      }
    >
      {video.thumbnailUrl ? (
        <Image source={{ uri: video.thumbnailUrl }} style={styles.thumbnail} contentFit="cover" />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          {video.status === 'processing' || video.status === 'pending' ? (
            <View style={styles.processingIndicator}>
              <ActivityIndicator color={colors.amber} size="small" />
              <Text style={styles.processingText}>Generating…</Text>
            </View>
          ) : (
            <View style={styles.thumbnailIcon}>
              <View style={styles.filmIconFrame}>
                <View style={[styles.filmIconNotch, { left: 4 }]} />
                <View style={[styles.filmIconNotch, { right: 4 }]} />
              </View>
            </View>
          )}
        </View>
      )}

      {/* Overlay badge for playable state */}
      {isPlayable && (
        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <View style={styles.playArrow} />
          </View>
        </View>
      )}

      <View style={styles.cardBody}>
        <Text style={styles.cardPrompt} numberOfLines={2}>
          {video.prompt}
        </Text>
        <View style={styles.cardFooter}>
          <StatusBadge status={video.status} />
          {video.durationSeconds != null && (
            <Text style={styles.cardDuration}>{video.durationSeconds}s</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVideos = useCallback(async () => {
    try {
      const { videos: list } = await api.videos.list();
      setVideos(list);
    } catch {
      // Silently handle — user may not be logged in yet
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchVideos();
    }, [fetchVideos]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    void fetchVideos();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.amber} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={videos}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => <VideoCard video={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.amber}
            colors={[colors.amber]}
          />
        }
        ListHeaderComponent={
          videos.length > 0 ? (
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderCount}>{videos.length}</Text>
              <Text style={styles.listHeaderLabel}>{videos.length === 1 ? 'video' : 'videos'}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <View style={styles.emptyFilmFrame}>
                <View style={[styles.emptyFilmNotch, { left: 6 }]} />
                <View style={[styles.emptyFilmNotch, { right: 6 }]} />
              </View>
            </View>
            <Text style={styles.emptyTitle}>Your library is empty</Text>
            <Text style={styles.emptySubtitle}>Describe a scene and let AI bring it to life.</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/create')}
              activeOpacity={0.82}
            >
              <Text style={styles.emptyButtonText}>Create your first video</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  list: {
    padding: spacing.l,
    gap: spacing.m,
    paddingBottom: spacing['3xl'],
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginBottom: spacing.s,
    paddingHorizontal: 2,
  },
  listHeaderCount: {
    ...typography.displayM,
    color: colors.amber,
  },
  listHeaderLabel: {
    ...typography.bodyM,
    color: colors.textMuted,
  },
  // Video Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.l,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  thumbnailPlaceholder: {
    backgroundColor: '#0f0f12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingIndicator: {
    alignItems: 'center',
    gap: spacing.s,
  },
  processingText: {
    ...typography.caption,
    color: colors.amber,
    marginTop: 2,
  },
  thumbnailIcon: {
    opacity: 0.2,
  },
  filmIconFrame: {
    width: 40,
    height: 28,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filmIconNotch: {
    position: 'absolute',
    width: 5,
    height: 8,
    borderRadius: 1.5,
    backgroundColor: colors.textSecondary,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  playArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.white,
    marginLeft: 3,
  },
  cardBody: {
    padding: spacing.m,
    gap: spacing.s,
  },
  cardPrompt: {
    ...typography.bodyM,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.s,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  cardDuration: {
    ...typography.caption,
    color: colors.textMuted,
  },
  // Empty state
  empty: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'] * 1.5,
    paddingHorizontal: spacing['3xl'],
    gap: spacing.m,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.amberSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.s,
    borderWidth: 1,
    borderColor: colors.amberGlow,
  },
  emptyFilmFrame: {
    width: 36,
    height: 26,
    borderWidth: 2,
    borderColor: colors.amber,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emptyFilmNotch: {
    position: 'absolute',
    width: 5,
    height: 8,
    borderRadius: 1.5,
    backgroundColor: colors.amber,
  },
  emptyTitle: {
    ...typography.headingL,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.bodyM,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: spacing.s,
    backgroundColor: colors.amber,
    borderRadius: radius.m,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: 13,
  },
  emptyButtonText: {
    color: colors.black,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
