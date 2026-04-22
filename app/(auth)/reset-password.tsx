import { api } from "@/src/api/client";
import AppGradient from "@/src/components/AppGradient";
import { colors } from "@/src/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(params.email || "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] =
    useState(false);
  const [loading, setLoading] = useState(false);

  async function handleResetPassword() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert("Erro", "Introduz o teu email.");
      return;
    }

    if (!otp.trim()) {
      Alert.alert("Erro", "Introduz o código OTP.");
      return;
    }

    if (!password) {
      Alert.alert("Erro", "Introduz a nova palavra-passe.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Erro", "A palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== passwordConfirmation) {
      Alert.alert("Erro", "As palavras-passe não coincidem.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/reset-password", {
        email: cleanEmail,
        otp: otp.trim(),
        password,
        password_confirmation: passwordConfirmation,
      });

      Alert.alert("Sucesso", "Palavra-passe alterada com sucesso.", [
        {
          text: "OK",
          onPress: () =>
            router.replace({
              pathname: "/(auth)/login",
              params: { email: cleanEmail },
            }),
        },
      ]);
    } catch (error: any) {
      console.log(error?.response?.data || error);

      Alert.alert(
        "Erro",
        error?.response?.data?.message ||
          "Não foi possível redefinir a palavra-passe."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppGradient>
      <View style={styles.container}>
        <Text style={styles.kicker}>RECUPERAÇÃO</Text>
        <Text style={styles.title}>Redefinir palavra-passe</Text>
        <Text style={styles.subtitle}>
          Introduz o código recebido por email e define a tua nova palavra-passe.
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

          <TextInput
            placeholder="Código OTP"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={otp}
            onChangeText={setOtp}
            autoCapitalize="none"
            keyboardType="number-pad"
            style={styles.input}
            maxLength={6}
          />

          <View style={styles.passwordWrapper}>
            <TextInput
              placeholder="Nova palavra-passe"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCorrect={false}
              style={styles.passwordInput}
            />

            <Pressable
              onPress={() => setShowPassword((prev) => !prev)}
              style={styles.eyeButton}
              hitSlop={10}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="rgba(255,255,255,0.75)"
              />
            </Pressable>
          </View>

          <View style={styles.passwordWrapper}>
            <TextInput
              placeholder="Confirmar palavra-passe"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={passwordConfirmation}
              onChangeText={setPasswordConfirmation}
              secureTextEntry={!showPasswordConfirmation}
              autoCorrect={false}
              style={styles.passwordInput}
            />

            <Pressable
              onPress={() =>
                setShowPasswordConfirmation((prev) => !prev)
              }
              style={styles.eyeButton}
              hitSlop={10}
            >
              <Ionicons
                name={
                  showPasswordConfirmation
                    ? "eye-off-outline"
                    : "eye-outline"
                }
                size={22}
                color="rgba(255,255,255,0.75)"
              />
            </Pressable>
          </View>

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "A actualizar..." : "Actualizar palavra-passe"}
            </Text>
          </Pressable>

          <Pressable onPress={() => router.back()}>
            <Text style={styles.backLink}>Voltar</Text>
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
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    marginBottom: 14,
    paddingRight: 14,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.white,
    fontSize: 15,
  },
  eyeButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    backgroundColor: colors.pink,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 6,
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