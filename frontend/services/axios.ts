// services/axios.ts

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";

// ============ CONFIGURAÇÃO BASE ============
//
// .env.local:
//   NEXT_PUBLIC_APP_DOMAIN=app.factura-ja.localhost   (domínio base; em produção app.factura-ja.ao)
//   NEXT_PUBLIC_API_PORT=                             (vazio quando o nginx serve tudo na 80/443; 8000 no setup antigo)

const APP_DOMAIN = (process.env.NEXT_PUBLIC_APP_DOMAIN || "").trim().replace(/^\.+|\.+$/g, "").toLowerCase();
const API_PORT = (process.env.NEXT_PUBLIC_API_PORT || "").trim();

const portSuffix = (): string => (API_PORT ? `:${API_PORT}` : "");

/** API do TENANT: mesmo host da página (subdomínio do tenant). */
const getBaseURL = (): string => {
  if (typeof window === "undefined") return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  return `${window.location.protocol}//${window.location.hostname}${portSuffix()}`;
};

/**
 * API do LANDLORD: SEMPRE o domínio base.
 * As rotas do landlord só existem em app.factura-ja.*, por isso uma página de
 * tenant (acme.app...) que chame o landlord tem de ir ao domínio base (CORS + cookies partilhados).
 */
const getLandlordBaseURL = (): string => {
  if (typeof window === "undefined" || !APP_DOMAIN) return getBaseURL();
  return `${window.location.protocol}//${APP_DOMAIN}${portSuffix()}`;
};

const baseConfig = {
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  timeout: 1890000, // 31 min — mantido do original (relatórios/SAF-T longos)
};

const debugApi = process.env.NEXT_PUBLIC_DEBUG_API === "true";

// ============ TENANT HELPERS ============

interface EmpresaData {
  id: string;
  subdomain?: string;
}

export const clearTenant = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("tenant_id");
  localStorage.removeItem("tenant_subdomain");
  console.log("[TENANT] Limpo");
};

export const setTenant = (empresa: EmpresaData): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem("tenant_id", empresa.id);
  if (empresa.subdomain) {
    localStorage.setItem("tenant_subdomain", empresa.subdomain);
  }
  console.log("[TENANT] Definido:", empresa.id, empresa.subdomain);
};

/** O host é a fonte de verdade; localStorage e query só valem fora de um subdomínio de tenant. */
export const getTenant = (): string | null => {
  if (typeof window === "undefined") return null;

  const subdomain = extractSubdomain(window.location.hostname);
  if (subdomain && !isReservedSubdomain(subdomain)) {
    return subdomain;
  }

  const tenantId = localStorage.getItem("tenant_id");
  if (tenantId) return tenantId;

  const urlParams = new URLSearchParams(window.location.search);
  const queryTenant = urlParams.get("tenant") || urlParams.get("empresa");
  if (queryTenant) {
    localStorage.setItem("tenant_id", queryTenant);
    return queryTenant;
  }

  return null;
};

/** Igual ao ResolveTenant::extrairSubdomain (compara com o domínio base). */
const extractSubdomain = (hostname: string): string | null => {
  const host = hostname.toLowerCase();
  if (isIP(host)) return null;

  if (APP_DOMAIN) {
    if (host === APP_DOMAIN || host === `www.${APP_DOMAIN}`) return null;

    const suffix = `.${APP_DOMAIN}`;
    if (host.endsWith(suffix)) {
      const sub = host.slice(0, -suffix.length);
      if (!sub || sub === "www" || sub.includes(".")) return null;
      return sub;
    }
    return null;
  }

  // Fallback legado (NEXT_PUBLIC_APP_DOMAIN não definido)
  const parts = host.split(".");
  if (parts[0] === "www") parts.shift();
  if (parts[0] === "localhost") return null;
  if (parts.length > 2) return parts[0];
  return null;
};

const isReservedSubdomain = (subdomain: string): boolean => {
  const reserved = ["www", "api", "app", "admin", "login", "register", "logout", "auth", "static", "test", "dev", "staging"];
  return reserved.includes(subdomain.toLowerCase());
};

const isIP = (value: string): boolean => {
  return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(value);
};

const LANDLORD_PUBLIC_PATHS = ["/landlord/login", "/landlord/register"];

/**
 * Só expulsa para o login do landlord quando o utilizador está DENTRO do painel
 * (e não nas páginas públicas). Utilizadores de onboarding/Google e de tenants
 * também usam landlordApi e não podem ser atirados para o painel.
 */
const forceLandlordLogout = (): void => {
  if (typeof window === "undefined") return;

  const path = window.location.pathname;
  if (!path.startsWith("/landlord") || LANDLORD_PUBLIC_PATHS.includes(path)) return;

  console.log("[LANDLORD] Forçando logout...");
  localStorage.removeItem("landlord_user");
  clearTenant();
  window.location.href = "/landlord/login";
};

// ============ INSTÂNCIA DO LANDLORD ============

export const landlordApi = axios.create({
  baseURL: getLandlordBaseURL(),
  ...baseConfig,
});

