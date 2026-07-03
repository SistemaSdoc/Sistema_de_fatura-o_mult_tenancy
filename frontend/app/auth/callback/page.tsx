"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi, setTenant } from "@/services/axios";

export default function AuthCallbackPage() {
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

        setTenant({ id: empresaId, subdomain: subdomain || undefined });

        const verifySession = async () => {
            try {
                await authApi.me();
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