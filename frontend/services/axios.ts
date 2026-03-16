import axios, { AxiosError } from "axios";
import Cookies from "js-cookie";

export interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
  status?: number;
}

// Detecta automaticamente o host do browser e usa a porta 8000 do Laravel.
// Funciona com qualquer IP — não precisa de alterar quando o IP muda.
const getBaseURL = (): string => {
  if (typeof window === "undefined") return "http://localhost:8000";
  return `${window.location.protocol}//${window.location.hostname}:8000`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Configuração CSRF Sanctum
api.defaults.xsrfCookieName = "XSRF-TOKEN";
api.defaults.xsrfHeaderName = "X-XSRF-TOKEN";

// Interceptor REQUEST
api.interceptors.request.use(
  (config) => {
    const xsrfToken = Cookies.get("XSRF-TOKEN");
    const method = config.method?.toLowerCase();

    if (xsrfToken && method && ["post", "put", "patch", "delete"].includes(method)) {
      config.headers["X-XSRF-TOKEN"] = xsrfToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor RESPONSE
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status;
    const url = error.config?.url;

    if (status === 401 && !url?.includes("/login")) {
      console.warn("[401] Sessão expirada ou inválida");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    if (status === 419) console.error("[419] CSRF inválido");
    if (status === 403) console.error(`[403] Acesso negado em ${url}`);

    return Promise.reject(error);
  }
);

export default api;