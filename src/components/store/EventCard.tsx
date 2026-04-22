import { colors } from "@/src/theme/colors";
import type { StoreEvent } from "@/src/types/store";
import { router } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  item: StoreEvent;
};

export default function EventCard({ item }: Props) {
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/store/event/${item.id}`)}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>Evento</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    marginRight: 14,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  image: {
    width: "100%",
    height: 240,
    resizeMode: "cover",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  content: {
    padding: 12,
  },
  title: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
});