"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  RefreshCw,
  Globe,
  ReceiptText,
  MessageCircle,
  Send,
  Clock3,
  CircleAlert,
  ClipboardList,
  Loader2,
} from "lucide-react";

import { api } from "@/services/axios";
import { useLandlordAuth } from "@/context/LandlordAuthContext";
import { useThemeColors } from "@/context/ThemeContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type DocumentoResumo = {
  id: string;
  numero_documento: string;
  tipo_documento: string;
  estado: string;
  total_liquido: number;
  data_emissao: string | null;
  hora_emissao: string | null;
  cliente_nome: string | null;
  cliente_nif: string | null;
};

type Mensagem = {
  id: string;
  mensagem: string;
  remetente_tipo: "landlord" | "empresa";
  remetente_nome: string | null;
  remetente_email: string | null;
  lida: boolean;
  created_at: string | null;
};

type EmpresaDetalhe = {
  id: string;
  nome: string;
  nif: string;
  email: string;
  telefone?: string;
  endereco?: string;
  status: "ativo" | "suspenso";
  db_name: string;
  regime_fiscal: string;
  subdomain?: string;
  logo?: string | null;
  modo?: string;
  detalhes?: {
    resumo?: {
      total_documentos: number;
      total_faturacao: number;
      total_recebido: number;
      saldo_pendente: number;
      total_clientes: number;
      total_utilizadores: number;
      documentos_por_tipo: Array<{ tipo: string; total: number }>;
    };
    documentos?: {
      total: number;
      tipos: string[];
      recentes: DocumentoResumo[];
    };
    mensagens?: Mensagem[];
  };
};

const documentoLabel: Record<string, string> = {
  FT: "Fatura",
  FR: "Fatura-Recibo",
  FP: "Proforma",
  FA: "Adiantamento",
  NC: "Nota de Crédito",
  ND: "Nota de Débito",
  RC: "Recibo",
  FRt: "Retificação",
};

const estadoLabel: Record<string, string> = {
  emitido: "Emitido",
  paga: "Paga",
  parcialmente_paga: "Parcial",
  cancelado: "Cancelado",
  expirado: "Expirado",
};

