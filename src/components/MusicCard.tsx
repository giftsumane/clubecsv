import { usePlayerStore } from "@/src/store/playerStore";
import { colors } from "@/src/theme/colors";
import type { Music } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  music: Music;
  onPress: () => void;
};

export default function MusicCard({ music, onPress }: Props) {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isLoading = usePlayerStore((state) => state.isLoading);
  const isBuffering = usePlayerStore((state) => state.isBuffering);

  const isActive = currentTrack?.id === music.id;

  const statusIcon = isLoading || isBuffering
    ? "hourglass-outline"
    : isActive && isPlaying
    ? "pause"
    : "play";

  return (
    <Pressable
      style={[styles.card, isActive && styles.cardActive]}
      onPress={onPress}
    >
      {/* COVER */}
      <View style={styles.coverWrapper}>
        {music.cover_url ? (
          <Image source={{ uri: music.cover_url }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.placeholder]}>
            <Ionicons name="musical-notes" size={16} color={colors.white} />
          </View>
        )}

        {/* PLAY ICON OVERLAY */}
        <View style={styles.overlay}>
          <Ionicons name={statusIcon} size={16} color={colors.white} />
        </View>
      </View>

      {/* INFO */}
      <View style={styles.info}>
        <Text
          style={[styles.title, isActive && styles.titleActive]}
          numberOfLines={1}
        >
          {music.title}
        </Text>

        <Text style={styles.subtitle} numberOfLines={1}>
          {music.artist?.name || "Artista"}
        </Text>
      </View>

      {/* RIGHT ACTION */}
      <View style={styles.right}>
        {isActive ? (
          <Ionicons
            name={isPlaying ? "volume-high" : "pause"}
            size={18}
            color={colors.yellow}
          />
        ) : (
          <Ionicons
            name="ellipsis-horizontal"
            size={18}
            color="rgba(255,255,255,0.6)"
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  cardActive: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.18)",
  },

  coverWrapper: {
    position: "relative",
  },

  cover: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  placeholder: {
    justifyContent: "center",
    alignItems: "center",
  },

  overlay: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 999,
    padding: 4,
  },

  info: {
    flex: 1,
    marginLeft: 12,
  },

  title: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.white,
  },

  titleActive: {
    color: colors.yellow,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
  },

  right: {
    marginLeft: 10,
  },
});