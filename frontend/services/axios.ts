import axios, { AxiosError } from "axios";
import Cookies from "js-cookie";

const getBaseURL = (): string => {
  if (typeof window === "undefined") return "http://localhost:8000";
  return `${window.location.protocol}//${window.location.hostname}:8000`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    const method = config.method?.toLowerCase();
    if (["post", "put", "patch", "delete"].includes(method || "")) {
      const xsrfToken = Cookies.get("XSRF-TOKEN");
      if (!xsrfToken) {
        try {
          await api.get("/sanctum/csrf-cookie", { withCredentials: true });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {
          console.warn("Não foi possível obter CSRF cookie");
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - evita loop infinito
let isRefreshing = false;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (status === 419 && !isRefreshing && !originalRequest?._retry) {
      isRefreshing = true;
      if (originalRequest) originalRequest._retry = true;
      console.warn("[419] CSRF inválido - tentando recuperar...");

      Cookies.remove("XSRF-TOKEN");

      try {
        await api.get("/sanctum/csrf-cookie");
        isRefreshing = false;
        return api(originalRequest!);
      } catch (refreshError) {
        isRefreshing = false;
        console.error("Falha ao recuperar CSRF", refreshError);
      }
    }

    if (status === 401) {
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;