import { api } from "@/src/api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
export async function register(name: string, email: string, password: string) {
  const { data } = await api.post("/register", {
    name,
    email,
    password,
    password_confirmation: password,
  });

  return data;
}

export async function login(email: string, password: string) {
  const { data } = await api.post("/login", {
    email,
    password,
  });

  const token = data.token;
  const user = data.user;

  await AsyncStorage.setItem("token", token);
  await AsyncStorage.setItem("user", JSON.stringify(user));

  api.defaults.headers.common.Authorization = `Bearer ${token}`;

  return data;
}

export async function logout() {
  await AsyncStorage.removeItem("token");
  await AsyncStorage.removeItem("user");
  delete api.defaults.headers.common.Authorization;
}

export async function loadAuth() {
  const token = await AsyncStorage.getItem("token");
  const user = await AsyncStorage.getItem("user");

  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  return {
    token,
    user: user ? JSON.parse(user) : null,
  };
}