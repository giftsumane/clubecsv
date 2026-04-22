import { usePlayerStore } from "@/src/store/playerStore";
import { colors } from "@/src/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export default function PlayerBar() {
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

  if (!currentTrack) return null;

  const safePosition = Math.max(0, position || 0);
  const safeDuration = Math.max(0, duration || 0);
  const progress = safeDuration > 0 ? Math.min(safePosition / safeDuration, 1) : 0;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < queue.length - 1;
  const isBusy = isLoading || isBuffering;

  const subtitle = isLoading
    ? "A preparar..."
    : isBuffering
    ? "A carregar..."
    : isPlaying
    ? "A tocar"
    : "Em pausa";

  const mainIcon = isBusy ? "hourglass-outline" : isPlaying ? "pause" : "play";

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <View style={styles.leftBlock}>
            {currentTrack.cover_url ? (
              <Image source={{ uri: currentTrack.cover_url }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <Ionicons name="musical-notes" size={18} color={colors.white} />
              </View>
            )}

            <View style={styles.infoBlock}>
              <Text style={styles.title} numberOfLines={1}>
                {currentTrack.title}
              </Text>

              <Text style={styles.artist} numberOfLines={1}>
                {currentTrack.artistName || "Artista"}
              </Text>

              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={stopAndReset}
            hitSlop={10}
          >
            <Ionicons name="close" size={20} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(safePosition)}</Text>
          <Text style={styles.timeText}>{formatTime(safeDuration)}</Text>
        </View>

        <View style={styles.controlsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              (!hasPrev || isBusy) && styles.buttonDisabled,
              pressed && hasPrev && !isBusy && styles.buttonPressed,
            ]}
            onPress={playPrevious}
            disabled={!hasPrev || isBusy}
            hitSlop={8}
          >
            <Ionicons name="play-skip-back" size={22} color={colors.white} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              isBusy && styles.primaryButtonBusy,
              pressed && !isBusy && styles.buttonPressed,
            ]}
            onPress={togglePlayPause}
            disabled={isLoading}
            hitSlop={8}
          >
            <Ionicons name={mainIcon} size={22} color={colors.white} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              (!hasNext || isBusy) && styles.buttonDisabled,
              pressed && hasNext && !isBusy && styles.buttonPressed,
            ]}
            onPress={playNext}
            disabled={!hasNext || isBusy}
            hitSlop={8}
          >
            <Ionicons name="play-skip-forward" size={22} color={colors.white} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 92,
    paddingHorizontal: 12,
    zIndex: 30,
  },
  container: {
    backgroundColor: colors.purple,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  leftBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cover: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  coverPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  infoBlock: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  artist: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    marginTop: 2,
  },
  subtitle: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 12,
    marginTop: 4,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  progressTrack: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    marginTop: 14,
    overflow: "hidden",
  },
  progressFill: {
    height: 5,
    backgroundColor: colors.yellow,
    borderRadius: 999,
  },
  timeRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontWeight: "600",
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1.2,
    backgroundColor: colors.pink,
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonBusy: {
    opacity: 0.85,
  },
  iconButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});