import { colors } from "@/src/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    ImageBackground,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

type Props = {
  title: string;
  subtitle?: string;
  image?: string;
  onPress?: () => void;
};

export default function HomeBanner({
  title,
  subtitle,
  image,
  onPress,
}: Props) {
  return (
    <Pressable onPress={onPress} style={styles.wrapper}>
      <ImageBackground
        source={{
          uri:
            image ||
            "https://csveventos.co.mz/images/clubecsv.jpg",
        }}
        style={styles.banner}
        imageStyle={styles.image}
      >
        <View style={styles.overlay}>
          <View style={styles.badge}>
            <Ionicons
              name="notifications"
              size={14}
              color={colors.white}
            />

            <Text style={styles.badgeText}>
              Novidade
            </Text>
          </View>

          <Text style={styles.title}>
            {title}
          </Text>

          {!!subtitle && (
            <Text style={styles.subtitle}>
              {subtitle}
            </Text>
          )}
        </View>
      </ImageBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
  },

  banner: {
    height: 180,
    justifyContent: "flex-end",
    borderRadius: 24,
    overflow: "hidden",
  },

  image: {
    borderRadius: 24,
  },

  overlay: {
    padding: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },

  badgeText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 12,
  },

  title: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
  },

  subtitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    lineHeight: 20,
  },
});