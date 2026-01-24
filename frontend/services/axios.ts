import axios, { AxiosError } from "axios";

export interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
  status?: number;
}

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

api.defaults.xsrfCookieName = "XSRF-TOKEN";
api.defaults.xsrfHeaderName = "X-XSRF-TOKEN";

// 🔹 Interceptor de erros
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const msg = error.response?.data?.message || error.message;
    console.error("[AXIOS ERROR]", error.response?.status, msg);
    return Promise.reject(error);
  }
);

await fetch("http://127.0.0.1:8000/api/test", {
  method: "POST",
  credentials: "include",
});


export default api;
