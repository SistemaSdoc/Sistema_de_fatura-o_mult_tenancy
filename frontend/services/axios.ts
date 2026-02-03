import axios, { AxiosError } from "axios";
import Cookies from "js-cookie";

export interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
  status?: number;
}

const api = axios.create({
  baseURL: "http://192.168.5.184:8000", //backend Laravel
  withCredentials: true,            //envia cookies
  headers: {
    Accept: "application/json",
  },
});

// Configuração padrão de CSRF
api.defaults.xsrfCookieName = "XSRF-TOKEN";
api.defaults.xsrfHeaderName = "X-XSRF-TOKEN";

// Interceptor de requisição → injeta o token em todos os POST/PUT/DELETE
api.interceptors.request.use((config) => {
  const xsrfToken = Cookies.get("XSRF-TOKEN");
  if (xsrfToken && config.method && ["post", "put", "delete"].includes(config.method)) {
    config.headers["X-XSRF-TOKEN"] = xsrfToken;
  }
  return config;
});

// Interceptor de resposta → trata erros
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const msg = error.response?.data?.message || error.message;
    console.error("[AXIOS ERROR]", error.response?.status, msg);
    return Promise.reject(error);
  }
);

export default api;