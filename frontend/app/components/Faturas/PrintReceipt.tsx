"use client";

import Image from 'next/image';
import {
    DocumentoFiscal,
    TipoDocumento,
    ItemDocumento,
} from "@/services/DocumentoFiscal";
import { useThemeColors } from "@/context/ThemeContext";
import { useState, useEffect } from 'react';
import api from "@/services/axios";
import { Printer, X, Receipt, Hash, Banknote, User, FileText } from "lucide-react";

interface PrintReceiptProps {
    documento: DocumentoFiscal | null;
    isOpen: boolean;
    onClose: () => void;
    formatKz: (valor: number | string | undefined) => string;
    formatQuantidade: (qtd: number | string | undefined) => string;
    documentoFiscalService: {
        getTipoDocumentoNome: (tipo: TipoDocumento) => string;
        getNomeCliente: (doc: DocumentoFiscal) => string;
        getNifCliente: (doc: DocumentoFiscal) => string | null;
    };
}

const TIPOS_TALAO: TipoDocumento[] = ['FR', 'RC'];

export default function PrintReceipt({
    documento,
    isOpen,
    onClose,
    formatKz,
    formatQuantidade,
    documentoFiscalService,
}: PrintReceiptProps) {
    const colors = useThemeColors();
    const [documentoOrigem, setDocumentoOrigem] = useState<DocumentoFiscal | null>(null);

    useEffect(() => {
        if (!isOpen || !documento) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDocumentoOrigem(null);
            return;
        }

        if (documento.tipo_documento === 'RC' && documento.fatura_id) {
            api.get(`/api/documentos-fiscais/${documento.fatura_id}`)
                .then(response => {
                    if (response.data.success) {
                        setDocumentoOrigem(response.data.data.documento);
                    }
                })
                .catch(() => setDocumentoOrigem(null));
        } else {
            setDocumentoOrigem(null);
        }
    }, [isOpen, documento]);

    if (!isOpen || !documento) return null;
    if (!TIPOS_TALAO.includes(documento.tipo_documento)) return null;

    const docInfo = documentoOrigem || documento;
    const itensParaMostrar: ItemDocumento[] = documentoOrigem?.itens || documento.itens || [];

    const formatTaxaIva = (taxa?: number) => (!taxa || taxa === 0 ? '-' : `${taxa}%`);
    const formatTaxaRetencao = (taxa?: number) => (!taxa || taxa === 0 ? '-' : `${taxa}%`);
    const formatValorRetencao = (valor?: number) =>
        (!valor || valor === 0 ? '-' : `-${formatKz(valor)}`);

    const calcularTaxaRetencaoItem = (item: ItemDocumento): number | undefined => {
        if (!item.valor_retencao || item.valor_retencao === 0) return undefined;
        if (item.taxa_retencao && item.taxa_retencao > 0) return item.taxa_retencao;
        return 6.5;
    };

    /**
     * Imprime o talão directamente numa iframe invisível.
     * Sem modal de pré-visualização — dispara window.print() imediatamente.
     */
    const handlePrint = () => {
        const iframe = document.createElement("iframe");
        iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        const itensPrint: ItemDocumento[] = documentoOrigem?.itens || documento.itens || [];

        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>${documentoFiscalService.getTipoDocumentoNome(documento.tipo_documento)} - ${documento.numero_documento}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; width: 80mm; font-size: 12px; line-height: 1.4; }
    .container { width: 80mm; padding: 4mm; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .small { font-size: 10px; }
    .tiny { font-size: 9px; }
    .sep-dash { border: none; border-top: 1px dashed #666; margin: 6px 0; }
    .sep-solid { border: none; border-top: 2px solid #333; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; }
    .col-half { width: 50%; }
    .col-third { width: 33.333%; }
    .col-sixth { width: 16.666%; }
    .logo { width: 55px; height: 55px; object-fit: contain; display: block; margin: 0 auto 6px; }
    .item-taxas { display: flex; justify-content: space-between; font-size: 9px; color: #555; margin-top: 2px; }
    .origem-box { background: #f0f0f0; padding: 4px 6px; margin-bottom: 6px; font-size: 10px; }
    .bank-block { font-size: 10px; text-align: center; }
    .bank-block p { margin-bottom: 2px; }
  </style>
</head>
<body>
<div class="container">

  <!-- Cabeçalho -->
  <div class="center" style="border-bottom:1px dashed #666; padding-bottom:10px; margin-bottom:10px;">
    <img src="/images/4.png" alt="Logo" class="logo" />
    <div class="bold" style="font-size:15px; text-transform:uppercase;">Faturajá</div>
    <div class="small">NIF: 5417243423</div>
    <div class="small">Luanda, Angola</div>
    <div class="small">Tel: +244 999 999 999</div>
  </div>

  <!-- Tipo e Número -->
  <div style="border-bottom:1px dashed #666; padding-bottom:6px; margin-bottom:6px;">
    <div class="row bold" style="font-size:13px;">
      <span>${documentoFiscalService.getTipoDocumentoNome(documento.tipo_documento)}</span>
      <span>Nº ${documento.numero_documento}</span>
    </div>
    <div class="row small">
      <span>Série: ${documento.serie}</span>
      <span>${new Date(documento.data_emissao).toLocaleDateString("pt-AO")} ${documento.hora_emissao || ''}</span>
    </div>
  </div>

  ${documento.tipo_documento === 'RC' && docInfo && docInfo !== documento ? `
  <div class="origem-box">
    <strong>Referente a:</strong> ${documentoFiscalService.getTipoDocumentoNome(docInfo.tipo_documento)} Nº ${docInfo.numero_documento}
  </div>` : ''}

  <!-- Cliente -->
  <div style="border-bottom:1px dashed #666; padding-bottom:6px; margin-bottom:6px;">
    <div class="bold small">Cliente: ${documentoFiscalService.getNomeCliente(docInfo)}</div>
    ${documentoFiscalService.getNifCliente(docInfo) ? `<div class="small">NIF: ${documentoFiscalService.getNifCliente(docInfo)}</div>` : ''}
  </div>

  <!-- Itens -->
  <div style="border-bottom:2px dashed #666; padding-bottom:6px; margin-bottom:6px;">
    <div class="row bold small" style="border-bottom:1px solid #ccc; padding-bottom:3px; margin-bottom:4px;">
      <span class="col-half">Descrição</span>
      <span class="col-sixth" style="text-align:center;">Qtd</span>
      <span class="col-third" style="text-align:right;">Total</span>
    </div>
    ${itensPrint.length > 0
            ? itensPrint.map(item => {
                const taxaRet = calcularTaxaRetencaoItem(item);
                return `
      <div style="margin-bottom:5px;">
        <div class="small" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.descricao}</div>
        <div class="row small">
          <span class="col-half">${formatKz(item.preco_unitario)}</span>
          <span class="col-sixth" style="text-align:center;">${formatQuantidade(item.quantidade)}</span>
          <span class="col-third bold" style="text-align:right;">${formatKz(item.total_linha)}</span>
        </div>
        <div class="item-taxas">
          <span style="color:#2563eb;">IVA: ${formatTaxaIva(item.taxa_iva)}</span>
          <span style="color:#dc2626;">Ret: ${formatTaxaRetencao(taxaRet)}</span>
        </div>
      </div>`;
            }).join('')
            : '<div class="center small" style="color:#888; padding:6px 0;">Nenhum item</div>'
        }
  </div>

  <!-- Totais -->
  <div style="border-bottom:1px dashed #666; padding-bottom:6px; margin-bottom:6px;">
    <div class="row small"><span>Base Tributável:</span><span>${formatKz(docInfo.base_tributavel)}</span></div>
    <div class="row small"><span>Total IVA:</span><span>${formatKz(docInfo.total_iva)}</span></div>
    <div class="row small"><span>Total Retenção:</span><span style="color:#dc2626;">${formatValorRetencao(docInfo.total_retencao)}</span></div>
    <div class="row bold" style="font-size:14px; border-top:2px solid #333; margin-top:4px; padding-top:4px;">
      <span>TOTAL:</span>
      <span>${formatKz(documento.total_liquido)}</span>
    </div>
  </div>

  ${documento.hash_fiscal ? `
  <!-- Hash Fiscal -->
  <div class="center" style="margin-bottom:8px; padding:4px 0;">
    <div class="bold small">Hash Fiscal:</div>
    <div class="tiny" style="word-break:break-all; line-height:1.3;">${documento.hash_fiscal}</div>
  </div>` : ''}

  <!-- Dados Bancários -->
  <div class="bank-block" style="border-top:1px dashed #666; padding-top:8px;">
    <div class="bold small" style="margin-bottom:4px;">Coordenadas bancárias</div>
    <p class="small">Banco: BAI</p>
    <p class="small">IBAN: AO06 0004 0000 1234 5678 9012 3</p>
    <p class="bold small" style="margin-top:6px;">Obrigado pela preferência!</p>
    <p class="small" style="margin-top:4px;">*** Fim do Documento ***</p>
  </div>

</div>
<script>
  window.onload = function() {
    window.focus();
    window.print();
    setTimeout(function() { window.close(); }, 200);
  };
</script>
</body>
</html>`;

        doc.open();
        doc.write(htmlContent);
        doc.close();

        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 2000);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
                style={{ backgroundColor: colors.card }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Cabeçalho do modal */}
                <div
                    className="px-4 py-3 flex justify-between items-center shrink-0"
                    style={{ backgroundColor: colors.primary }}
                >
                    <div className="min-w-0 flex-1 mr-3">
                        <div className="flex items-center gap-2">
                            <Receipt size={20} className="text-white shrink-0" />
                            <h2 className="text-base font-bold truncate text-white">
                                {documento.tipo_documento === "RC" ? "Recibo" : "Fatura-Recibo"}
                            </h2>
                        </div>
                        <p className="text-sm truncate text-white/80 mt-0.5">
                            Nº {documento.numero_documento}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handlePrint}
                            className="px-3 py-2 rounded-lg transition-colors text-white hover:bg-white/20 touch-manipulation flex items-center gap-2 text-sm font-medium"
                            title="Imprimir agora"
                        >
                            <Printer size={18} />
                            <span>Imprimir</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg transition-colors text-white hover:bg-white/20 touch-manipulation"
                            title="Fechar"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Pré-visualização do talão */}
                <div className="flex-1 overflow-y-auto p-0" style={{ backgroundColor: colors.hover }}>
                    <div
                        className="mx-auto"
                        style={{ width: '80mm', minHeight: '100%', backgroundColor: 'white' }}
                    >
                        <div className="p-3 font-mono text-xs leading-relaxed">

                            {/* Cabeçalho */}
                            <div
                                className="text-center border-b-2 border-dashed pb-3 mb-3"
                                style={{ borderColor: colors.border }}
                            >
                                <div className="flex justify-center mb-2">
                                    <Image
                                        src="/images/4.png"
                                        alt="Logo"
                                        width={55}
                                        height={55}
                                        className="w-14 h-14 object-contain"
                                    />
                                </div>
                                <h1 className="text-base font-bold uppercase mb-1" style={{ color: colors.primary }}>
                                    Faturajá
                                </h1>
                                <p className="text-[10px]" style={{ color: colors.textSecondary }}>NIF: 5417243423</p>
                                <p className="text-[10px]" style={{ color: colors.textSecondary }}>Luanda, Angola</p>
                                <p className="text-[10px]" style={{ color: colors.textSecondary }}>Tel: +244 999 999 999</p>
                            </div>

                            {/* Tipo e Número */}
                            <div className="border-b border-dashed pb-2 mb-2" style={{ borderColor: colors.border }}>
                                <div className="flex justify-between font-bold text-sm" style={{ color: colors.text }}>
                                    <span>{documentoFiscalService.getTipoDocumentoNome(documento.tipo_documento)}</span>
                                    <span>Nº {documento.numero_documento}</span>
                                </div>
                                <div className="flex justify-between text-[10px]" style={{ color: colors.textSecondary }}>
                                    <span>Série: {documento.serie}</span>
                                    <span>
                                        {new Date(documento.data_emissao).toLocaleDateString("pt-AO")}{' '}
                                        {documento.hora_emissao}
                                    </span>
                                </div>
                            </div>

                            {/* Referência de origem (para RC) */}
                            {documento.tipo_documento === 'RC' && documentoOrigem && (
                                <div
                                    className="rounded p-2 mb-2 text-[10px]"
                                    style={{ backgroundColor: colors.hover }}
                                >
                                    <p className="font-semibold" style={{ color: colors.text }}>
                                        <FileText size={12} className="inline mr-1" />
                                        Referente a:{' '}
                                        {documentoFiscalService.getTipoDocumentoNome(documentoOrigem.tipo_documento)}{' '}
                                        Nº {documentoOrigem.numero_documento}
                                    </p>
                                </div>
                            )}

                            {/* Cliente */}
                            <div className="border-b border-dashed pb-2 mb-2" style={{ borderColor: colors.border }}>
                                <p className="font-bold text-xs" style={{ color: colors.text }}>
                                    <User size={12} className="inline mr-1" />
                                    Cliente: {documentoFiscalService.getNomeCliente(docInfo)}
                                </p>
                                {documentoFiscalService.getNifCliente(docInfo) && (
                                    <p className="text-[10px] mt-0.5" style={{ color: colors.textSecondary }}>
                                        NIF: {documentoFiscalService.getNifCliente(docInfo)}
                                    </p>
                                )}
                            </div>

                            {/* Itens */}
                            <div className="border-b-2 border-dashed pb-2 mb-2" style={{ borderColor: colors.border }}>
                                <div
                                    className="flex justify-between font-bold border-b pb-1 mb-1 text-xs"
                                    style={{ borderColor: colors.border }}
                                >
                                    <span className="w-1/2" style={{ color: colors.primary }}>Descrição</span>
                                    <span className="w-1/6 text-center" style={{ color: colors.primary }}>Qtd</span>
                                    <span className="w-1/3 text-right" style={{ color: colors.primary }}>Total</span>
                                </div>
                                {itensParaMostrar.length > 0 ? (
                                    itensParaMostrar.map((item: ItemDocumento, idx: number) => {
                                        const taxaRet = calcularTaxaRetencaoItem(item);
                                        return (
                                            <div key={idx} className="mb-1">
                                                <div className="truncate text-xs" style={{ color: colors.text }}>
                                                    {item.descricao}
                                                </div>
                                                <div className="flex justify-between text-[10px]">
                                                    <span className="w-1/2 truncate" style={{ color: colors.textSecondary }}>
                                                        {formatKz(item.preco_unitario)}
                                                    </span>
                                                    <span className="w-1/6 text-center" style={{ color: colors.textSecondary }}>
                                                        {formatQuantidade(item.quantidade)}
                                                    </span>
                                                    <span className="w-1/3 text-right font-semibold" style={{ color: colors.secondary }}>
                                                        {formatKz(item.total_linha)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-[9px] mt-0.5">
                                                    <span className="text-blue-600">IVA: {formatTaxaIva(item.taxa_iva)}</span>
                                                    {taxaRet && (
                                                        <span className="text-red-600">Ret: {formatTaxaRetencao(taxaRet)}</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center text-[10px] py-2" style={{ color: colors.textSecondary }}>
                                        Nenhum item
                                    </div>
                                )}
                            </div>

                            {/* Totais */}
                            <div className="border-b border-dashed pb-2 mb-2" style={{ borderColor: colors.border }}>
                                <div className="flex justify-between text-[10px]" style={{ color: colors.textSecondary }}>
                                    <span>Base Tributável:</span>
                                    <span className="font-medium">{formatKz(docInfo.base_tributavel)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] mt-0.5" style={{ color: colors.textSecondary }}>
                                    <span>Total IVA:</span>
                                    <span className="font-medium">{formatKz(docInfo.total_iva)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] mt-0.5" style={{ color: colors.textSecondary }}>
                                    <span>Total Retenção:</span>
                                    <span className="font-medium text-red-600">
                                        {formatValorRetencao(docInfo.total_retencao)}
                                    </span>
                                </div>
                                <div
                                    className="flex justify-between font-bold text-sm border-t-2 pt-2 mt-2"
                                    style={{ borderColor: colors.primary, color: colors.primary }}
                                >
                                    <span>TOTAL:</span>
                                    <span>{formatKz(documento.total_liquido)}</span>
                                </div>
                            </div>

                            {/* Hash Fiscal */}
                            {documento.hash_fiscal && (
                                <div
                                    className="text-center mb-2 p-2 rounded"
                                    style={{ backgroundColor: colors.hover }}
                                >
                                    <p
                                        className="text-[10px] font-bold mb-1"
                                        style={{ color: colors.textSecondary }}
                                    >
                                        <Hash size={12} className="inline mr-1" />
                                        Hash Fiscal:
                                    </p>
                                    <p
                                        className="text-[9px] break-all leading-relaxed font-mono"
                                        style={{ color: colors.text }}
                                    >
                                        {documento.hash_fiscal}
                                    </p>
                                </div>
                            )}

                            {/* Dados Bancários */}
                            <div
                                className="text-center pt-2 border-t border-dashed"
                                style={{ borderColor: colors.border }}
                            >
                                <p className="text-xs font-bold mb-2" style={{ color: colors.secondary }}>
                                    <Banknote size={14} className="inline mr-1" />
                                    Coordenadas bancárias
                                </p>
                                <p className="text-[10px]" style={{ color: colors.textSecondary }}>Banco: BAI</p>
                                <p className="text-[10px]" style={{ color: colors.textSecondary }}>
                                    IBAN: AO06 0004 0000 1234 5678 9012 3
                                </p>
                                <p className="mt-2 font-bold text-xs" style={{ color: colors.secondary }}>
                                    Obrigado pela preferência!
                                </p>
                                <p className="mt-1 text-[10px]" style={{ color: colors.textSecondary }}>
                                    *** Fim do Documento ***
                                </p>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}