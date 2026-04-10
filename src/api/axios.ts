import axios from 'axios';

// Read base URL from .env file
// If this logs "undefined", your .env file is missing or Vite wasn't restarted
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// console.log('[API] Base URL:', BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the server returns 401, clear session and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const is401 = err.response?.status === 401;
    const isAuthRoute =
      window.location.pathname === '/login' ||
      window.location.pathname === '/signup';
 
    if (is401 && !isAuthRoute) {
      // Session expired on a protected page — clear and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
 
    // For all other cases (including wrong password on /login),
    // just reject the promise so the catch block in the page handles it
    return Promise.reject(err);
  }
);
 
export default api;
