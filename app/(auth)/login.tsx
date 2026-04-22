import AppGradient from "@/src/components/AppGradient";
import { useAuthStore } from "@/src/store/authStore";
import { colors } from "@/src/theme/colors";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
  Alert, Image, Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    const cleanEmail = email.trim().toLowerCase();

    try {
      await login(cleanEmail, password);

      router.replace("/welcome");

      
    } catch (error: any) {
      const data = error?.response?.data;

      console.log(data || error);

      if (data?.requires_verification) {
        router.push({
          pathname: "/(auth)/verify-email",
          params: {
            email: data.email || cleanEmail,
          },
        });
        return;
      }

      Alert.alert("Erro", data?.message || "Falha no login.");
    }
  }

  return (
    <AppGradient>
      <View style={styles.container}>
        <View style={styles.header}>
        <Image
          source={require("@/assets/images/csv-logo.jpg")}
          style={styles.logo}
          resizeMode="contain"
        />
          <Text style={styles.brand}>BEM VINDO AO CLUBE CSV</Text>
          <Text style={styles.title}>Entrar</Text>
          <Text style={styles.subtitle}>Entrar na tua conta</Text>
        </View>

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
            placeholder="Palavra-passe"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCorrect={false}
            style={styles.input}
          />

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "A entrar..." : "Entrar"}
            </Text>
          </Pressable>

          <Link href="/(auth)/register" style={styles.link}>
            Ainda não tens conta?{" "}
            <Text style={styles.linkStrong}>Criar conta</Text>
          </Link>
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
  header: {
    marginBottom: 36,
  },
  brand: {
    color: colors.yellow,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 10,
    alignSelf: "center",
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.white,
    marginBottom: 8,
    alignSelf: "center",
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
    alignSelf: "center",
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
  link: {
    textAlign: "center",
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 14,
  },
  linkStrong: {
    color: colors.yellow,
    fontWeight: "800",
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: "center",
    marginBottom: 20,
  },
});