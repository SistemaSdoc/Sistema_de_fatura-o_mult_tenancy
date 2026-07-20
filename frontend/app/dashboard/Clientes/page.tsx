"use client";

import React, { useEffect, useState, useCallback } from "react";
import MainEmpresa from "../../components/MainEmpresa";
import { clienteService, formatarNIF, getTipoClienteLabel, getStatusClienteLabel } from "@/services/clientes";
import type { Cliente, CriarClienteInput, AtualizarClienteInput } from "@/services/clientes";
import { Users, Plus, Search, Building2, X, Upload, CheckCircle, XCircle } from "lucide-react";
import { ToastNotification } from "@/components/ToastNotification";
import { useThemeColors } from "@/context/ThemeContext";
import { Modal } from "@/app/components/Clientes/Modal";
import { ConfirmModal } from "@/app/components/Clientes/ConfirmModal";
import { FormCliente } from "@/app/components/Clientes/FormCliente";
import { LoadingStats, LoadingTabela } from "@/app/components/Clientes/LoadingStates";
import { TabelaClientes } from "@/app/components/Clientes/TabelaClientes";
import { ModalImportar } from "@/app/components/Clientes/ModalImportar";


/* ══════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════════════ */
export default function ClientesPage() {
  const colors = useThemeColors();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativos" | "inativos">("ativos");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" | "info" } | null>(null);
  const [modalImportar, setModalImportar] = useState(false);
  const [modalForm, setModalForm] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [modalStatus, setModalStatus] = useState(false);
  const [selecao, setSelecao] = useState<Cliente | null>(null);
  const [loadingAcao, setLoadingAcao] = useState(false);

  const showToast = (message: string, type: "success" | "error" | "warning" | "info" = "info") => {
    setToast({ message, type });
  };

  /* ── Filtro local ── */
  useEffect(() => {
    const t = busca.toLowerCase();
    setClientesFiltrados(
      clientes.filter(
        (c) =>
          c.nome.toLowerCase().includes(t) ||
          (c.nif && c.nif.toLowerCase().includes(t)) ||
          (c.email && c.email.toLowerCase().includes(t)) ||
          (c.telefone && c.telefone.includes(t))
      )
    );
  }, [busca, clientes]);

  /* ── Carregar ── */
  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      let data;

      if (filtroStatus === "todos") {
        const ativos = await clienteService.listar({
          status: "ativo",
          per_page: 12,
        });
        const inativos = await clienteService.listar({
          status: "inativo",
          per_page: 12,
        });
        data = [...(ativos.data || []), ...(inativos.data || [])];
      } else if (filtroStatus === "ativos") {
        const response = await clienteService.listar({
          status: "ativo",
          per_page: 12,
        });
        data = response.data || [];
      } else {
        const response = await clienteService.listar({
          status: "inativo",
          per_page: 12,
        });
        data = response.data || [];
      }

      setClientes(data);
      setClientesFiltrados(data);
    } catch {
      /* silencioso — utilizador vê lista vazia */
    } finally {
      setLoading(false);
    }
  }, [filtroStatus]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /* ── Handlers de modal ── */
  const abrirCriar = () => {
    setSelecao(null);
    setModalForm(true);
  };
  const abrirEditar = (c: Cliente) => {
    setSelecao(c);
    setModalForm(true);
  };
  const abrirDetalhes = (c: Cliente) => {
    setSelecao(c);
    setModalDetalhes(true);
  };
  const abrirStatus = (c: Cliente) => {
    setSelecao(c);
    setModalStatus(true);
  };

  const fecharForm = () => {
    setModalForm(false);
    setSelecao(null);
  };
  const fecharDetalhes = () => {
    setModalDetalhes(false);
    setSelecao(null);
  };
  const fecharStatus = () => {
    setModalStatus(false);
    setSelecao(null);
  };

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (err instanceof Error) return err.message;

    if (typeof err === "object" && err !== null && "response" in err) {
      const responseErr = err as {
        response?: { data?: { message?: string } };
      };
      const message = responseErr.response?.data?.message;
      if (typeof message === "string") return message;
    }

    return fallback;
  };

  /* ── Submeter formulário ── */
  const handleSubmit = async (dados: CriarClienteInput | AtualizarClienteInput) => {
    setLoadingAcao(true);
    try {
      if (selecao) {
        await clienteService.atualizarCliente(selecao.id, dados as AtualizarClienteInput);
        showToast(`Cliente "${dados.nome}" atualizado com sucesso`, "success");
      } else {
        await clienteService.criarCliente(dados as CriarClienteInput);
        showToast(`Cliente "${dados.nome}" criado com sucesso`, "success");
      }
      fecharForm();
      await carregar();
    } catch (err: unknown) {
      showToast(getErrorMessage(err, "Erro ao guardar cliente"), "error");
    } finally {
      setLoadingAcao(false);
    }
  };

  /* ── Alterar status ── */
  const handleStatus = async () => {
    if (!selecao) return;
    setLoadingAcao(true);
    try {
      if (selecao.status === "ativo") {
        await clienteService.inativarCliente(selecao.id);
        showToast(`Cliente "${selecao.nome}" inativado com sucesso`, "success");
      } else {
        await clienteService.ativarCliente(selecao.id);
        showToast(`Cliente "${selecao.nome}" ativado com sucesso`, "success");
      }
      fecharStatus();
      await carregar();
    } catch (err: unknown) {
      showToast(getErrorMessage(err, "Erro ao alterar status"), "error");
    } finally {
      setLoadingAcao(false);
    }
  };

  /* ── Estatísticas ── */
  const stats = [
    { icon: Users, label: "Total", value: clientes.length, color: colors.text },
    {
      icon: CheckCircle,
      label: "Ativos",
      value: clientes.filter((c) => c.status === "ativo").length,
      color: colors.secondary,
    },
    {
      icon: XCircle,
      label: "Inativos",
      value: clientes.filter((c) => c.status !== "ativo").length,
      color: colors.textSecondary,
    },
    {
      icon: Building2,
      label: "Empresas",
      value: clientes.filter((c) => c.tipo === "empresa").length,
      color: colors.secondary,
    },
  ];

  return (
    <MainEmpresa>
      <div className="space-y-4 max-w-7xl mx-auto pb-6 transition-colors duration-300" style={{ backgroundColor: colors.background }}>
        {/* Toast Notification */}
        {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} colors={colors} />}

        {/* ── Cabeçalho ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: colors.secondary }}>
              Clientes
            </h1>
            <p className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
              Gerencie os seus clientes e empresas
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Pesquisa */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textSecondary }} />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nome, NIF, email ou telefone…"
                className="w-full pl-9 pr-4 py-2 border outline-none text-sm"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              />
            </div>
            {/* Filtro status */}
            <select
              value={filtroStatus}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFiltroStatus(e.target.value as "todos" | "ativos" | "inativos")}
              className="px-3 py-2 border outline-none text-sm"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text,
              }}>
              <option value="ativos">Ativos</option>
              <option value="inativos">Inativos</option>
              <option value="todos">Todos</option>
            </select>
            {/* Importar */}
            <button
              onClick={() => setModalImportar(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
              style={{
                color: colors.text,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.card,
              }}>
              <Upload className="w-4 h-4" />
              Importar Excel
            </button>
            {/* Novo */}
            <button
              onClick={abrirCriar}
              className="flex items-center gap-1.5 px-4 py-2 text-white text-sm font-medium"
              style={{ backgroundColor: colors.primary }}>
              <Plus className="w-4 h-4" />
              Novo
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        {loading ? (
          <LoadingStats colors={colors} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map(({ icon: Icon, label, value, color }) => (
              <div
                key={label}
                className="p-4 border"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                }}>
                <div className="flex items-center gap-3">
                  <div className="p-2" style={{ backgroundColor: `${color}18` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xl font-bold leading-none" style={{ color: colors.text }}>
                      {value}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
                      {label}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabela ── */}
        {loading ? (
          <LoadingTabela colors={colors} />
        ) : clientes.length === 0 ? (
          <div className="border text-center py-14" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <Users className="w-14 h-14 mx-auto mb-3" style={{ color: colors.border }} />
            <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
              {filtroStatus === "ativos"
                ? "Nenhum cliente ativo encontrado."
                : filtroStatus === "inativos"
                  ? "Nenhum cliente inativo encontrado."
                  : "Nenhum cliente encontrado."}
            </p>
            <button onClick={abrirCriar} className="px-4 py-2 text-white text-sm" style={{ backgroundColor: colors.primary }}>
              Cadastrar primeiro cliente
            </button>
          </div>
        ) : (
          <TabelaClientes
            clientes={clientesFiltrados}
            busca={busca}
            colors={colors}
            onVerDetalhes={abrirDetalhes}
            onEditar={abrirEditar}
            onStatus={abrirStatus}
            onLimparBusca={() => setBusca("")}
            onToast={showToast}
          />
        )}
      </div>

      {/* ── Modal Formulário ── */}
      <Modal isOpen={modalForm} onClose={fecharForm} title={selecao ? "Editar Cliente" : "Novo Cliente"} colors={colors}>
        <FormCliente cliente={selecao} onSubmit={handleSubmit} onCancel={fecharForm} loading={loadingAcao} colors={colors} />
      </Modal>

      {/* ── Modal Detalhes ── */}
      <Modal isOpen={modalDetalhes} onClose={fecharDetalhes} title="Detalhes do Cliente" colors={colors}>
        {selecao && (
          <div className="space-y-4">
            {/* Avatar + nome */}
            <div className="flex items-center gap-4 pb-4 border-b" style={{ borderColor: colors.border }}>
              <div className="w-14 h-14 flex items-center justify-center" style={{ backgroundColor: `${colors.secondary}20` }}>
                {selecao.tipo === "empresa" ? (
                  <Building2 className="w-7 h-7" style={{ color: colors.secondary }} />
                ) : (
                  <Users className="w-7 h-7" style={{ color: colors.text }} />
                )}
              </div>
              <div>
                <h4 className="text-lg font-semibold" style={{ color: colors.text }}>
                  {selecao.nome}
                </h4>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span
                    className="inline-flex items-center px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${colors.primary}18`,
                      color: colors.primary,
                    }}>
                    {getTipoClienteLabel(selecao.tipo)}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: selecao.status === "ativo" ? `${colors.secondary}18` : `${colors.textSecondary}18`,
                      color: selecao.status === "ativo" ? colors.secondary : colors.textSecondary,
                    }}>
                    {selecao.status === "ativo" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {getStatusClienteLabel(selecao.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid de detalhes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: "Phone", label: "Telefone", value: selecao.telefone || "—" },
                { icon: "Mail", label: "Email", value: selecao.email || "—" },
                {
                  icon: "Calendar",
                  label: "Registo",
                  value: new Date(selecao.data_registro).toLocaleDateString("pt-PT"),
                },
                {
                  icon: "Building2",
                  label: "NIF",
                  value: formatarNIF(selecao.nif) || "—",
                },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-start gap-2 p-2" style={{ backgroundColor: colors.hover }}>
                  <div className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.textSecondary }}>
                    {/* Placeholder para ícone */}
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>
                      {label}
                    </p>
                    <p className="text-sm font-medium mt-0.5" style={{ color: colors.text }}>
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {selecao.endereco && (
              <div className="flex items-start gap-2 p-2" style={{ backgroundColor: colors.hover }}>
                <div className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.textSecondary }} />
                <div>
                  <p className="text-xs" style={{ color: colors.textSecondary }}>
                    Endereço
                  </p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: colors.text }}>
                    {selecao.endereco}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={fecharDetalhes}
                className="flex-1 px-3 py-2 text-gray-700 text-sm font-medium flex items-center justify-center gap-2"
                style={{
                  color: colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                }}>
                Cancelar
              </button>
              <button
                onClick={() => {
                  fecharDetalhes();
                  abrirEditar(selecao);
                }}
                className="flex-1 px-3 py-2 text-white text-sm font-medium flex items-center justify-center gap-2"
                style={{ backgroundColor: colors.primary }}>
                Editar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal Alterar Status ── */}
      <ConfirmModal
        isOpen={modalStatus}
        onClose={fecharStatus}
        onConfirm={handleStatus}
        title={selecao?.status === "ativo" ? "Inativar Cliente" : "Ativar Cliente"}
        message={
          selecao?.status === "ativo"
            ? `Tem a certeza que deseja inativar "${selecao?.nome}"? Clientes inativos não podem realizar novas compras.`
            : `Tem a certeza que deseja ativar "${selecao?.nome}"? Clientes activos podem realizar compras normalmente.`
        }
        confirmText={selecao?.status === "ativo" ? "Inativar" : "Ativar"}
        type={selecao?.status === "ativo" ? "warning" : "info"}
        loading={loadingAcao}
        colors={colors}
      />
      <ModalImportar
        isOpen={modalImportar}
        onClose={() => setModalImportar(false)}
        onImportar={(file) => clienteService.importarClientes(file)}
        onConcluido={carregar}
        colors={colors}
      />
    </MainEmpresa>
  );
}
