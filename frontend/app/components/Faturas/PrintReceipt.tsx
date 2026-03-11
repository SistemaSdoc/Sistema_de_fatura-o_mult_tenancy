"use client";

import Image from 'next/image';
import {
  DocumentoFiscal,
  TipoDocumento,
  ItemDocumento
} from "@/services/DocumentoFiscal";
import { useThemeColors } from "@/context/ThemeContext";
import { useState, useEffect } from 'react';
import api from "@/services/axios";

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

// Apenas FR e RC podem ser impressos
const TIPOS_IMPRESSAO: TipoDocumento[] = ['FR', 'RC'];

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
            const faturaOrigem = response.data.data.documento;
            setDocumentoOrigem(faturaOrigem);
          }
        })
        .catch(error => {
          console.error('Erro ao buscar fatura de origem:', error);
          setDocumentoOrigem(null);
        });
    } else {
      setDocumentoOrigem(null);
    }
  }, [isOpen, documento]);

  if (!isOpen || !documento) return null;

  const podeImprimir = (tipo: TipoDocumento): boolean => {
    return TIPOS_IMPRESSAO.includes(tipo);
  };

  if (!podeImprimir(documento.tipo_documento)) return null;

  // Determina quais itens mostrar baseado no documentoOrigem
  const itensParaMostrar = documentoOrigem?.itens || documento?.itens || [];

  const formatTaxaIva = (taxa: number | undefined): string => {
    if (!taxa || taxa === 0) return '-';
    return `${taxa}%`;
  };

  const formatTaxaRetencao = (taxa: number | undefined): string => {
    if (!taxa || taxa === 0) return '-';
    return `${taxa}%`;
  };

  const formatValorRetencao = (valor: number | undefined): string => {
    if (!valor || valor === 0) return '-';
    return `-${formatKz(valor)}`;
  };

  const calcularTaxaRetencaoItem = (item: ItemDocumento): number | undefined => {
    if (!item.valor_retencao || item.valor_retencao === 0) return undefined;
    if (item.taxa_retencao && item.taxa_retencao > 0) return item.taxa_retencao;
    return 6.5;
  };

  const handlePrint = () => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const docInfo = documentoOrigem || documento;
    const itensPrint = documentoOrigem?.itens || documento.itens || [];

    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Talão</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body {
            font-family: 'Courier New', monospace;
            margin: 0;
            padding: 0;
            width: 80mm;
            font-size: 11px;
            line-height: 1.3;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          .container { width: 80mm; padding: 3mm; }
          
          .text-center { text-align: center; }
          .center { margin-left: auto; margin-right: auto; display: block; }
          
          .logo-container { 
            text-align: center; 
            margin-bottom: 6px; 
            width: 100%;
          }
          .logo {
            width: 48px;
            height: 48px;
            object-fit: contain;
            margin: 0 auto;
            display: block;
          }
          
          .font-bold { font-weight: bold; }
          .text-sm { font-size: 12px; }
          .text-xs { font-size: 10px; }
          .text-10 { font-size: 10px; }
          .text-9 { font-size: 9px; }
          
          .border-b { border-bottom: 1px dashed #666; }
          .border-b-2 { border-bottom: 2px dashed #666; }
          .border-t { border-top: 1px dashed #666; }
          .border-t-2 { border-top: 2px solid #333; }
          .pb-1 { padding-bottom: 4px; }
          .pb-2 { padding-bottom: 8px; }
          .pb-3 { padding-bottom: 12px; }
          .pt-1 { padding-top: 4px; }
          .pt-2 { padding-top: 8px; }
          .mb-1 { margin-bottom: 4px; }
          .mb-2 { margin-bottom: 8px; }
          .mb-3 { margin-bottom: 12px; }
          .mt-1 { margin-top: 4px; }
          .mt-2 { margin-top: 8px; }
          
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .w-1-2 { width: 50%; }
          .w-1-3 { width: 33.333%; }
          .w-1-6 { width: 16.666%; }
          
          .truncate { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
          .break-all { word-break: break-all; }
          .uppercase { text-transform: uppercase; }
          
          .header-info {
            text-align: center;
            border-bottom: 2px dashed #666;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .header-info h1 {
            text-align: center;
            font-size: 13px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 3px;
          }
          .header-info p {
            text-align: center;
            font-size: 9px;
            margin-bottom: 2px;
          }
          
          .hash-section {
            text-align: center;
            margin-bottom: 6px;
          }
          .hash-section p {
            text-align: center;
            font-size: 8px;
            word-break: break-all;
            line-height: 1.2;
          }
          .hash-label {
            font-weight: bold;
            text-align: center;
            margin-bottom: 2px;
          }
          
          .bank-section {
            text-align: center;
            padding-top: 6px;
            border-top: 1px dashed #666;
          }
          .bank-section p {
            text-align: center;
            font-size: 9px;
            margin-bottom: 2px;
          }
          .bank-title {
            font-weight: bold;
            text-align: center;
            margin-bottom: 3px;
          }
          .thank-you {
            font-weight: bold;
            text-align: center;
            margin-top: 6px;
            font-size: 9px;
          }
          .end-doc {
            text-align: center;
            margin-top: 6px;
            font-size: 9px;
          }
          
          .item-taxas {
            display: flex;
            justify-content: space-between;
            font-size: 8px;
            margin-top: 2px;
            color: #666;
          }
          .taxa-iva { color: #2563eb; }
          .taxa-retencao { color: #dc2626; }
          
          .origem-info {
            background: #f3f4f6;
            padding: 3px 6px;
            margin-bottom: 6px;
            border-radius: 3px;
            font-size: 8px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header-info">
            <div class="logo-container">
              <img src="/images/4.png" alt="Logo Faturajá" class="logo" width="48" height="48" />
            </div>
            <h1>Faturajá</h1>
            <p>NIF: ****************</p>
            <p>Endereço: **************</p>
            <p>Tel: +244 **************</p>
          </div>

          <div class="border-b pb-1 mb-1">
            <div class="flex justify-between font-bold text-xs">
              <span>${documentoFiscalService.getTipoDocumentoNome(documento.tipo_documento)}</span>
              <span>Nº ${documento.numero_documento}</span>
            </div>
            <div class="flex justify-between text-9">
              <span>Série: ${documento.serie}</span>
              <span>${new Date(documento.data_emissao).toLocaleDateString("pt-AO")} ${documento.hora_emissao || ''}</span>
            </div>
          </div>

          ${documento.tipo_documento === 'RC' && docInfo ? `
            <div class="origem-info">
              <p><strong>Referente a:</strong> ${documentoFiscalService.getTipoDocumentoNome(docInfo.tipo_documento)} Nº ${docInfo.numero_documento}</p>
            </div>
          ` : ''}

          <div class="border-b pb-1 mb-1">
            <p class="font-bold text-xs">Cliente: ${documentoFiscalService.getNomeCliente(docInfo)}</p>
            ${documentoFiscalService.getNifCliente(docInfo) ? `<p class="text-9">NIF: ${documentoFiscalService.getNifCliente(docInfo)}</p>` : ''}
          </div>

          <div class="border-b-2 pb-1 mb-1">
            <div class="flex justify-between font-bold border-b pb-0.5 mb-0.5 text-9">
              <span class="w-1-2">Descrição</span>
              <span class="w-1-6 text-center">Qtd</span>
              <span class="w-1-3" style="text-align: right;">Total</span>
            </div>
            ${itensPrint && itensPrint.length > 0
        ? itensPrint.map((item) => {
          const taxaRet = calcularTaxaRetencaoItem(item);
          return `
                <div class="mb-0.5">
                  <div class="truncate text-9">${item.descricao}</div>
                  <div class="flex justify-between text-9">
                    <span class="w-1-2 truncate">${formatKz(item.preco_unitario)}</span>
                    <span class="w-1-6 text-center">${formatQuantidade(item.quantidade)}</span>
                    <span class="w-1-3 font-bold" style="text-align: right;">${formatKz(item.total_linha)}</span>
                  </div>
                  <div class="item-taxas">
                    <span class="taxa-iva">IVA: ${formatTaxaIva(item.taxa_iva)}</span>
                    <span class="taxa-retencao">Ret: ${formatTaxaRetencao(taxaRet)}</span>
                  </div>
                </div>
              `;
        }).join('')
        : '<div class="text-center text-9" style="color: #666; padding: 4px 0;">Nenhum item</div>'
      }
          </div>

          <div class="border-b pb-1 mb-1">
            <div class="flex justify-between text-9">
              <span>Base Tributável:</span>
              <span>${formatKz(docInfo.base_tributavel)}</span>
            </div>
            <div class="flex justify-between text-9">
              <span>Total IVA:</span>
              <span>${formatKz(docInfo.total_iva)}</span>
            </div>
            <div class="flex justify-between text-9">
              <span>Total Retenção:</span>
              <span>${formatValorRetencao(docInfo.total_retencao)}</span>
            </div>
            <div class="flex justify-between font-bold text-xs border-t-2 pt-1 mt-1">
              <span>TOTAL:</span>
              <span>${formatKz(documento.total_liquido)}</span>
            </div>
          </div>

          ${documento.hash_fiscal ? `
            <div class="hash-section">
              <p class="hash-label text-9">Hash:</p>
              <p class="text-8">${documento.hash_fiscal}</p>
            </div>
          ` : ''}

          <div class="bank-section">
            <p class="bank-title text-9">Coordenadas bancárias</p>
            <p class="text-9">Bai: 00000000000000000000000000000</p>
            <p class="text-9">Bic: 0000000000000000000000000000</p>
            <p class="thank-you text-9">Obrigado pela preferência!</p>
            <p class="end-doc text-9">*** Fim do Documento ***</p>
          </div>
        </div>
        <script>
          window.onload = function () {
            window.focus();
            window.print();
            setTimeout(() => {
              window.close();
            }, 100);
          };
        </script>
      </body>
    </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="rounded-xl shadow-2xl w-full max-w-[380px] max-h-[90vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: colors.card }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-3 py-2 flex justify-between items-center shrink-0"
          style={{ backgroundColor: colors.primary }}
        >
          <div className="min-w-0 flex-1 mr-2">
            <h2 className="text-sm font-bold truncate text-white">
              {documento.tipo_documento === "RC" ? "Recibo" : "Fatura-Recibo"}
            </h2>
            <p className="text-[10px] truncate text-white/80">
              {documento.numero_documento}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg transition-colors text-white hover:bg-white/20 touch-manipulation"
              title="Imprimir Talão"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors text-white hover:bg-white/20 touch-manipulation"
              title="Fechar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="flex-1 overflow-y-auto p-0" style={{ backgroundColor: colors.hover }}>
          <div className="mx-auto" style={{ width: '76mm', minHeight: '100%', backgroundColor: 'white' }}>
            <div className="p-2 font-mono text-[10px] leading-tight">
              {/* Header */}
              <div className="text-center border-b-2 border-dashed pb-2 mb-2" style={{ borderColor: colors.border }}>
                <div className="flex justify-center mb-1">
                  <Image src="/images/4.png" alt="Logo Faturajá" width={48} height={48} className="w-12 h-12 object-contain" />
                </div>
                <h1 className="text-sm font-bold uppercase mb-0.5 text-center" style={{ color: colors.primary }}>Faturajá</h1>
                <p className="text-[9px] text-center" style={{ color: colors.textSecondary }}>NIF: ****************</p>
                <p className="text-[9px] text-center" style={{ color: colors.textSecondary }}>Endereço:************** </p>
                <p className="text-[9px] text-center" style={{ color: colors.textSecondary }}>Tel: +244 **************</p>
              </div>

              {/* Document Info */}
              <div className="border-b border-dashed pb-1 mb-1" style={{ borderColor: colors.border }}>
                <div className="flex justify-between font-bold text-[10px]" style={{ color: colors.text }}>
                  <span>{documentoFiscalService.getTipoDocumentoNome(documento.tipo_documento)}</span>
                  <span>Nº {documento.numero_documento}</span>
                </div>
                <div className="flex justify-between text-[8px]" style={{ color: colors.textSecondary }}>
                  <span>Série: {documento.serie}</span>
                  <span>{new Date(documento.data_emissao).toLocaleDateString("pt-AO")} {documento.hora_emissao}</span>
                </div>
              </div>

              {/* Info do documento de origem (para recibos) */}
              {documento.tipo_documento === 'RC' && documentoOrigem && (
                <div className="bg-gray-100 p-1 rounded mb-1 text-[8px]" style={{ backgroundColor: colors.hover }}>
                  <p className="font-semibold" style={{ color: colors.text }}>
                    Referente a: {documentoFiscalService.getTipoDocumentoNome(documentoOrigem.tipo_documento)} Nº {documentoOrigem.numero_documento}
                  </p>
                </div>
              )}

              {/* Client */}
              <div className="border-b border-dashed pb-1 mb-1" style={{ borderColor: colors.border }}>
                <p className="font-bold text-[9px]" style={{ color: colors.text }}>
                  Cliente: {documentoFiscalService.getNomeCliente(documentoOrigem || documento)}
                </p>
                {(documentoOrigem ? documentoFiscalService.getNifCliente(documentoOrigem) : documentoFiscalService.getNifCliente(documento)) && (
                  <p className="text-[8px]" style={{ color: colors.textSecondary }}>
                    NIF: {documentoOrigem ? documentoFiscalService.getNifCliente(documentoOrigem) : documentoFiscalService.getNifCliente(documento)}
                  </p>
                )}
              </div>

              {/* Items */}
              <div className="border-b-2 border-dashed pb-1 mb-1" style={{ borderColor: colors.border }}>
                <div className="flex justify-between font-bold border-b pb-0.5 mb-0.5 text-[9px]" style={{ borderColor: colors.border }}>
                  <span className="w-1/2" style={{ color: colors.primary }}>Descrição</span>
                  <span className="w-1/6 text-center" style={{ color: colors.primary }}>Qtd</span>
                  <span className="w-1/6 text-center" style={{ color: colors.primary }}>Iva</span>
                  <span className="w-1/3 text-right" style={{ color: colors.primary }}>Total</span>
                </div>
                {itensParaMostrar && itensParaMostrar.length > 0 ? (
                  itensParaMostrar.map((item: ItemDocumento, idx: number) => {
                    const taxaRet = calcularTaxaRetencaoItem(item);
                    return (
                      <div key={idx} className="mb-0.5">
                        <div className="truncate text-[9px]" style={{ color: colors.text }}>{item.descricao}</div>
                        <div className="flex justify-between text-[8px]">
                          <span className="w-1/2 truncate" style={{ color: colors.textSecondary }}>{formatKz(item.preco_unitario)}</span>
                          <span className="w-1/6 text-center" style={{ color: colors.textSecondary }}>{formatQuantidade(item.quantidade)}</span>
                          <span className="w-1/6 text-center" style={{ color: colors.textSecondary }}>{formatTaxaIva(item.taxa_iva)}</span>
                          <span className="w-1/3 text-right font-semibold" style={{ color: colors.secondary }}>{formatKz(item.total_linha)}</span>
                        </div>
                        <div className="flex justify-between text-[7px] mt-0.5">
                          <span className="text-blue-600">IVA: {formatTaxaIva(item.taxa_iva)}</span>
                          {taxaRet && (
                            <span className="text-red-600">Ret: {formatTaxaRetencao(taxaRet)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-[8px] py-1" style={{ color: colors.textSecondary }}>Nenhum item</div>
                )}
              </div>

              {/* Totals */}
              <div className="border-b border-dashed pb-1 mb-1" style={{ borderColor: colors.border }}>
                <div className="flex justify-between text-[8px]" style={{ color: colors.textSecondary }}>
                  <span>Base Tributável:</span>
                  <span>{formatKz((documentoOrigem || documento).base_tributavel)}</span>
                </div>
                <div className="flex justify-between text-[8px]" style={{ color: colors.textSecondary }}>
                  <span>Total IVA:</span>
                  <span>{formatKz((documentoOrigem || documento).total_iva)}</span>
                </div>
                <div className="flex justify-between text-[8px]" style={{ color: colors.textSecondary }}>
                  <span>Total Retenção:</span>
                  <span>{formatValorRetencao((documentoOrigem || documento).total_retencao)}</span>
                </div>

                <div className="flex justify-between font-bold text-[10px] border-t-2 pt-1 mt-1"
                  style={{ borderColor: colors.primary, color: colors.primary }}>
                  <span>TOTAL:</span>
                  <span>{formatKz(documento.total_liquido)}</span>
                </div>
              </div>

              {/* Hash */}
              {documento.hash_fiscal && (
                <div className="text-center mb-1">
                  <p className="text-[8px] font-bold text-center" style={{ color: colors.textSecondary }}>Hash:</p>
                  <p className="text-[7px] break-all text-center leading-tight" style={{ color: colors.textSecondary }}>
                    {documento.hash_fiscal}
                  </p>
                </div>
              )}

              {/* Bank Info */}
              <div className="text-center pt-1 border-t border-dashed" style={{ borderColor: colors.border }}>
                <p className="text-[9px] font-bold text-center mb-0.5" style={{ color: colors.secondary }}>Coordenadas bancárias</p>
                <p className="text-[8px] text-center" style={{ color: colors.textSecondary }}>Bai:00000000000000000000000000000</p>
                <p className="text-[8px] text-center" style={{ color: colors.textSecondary }}>Bic:0000000000000000000000000000</p>
                <p className="mt-1 font-bold text-center text-[9px]" style={{ color: colors.secondary }}>
                  Obrigado pela preferência!
                </p>
                <p className="mt-1 text-center text-[8px]" style={{ color: colors.textSecondary }}>
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