landlordApi.defaults.xsrfCookieName = "XSRF-TOKEN";
landlordApi.defaults.xsrfHeaderName = "X-XSRF-TOKEN";

landlordApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const xsrfToken = Cookies.get("XSRF-TOKEN");
    if (xsrfToken) {
      config.headers["X-XSRF-TOKEN"] = xsrfToken;
    }
    config.headers["X-Landlord-Request"] = "true";
    delete config.headers["X-Empresa-ID"];
    delete config.headers["X-Tenant-ID"];

    if (debugApi) {
      console.log(`🏠 [LANDLORD] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

landlordApi.interceptors.response.use(
  (response) => {
    if (debugApi) {
      console.log(`✅ [LANDLORD] ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error: AxiosError): Promise<any> => {
    const status = error.response?.status;
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

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

    if (status === 401 && !originalRequest.url?.includes("/login")) {
      forceLandlordLogout();
    }

    if (status === 403) {
      console.error("[LANDLORD] Acesso negado:", originalRequest.url);
    }
    if (status === 500) {
      console.error("[LANDLORD] Erro interno do servidor:", originalRequest.url);
    }

    return Promise.reject(error);
  }
);

// ============ INSTÂNCIA DO TENANT ============

export const tenantApi = axios.create({
  baseURL: getBaseURL(),
  ...baseConfig,
});

tenantApi.defaults.xsrfCookieName = "XSRF-TOKEN";
tenantApi.defaults.xsrfHeaderName = "X-XSRF-TOKEN";

tenantApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const xsrfToken = Cookies.get("XSRF-TOKEN");
    if (xsrfToken) {
      config.headers["X-XSRF-TOKEN"] = xsrfToken;
    }

    // Num subdomínio de tenant o HOST identifica a empresa — não se envia header.
    // (Evita que um tenant antigo do localStorage contradiga o host.)
    // Fora de subdomínio (domínio base) usa-se o tenant guardado, se existir.
    let hostIsTenant = false;
    if (typeof window !== "undefined") {
      const sub = extractSubdomain(window.location.hostname);
      hostIsTenant = !!sub && !isReservedSubdomain(sub);
    }

    if (!hostIsTenant) {
      const tenant = getTenant();
      if (tenant) {
        config.headers["X-Empresa-ID"] = tenant;
        config.headers["X-Tenant-ID"] = tenant;
      } else {
        const publicPaths = ["/sanctum/csrf-cookie", "/login", "/register"];
        if (!publicPaths.some((p) => config.url?.includes(p))) {
          console.warn("[TENANT] Nenhum tenant encontrado para:", config.url);
        }
      }
    }

    if (debugApi) {
      console.log(`🏢 [TENANT] ${config.method?.toUpperCase()} ${config.url}`, {
        hostIsTenant,
      });
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Interceptor de resposta do TENANT: silencia 400 e 401.
// O tenant NÃO é guardado aqui — fá-lo o AuthProvider (login e /me).
tenantApi.interceptors.response.use(
  (response) => {
    if (debugApi) {
      console.log(`✅ [TENANT] ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error: AxiosError): Promise<any> => {
    const status = error.response?.status;
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 400/401: sinaliza com _silenced mantendo o AxiosError (protótipo, response, isAxiosError)
    if (status === 400 || status === 401) {
      console.warn(`[TENANT] Requisição falhou (${status}): ${originalRequest.url}`);
      return Promise.reject(Object.assign(error, { _silenced: true }));
    }

    // CSRF expirado (419) - renova e tenta novamente
    if (status === 419 && !originalRequest._retry) {
      console.log("[TENANT] CSRF expirado, renovando...");
      originalRequest._retry = true;
      try {
        await tenantApi.get("/sanctum/csrf-cookie");
        return tenantApi(originalRequest);
      } catch {
        clearTenant();
      }
    }

    // Outros erros (500, etc.) são rejeitados normalmente
    return Promise.reject(error);
  }
);

// ============ API SERVICES ============
export const landlordUsersApi = {
  listar: (params?: { role?: string; ativo?: boolean; per_page?: number }) => landlordApi.get("/api/landlord/usuarios", { params }),
  criar: (data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: string;
    empresa_id?: string | null;
    ativo?: boolean;
  }) => landlordApi.post("/api/landlord/usuarios", data),
  atualizar: (id: string, data: { name?: string; email?: string; role?: string; ativo?: boolean }) =>
    landlordApi.put(`/api/landlord/usuarios/${id}`, data),
  remover: (id: string) => landlordApi.delete(`/api/landlord/usuarios/${id}`),
  toggleStatus: (id: string) => landlordApi.patch(`/api/landlord/usuarios/${id}/toggle-status`),
  resetPassword: (id: string, data: { password: string; password_confirmation: string }) =>
    landlordApi.post(`/api/landlord/usuarios/${id}/reset-password`, data),
  vincularEmpresa: (id: string, empresa_id: string) => landlordApi.post(`/api/landlord/usuarios/${id}/vincular-empresa`, { empresa_id }),
  desvincularEmpresa: (id: string) => landlordApi.delete(`/api/landlord/usuarios/${id}/desvincular-empresa`),
};

export const featuresApi = {
  listar: () => landlordApi.get("/api/landlord/features"),
  criar: (data: { nome: string; descricao?: string; icone?: string; ativo?: boolean }) => landlordApi.post("/api/landlord/features", data),
  atualizar: (id: string, data: any) => landlordApi.put(`/api/landlord/features/${id}`, data),
  remover: (id: string) => landlordApi.delete(`/api/landlord/features/${id}`),
};

export const planosCrudApi = {
  listar: () => landlordApi.get("/api/landlord/planos"),
  criar: (data: any) => landlordApi.post("/api/landlord/planos", data),
  atualizar: (id: string, data: any) => landlordApi.put(`/api/landlord/planos/${id}`, data),
  remover: (id: string) => landlordApi.delete(`/api/landlord/planos/${id}`),
  attachFeature: (planoId: string, data: { feature_id: string; quantidade: number; unidade?: string }) =>
    landlordApi.post(`/api/landlord/planos/${planoId}/features`, data),
  detachFeature: (planoId: string, featureId: string) => landlordApi.delete(`/api/landlord/planos/${planoId}/features/${featureId}`),
};

export const perfilApi = {
  atualizar: (data: { name: string }) => landlordApi.put("/api/landlord/perfil", data),
  alterarSenha: (data: { senha_atual: string; nova_senha: string; nova_senha_confirmation: string }) =>
    landlordApi.put("/api/landlord/perfil/senha", data),
};

export const analyticsApi = {
  resumo: () => landlordApi.get("/api/landlord/analytics/resumo"),
};

export const subscricaoApi = {
  criar: (data: { plano_id: string; forma_pagamento?: string; renovacao_automatica?: boolean }) => tenantApi.post("/api/subscricoes", data),
  minhaAssinatura: () => tenantApi.get("/api/subscricoes/me"),
  cancelar: (id: string) => tenantApi.patch(`/api/subscricoes/${id}/cancel`),
  renovar: (id: string) => tenantApi.post(`/api/subscricoes/${id}/renovar`),
};

export const planosApi = {
  listarAtivos: () => landlordApi.get("/api/planos-ativos"),
  buscar: (id: string) => landlordApi.get(`/api/planos/${id}`),
};

export const landAuthApi = {
  api: landlordApi,
  getCsrf: () => landlordApi.get("/sanctum/csrf-cookie"),
  login: (email: string, password: string) => landlordApi.post("/api/landlord/login", { email, password }),
  logout: () => landlordApi.post("/api/landlord/logout"),
  me: () => landlordApi.get("/api/landlord/landlordme"),
  perfil: {
    atualizar: (data: { name: string }) => landlordApi.put("/api/landlord/perfil", data),
    alterarSenha: (data: { senha_atual: string; nova_senha: string; nova_senha_confirmation: string }) =>
      landlordApi.put("/api/landlord/perfil/senha", data),
  },

  criarEmpresaFreelancer: (data: { nome: string; subdomain: string; modo?: "colectivo" | "singular" }) =>
    landlordApi.post("/api/landlord/freelancer/empresa", data),
  atualizarEmpresaFreelancer: (data: FormData) =>
    landlordApi.put("/api/landlord/freelancer/empresa", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  onboardingStatus: () => landlordApi.get("/api/landlord/freelancer/onboarding"),
  empresas: {
    list: () => landlordApi.get("/api/landlord/empresas"),
    create: (data: any) => landlordApi.post("/api/landlord/empresas", data),
    show: (id: string) => landlordApi.get(`/api/landlord/empresas/${id}`),
    mensagens: (id: string) => landlordApi.get(`/api/landlord/empresas/${id}/mensagens`),
    enviarMensagem: (id: string, data: { mensagem: string }) => landlordApi.post(`/api/landlord/empresas/${id}/mensagens`, data),
    update: (id: string, data: any) => landlordApi.put(`/api/landlord/empresas/${id}`, data),
    toggleStatus: (id: string) => landlordApi.patch(`/api/landlord/empresas/${id}/toggle-status`),
  },
};

export const authApi = {
  api: tenantApi,
  getCsrf: () => tenantApi.get("/sanctum/csrf-cookie"),
  login: (email: string, password: string) => tenantApi.post("/login", { email, password }),
  logout: () => tenantApi.post("/logout"),
  me: () => tenantApi.get("/api/me"),
  empresa: {
    get: () => tenantApi.get("/api/empresa"),
    update: (data: any) => tenantApi.put("/api/empresa", data),
    uploadLogo: (formData: FormData) =>
      tenantApi.post("/api/empresa/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
  },
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
  get: (url: string) => tenantApi.get(`/api/${url}`),
  post: (url: string, data: any) => tenantApi.post(`/api/${url}`, data),
  put: (url: string, data: any) => tenantApi.put(`/api/${url}`, data),
  patch: (url: string, data?: any) => tenantApi.patch(`/api/${url}`, data),
  delete: (url: string) => tenantApi.delete(`/api/${url}`),
};

export const api = tenantApi;
export default api;