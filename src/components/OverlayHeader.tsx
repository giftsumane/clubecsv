import { colors } from "@/src/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    View,
    type StyleProp,
    type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  title: string;
  visible?: boolean;
  onBackPress?: () => void;
  rightElement?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

export default function OverlayHeader({
  title,
  visible = true,
  onBackPress,
  rightElement,
  containerStyle,
}: Props) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        { paddingTop: insets.top + 8 },
        containerStyle,
      ]}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={onBackPress || (() => router.back())}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </Pressable>

        <View style={styles.titleWrap}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        </View>

        <View style={styles.rightSlot}>{rightElement ?? <View style={styles.placeholder} />}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingHorizontal: 16,
  },
  header: {
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10,10,20,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  title: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
  },
  rightSlot: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    width: 40,
    height: 40,
  },
});