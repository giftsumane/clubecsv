import AppGradient from "@/src/components/AppGradient";
import { useAuthStore } from "@/src/store/authStore";
import { colors } from "@/src/theme/colors";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function WelcomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.82)).current;
  const translateAnim = useRef(new Animated.Value(16)).current;
  const glowAnim = useRef(new Animated.Value(0.75)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;

  const [loadingText, setLoadingText] = useState("A preparar aplicação");

  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    const animations = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 850,
        easing: Easing.out(Easing.back(1.15)),
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(subtitleFade, {
        toValue: 1,
        duration: 850,
        delay: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
    ]);

    animations.start();

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.78,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    glowLoop.start();

    return () => {
      glowLoop.stop();
      animations.stop();
    };
  }, [
    fadeAnim,
    glowAnim,
    progressAnim,
    scaleAnim,
    subtitleFade,
    translateAnim,
  ]);

  useEffect(() => {
    if (!hasHydrated) return;

    setLoadingText("A iniciar aplicação");

    const timer = setTimeout(() => {
      if (!token) {
        router.replace("/(auth)/login");
        return;
      }

      router.replace("/(tabs)");
    }, 500);

    return () => clearTimeout(timer);
  }, [hasHydrated, token]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <AppGradient>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { translateY: translateAnim }],
            },
          ]}
        >
          <View style={styles.logoWrap}>
            <Animated.View
              style={[
                styles.logoGlow,
                {
                  opacity: glowAnim,
                  transform: [{ scale: glowAnim }],
                },
              ]}
            />

            <View style={styles.logoCircle}>
              <Image
                source={require("@/assets/images/csv-logo.jpg")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>

          <Text style={styles.title}>Bem-vindo ao Clube CSV</Text>

          <Animated.Text style={[styles.subtitle, { opacity: subtitleFade }]}>
            A preparar a tua experiência...
          </Animated.Text>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[styles.progressFill, { width: progressWidth }]}
            />
          </View>

          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.yellow} />
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        </Animated.View>
      </View>
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  content: {
    width: "100%",
    alignItems: "center",
  },
  logoWrap: {
    width: 190,
    height: 190,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },
  logoGlow: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(211,71,255,0.18)",
    borderWidth: 1.5,
    borderColor: "rgba(255,40,117,0.45)",
  },
  logoCircle: {
    width: 165,
    height: 165,
    borderRadius: 82.5,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logo: {
    width: 132,
    height: 132,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: colors.white,
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  progressTrack: {
    width: "78%",
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    marginBottom: 18,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.pink,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "600",
  },
});
