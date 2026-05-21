import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export const api = axios.create({
  baseURL: "https://bilhetes.csveventos.co.mz/api",
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