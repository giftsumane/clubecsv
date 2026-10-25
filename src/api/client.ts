import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://bilhetes.csveventos.co.mz/api";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const rawAuth = await AsyncStorage.getItem("clubcsv-auth");

      if (rawAuth) {
        const parsed = JSON.parse(rawAuth);
        const token = parsed?.state?.token;

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.log("Erro ao ler token do AsyncStorage:", error);
    }

    return config;
  },
  (error) => Promise.reject(error)
);
