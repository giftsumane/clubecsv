import { colors } from "@/src/theme/colors";
import type { StoreAlbum } from "@/src/types/store";
import { router } from "expo-router";
import React from "react";
import {
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

type Props = {
  item: StoreAlbum;
};

export default function AlbumCardStore({ item }: Props) {
  const imageUri = item.cover_url || item.image_url || undefined;

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/store/album/${item.id}`)}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>Álbum</Text>
        </View>
      )}

      <Text style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>

      {!!item.artist_name && (
        <Text style={styles.artist} numberOfLines={1}>
          {item.artist_name}
        </Text>
      )}

      {item.price !== null && item.price !== undefined && (
        <Text style={styles.price}>{item.price} MZN</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    marginRight: 14,
  },
  image: {
    width: "100%",
    height: 140,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  title: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  artist: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  price: {
    color: colors.yellow,
    fontSize: 13,
    marginTop: 4,
    fontWeight: "700",
  },
});