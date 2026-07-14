"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Crown, Calendar, CreditCard, CheckCircle, AlertTriangle, ArrowLeft, Clock, RefreshCw } from "lucide-react";
import { useThemeColors } from "@/context/ThemeContext";
import { useAuth } from "@/context/authprovider";
import { subscricaoService } from "@/services/subscricoes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import MainEmpresa from "@/app/components/MainEmpresa";
import PlanosModal from "@/app/components/PlanosModal";

interface Subscricao {
  id: string;
  plano_id: string;
  status: "ativa" | "inativa" | "expirada" | "cancelada";
  data_inicio: string;
  data_fim: string;
  forma_pagamento?: string;
  renovacao_automatica?: boolean;
  plano?: {
    id: string;
    nome: string;
    descricao: string;
    valor_mensal: number;
    features: any[];
  };
  empresa?: {
    id: string;
    nome: string;
  };
}

export default function MinhaSubscricaoPage() {
  const router = useRouter();
  const colors = useThemeColors();
  const { user, loading: authLoading } = useAuth();
  const [modalPlanosAberto, setModalPlanosAberto] = useState(false);
  const [subscricao, setSubscricao] = useState<Subscricao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarSubscricao = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await subscricaoService.minhaAssinatura();
      
      // O serviço retorna null quando não tem assinatura (404)
      if (response === null) {
        setSubscricao(null);
        return;
      }
      
      // Processa a resposta - pode ser { subscricao: {...} } ou diretamente o objeto
      const sub = response?.subscricao ?? response;
      
      // Verifica se é um objeto válido com ID
      if (sub && typeof sub === 'object' && 'id' in sub) {
        setSubscricao(sub as Subscricao);
      } else {
        setSubscricao(null);
      }
    } catch (err: any) {
      console.error("Erro ao carregar subscrição:", err);
      
      // Fallback para 404 (caso o serviço não tenha capturado)
      if (err.response?.status === 404) {
        setSubscricao(null);
        return;
      }
      
      setError(err.response?.data?.message || err.message || "Erro ao carregar subscrição");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      carregarSubscricao();
    }
  }, [user, authLoading, router]);

  const handleRenovar = () => {
    if (!subscricao) return;
    router.push(`/checkout?plano_id=${subscricao.plano_id}&renovacao=true`);
  };

  const handleCancelar = async () => {
    if (!subscricao) return;
    if (!confirm("Tem certeza que deseja cancelar a subscrição? Esta ação não pode ser desfeita.")) return;
    try {
      await subscricaoService.cancelar(subscricao.id);
      toast.success("Subscrição cancelada com sucesso.");
      carregarSubscricao();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erro ao cancelar subscrição");
    }
  };

  // Verifica se o plano é experimental (grátis)
  const isExperimental =
    subscricao?.plano?.valor_mensal === 0 ||
    subscricao?.forma_pagamento === "gratuito" ||
    subscricao?.plano?.nome?.toLowerCase() === "experimental";

  // Loading
  if (authLoading || loading) {
    return (
      <MainEmpresa>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
          <span className="ml-2" style={{ color: colors.textSecondary }}>
            A carregar...
          </span>
        </div>
      </MainEmpresa>
    );
  }

  // Erro
  if (error) {
    return (
      <MainEmpresa>
        <div className="max-w-3xl mx-auto p-4">
          <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-16 h-16 mx-auto mb-4" style={{ color: colors.danger }} />
              <h2 className="text-xl font-bold" style={{ color: colors.text }}>
                Erro ao carregar subscrição
              </h2>
              <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>
                {error}
              </p>
              <Button onClick={carregarSubscricao} className="mt-6" style={{ backgroundColor: colors.primary, color: "white" }}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainEmpresa>
    );
  }

  // Sem subscrição - MOSTRA A TELA DE "SEM SUBSCRIÇÃO"
  if (!subscricao) {
    return (
      <MainEmpresa>
        <div className="max-w-3xl mx-auto p-4">
          <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <CardContent className="py-12 text-center">
              <Crown className="w-16 h-16 mx-auto mb-4" style={{ color: colors.primary }} />
              <h2 className="text-xl font-bold" style={{ color: colors.text }}>
                Sem subscrição activa
              </h2>
              <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>
                A sua empresa ainda não tem uma subscrição activa.
              </p>
              <button
                onClick={() => setModalPlanosAberto(true)}
                className="mt-6 px-6 py-2 rounded-full font-semibold cursor-pointer"
                style={{ backgroundColor: colors.primary, color: "white" }}>
                Ver planos disponíveis
              </button>
            </CardContent>
          </Card>
        </div>
        <PlanosModal isOpen={modalPlanosAberto} onClose={() => setModalPlanosAberto(false)} />
      </MainEmpresa>
    );
  }

  // Mapeamento de status
  const statusMap: Record<string, { label: string; color: string }> = {
    ativa: { label: "Activa", color: colors.primary || "#22c55e" },
    inativa: { label: "Inactiva", color: colors.secondary || "#6b7280" },
    expirada: { label: "Expirada", color: colors.danger || "#ef4444" },
    cancelada: { label: "Cancelada", color: colors.danger || "#ef4444" },
  };

  const statusInfo = statusMap[subscricao.status] || { 
    label: subscricao.status, 
    color: colors.textSecondary || "#6b7280" 
  };

  // Render principal - COM SUBSCRIÇÃO
  return (
    <MainEmpresa>
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.back()} className="p-2" style={{ color: colors.text }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold" style={{ color: colors.secondary }}>
            Minha Subscrição
          </h1>
        </div>

        <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Crown className="w-6 h-6" style={{ color: colors.secondary }} />
                <CardTitle style={{ color: colors.text }}>
                  {subscricao.plano?.nome || "Plano"}
                </CardTitle>
              </div>
              <Badge
                className="capitalize"
                style={{
                  backgroundColor: statusInfo.color,
                  color: "white",
                }}>
                {statusInfo.label}
              </Badge>
            </div>
            {subscricao.plano?.descricao && (
              <CardDescription style={{ color: colors.textSecondary }}>
                {subscricao.plano.descricao}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" style={{ color: colors.textSecondary }} />
                <div>
                  <p className="text-xs" style={{ color: colors.textSecondary }}>
                    Data de início
                  </p>
                  <p className="font-medium" style={{ color: colors.text }}>
                    {new Date(subscricao.data_inicio).toLocaleDateString("pt-PT")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" style={{ color: colors.textSecondary }} />
                <div>
                  <p className="text-xs" style={{ color: colors.textSecondary }}>
                    Data de fim
                  </p>
                  <p className="font-medium" style={{ color: colors.text }}>
                    {new Date(subscricao.data_fim).toLocaleDateString("pt-PT")}
                  </p>
                </div>
              </div>

              {subscricao.plano?.valor_mensal !== undefined && (
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" style={{ color: colors.textSecondary }} />
                  <div>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>
                      Valor mensal
                    </p>
                    <p className="font-bold text-xl" style={{ color: colors.secondary }}>
                      {Number(subscricao.plano.valor_mensal).toLocaleString("pt-AO")} KZ
                    </p>
                  </div>
                </div>
              )}

              {subscricao.forma_pagamento && (
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" style={{ color: colors.textSecondary }} />
                  <div>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>
                      Método de pagamento
                    </p>
                    <p className="font-medium capitalize" style={{ color: colors.text }}>
                      {subscricao.forma_pagamento.replace("_", " ")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${subscricao.renovacao_automatica ? "bg-green-500" : "bg-gray-400"}`} />
              <div>
                <p className="text-xs" style={{ color: colors.textSecondary }}>
                  Renovação automática
                </p>
                <p className="font-medium" style={{ color: colors.text }}>
                  {subscricao.renovacao_automatica ? "Sim" : "Não"}
                </p>
              </div>
            </div>

            {subscricao.plano?.features && subscricao.plano.features.length > 0 && (
              <div className="border-t pt-4" style={{ borderColor: colors.border }}>
                <p className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                  Recursos incluídos
                </p>
                <div className="grid grid-cols-1 gap-1">
                  {subscricao.plano.features.map((feature: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm" style={{ color: colors.text }}>
                      <CheckCircle className="w-4 h-4" style={{ color: colors.secondary }} />
                      <span>
                        {feature.pivot?.quantidade > 0 ? `${feature.pivot.quantidade} ${feature.pivot.unidade || ""} ` : ""}
                        {feature.nome}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3 border-t pt-6" style={{ borderColor: colors.border }}>
            {subscricao.status === "ativa" && (
              <>
                {!isExperimental && (
                  <Button 
                    variant="outline" 
                    onClick={handleRenovar} 
                    style={{ borderColor: colors.border, color: colors.text }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Renovar
                  </Button>
                )}
                <Button 
                  variant="destructive" 
                  onClick={handleCancelar} 
                  style={{ background: colors.danger || "#ef4444", color: "white" }}
                >
                  Cancelar subscrição
                </Button>
              </>
            )}
            <button
              onClick={() => setModalPlanosAberto(true)}
              className="ml-auto px-6 py-2 font-semibold cursor-pointer"
              style={{ backgroundColor: colors.primary, color: "white" }}>
              Ver outros planos
            </button>
          </CardFooter>
        </Card>
      </div>
      <PlanosModal isOpen={modalPlanosAberto} onClose={() => setModalPlanosAberto(false)} />
    </MainEmpresa>
  );
}