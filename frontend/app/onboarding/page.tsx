// app/onboarding/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { landAuthApi, setTenant } from "@/services/axios";
import { useAuth } from "@/context/authprovider";
import { toast } from "sonner";

interface LandlordUser {
    id: string;
    name: string;
    email: string;
}

export default function OnboardingPage() {
    const router = useRouter();
    const { refreshUser } = useAuth();

    const [landlordUser, setLandlordUser] = useState<LandlordUser | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [nome, setNome] = useState("");
    const [subdomain, setSubdomain] = useState("");

    // Busca dados do usuário landlord (não do tenant!)
    useEffect(() => {
        landAuthApi
            .me()
            .then((res) => setLandlordUser(res.data.user))
            .catch(() => {
                toast.error("Sessão expirada, faça login novamente.");
                router.replace("/login");
            })
            .finally(() => setLoadingUser(false));
    }, [router]);

    const handleSubmit = async () => {
        if (!nome || !subdomain) {
            toast.error("Preencha nome e subdomínio.");
            return;
        }

        setSubmitting(true);
        try {
            const response = await landAuthApi.criarEmpresaFreelancer({ nome, subdomain });

            if (response.data?.success) {
                const { empresa_id, subdomain: sub } = response.data.data;

                // Agora sim: guarda o tenant e busca o usuário tenant
                setTenant({ id: empresa_id, subdomain: sub });
                await refreshUser();

                toast.success("Empresa criada com sucesso!");
                router.replace("/dashboard");
            }
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: { message?: string } } };
            toast.error(apiError.response?.data?.message || "Erro ao criar empresa");
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingUser) return <p>A carregar...</p>;

    return (
        <div className="max-w-md mx-auto mt-16 space-y-4">
            <h1 className="text-2xl font-bold">Bem-vindo, {landlordUser?.name}!</h1>
            <p className="text-sm text-muted-foreground">
                Vamos criar sua empresa para começar a faturar.
            </p>

            <div className="space-y-2">
                <label className="text-sm font-medium">Nome da empresa</label>
                <input
                    className="w-full border rounded-md px-3 py-2"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Diniz Consultoria"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Subdomínio</label>
                <input
                    className="w-full border rounded-md px-3 py-2"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                    placeholder="ex: diniz-consultoria"
                />
            </div>

            <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-primary text-white rounded-md py-2 font-medium disabled:opacity-50"
            >
                {submitting ? "Criando..." : "Criar empresa"}
            </button>
        </div>
    );
}