import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
});

// Attach user_id to every request
api.interceptors.request.use((config) => {
  const user = auth.currentUser;
  if (user) {
    config.params = { ...config.params, user_id: user.uid };
  }
  return config;
});

export default api;