export default function EmpresaDetalhePage() {
  const { user, loading: authLoading } = useLandlordAuth();
  const colors = useThemeColors();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [empresa, setEmpresa] = useState<EmpresaDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMessage, setSavingMessage] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [error, setError] = useState("");

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === "object" && error !== null && "response" in error) {
      const response = (error as { response?: { data?: { message?: string } } }).response;
      return response?.data?.message || fallback;
    }

    if (error instanceof Error) {
      return error.message || fallback;
    }

    return fallback;
  };

  const currency = useMemo(
    () =>
      new Intl.NumberFormat("pt-AO", {
        style: "currency",
        currency: "AOA",
        maximumFractionDigits: 2,
      }),
    [],
  );

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "super_admin")) {
      router.push("/landlord/login");
    }
  }, [user, authLoading, router]);

  const carregarEmpresa = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await api.get(`/api/landlord/empresas/${id}`);
      setEmpresa(response.data.data);
      setError("");
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Erro ao carregar a ficha da empresa");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;

    const timer = window.setTimeout(() => {
      void carregarEmpresa();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [user, id, carregarEmpresa]);

  const enviarMensagem = async () => {
    if (!id || !mensagem.trim()) return;

    setSavingMessage(true);
    try {
      await api.post(`/api/landlord/empresas/${id}/mensagens`, {
        mensagem: mensagem.trim(),
      });
      toast.success("Mensagem enviada com sucesso");
      setMensagem("");
      await carregarEmpresa();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Erro ao enviar mensagem"));
    } finally {
      setSavingMessage(false);
    }
  };

  const resumo = empresa?.detalhes?.resumo;
  const documentos = empresa?.detalhes?.documentos?.recentes ?? [];
  const mensagens = empresa?.detalhes?.mensagens ?? [];

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-10 w-10 animate-spin" style={{ color: colors.primary }} />
          <p className="text-sm sm:text-base" style={{ color: colors.textSecondary }}>
            A carregar ficha da empresa...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 shrink-0 text-red-500" size={22} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold" style={{ color: colors.text }}>
                Não foi possível carregar a ficha
              </p>
              <p className="text-sm break-words" style={{ color: colors.textSecondary }}>
                {error}
              </p>
              <Button
                onClick={carregarEmpresa}
                className="mt-4 w-full sm:w-auto transition-transform active:scale-95"
                style={{ backgroundColor: colors.primary, color: "#fff" }}
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!empresa) {
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/landlord/dashboard/empresas")}
            className="shrink-0 transition-transform active:scale-90 hover:scale-105"
            style={{ borderColor: colors.border, color: colors.text, backgroundColor: colors.card }}
          >
            <ArrowLeft size={18} />
          </Button>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm" style={{ color: colors.textSecondary }}>
              Ficha da empresa
            </p>
            <h1
              className="text-xl font-bold tracking-tight break-words sm:text-2xl lg:text-3xl"
              style={{ color: colors.secondary }}
            >
              {empresa.nome}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                style={{
                  backgroundColor: empresa.status === "ativo" ? `${colors.success}15` : `${colors.danger}15`,
                  color: empresa.status === "ativo" ? colors.success : colors.danger,
                  border: `1px solid ${empresa.status === "ativo" ? colors.success : colors.danger}30`,
                }}
              >
                {empresa.status === "ativo" ? "Ativa" : "Suspensa"}
              </Badge>
              <Badge variant="secondary" style={{ backgroundColor: `${colors.secondary}15`, color: colors.secondary }}>
                {empresa.regime_fiscal}
              </Badge>
              {empresa.subdomain && (
                <Badge variant="outline" style={{ borderColor: colors.border, color: colors.textSecondary }}>
                  <Globe size={12} className="mr-1" />
                  {empresa.subdomain}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={carregarEmpresa}
          className="w-full sm:w-auto transition-transform active:scale-95 hover:brightness-105"
          style={{ color: colors.blue, backgroundColor: colors.card }}
        >
          <RefreshCw size={16} className="mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card
          className="transition-shadow hover:shadow-md"
          style={{ backgroundColor: colors.card }}
        >
          <CardContent className="p-3 sm:p-2">
            <p className="text-xs sm:text-sm" style={{ color: colors.secondary }}>
              Documentos
            </p>
            <p className="mt-2 text-lg font-bold sm:text-1xl" style={{ color: colors.secondary }}>
              {resumo?.total_documentos ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="transition-shadow hover:shadow-md" style={{ backgroundColor: colors.card }}>
          <CardContent className="p-3 sm:p-2">
            <p className="text-xs sm:text-sm" style={{ color: colors.blue }}>
              Faturação
            </p>
            <p className="mt-2 text-base font-bold break-words sm:text-1xl" style={{ color: colors.blue }}>
              {currency.format(resumo?.total_faturacao ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="transition-shadow hover:shadow-md" style={{ backgroundColor: colors.card }}>
          <CardContent className="p-3 sm:p-2">
            <p className="text-xs sm:text-sm" style={{ color: colors.secondary }}>
              Recebido
            </p>
            <p className="mt-2 text-base font-bold break-words sm:text-1xl" style={{ color: colors.secondary }}>
              {currency.format(resumo?.total_recebido ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="transition-shadow hover:shadow-md" style={{ backgroundColor: colors.card }}>
          <CardContent className="p-3 sm:p-2">
            <p className="text-xs sm:text-sm" style={{ color: colors.blue }}>
              Saldo pendente
            </p>
            <p className="mt-2 text-base font-bold break-words sm:text-1xl" style={{ color: colors.blue }}>
              {currency.format(resumo?.saldo_pendente ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="transition-shadow hover:shadow-md" style={{ backgroundColor: colors.card }}>
          <CardContent className="p-3 sm:p-2">
            <p className="text-xs sm:text-sm" style={{ color: colors.secondary }}>
              Clientes
            </p>
            <p className="mt-2 text-lg font-bold sm:text-1xl" style={{ color: colors.secondary }}>
              {resumo?.total_clientes ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="transition-shadow hover:shadow-md" style={{ backgroundColor: colors.card }}>
          <CardContent className="p-3 sm:p-2">
            <p className="text-xs sm:text-sm" style={{ color: colors.blue }}>
              Utilizadores
            </p>
            <p className="mt-2 text-lg font-bold sm:text-1xl" style={{ color: colors.blue }}>
              {resumo?.total_utilizadores ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" style={{ backgroundColor: colors.card }}>
          <CardContent className="space-y-4 p-4 sm:space-y-5 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold sm:text-lg" style={{ color: colors.secondary }}>
                  Dados da empresa
                </h2>
                <p className="text-xs sm:text-sm" style={{ color: colors.textSecondary }}>
                  Informações principais e fiscais
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:gap-4 sm:grid-cols-2">
              <div
                className="space-y-1 border p-1 transition-colors hover:bg-black/[0.02] sm:p-4"
                style={{ borderColor: colors.border }}
              >
                <p className="text-xs uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                  NIF
                </p>
                <p className="break-words font-medium" style={{ color: colors.text }}>
                  {empresa.nif}
                </p>
              </div>
              <div
                className="space-y-1 border p-3 transition-colors hover:bg-black/[0.02] sm:p-4"
                style={{ borderColor: colors.border }}
              >
                <p className="text-xs uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                  Email
                </p>
                <p className="break-words font-medium" style={{ color: colors.text }}>
                  {empresa.email}
                </p>
              </div>
              <div
                className="space-y-1  border p-3 transition-colors hover:bg-black/[0.02] sm:p-4"
                style={{ borderColor: colors.border }}
              >
                <p className="text-xs uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                  Contacto
                </p>
                <p className="break-words font-medium" style={{ color: colors.text }}>
                  {empresa.telefone || "Sem contacto"}
                </p>
              </div>
              <div
                className="space-y-1 border p-3 transition-colors hover:bg-black/[0.02] sm:p-4"
                style={{ borderColor: colors.border }}
              >
                <p className="text-xs uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                  Base de dados
                </p>
                <p className="break-all font-mono text-sm" style={{ color: colors.text }}>
                  {empresa.db_name}
                </p>
              </div>
              <div
                className="space-y-1 border p-3 transition-colors hover:bg-black/[0.02] sm:col-span-2 sm:p-4"
                style={{ borderColor: colors.border }}
              >
                <p className="text-xs uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                  Endereço
                </p>
                <p className="break-words font-medium" style={{ color: colors.text }}>
                  {empresa.endereco || "Sem endereço disponível"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: colors.card }}>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div>
              <h2 className="text-base font-semibold sm:text-lg" style={{ color: colors.blue }}>
                Resumo dos documentos
              </h2>
              <p className="text-xs sm:text-sm" style={{ color: colors.textSecondary }}>
                Distribuição dos documentos
              </p>
            </div>

            <div className="space-y-3">
              {(resumo?.documentos_por_tipo || []).map((item) => (
                <div
                  key={item.tipo}
                  className="flex items-center justify-between border px-3 py-3 transition-colors hover:bg-black/[0.02] sm:px-4"
                  style={{ borderColor: colors.border }}
                >
                  <span className="min-w-0 truncate pr-2" style={{ color: colors.text }}>
                    {documentoLabel[item.tipo] || item.tipo}
                  </span>
                  <Badge
                    variant="secondary"
                    className="shrink-0"
                    style={{  color: colors.secondary }}
                  >
                    {item.total}
                  </Badge>
                </div>
              ))}
              {!resumo?.documentos_por_tipo?.length && (
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  Ainda não há documentos registados.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card style={{ backgroundColor: colors.card }}>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold sm:text-lg" style={{ color: colors.secondary }}>
                Documentos recentes
              </h2>
              <p className="text-xs sm:text-sm" style={{ color: colors.textSecondary }}>
                Últimos documentos gerados pela empresa
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {documentos.map((documento) => (
              <div
                key={documento.id}
                className="flex flex-col gap-3 border p-3 transition-shadow hover:shadow-sm sm:p-4 lg:flex-row lg:items-center lg:justify-between"
                style={{ borderColor: colors.border }}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-words font-semibold" style={{ color: colors.text }}>
                      {documento.numero_documento}
                    </span>
                    <Badge variant="secondary" style={{ backgroundColor: `${colors.secondary}15`, color: colors.secondary }}>
                      {documentoLabel[documento.tipo_documento] || documento.tipo_documento}
                    </Badge>
                    <Badge
                      style={{
                        backgroundColor: documento.estado === "cancelado" ? `${colors.danger}15` : `${colors.success}15`,
                        color: documento.estado === "cancelado" ? colors.danger : colors.success,
                      }}
                    >
                      {estadoLabel[documento.estado] || documento.estado}
                    </Badge>
                  </div>
                  <div
                    className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm"
                    style={{ color: colors.textSecondary }}
                  >
                    <span className="break-words">{documento.cliente_nome || "Sem cliente"}</span>
                    {documento.cliente_nif && <span className="break-all font-mono">{documento.cliente_nif}</span>}
                    {documento.data_emissao && <span>{documento.data_emissao}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-4 lg:shrink-0">
                  <div className="text-left lg:text-right">
                    <p className="text-xs uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                      Valor
                    </p>
                    <p className="break-words font-semibold" style={{ color: colors.text }}>
                      {currency.format(documento.total_liquido)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {!documentos.length && (
              <div className=" border border-dashed p-6 text-center sm:p-8" style={{ borderColor: colors.border }}>
                <ClipboardList className="mx-auto mb-3" style={{ color: colors.textSecondary }} />
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  Sem documentos recentes para mostrar.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1" style={{ backgroundColor: colors.card }}>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div>
              <h2 className="text-base font-semibold sm:text-lg" style={{ color: colors.secondary }}>
                Nova mensagem
              </h2>
              <p className="text-xs sm:text-sm" style={{ color: colors.textSecondary }}>
                Escreve uma mensagem para esta empresa
              </p>
            </div>

            <Textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Escreve aqui a mensagem..."
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
              }}
              className="min-h-[120px] transition-shadow focus:shadow-sm sm:min-h-[140px]"
            />

            <Button
              onClick={enviarMensagem}
              disabled={!mensagem.trim() || savingMessage}
              className="w-full transition-transform active:scale-95 disabled:active:scale-100"
              style={{ backgroundColor: colors.primary, color: "#fff" }}
            >
              {savingMessage ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Send size={16} className="mr-2" />}
              Enviar mensagem
            </Button>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2" style={{ backgroundColor: colors.card }}>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold sm:text-lg" style={{ color: colors.secondary }}>
                  Mensagens internas
                </h2>
                <p className="text-xs sm:text-sm" style={{ color: colors.textSecondary }}>
                  Histórico de comunicação com a empresa
                </p>
              </div>
              <MessageCircle className="shrink-0" style={{ color: colors.secondary }} />
            </div>

            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
              {mensagens.map((item) => (
                <div
                  key={item.id}
                  className="border p-3 transition-shadow hover:shadow-sm sm:p-4"
                  style={{ borderColor: colors.border }}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="break-words font-semibold" style={{ color: colors.text }}>
                          {item.remetente_nome || "Sistema"}
                        </span>
                        <Badge
                          variant="secondary"
                          style={{
                            backgroundColor: item.remetente_tipo === "landlord" ? `${colors.primary}15` : `${colors.secondary}15`,
                            color: item.remetente_tipo === "landlord" ? colors.blue : colors.secondary,
                          }}
                        >
                          {item.remetente_tipo === "landlord" ? "Landlord" : "Empresa"}
                        </Badge>
                        {item.lida && (
                          <Badge variant="outline" style={{ borderColor: colors.border, color: colors.textSecondary }}>
                            Lida
                          </Badge>
                        )}
                      </div>
                      <div
                        className="mt-1 flex flex-wrap items-center gap-2 text-xs sm:text-sm"
                        style={{ color: colors.textSecondary }}
                      >
                        {item.remetente_email && <span className="break-all">{item.remetente_email}</span>}
                        {item.created_at && (
                          <span className="inline-flex items-center gap-1 whitespace-nowrap">
                            <Clock3 size={12} />
                            {new Date(item.created_at).toLocaleString("pt-PT")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6" style={{ color: colors.text }}>
                    {item.mensagem}
                  </p>
                </div>
              ))}

              {!mensagens.length && (
                <div className=" border border-dashed p-6 text-center sm:p-8" style={{ borderColor: colors.border }}>
                  <MessageCircle className="mx-auto mb-3" style={{ color: colors.textSecondary }} />
                  <p className="text-sm" style={{ color: colors.textSecondary }}>
                    Ainda não existem mensagens para esta empresa.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}