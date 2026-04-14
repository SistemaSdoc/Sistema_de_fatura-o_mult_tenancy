import axios, { AxiosError } from "axios";
import Cookies from "js-cookie";

export interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
  status?: number;
}

// BaseURL dinâmica (melhor que está)
const getBaseURL = (): string => {
  if (typeof window === "undefined") return "http://localhost:8000";
  return `${window.location.protocol}//${window.location.hostname}:8000`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,           // Essencial para cookies
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",   // ← Adicionado
  },
});

// Configuração Sanctum
api.defaults.xsrfCookieName = "XSRF-TOKEN";
api.defaults.xsrfHeaderName = "X-XSRF-TOKEN";

// ==================== INTERCEPTOR REQUEST ====================
api.interceptors.request.use(
  async (config) => {
    const method = config.method?.toLowerCase();

    // Para requisições que modificam dados → garante CSRF
    if (["post", "put", "patch", "delete"].includes(method || "")) {
      // Se não tiver o token ainda, busca primeiro
      const xsrfToken = Cookies.get("XSRF-TOKEN");
      if (!xsrfToken) {
        try {
          await api.get("/sanctum/csrf-cookie", { 
            baseURL: getBaseURL() 
          });
        } catch (err) {
          console.error("Falha ao obter CSRF Cookie");
        }
      }

      const freshToken = Cookies.get("XSRF-TOKEN");
      if (freshToken) {
        config.headers["X-XSRF-TOKEN"] = freshToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ==================== INTERCEPTOR RESPONSE ====================
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status;
    const url = error.config?.url;

    if (status === 419) {
      console.error("[419] CSRF Token inválido ou expirado");
      // Tenta recuperar automaticamente
      Cookies.remove("XSRF-TOKEN");
    }

    if (status === 401 && !url?.includes("/login")) {
      console.warn("[401] Sessão expirada");
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;