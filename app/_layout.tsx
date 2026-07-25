import { useEffect, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  addNotificationResponseListener,
  registerForPushNotifications,
} from "@/services/notifications";
import PlayerBar from "@/src/components/PlayerBar";
import { useAuthStore } from "@/src/store/authStore";
import { checkAppVersion } from "@/src/utils/checkAppVersion";

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hasHydratedAuth = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [checkingVersion, setCheckingVersion] = useState(true);
  const [forceUpdate, setForceUpdate] = useState<any>(null);

  useEffect(() => {
    async function verifyVersion() {
      try {
        const result = await checkAppVersion();

        if (result.mustUpdate) {
          setForceUpdate(result);
        }
      } catch (error) {
        console.log("Erro ao verificar versão:", error);
      } finally {
        setCheckingVersion(false);
      }
    }

    verifyVersion();
  }, []);

  useEffect(() => {
    const subscription = addNotificationResponseListener();

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedAuth) return;

    registerForPushNotifications()
      .then((token) => {
        console.log("PUSH TOKEN:", token);
      })
      .catch((error) => {
        console.log("Erro notificações:", error);
      });
  }, [hasHydratedAuth, isAuthenticated]);

  if (checkingVersion) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#ffffff",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>
          A verificar versão...
        </Text>
      </View>
    );
  }

  if (forceUpdate) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#ffffff",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <Text
          style={{
            fontSize: 26,
            fontWeight: "900",
            textAlign: "center",
            color: "#111827",
            marginBottom: 12,
          }}
        >
          Actualização obrigatória
        </Text>

        <Text
          style={{
            fontSize: 16,
            textAlign: "center",
            color: "#4b5563",
            lineHeight: 24,
            marginBottom: 28,
          }}
        >
          {forceUpdate.message ||
            "Existe uma nova versão do Clube CSV. Actualize para continuar a utilizar a aplicação."}
        </Text>

        <Pressable
          onPress={() => Linking.openURL(forceUpdate.storeUrl)}
          style={{
            backgroundColor: "#5736B9",
            paddingVertical: 15,
            paddingHorizontal: 30,
            borderRadius: 14,
            width: "100%",
            maxWidth: 320,
          }}
        >
          <Text
            style={{
              color: "#ffffff",
              fontSize: 16,
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            Actualizar agora
          </Text>
        </Pressable>
      </View>
    );
  }

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
