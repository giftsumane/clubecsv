import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { api } from "../api/client";
import type { User } from "../types";

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  hasHydrated: boolean;

  login: (email: string, password: string) => Promise<any>;
  register: (
    name: string,
    email: string,
    phone: string,
    password: string
  ) => Promise<any>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  resendVerificationCode: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  setHasHydrated: (value: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      login: async (email, password) => {
        set({ loading: true });

        try {
          const { data } = await api.post("/login", { email, password });

          const token = data?.token;
          const user = data?.user;

          if (!token || !user) {
            throw new Error("Resposta inválida do servidor.");
          }

          set({
            user,
            token,
            isAuthenticated: true,
            loading: false,
          });

          return data;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      register: async (name, email, phone, password) => {
        set({ loading: true });

        try {
          const { data } = await api.post("/register", {
            name,
            email,
            phone,
            password,
            password_confirmation: password,
          });

          set({ loading: false });
          return data;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      verifyEmailCode: async (email, code) => {
        set({ loading: true });

        try {
          const { data } = await api.post("/verify-email-code", {
            email,
            code,
          });

          const token = data?.token;
          const user = data?.user;

          if (!token || !user) {
            throw new Error("Resposta inválida do servidor.");
          }

          set({
            user,
            token,
            isAuthenticated: true,
            loading: false,
          });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      resendVerificationCode: async (email) => {
        set({ loading: true });

        try {
          await api.post("/resend-verification-code", { email });
          set({ loading: false });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.post("/logout");
        } catch (error) {
          console.log("Erro no logout remoto:", error);
        } finally {
          await AsyncStorage.removeItem("clubcsv-auth");

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false,
            hasHydrated: true,
          });
        }
      },
    }),
    {
      name: "clubcsv-auth",
      storage: createJSONStorage(() => AsyncStorage),

      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),

      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.log("Erro ao rehidratar authStore:", error);

            useAuthStore.setState({
              user: null,
              token: null,
              isAuthenticated: false,
              hasHydrated: true,
              loading: false,
            });

            return;
          }

          const token = state?.token ?? null;
          const user = state?.user ?? null;

          useAuthStore.setState({
            user,
            token,
            isAuthenticated: !!token,
            hasHydrated: true,
            loading: false,
          });
        };
      },
    }
  )
);