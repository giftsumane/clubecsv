import AppGradient from "@/src/components/AppGradient";
import { useAuthStore } from "@/src/store/authStore";
import { colors } from "@/src/theme/colors";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function RegisterScreen() {
  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.loading);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleRegister() {
    try {
      await register(name, email, password);

      router.push({
        pathname: "/(auth)/verify-email",
        params: { email: email.trim().toLowerCase() },
      });
      
    } catch (error: any) {
      console.log(error?.response?.data || error);
      Alert.alert("Erro", error?.response?.data?.message || "Falha no registo.");
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
          <Text style={styles.brand}>CLUBE CSV</Text>
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>
            Regista-te para comprar, ouvir e gerir os teus conteúdos.
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            placeholder="Nome"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <TextInput
            placeholder="Email"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <TextInput
            placeholder="Palavra-passe"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "A criar..." : "Criar conta"}
            </Text>
          </Pressable>

          <Link href="/(auth)/login" style={styles.link}>
            Já tens conta? <Text style={styles.linkStrong}>Entrar</Text>
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
    color: colors.orange,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
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
    backgroundColor: colors.orange,
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