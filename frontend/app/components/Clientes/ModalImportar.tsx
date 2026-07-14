"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Upload, X, CheckCircle2, AlertCircle, FileSpreadsheet, Loader2, Download } from "lucide-react";
import type { ImportarClientesResponse } from "@/services/clientes";

interface ModalImportarProps {
  isOpen: boolean;
  onClose: () => void;
  onImportar: (file: File) => Promise<ImportarClientesResponse>;
  onConcluido: () => void;
  colors: any;
}

export const ModalImportar: React.FC<ModalImportarProps> = ({
  isOpen,
  onClose,
  onImportar,
  onConcluido,
  colors,
}) => {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<ImportarClientesResponse | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false); // ← novo
  const inputRef = useRef<HTMLInputElement>(null);

  // Garante que só usamos document.body no client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Trava o scroll da página de fundo enquanto o modal está aberto
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const resetar = () => {
    setArquivo(null);
    setResultado(null);
    setErroGeral(null);
    setCarregando(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClose = () => {
    resetar();
    onClose();
  };

  const handleArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extensoesValidas = [".xlsx", ".xls"];
    const valido = extensoesValidas.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!valido) {
      setErroGeral("Formato inválido. Envia um ficheiro .xlsx ou .xls.");
      return;
    }

    setErroGeral(null);
    setResultado(null);
    setArquivo(file);
  };

  const handleImportar = async () => {
    if (!arquivo) return;

    setCarregando(true);
    setErroGeral(null);

    try {
      const res = await onImportar(arquivo);
      setResultado(res);
      if (res.total_sucesso > 0) {
        onConcluido();
      }
    } catch (err: any) {
      setErroGeral(err?.response?.data?.message || "Erro ao importar o arquivo");
      setResultado({
        success: false,
        message: err?.response?.data?.message || "Erro ao importar o arquivo",
        total_sucesso: 0,
        total_erros: 0,
        erros: [],
      });
    } finally {
      setCarregando(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4 animate-in fade-in-0 duration-200"
      style={{ height: "100dvh" }} // ← garante altura correta em mobile (barra de endereço)
    >
      <div
        className="shadow-2xl max-w-lg w-full max-h-[85dvh] overflow-hidden animate-in zoom-in-95 fade-in-0 duration-300 flex flex-col"
        style={{ backgroundColor: colors.card }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: colors.border }}
        >
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-semibold" style={{ color: colors.secondary }}>
              Importar Clientes
            </h2>
          </div>
          <button onClick={handleClose} className="p-1 hover:opacity-70 transition-opacity" disabled={carregando}>
            <X className="w-5 h-5" style={{ color: colors.textSecondary }} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {!resultado && (
            <>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Carrega o ficheiro Excel preenchido para criar vários clientes de uma vez.
              </p>

              <label
                htmlFor="arquivo-importacao"
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed py-8 px-4 cursor-pointer transition-colors hover:opacity-80"
                style={{ borderColor: colors.border }}
              >
                <Upload className="w-8 h-8" style={{ color: colors.primary }} />
                <span className="text-sm font-medium" style={{ color: colors.secondary }}>
                  {arquivo ? arquivo.name : "Clique para escolher o ficheiro .xlsx"}
                </span>
                <span className="text-xs" style={{ color: colors.textSecondary }}>
                  Tamanho máximo: 5MB
                </span>
                <input
                  id="arquivo-importacao"
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleArquivo}
                  disabled={carregando}
                />
              </label>

              <a
                href="/templates/template_importacao_clientes.xlsx"
                download
                className="flex items-center gap-1.5 text-xs font-medium w-fit transition-colors hover:opacity-70"
                style={{ color: colors.secondary }}
              >
                <Download className="w-3.5 h-3.5" />
                Baixar modelo de planilha
              </a>

              {erroGeral && (
                <div className="flex items-start gap-2 p-3 text-sm bg-red-50 text-red-700 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{erroGeral}</span>
                </div>
              )}
            </>
          )}

          {resultado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-3" style={{ background: colors.primary }}>
                  <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: colors.text }} />
                  <div>
                    <p className="text-lg font-bold" style={{ color: colors.text }}>
                      {resultado.total_sucesso}
                    </p>
                    <p className="text-xs" style={{ color: colors.text }}>
                      Importados
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3" style={{ background: colors.primary }}>
                  <AlertCircle className="w-5 h-5" style={{ color: colors.secondary }} />
                  <div>
                    <p className="text-lg font-bold" style={{ color: colors.secondary }}>
                      {resultado.total_erros}
                    </p>
                    <p className="text-xs" style={{ color: colors.secondary }}>
                      Com erro
                    </p>
                  </div>
                </div>
              </div>

              {resultado.erros.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: colors.textSecondary }}>
                    Linhas com erro:
                  </p>
                  <div className="border max-h-40 overflow-y-auto" style={{ borderColor: colors.border }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ backgroundColor: colors.background }}>
                          <th className="text-left px-2 py-1.5 font-medium" style={{ color: colors.textSecondary }}>
                            Linha
                          </th>
                          <th className="text-left px-2 py-1.5 font-medium" style={{ color: colors.textSecondary }}>
                            Nome
                          </th>
                          <th className="text-left px-2 py-1.5 font-medium" style={{ color: colors.textSecondary }}>
                            Erro
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.erros.map((e, i) => (
                          <tr key={i} className="border-t" style={{ borderColor: colors.border }}>
                            <td className="px-2 py-1.5">{e.linha}</td>
                            <td className="px-2 py-1.5">{e.nome}</td>
                            <td className="px-2 py-1.5" style={{ color: colors.secondary }}>
                              {e.erro}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t shrink-0" style={{ borderColor: colors.border }}>
          {!resultado ? (
            <>
              <button
                onClick={handleClose}
                disabled={carregando}
                className="px-4 py-2 text-sm font-medium transition-colors hover:opacity-70"
                style={{ color: colors.textSecondary }}
              >
                Cancelar
              </button>
              <button
                onClick={handleImportar}
                disabled={!arquivo || carregando}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: colors.primary }}
              >
                {carregando && <Loader2 className="w-4 h-4 animate-spin" />}
                {carregando ? "A importar..." : "Importar"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={resetar}
                className="px-4 py-2 text-sm font-medium transition-colors hover:opacity-70"
                style={{ color: colors.textSecondary }}
              >
                Importar outro ficheiro
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: colors.secondary }}
              >
                Concluir
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};