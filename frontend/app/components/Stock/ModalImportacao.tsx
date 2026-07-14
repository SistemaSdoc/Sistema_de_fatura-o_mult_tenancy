"use client";

import React, { useState, useRef } from "react";
import { Upload, X, CheckCircle2, AlertCircle,  Loader2, Download } from "lucide-react";
import produtoService, { ImportarProdutosResponse } from "@/services/produtos";

interface ModalImportacaoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  colors: any;
}

export function ModalImportacao({ isOpen, onClose, onSuccess, colors }: ModalImportacaoProps) {
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ImportarProdutosResponse | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetar = () => {
    setFicheiro(null);
    setResultado(null);
    setErroGeral(null);
    setEnviando(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClose = () => {
    resetar();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setFicheiro(file);
  };

  const handleImportar = async () => {
    if (!ficheiro) return;

    setEnviando(true);
    setErroGeral(null);

    try {
      const resposta = await produtoService.importarProdutos(ficheiro);
      setResultado(resposta);

      const totalSucesso = resposta.produtos.total_sucesso + resposta.servicos.total_sucesso;
      if (totalSucesso > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setErroGeral(err?.response?.data?.error || err?.response?.data?.message || "Erro ao importar o ficheiro.");
    } finally {
      setEnviando(false);
    }
  };

  const totalSucesso = resultado ? resultado.produtos.total_sucesso + resultado.servicos.total_sucesso : 0;
  const totalErros = resultado ? resultado.produtos.total_erros + resultado.servicos.total_erros : 0;
  const totalIgnorados = resultado ? resultado.produtos.total_ignorados + resultado.servicos.total_ignorados : 0;
  const todosOsErros = resultado ? [...resultado.produtos.erros, ...resultado.servicos.erros] : [];
  const todosOsIgnorados = resultado ? [...resultado.produtos.ignorados, ...resultado.servicos.ignorados] : [];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-2 sm:p-4 animate-in fade-in-0 duration-200">
      <div
        className="shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 fade-in-0 duration-300 flex flex-col"
        style={{ backgroundColor: colors.card }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: colors.border }}
        >
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-semibold" style={{ color: colors.secondary }}>
              Importar Produtos e Serviços
            </h2>
          </div>
          <button onClick={handleClose} className="p-1 hover:opacity-70 transition-opacity" disabled={enviando}>
            <X className="w-5 h-5" style={{ color: colors.textSecondary }} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {!resultado && (
            <>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Carrega o ficheiro Excel preenchido folhas Produtos e Serviços para criar vários itens de uma vez.
              </p>

              <label
                htmlFor="ficheiro-importacao"
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed py-8 px-4 cursor-pointer transition-colors hover:opacity-80"
                style={{ borderColor: colors.border }}
              >
                <Upload className="w-8 h-8" style={{ color: colors.primary }} />
                <span className="text-sm font-medium" style={{ color: colors.secondary }}>
                  {ficheiro ? ficheiro.name : "Clique para escolher o ficheiro .xlsx"}
                </span>
                <span className="text-xs" style={{ color: colors.textSecondary }}>
                  Tamanho máximo: 5MB
                </span>
                <input
                  id="ficheiro-importacao"
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={enviando}
                />
              </label>

              {/* Link do template - ADICIONADO */}
              <a 
                href="/templates/FaturaJa_Template_Importacao.xlsx"
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
              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center gap-2 p-3" style={{ background: colors.primary }}>
                  <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: colors.text }} />
                  <div>
                    <p className="text-lg font-bold" style={{ color: colors.text }}>{totalSucesso}</p>
                    <p className="text-xs" style={{ color: colors.text }}>Criados</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3" style={{ background: colors.secondary }}>
                  <AlertCircle className="w-5 h-5 shrink-0" style={{ color: colors.text }} />
                  <div>
                    <p className="text-lg font-bold" style={{ color: colors.text }}>{totalIgnorados}</p>
                    <p className="text-xs" style={{ color: colors.text }}>Já existiam</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3" style={{ background: colors.primary }}>
                  <AlertCircle className="w-5 h-5" style={{ color: colors.secondary }} />
                  <div>
                    <p className="text-lg font-bold" style={{ color: colors.secondary }}>{totalErros}</p>
                    <p className="text-xs" style={{ color: colors.secondary }}>Com erro</p>
                  </div>
                </div>
              </div>

              <div className="text-xs space-y-0.5" style={{ color: colors.textSecondary }}>
                <p>
                  Produtos: {resultado.produtos.total_sucesso} criado(s) / {resultado.produtos.total_ignorados} já
                  existia(m) / {resultado.produtos.total_erros} erro(s)
                </p>
                <p>
                  Serviços: {resultado.servicos.total_sucesso} criado(s) / {resultado.servicos.total_ignorados} já
                  existia(m) / {resultado.servicos.total_erros} erro(s)
                </p>
              </div>

              {todosOsIgnorados.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: colors.textSecondary }}>
                    Linhas já existentes (ignoradas):
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
                            Motivo
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {todosOsIgnorados.map((e, i) => (
                          <tr key={i} className="border-t" style={{ borderColor: colors.border }}>
                            <td className="px-2 py-1.5">{e.linha}</td>
                            <td className="px-2 py-1.5">{e.nome}</td>
                            <td className="px-2 py-1.5" style={{ color: colors.secondary }}>{e.motivo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {todosOsErros.length > 0 && (
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
                        {todosOsErros.map((e, i) => (
                          <tr key={i} className="border-t" style={{ borderColor: colors.border }}>
                            <td className="px-2 py-1.5">{e.linha}</td>
                            <td className="px-2 py-1.5">{e.nome}</td>
                            <td className="px-2 py-1.5" style={{ color: colors.secondary }}>{e.erro}</td>
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
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: colors.border }}>
          {!resultado ? (
            <>
              <button
                onClick={handleClose}
                disabled={enviando}
                className="px-4 py-2 text-sm font-medium transition-colors hover:opacity-70"
                style={{ color: colors.textSecondary }}
              >
                Cancelar
              </button>
              <button
                onClick={handleImportar}
                disabled={!ficheiro || enviando}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: colors.primary }}
              >
                {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
                {enviando ? "A importar..." : "Importar"}
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
}