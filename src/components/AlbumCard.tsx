import type { Album } from "@/src/types";
import { formatPrice } from "@/src/utils/formatters";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  album: Album;
  onPress: () => void;
};

export default function AlbumCard({ album, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {album.cover_url ? (
        <Image source={{ uri: album.cover_url }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.placeholder]}>
          <Text style={styles.placeholderText}>Sem capa</Text>
        </View>
      )}

      <Text style={styles.title} numberOfLines={1}>
        {album.title}
      </Text>

      <Text style={styles.artist} numberOfLines={1}>
        {album.artist?.name || "Artista"}
      </Text>

      <Text style={styles.price}>{formatPrice(album.price || 0)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 180,
    marginRight: 12,
  },
  cover: {
    width: 180,
    height: 180,
    borderRadius: 12,
    marginBottom: 8,
  },
  placeholder: {
    backgroundColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#555",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "ffa217"
  },
  artist: {
    color: "#666",
    marginTop: 4,
  },
  price: {
    marginTop: 6,
    fontWeight: "600",
    color: "ffa217"
  },
});