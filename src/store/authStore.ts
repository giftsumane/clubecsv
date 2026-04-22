import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { api } from '../api/client';
import type { User } from '../types';

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (name: string, email: string, password: string) => Promise<any>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  resendVerificationCode: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,

      login: async (email, password) => {
        set({ loading: true });

        try {
          const { data } = await api.post('/login', { email, password });

          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            loading: false,
          });

          return data;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      register: async (name, email, password) => {
        set({ loading: true });

        try {
          const { data } = await api.post('/register', {
            name,
            email,
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
          const { data } = await api.post('/verify-email-code', { email, code });

          set({
            user: data.user,
            token: data.token,
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
          await api.post('/resend-verification-code', { email });
          set({ loading: false });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.post('/logout');
        } catch (error) {
          console.log('Erro no logout remoto:', error);
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false,
          });

          await AsyncStorage.removeItem('clubcsv-auth');
        }
      },
    }),
    {
      name: 'clubcsv-auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);