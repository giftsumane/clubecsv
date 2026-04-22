import AppGradient from "@/src/components/AppGradient";
import { useAuthStore } from "@/src/store/authStore";
import { colors } from "@/src/theme/colors";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email || "";

  const verifyEmailCode = useAuthStore((state) => state.verifyEmailCode);
  const resendVerificationCode = useAuthStore((state) => state.resendVerificationCode);
  const loading = useAuthStore((state) => state.loading);

  const [code, setCode] = useState("");

  async function handleVerify() {
    try {
      await verifyEmailCode(email, code);
      router.replace("/welcome");
    } catch (error: any) {
      Alert.alert("Erro", error?.response?.data?.message || "Não foi possível verificar o email.");
    }
  }

  async function handleResend() {
    try {
      await resendVerificationCode(email);
      Alert.alert("Sucesso", "Enviámos um novo código para o teu email.");
    } catch (error: any) {
      Alert.alert("Erro", error?.response?.data?.message || "Falha ao reenviar o código.");
    }
  }

  return (
    <AppGradient>
      <View style={styles.container}>
        <Text style={styles.title}>Verificar email</Text>
        <Text style={styles.subtitle}>
          Introduz o código enviado para {email}
        </Text>

        <TextInput
          placeholder="Código de 6 dígitos"
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.input}
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "A verificar..." : "Confirmar email"}
          </Text>
        </Pressable>

        <Pressable onPress={handleResend}>
          <Text style={styles.link}>Reenviar código</Text>
        </Pressable>
      </View>
    </AppGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 24,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    color: colors.white,
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 6,
  },
  button: {
    backgroundColor: colors.orange,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 16,
  },
  link: {
    textAlign: "center",
    color: colors.yellow,
    fontWeight: "700",
    marginTop: 8,
  },
});