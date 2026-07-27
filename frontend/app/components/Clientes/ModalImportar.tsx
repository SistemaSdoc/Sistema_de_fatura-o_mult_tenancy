"use client";

import React, { useState, useRef, useEffect } from "react";
import { Modal } from "@/app/components/Clientes/Modal";
import { createPortal } from "react-dom";
import {
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Loader2,
  Download,
  RefreshCcw,
  AlertTriangle,
} from "lucide-react";
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
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar Clientes" colors={colors}>
      <div className="flex flex-col">
        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {!resultado ? (
            <>
              {!arquivo ? (
                <label
                  className="flex flex-col items-center justify-center gap-2 border-2 border-dashed cursor-pointer py-10 px-4 text-center transition-colors hover:opacity-80"
                  style={{ borderColor: colors.border }}
                >
                  <Upload className="w-8 h-8" style={{ color: colors.textSecondary }} />
                  <p className="text-sm font-medium" style={{ color: colors.text }}>
                    Clica para escolher um ficheiro
                  </p>
                  <p className="text-xs" style={{ color: colors.textSecondary }}>
                    Formatos aceites: .xlsx, .xls
                  </p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleArquivo}
                  />
                </label>
              ) : (
                <div
                  className="flex items-center justify-between gap-2 p-3 border"
                  style={{ borderColor: colors.border }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileSpreadsheet className="w-5 h-5 shrink-0" style={{ color: colors.primary }} />
                    <span className="text-sm truncate" style={{ color: colors.text }}>
                      {arquivo.name}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setArquivo(null);
                      if (inputRef.current) inputRef.current.value = "";
                    }}
                    disabled={carregando}
                    className="shrink-0 hover:opacity-70"
                  >
                    <X className="w-4 h-4" style={{ color: colors.textSecondary }} />
                  </button>
                </div>
              )}

              {erroGeral && (
                <div className="flex items-center gap-2 p-3" style={{ background: colors.primary }}>
                  <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: colors.secondary }} />
                  <p className="text-xs" style={{ color: colors.secondary }}>
                    {erroGeral}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {resultado.total_sucesso > 0 ? (
                  <CheckCircle2 className="w-5 h-5" style={{ color: colors.primary }} />
                ) : (
                  <AlertCircle className="w-5 h-5" style={{ color: colors.secondary }} />
                )}
                <p className="text-sm font-medium" style={{ color: colors.text }}>
                  {resultado.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-3" style={{ background: colors.primary }}>
                  <CheckCircle2 className="w-5 h-5" style={{ color: colors.text }} />
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
        <div
          className="flex items-center justify-end gap-2 px-5 py-4 border-t shrink-0"
          style={{ borderColor: colors.border }}
        >
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
    </Modal>
  );

  return createPortal(modalContent, document.body);
};