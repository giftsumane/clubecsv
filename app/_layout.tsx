import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { registerForPushNotifications } from "@/services/notifications";
import PlayerBar from "@/src/components/PlayerBar";

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    registerForPushNotifications()
      .then((token) => {
        console.log("PUSH TOKEN:", token);
      })
      .catch((error) => {
        console.log("Erro notificações:", error);
      });
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="album/[id]" />
        <Stack.Screen name="music/[id]" />
        <Stack.Screen name="purchases" />
      </Stack>

      <StatusBar style="auto" />

      <PlayerBar />
    </ThemeProvider>
  );
}