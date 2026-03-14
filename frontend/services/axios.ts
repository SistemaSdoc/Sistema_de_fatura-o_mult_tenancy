import axios, { AxiosError } from "axios";
import Cookies from "js-cookie";

export interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
  status?: number;
}

const api = axios.create({
  baseURL: "http://192.168.0.170:8000",
  withCredentials: true, // ESSENCIAL para SPA Sanctum
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

    // REMOVIDO: Cache-Control / Pragma / Expires no GET /me
    // Esses headers eram bloqueados pelo CORS preflight (Access-Control-Allow-Headers)
    // O Sanctum não precisa deles — a sessão é gerida pelo cookie de sessão

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

    // Só redireciona se NÃO for login
    if (status === 401 && !url?.includes("/login")) {
      console.warn("[401] Sessão expirada ou inválida");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    if (status === 419) {
      console.error("[419] CSRF inválido");
    }

    if (status === 403) {
      console.error(`[403] Acesso negado em ${url}`);
    }

    return Promise.reject(error);
  }
);

export default api;