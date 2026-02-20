// src/services/axios.ts (CORRIGIDO PARA SANCTUM SPA)
import axios, { AxiosError } from "axios";
import Cookies from "js-cookie";

export interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
  status?: number;
}

const api = axios.create({
  baseURL: "http://192.168.1.199:8000", // URL do backend Laravel
  withCredentials: true, // ESSENCIAL: envia cookies de sessão do Sanctum
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Configuração de CSRF para Sanctum
api.defaults.xsrfCookieName = "XSRF-TOKEN";
api.defaults.xsrfHeaderName = "X-XSRF-TOKEN";

// Interceptor de REQUEST - Apenas CSRF, sem Authorization Bearer
api.interceptors.request.use(
  (config) => {
    const xsrfToken = Cookies.get("XSRF-TOKEN");
    const method = config.method?.toLowerCase();

    // Sanctum SPA: CSRF token apenas para métodos que modificam estado
    if (xsrfToken && ["post", "put", "patch", "delete"].includes(method)) {
      config.headers["X-XSRF-TOKEN"] = xsrfToken;
    }

    // NÃO adicionar Authorization: Bearer!
    // Sanctum SPA usa cookie de sessão HTTP-only automaticamente via withCredentials

    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de RESPONSE - Debug detalhado
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();

    if (status === 403) {
      console.error(`[ERRO 403] Acesso negado em ${method} ${url}`, {
        csrfToken: Cookies.get("XSRF-TOKEN") ? "Presente" : "Ausente",
        cookiesHabilitados: navigator.cookieEnabled,
        withCredentials: error.config?.withCredentials,
        mensagem: error.response?.data?.message || "This action is unauthorized.",
      });

      // Verificação adicional: talvez seja problema de CORS ou sessão
      console.warn("Verifique no Laravel: 1) Permissões do usuário, 2) SESSION_DOMAIN, 3) CORS supports_credentials");
    }

    if (status === 419) {
      console.error("[ERRO 419] CSRF Token expirado ou inválido! Recarregue a página.");
    }

    if (status === 401) {
      console.error("[ERRO 401] Sessão expirada ou usuário não autenticado.");
      // Opcional: redirecionar para login
      // window.location.href = '/login';
    }

    const msg = error.response?.data?.message || error.message;
    console.error(`[AXIOS ERROR ${status}]`, msg);
    return Promise.reject(error);
  }
);

export default api;