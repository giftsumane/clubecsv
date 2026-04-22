import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
  //baseURL: 'http://192.168.100.168:8000/api',// base internet casa
  //baseURL: 'http://192.168.18.140:8000/api',// base internet office
  baseURL: 'https://bilhetes.csveventos.co.mz/api', //base de dados online
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  console.log('API REQUEST:', config.method?.toUpperCase(), `${config.baseURL}${config.url}`);

  return config;
});

