import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5001/api",
  headers: { "Content-Type": "application/json" }
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("laundtime_partner_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || "Something went wrong. Please try again.";

export default API;
