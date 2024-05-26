import axios from 'axios';

const api = axios.create({
  baseURL: '/',
  timeout: 120 * 1000,
});

export default api;
