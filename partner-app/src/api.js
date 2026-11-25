import axios from "axios";

export const getPartnerBaseURL = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL.replace(/\/+$/, '');
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:5001/api";
    }
    if (host.includes("onrender.com")) {
      return "https://laundtime-backend.onrender.com/api";
    }
    return `${window.location.protocol}//${host}/api`;
  }
  return "http://localhost:5001/api";
};

const API = axios.create({
  baseURL: getPartnerBaseURL(),
  headers: { "Content-Type": "application/json" },
  timeout: 15000
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("laundtime_partner_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || "Something went wrong. Please try again.";

export default API;
