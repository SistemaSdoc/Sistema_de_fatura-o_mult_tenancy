import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";

const getBaseURL = (): string => {
    if (typeof window === "undefined") return "http://localhost:8000";
    return `${window.location.protocol}//${window.location.hostname}:8000`;
};

// ⭐ CONFIGURAÇÃO BASE — withCredentials: true é ESSENCIAL para cookies de sessão
export const api = axios.create({
    baseURL: getBaseURL(),
    withCredentials: true,  // ← Envia cookies (laravel_session, XSRF-TOKEN) em TODAS as requisições
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
    },
    timeout: 930000, // 30s é suficiente para a maioria das requisições
});

api.defaults.xsrfCookieName = "XSRF-TOKEN";
api.defaults.xsrfHeaderName = "X-XSRF-TOKEN";

// ============ TENANT ============

interface EmpresaData {
    id: string;
    subdomain?: string;
}

/**
 * Descobre tenant automaticamente
 * Prioridade: localStorage UUID > subdomain > query param
 */
const discoverTenant = (): string | null => {
    if (typeof window === "undefined") return null;

    // 1. UUID da empresa (sempre prioritário)
    const tenantId = localStorage.getItem("tenant_id");
    if (tenantId) return tenantId;

    // 2. Subdomínio
    const hostname = window.location.hostname;
    const subdomain = extractSubdomain(hostname);
    if (subdomain && !isReservedSubdomain(subdomain)) {
        return subdomain;
    }

    // 3. Query param
    const urlParams = new URLSearchParams(window.location.search);
    const queryTenant = urlParams.get("tenant") || urlParams.get("empresa");
    if (queryTenant) {
        localStorage.setItem("tenant_id", queryTenant);
        return queryTenant;
    }

    return null;
};

const extractSubdomain = (hostname: string): string | null => {
    const parts = hostname.split(".");
    if (parts[0] === "www") parts.shift();
    if (parts[0] === "localhost" || isIP(parts[0])) return null;
    if (parts.length > 2) return parts[0];
    return null;
};

const isReservedSubdomain = (subdomain: string): boolean => {
    const reserved = [
        "www", "api", "app", "admin", "login", "register",
        "logout", "auth", "static", "test", "dev", "staging",
    ];
    return reserved.includes(subdomain.toLowerCase());
};

const isIP = (value: string): boolean => {
    return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(value);
};

// ============ EXPORTS ============

export const getTenant = discoverTenant;

export const setTenant = (empresa: EmpresaData): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem("tenant_id", empresa.id);
    if (empresa.subdomain) {
        localStorage.setItem("tenant_subdomain", empresa.subdomain);
    }
    console.log("[TENANT] Definido:", empresa.id, empresa.subdomain);
};

export const clearTenant = (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("tenant_id");
    localStorage.removeItem("tenant_subdomain");
    console.log("[TENANT] Limpo");
};

// ============ INTERCEPTORS ============

// Request: injeta CSRF e Tenant
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const method = config.method?.toLowerCase();

        // ⭐ CSRF Token para TODAS as requisições (não só mutações)
        // Laravel Sanctum exige XSRF-TOKEN em todas as requisições autenticadas
        const xsrfToken = Cookies.get("XSRF-TOKEN");
        if (xsrfToken) {
            config.headers["X-XSRF-TOKEN"] = xsrfToken;
        } else {
            // Só loga warning se NÃO for rota pública de CSRF
            const csrfPaths = ["/sanctum/csrf-cookie"];
            if (!csrfPaths.some((p) => config.url?.includes(p))) {
                console.warn("[AXIOS] CSRF token não encontrado para", config.url);
            }
        }

        // ⭐ Injeta tenant se disponível (ESSENCIAL para o middleware ResolveTenant)
        const tenant = discoverTenant();
        if (tenant) {
            config.headers["X-Empresa-ID"] = tenant;
            config.headers["X-Tenant-ID"] = tenant;  // Header alternativo para compatibilidade
        } else {
            const publicPaths = ["/sanctum/csrf-cookie", "/login", "/register", "/forgot-password", "/logout"];
            if (!publicPaths.some((p) => config.url?.includes(p))) {
                console.warn("[AXIOS] Tenant não encontrado para", config.url);
            }
        }

        // ⭐ DEBUG: Loga config da requisição para rotas API (ajudar a diagnosticar)
        if (config.url?.startsWith("/api/")) {
            console.log("[AXIOS][API] Requisição:", {
                url: config.url,
                method: config.method,
                withCredentials: config.withCredentials,
                hasXsrf: !!xsrfToken,
                hasTenant: !!tenant,
                tenant: tenant,
                headers: {
                    "X-Empresa-ID": config.headers["X-Empresa-ID"],
                    "X-XSRF-TOKEN": config.headers["X-XSRF-TOKEN"] ? "presente" : "ausente",
                },
            });
        }

        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

