// services/axios.ts

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";

// ============ CONFIGURAÇÃO BASE ============

const getBaseURL = (): string => {
    if (typeof window === "undefined") return "https://192.168.1.192:8000";
    return `${window.location.protocol}//${window.location.hostname}:8000`;
};

const baseConfig = {
    withCredentials: true, // ESSENCIAL para cookies de sessão
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
    },
    timeout: 890000, // 30 segundos
};

// ============ TENANT HELPERS ============

interface EmpresaData {
    id: string;
    subdomain?: string;
}

/**
 * Limpa os dados do tenant do localStorage
 */
export const clearTenant = (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("tenant_id");
    localStorage.removeItem("tenant_subdomain");
    console.log("[TENANT] Limpo");
};

/**
 * Salva os dados do tenant no localStorage
 */
export const setTenant = (empresa: EmpresaData): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem("tenant_id", empresa.id);
    if (empresa.subdomain) {
        localStorage.setItem("tenant_subdomain", empresa.subdomain);
    }
    console.log("[TENANT] Definido:", empresa.id, empresa.subdomain);
};

/**
 * Descobre o tenant automaticamente
 * Prioridade: localStorage > subdomain > query param
 */
export const getTenant = (): string | null => {
    if (typeof window === "undefined") return null;

    // 1. UUID da empresa (prioritário)
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

// ============ FUNÇÕES AUXILIARES ============

const forceLandlordLogout = (): void => {
    if (typeof window === "undefined") return;
    console.log("[LANDLORD] Forçando logout...");
    localStorage.removeItem("landlord_user");
    clearTenant();
    
    if (!window.location.pathname.includes("/landlord/login")) {
        window.location.href = "/landlord/login";
    }
};

// ============ INSTÂNCIA DO LANDLORD (NUNCA ENVIA TENANT) ============

export const landlordApi = axios.create({
    baseURL: getBaseURL(),
    ...baseConfig,
});

landlordApi.defaults.xsrfCookieName = "XSRF-TOKEN";
landlordApi.defaults.xsrfHeaderName = "X-XSRF-TOKEN";

// Interceptor de REQUEST do Landlord
landlordApi.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
        // Adiciona CSRF token
        const xsrfToken = Cookies.get("XSRF-TOKEN");
        if (xsrfToken) {
            config.headers["X-XSRF-TOKEN"] = xsrfToken;
        }

        // Identifica como requisição do landlord
        config.headers["X-Landlord-Request"] = "true";
        
        // GARANTE que headers de tenant NÃO existem
        delete config.headers["X-Empresa-ID"];
        delete config.headers["X-Tenant-ID"];

        // Log em desenvolvimento
        if (process.env.NODE_ENV === "development") {
            console.log(`🏠 [LANDLORD] ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

// Interceptor de RESPONSE do Landlord
landlordApi.interceptors.response.use(
    (response) => {
        if (process.env.NODE_ENV === "development") {
            console.log(`✅ [LANDLORD] ${response.status} ${response.config.url}`);
        }
        return response;
    },
    async (error: AxiosError): Promise<any> => {
        const status = error.response?.status;
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        
        // CSRF expirado (419) - renova e tenta novamente
        if (status === 419 && !originalRequest._retry) {
            console.log("[LANDLORD] CSRF expirado, renovando...");
            originalRequest._retry = true;
            
            try {
                await landlordApi.get("/sanctum/csrf-cookie");
                return landlordApi(originalRequest);
            } catch {
                forceLandlordLogout();
            }
        }
        
        // Não autorizado (401)
        if (status === 401 && !originalRequest.url?.includes("/login")) {
            forceLandlordLogout();
        }
        
        // Erro 403 - Sem permissão
        if (status === 403) {
            console.error("[LANDLORD] Acesso negado:", originalRequest.url);
        }
        
        // Erro 500 - Servidor
        if (status === 500) {
            console.error("[LANDLORD] Erro interno do servidor:", originalRequest.url);
        }
        
        return Promise.reject(error);
    }
);

// ============ INSTÂNCIA DO TENANT (SEMPRE ENVIA TENANT) ============

export const tenantApi = axios.create({
    baseURL: getBaseURL(),
    ...baseConfig,
});

tenantApi.defaults.xsrfCookieName = "XSRF-TOKEN";
tenantApi.defaults.xsrfHeaderName = "X-XSRF-TOKEN";

// Interceptor de REQUEST do Tenant
tenantApi.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
        // Adiciona CSRF token
        const xsrfToken = Cookies.get("XSRF-TOKEN");
        if (xsrfToken) {
            config.headers["X-XSRF-TOKEN"] = xsrfToken;
        }

        // Adiciona headers de tenant
        const tenant = getTenant();
        if (tenant) {
            config.headers["X-Empresa-ID"] = tenant;
            config.headers["X-Tenant-ID"] = tenant;
        } else {
            // Log apenas em desenvolvimento e para rotas não públicas
            const publicPaths = ["/sanctum/csrf-cookie", "/login", "/register"];
            if (!publicPaths.some(p => config.url?.includes(p))) {
                console.warn("[TENANT] Nenhum tenant encontrado para:", config.url);
            }
        }

        // Log em desenvolvimento
        if (process.env.NODE_ENV === "development") {
            console.log(`🏢 [TENANT] ${config.method?.toUpperCase()} ${config.url}`, {
                tenant: getTenant()
            });
        }

        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

// Interceptor de RESPONSE do Tenant
tenantApi.interceptors.response.use(
    (response) => {
        // Salva tenant após login bem-sucedido do tenant
        const isTenantLogin = response.config.url?.includes("/login") && 
                              !response.config.url?.includes("/api/landlord/");
        if (isTenantLogin && response.data?.empresa) {
            setTenant(response.data.empresa);
        }
        
        if (process.env.NODE_ENV === "development") {
            console.log(`✅ [TENANT] ${response.status} ${response.config.url}`);
        }
        
        return response;
    },
    async (error: AxiosError): Promise<any> => {
        const status = error.response?.status;
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        
        // CSRF expirado (419) - renova e tenta novamente
        if (status === 419 && !originalRequest._retry) {
            console.log("[TENANT] CSRF expirado, renovando...");
            originalRequest._retry = true;
            
            try {
                await tenantApi.get("/sanctum/csrf-cookie");
                return tenantApi(originalRequest);
            } catch {
                // Se falhar, limpa tenant
                clearTenant();
            }
        }
        
        return Promise.reject(error);
    }
);

// ============ API SERVICES ============

/**
 * API para o LANDLORD (Super Admin)
 * - NUNCA envia headers de tenant
 * - Usa rotas com prefixo /api/landlord
 */
export const landAuthApi = {
    api: landlordApi,
    
    getCsrf: () => landlordApi.get("/sanctum/csrf-cookie"),
    
    login: (email: string, password: string) =>
        landlordApi.post("/api/landlord/login", { email, password }),
    
    logout: () => landlordApi.post("/api/landlord/logout"),
    
    me: () => landlordApi.get("/api/landlord/landlordme"),
    
    empresas: {
        list: () => landlordApi.get("/api/landlord/empresas"),
        create: (data: any) => landlordApi.post("/api/landlord/empresas", data),
        show: (id: string) => landlordApi.get(`/api/landlord/empresas/${id}`),
        update: (id: string, data: any) => landlordApi.put(`/api/landlord/empresas/${id}`, data),
        toggleStatus: (id: string) => landlordApi.patch(`/api/landlord/empresas/${id}/toggle-status`),
    },
};

/**
 * API para o TENANT (Empresas)
 * - SEMPRE envia headers de tenant (X-Empresa-ID)
 * - Usa rotas com prefixo /api (sem /landlord)
 * 
 * EXEMPLOS DE ROTAS:
 * - POST   /api/login
 * - GET    /api/me
 * - GET    /api/empresa
 * - GET    /api/produtos
 * - POST   /api/vendas
 * - GET    /api/documentos-fiscais
 */
export const authApi = {
    api: tenantApi,
    
    getCsrf: () => tenantApi.get("/sanctum/csrf-cookie"),
    
    // Rotas de autenticação do tenant
    login: (email: string, password: string) =>
        tenantApi.post("/login", { email, password }),
    
    logout: () => tenantApi.post("/logout"),
    
    me: () => tenantApi.get("/me"),
    
    // Rotas de empresa (tenant)
    empresa: {
        get: () => tenantApi.get("/api/empresa"),
        update: (data: any) => tenantApi.put("/api/empresa", data),
        uploadLogo: (formData: FormData) => tenantApi.post("/api/empresa/logo", formData, {
            headers: { "Content-Type": "multipart/form-data" }
        }),
    },
    
    // Rotas de negócio do tenant
    produtos: {
        list: () => tenantApi.get("/api/produtos"),
        create: (data: any) => tenantApi.post("/api/produtos", data),
        update: (id: string, data: any) => tenantApi.put(`/api/produtos/${id}`, data),
        delete: (id: string) => tenantApi.delete(`/api/produtos/${id}`),
    },
    
    vendas: {
        list: () => tenantApi.get("/api/vendas"),
        create: (data: any) => tenantApi.post("/api/vendas", data),
        show: (id: string) => tenantApi.get(`/api/vendas/${id}`),
    },
    
    // Rotas genéricas - para qualquer endpoint do tenant
    get: (url: string) => tenantApi.get(`/api/${url}`),
    post: (url: string, data: any) => tenantApi.post(`/api/${url}`, data),
    put: (url: string, data: any) => tenantApi.put(`/api/${url}`, data),
    delete: (url: string) => tenantApi.delete(`/api/${url}`),
};

/**
 * Instância padrão (para compatibilidade com código existente)
 * Recomendado usar landAuthApi ou authApi explicitamente
 */
export const api = tenantApi;

export default api;