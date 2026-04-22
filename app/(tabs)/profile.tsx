import AppGradient from "@/src/components/AppGradient";
import { useAuthStore } from "@/src/store/authStore";
import { usePlayerStore } from "@/src/store/playerStore";
import { colors } from "@/src/theme/colors";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const stopAndReset = usePlayerStore((state) => state.stopAndReset);

  const handleLogout = async () => {
    try {
      await stopAndReset();
    } catch (error) {
      console.log("Erro ao parar o player no logout:", error);
    }

    logout();
    router.replace("/(auth)/login");
  };

  const handleDeleteAccount = () => {
    if (!user?.email) {
      Alert.alert("Erro", "Não foi possível obter o email do utilizador.");
      return;
    }

    Alert.alert(
      "Eliminar conta",
      "Tens a certeza que queres eliminar a tua conta?\n\nEsta acção é permanente e poderá remover o acesso a compras e conteúdos.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const url = `https://csveventos.co.mz/excluir-conta?email=${encodeURIComponent(
              user.email
            )}`;

            try {
              await Linking.openURL(url);
            } catch (e) {
              Alert.alert("Erro", "Não foi possível abrir a página.");
              return;
            }

            try {
              await stopAndReset();
            } catch (error) {
              console.log("Erro ao parar o player ao eliminar conta:", error);
            }

            logout();
            router.replace("/(auth)/login");

            Alert.alert(
              "Pedido iniciado",
              "Foste redireccionado para concluir a eliminação da conta."
            );
          },
        },
      ]
    );
  };

  return (
    <AppGradient>
      <View style={styles.container}>
        <Text style={styles.kicker}>A tua conta</Text>
        <Text style={styles.title}>Perfil</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Nome</Text>
          <Text style={styles.value}>{user?.name || "-"}</Text>

          <Text style={[styles.label, { marginTop: 12 }]}>Email</Text>
          <Text style={styles.value}>{user?.email || "-"}</Text>
        </View>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push("/tickets")}
        >
          <Text style={styles.secondaryButtonText}>Meus Bilhetes</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push("/purchases")}
        >
          <Text style={styles.secondaryButtonText}>
            Ver histórico de compras
          </Text>
        </Pressable>

        <Pressable style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Terminar sessão</Text>
        </Pressable>

        <Pressable style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Text style={styles.deleteButtonText}>Eliminar Conta</Text>
        </Pressable>
      </View>
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 40,
  },
  kicker: {
    color: colors.yellow,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 20,
    color: colors.white,
  },
  card: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 16,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
  },
  value: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
    color: colors.white,
  },
  secondaryButton: {
    marginTop: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontWeight: "700",
    color: colors.white,
  },
  button: {
    marginTop: 12,
    backgroundColor: colors.pink,
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    color: colors.white,
    fontWeight: "800",
  },
  deleteButton: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(255,0,0,0.4)",
    backgroundColor: "rgba(255,0,0,0.08)",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#FF4D4D",
    fontWeight: "800",
  },
});