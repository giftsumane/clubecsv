import { usePlayerStore } from "@/src/store/playerStore";
import { colors } from "@/src/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export default function PlayerBar() {
  const pathname = usePathname();

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
  const seekBy = usePlayerStore((state) => state.seekBy);

  if (!currentTrack || pathname === "/player") return null;

  const safePosition = Math.max(0, position || 0);
  const safeDuration = Math.max(0, duration || 0);
  const progress =
    safeDuration > 0 ? Math.min(safePosition / safeDuration, 1) : 0;

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

  const openPlayerDetail = () => {
    if (pathname !== "/player") {
      router.push("/player");
    }
  };

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <View style={styles.container}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <View style={styles.topRow}>
          <Pressable
            style={({ pressed }) => [
              styles.trackPressable,
              pressed && styles.buttonPressed,
            ]}
            onPress={openPlayerDetail}
          >
            {currentTrack.cover_url ? (
              <Image source={{ uri: currentTrack.cover_url }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <Ionicons name="musical-notes" size={16} color={colors.white} />
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
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={stopAndReset}
            hitSlop={10}
          >
            <Ionicons name="close" size={16} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.controlsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.seekButton,
              isBusy && styles.buttonDisabled,
              pressed && !isBusy && styles.buttonPressed,
            ]}
            onPress={() => seekBy(-10)}
            disabled={isBusy}
            hitSlop={8}
          >
            <Ionicons name="play-back" size={15} color={colors.white} />
            <Text style={styles.seekText}>10</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.smallIconButton,
              (!hasPrev || isBusy) && styles.buttonDisabled,
              pressed && hasPrev && !isBusy && styles.buttonPressed,
            ]}
            onPress={playPrevious}
            disabled={!hasPrev || isBusy}
            hitSlop={8}
          >
            <Ionicons name="play-skip-back" size={18} color={colors.white} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.mainPlayButton,
              isBusy && styles.mainPlayButtonBusy,
              pressed && !isBusy && styles.buttonPressed,
            ]}
            onPress={togglePlayPause}
            disabled={isLoading}
            hitSlop={8}
          >
            <Ionicons name={mainIcon} size={18} color={colors.white} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.smallIconButton,
              (!hasNext || isBusy) && styles.buttonDisabled,
              pressed && hasNext && !isBusy && styles.buttonPressed,
            ]}
            onPress={playNext}
            disabled={!hasNext || isBusy}
            hitSlop={8}
          >
            <Ionicons name="play-skip-forward" size={18} color={colors.white} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.seekButton,
              isBusy && styles.buttonDisabled,
              pressed && !isBusy && styles.buttonPressed,
            ]}
            onPress={() => seekBy(10)}
            disabled={isBusy}
            hitSlop={8}
          >
            <Text style={styles.seekText}>10</Text>
            <Ionicons name="play-forward" size={15} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.timeText}>{formatTime(safePosition)}</Text>
          <Text style={styles.timeText}>{formatTime(safeDuration)}</Text>
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
    bottom: 88,
    paddingHorizontal: 12,
    zIndex: 30,
  },
  container: {
    backgroundColor: "rgba(87,54,185,0.96)",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 9,
  },
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.yellow,
    borderRadius: 999,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trackPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  cover: {
    width: 46,
    height: 46,
    borderRadius: 12,
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
    minWidth: 0,
    justifyContent: "center",
  },
  title: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  artist: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 11,
    marginTop: 1,
  },
  subtitle: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 11,
    marginTop: 2,
  },
  controlsRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  seekButton: {
    minWidth: 42,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 8,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    gap: 3,
  },
  seekText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "800",
  },
  smallIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  mainPlayButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.pink,
    alignItems: "center",
    justifyContent: "center",
  },
  mainPlayButtonBusy: {
    opacity: 0.9,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignSelf: "flex-start",
    marginTop: 6,
  },
  bottomRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  timeText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});