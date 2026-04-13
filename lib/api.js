import axios from 'axios';

const api = axios.create({
  baseURL: typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  withCredentials: true,
});

export default api;
