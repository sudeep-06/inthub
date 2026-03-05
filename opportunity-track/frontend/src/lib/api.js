import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL,
  timeout: 10000,
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("opportuneai_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default API;