// Response: trata erros comuns SEM destruir estado global
let isRefreshingCsrf = false;
let csrfRefreshPromise: Promise<void> | null = null;

api.interceptors.response.use(
    (response) => {
        // Salva tenant após login bem-sucedido
        const isLogin = response.config.url?.includes("/login");
        if (isLogin && response.data?.success && response.data.empresa) {
            setTenant(response.data.empresa);
        }
        return response;
    },
    async (error: AxiosError<{ message?: string }>) => {
        const status = error.response?.status;
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // 419: CSRF token expirado — tenta refresh UMA vez
        if (status === 419 && !originalRequest._retry) {
            console.log("[AXIOS] CSRF expirado (419), tentando refresh...");
            originalRequest._retry = true;

            if (!isRefreshingCsrf) {
                isRefreshingCsrf = true;
                csrfRefreshPromise = authApi
                    .getCsrf()
                    .then(() => {
                        console.log("[AXIOS] CSRF refresh OK");
                    })
                    .catch(() => {
                        console.error("[AXIOS] CSRF refresh falhou");
                    })
                    .finally(() => {
                        isRefreshingCsrf = false;
                        csrfRefreshPromise = null;
                    });
            }

            await csrfRefreshPromise;
            return api(originalRequest);
        }

        // ⭐ 401: Sessão expirada ou não autenticado
        if (status === 401) {
            console.log("[AXIOS] 401 em", originalRequest?.url, "- delegando ao AuthProvider");

            // ⭐ NÃO faz redirect automático aqui — deixa o AuthProvider decidir
            // Isso evita loops de redirect quando /me ainda funciona
        }

        if (status === 500) {
            console.error("[AXIOS] 500 em", originalRequest?.url, error.response?.data);
        }

        return Promise.reject(error);
    }
);

// ============ API SERVICES ============

export const authApi = {
    api, // expõe instância para requisições genéricas
    getCsrf: () => api.get("/sanctum/csrf-cookie"),
    login: (email: string, password: string) =>
        api.post("/login", { email, password }),
    logout: () => api.post("/logout"),
    me: () => api.get("/me"),
};

// ⭐ INSTÂNCIA ESPECÍFICA PARA API — GARANTE withCredentials
export const apiService = axios.create({
    baseURL: getBaseURL(),
    withCredentials: true,  // ← ESSENCIAL!
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
    },
    timeout: 930000,
});

// Copia os mesmos interceptores da instância principal
apiService.defaults.xsrfCookieName = "XSRF-TOKEN";
apiService.defaults.xsrfHeaderName = "X-XSRF-TOKEN";

// Aplica os mesmos interceptores
apiService.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const xsrfToken = Cookies.get("XSRF-TOKEN");
        if (xsrfToken) {
            config.headers["X-XSRF-TOKEN"] = xsrfToken;
        }

        const tenant = discoverTenant();
        if (tenant) {
            config.headers["X-Empresa-ID"] = tenant;
            config.headers["X-Tenant-ID"] = tenant;
        }

        if (config.url?.startsWith("/api/")) {
            console.log("[AXIOS][apiService] Requisição:", {
                url: config.url,
                method: config.method,
                withCredentials: config.withCredentials,
                hasXsrf: !!xsrfToken,
                hasTenant: !!tenant,
            });
        }

        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

apiService.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<{ message?: string }>) => {
        const status = error.response?.status;
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (status === 419 && !originalRequest._retry) {
            originalRequest._retry = true;
            await authApi.getCsrf();
            return apiService(originalRequest);
        }

        if (status === 401) {
            console.log("[AXIOS][apiService] 401 em", originalRequest?.url);
        }

        return Promise.reject(error);
    }
);

export default api;