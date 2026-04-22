import AppGradient from "@/src/components/AppGradient";
import { usePlayerStore } from "@/src/store/playerStore";
import { colors } from "@/src/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export default function PlayerScreen() {
  const { width, height } = useWindowDimensions();

  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isLoading = usePlayerStore((state) => state.isLoading);
  const isBuffering = usePlayerStore((state) => state.isBuffering);
  const position = usePlayerStore((state) => state.position);
  const duration = usePlayerStore((state) => state.duration);
  const currentIndex = usePlayerStore((state) => state.currentIndex);
  const queue = usePlayerStore((state) => state.queue);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const playNext = usePlayerStore((state) => state.playNext);
  const playPrevious = usePlayerStore((state) => state.playPrevious);
  const stopAndReset = usePlayerStore((state) => state.stopAndReset);
  const playFromQueueIndex = usePlayerStore((state) => state.playFromQueueIndex);
  const seekBy = usePlayerStore((state) => state.seekBy);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < queue.length - 1;
  const safePosition = Math.max(0, position || 0);
  const safeDuration = Math.max(0, duration || 0);
  const progress =
    safeDuration > 0 ? Math.min(safePosition / safeDuration, 1) : 0;

  const coverSize = Math.max(220, Math.min(width - 56, height * 0.32));

  const subtitle = isLoading
    ? "A preparar..."
    : isBuffering
    ? "A carregar..."
    : isPlaying
    ? "A tocar"
    : "Em pausa";

  const mainIcon =
    isLoading || isBuffering
      ? "hourglass-outline"
      : isPlaying
      ? "pause"
      : "play";

  const upcomingTracks =
    currentIndex >= 0 ? queue.slice(currentIndex + 1, currentIndex + 6) : [];

  if (!currentTrack) {
    return (
      <AppGradient>
        <View style={styles.emptyContainer}>
          <Pressable style={styles.topButton} onPress={() => router.back()}>
            <Ionicons name="chevron-down" size={24} color={colors.white} />
          </Pressable>

          <View style={styles.emptyContent}>
            <View style={styles.emptyArtwork}>
              <Ionicons name="musical-notes" size={54} color={colors.white} />
            </View>

            <Text style={styles.emptyTitle}>Nenhuma música em reprodução</Text>
            <Text style={styles.emptySubtitle}>
              Escolhe uma faixa para começares a ouvir.
            </Text>
          </View>
        </View>
      </AppGradient>
    );
  }

  return (
    <AppGradient>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.topButton} onPress={() => router.back()}>
            <Ionicons name="chevron-down" size={24} color={colors.white} />
          </Pressable>

          <Text style={styles.headerTitle} numberOfLines={1}>
            A tocar agora
          </Text>

          <Pressable style={styles.topButton} onPress={stopAndReset}>
            <Ionicons name="close" size={22} color={colors.white} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.mainTop}>
            {currentTrack.cover_url ? (
              <Image
                source={{ uri: currentTrack.cover_url }}
                style={[styles.cover, { width: coverSize, height: coverSize }]}
              />
            ) : (
              <View
                style={[
                  styles.cover,
                  styles.coverPlaceholder,
                  { width: coverSize, height: coverSize },
                ]}
              >
                <Ionicons name="musical-notes" size={64} color={colors.white} />
              </View>
            )}

            <View style={styles.trackMeta}>
              <Text style={styles.title} numberOfLines={2}>
                {currentTrack.title}
              </Text>

              <Text style={styles.artist} numberOfLines={1}>
                {currentTrack.artistName || "Artista"}
              </Text>

              <Text style={styles.stateText} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>

            <View style={styles.progressBlock}>
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${progress * 100}%` }]}
                />
              </View>

              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatTime(safePosition)}</Text>
                <Text style={styles.timeText}>{formatTime(safeDuration)}</Text>
              </View>
            </View>

            <View style={styles.controlsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.seekCircleButton,
                  (isLoading || isBuffering) && styles.buttonDisabled,
                  pressed && !(isLoading || isBuffering) && styles.buttonPressed,
                ]}
                onPress={() => seekBy(-10)}
                disabled={isLoading || isBuffering}
              >
                <Ionicons name="play-back" size={20} color={colors.white} />
                <Text style={styles.seekCircleText}>10</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.sideButton,
                  !hasPrev && styles.buttonDisabled,
                  pressed && hasPrev && styles.buttonPressed,
                ]}
                onPress={playPrevious}
                disabled={!hasPrev}
              >
                <Ionicons
                  name="play-skip-back"
                  size={24}
                  color={colors.white}
                />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.playButton,
                  (isLoading || isBuffering) && styles.playButtonBusy,
                  pressed &&
                    !(isLoading || isBuffering) &&
                    styles.buttonPressed,
                ]}
                onPress={togglePlayPause}
                disabled={isLoading}
              >
                <Ionicons name={mainIcon} size={30} color={colors.white} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.sideButton,
                  !hasNext && styles.buttonDisabled,
                  pressed && hasNext && styles.buttonPressed,
                ]}
                onPress={playNext}
                disabled={!hasNext}
              >
                <Ionicons
                  name="play-skip-forward"
                  size={24}
                  color={colors.white}
                />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.seekCircleButton,
                  (isLoading || isBuffering) && styles.buttonDisabled,
                  pressed && !(isLoading || isBuffering) && styles.buttonPressed,
                ]}
                onPress={() => seekBy(10)}
                disabled={isLoading || isBuffering}
              >
                <Text style={styles.seekCircleText}>10</Text>
                <Ionicons name="play-forward" size={20} color={colors.white} />
              </Pressable>
            </View>
          </View>

          <View style={styles.queuePreview}>
            <View style={styles.queueHeader}>
              <Text style={styles.queueLabel}>Próximas músicas</Text>
              <Text style={styles.queueCount}>
                {queue.length > 0
                  ? `${currentIndex + 1} de ${queue.length}`
                  : "Sem fila"}
              </Text>
            </View>

            {upcomingTracks.length > 0 ? (
              upcomingTracks.map((track, index) => {
                const realIndex = currentIndex + index + 1;

                return (
                  <Pressable
                    key={`${track.id}-${realIndex}`}
                    onPress={() => playFromQueueIndex(realIndex)}
                    style={({ pressed }) => [
                      styles.queueItem,
                      pressed && styles.queueItemPressed,
                    ]}
                  >
                    {track.cover_url ? (
                      <Image
                        source={{ uri: track.cover_url }}
                        style={styles.queueCover}
                      />
                    ) : (
                      <View
                        style={[
                          styles.queueCover,
                          styles.queueCoverPlaceholder,
                        ]}
                      >
                        <Ionicons
                          name="musical-notes"
                          size={16}
                          color={colors.white}
                        />
                      </View>
                    )}

                    <View style={styles.queueInfo}>
                      <Text style={styles.queueTitle} numberOfLines={1}>
                        {track.title}
                      </Text>
                      <Text style={styles.queueArtist} numberOfLines={1}>
                        {track.artistName || "Artista"}
                      </Text>
                    </View>

                    <View style={styles.queueRight}>
                      <Text style={styles.queueOrder}>#{realIndex + 1}</Text>
                      <Ionicons
                        name="play-circle-outline"
                        size={20}
                        color="rgba(255,255,255,0.72)"
                      />
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <Text style={styles.queueEmpty}>
                Não há mais músicas na fila depois desta.
              </Text>
            )}
          </View>
        </ScrollView>
      </View>
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  topButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  mainTop: {
    alignItems: "center",
    paddingTop: 8,
  },
  cover: {
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  coverPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  trackMeta: {
    width: "100%",
    alignItems: "center",
    marginTop: 18,
  },
  title: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  artist: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  stateText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  progressBlock: {
    width: "100%",
    marginTop: 22,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.yellow,
  },
  timeRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "700",
  },
  controlsRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    paddingHorizontal: 2,
  },
  seekCircleButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 3,
  },
  seekCircleText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
  },
  sideButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: colors.pink,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  playButtonBusy: {
    opacity: 0.9,
  },
  queuePreview: {
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginTop: 26,
  },
  queueHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  queueLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  queueCount: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "700",
  },
  queueItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  queueItemPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  queueCover: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  queueCoverPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  queueInfo: {
    flex: 1,
    minWidth: 0,
  },
  queueTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  queueArtist: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 12,
    marginTop: 3,
  },
  queueRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  queueOrder: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "700",
  },
  queueEmpty: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    lineHeight: 20,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  emptyContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyArtwork: {
    width: 220,
    height: 220,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 18,
  },
});