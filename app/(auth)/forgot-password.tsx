import { api } from "@/src/api/client";
import AppGradient from "@/src/components/AppGradient";
import { colors } from "@/src/theme/colors";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendOtp() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert("Erro", "Introduz o teu email.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/forgot-password", {
        email: cleanEmail,
      });

      Alert.alert("Sucesso", "Enviámos um código OTP para o teu email.", [
        {
          text: "OK",
          onPress: () =>
            router.push({
              pathname: "/(auth)/reset-password",
              params: { email: cleanEmail },
            }),
        },
      ]);
    } catch (error: any) {
      console.log(error?.response?.data || error);
      Alert.alert(
        "Erro",
        error?.response?.data?.message ||
          "Não foi possível enviar o código de recuperação."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppGradient>
      <View style={styles.container}>
        <Text style={styles.kicker}>RECUPERAÇÃO</Text>
        <Text style={styles.title}>Recuperar palavra-passe</Text>
        <Text style={styles.subtitle}>
          Introduz o teu email para receberes um código OTP.
        </Text>

        <View style={styles.form}>
          <TextInput
            placeholder="Email"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            style={styles.input}
          />

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSendOtp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "A enviar..." : "Enviar código OTP"}
            </Text>
          </Pressable>

          <Pressable onPress={() => router.back()}>
            <Text style={styles.backLink}>Voltar ao login</Text>
          </Pressable>
        </View>
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
  kicker: {
    color: colors.yellow,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.3,
    marginBottom: 8,
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
    marginBottom: 28,
  },
  form: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 22,
    padding: 18,
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
    fontSize: 15,
  },
  button: {
    backgroundColor: colors.pink,
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
  backLink: {
    textAlign: "center",
    color: colors.yellow,
    fontWeight: "700",
    fontSize: 14,
  },
});