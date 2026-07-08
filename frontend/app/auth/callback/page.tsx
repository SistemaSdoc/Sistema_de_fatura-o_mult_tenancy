"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi, setTenant } from "@/services/axios";

function AuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const empresaId = params.get("empresa_id");
    const subdomain = params.get("subdomain");

    if (!empresaId) {
      setError("Empresa não informada no callback.");
      setTimeout(() => router.replace("/login"), 2000);
      return;
    }

    // ✅ Define o tenant ANTES de chamar /api/me
    setTenant({ id: empresaId, subdomain: subdomain || undefined });

    const verifySession = async () => {
      try {
        // Garantir o cookie CSRF antes de carregar a sessão
        await authApi.getCsrf();
        console.log("[AuthCallback] CSRF pronto, verificando sessão...");

        // Chama /api/me para carregar dados do usuário tenant
        const response = await authApi.me();
        console.log("[AuthCallback] Usuário tenant carregado:", response.data);

        // Se sucesso, vai para dashboard
        router.replace("/dashboard");
      } catch (err) {
        console.error("[AuthCallbackPage] authApi.me falhou", err);
        router.replace("/login?error=auth_failed");
      }
    };

    verifySession();
  }, [params, router]);

  if (error) return <p>{error} Redirecionando...</p>;
  return <p>A carregar sua conta...</p>;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<p>A carregar sua conta...</p>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
