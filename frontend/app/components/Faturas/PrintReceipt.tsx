"use client";

import Image from 'next/image';
import {
  DocumentoFiscal,
  TipoDocumento,
  ItemDocumento
} from "@/services/DocumentoFiscal";
import { useThemeColors } from "@/context/ThemeContext";

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

  if (!isOpen || !documento) return null;

  const podeImprimir = (tipo: TipoDocumento): boolean => {
    return TIPOS_IMPRESSAO.includes(tipo);
  };

  if (!podeImprimir(documento.tipo_documento)) return null;

  // Helper: formatar taxa do IVA (sempre mostra, "-" se zero/null)
  const formatTaxaIva = (taxa: number | undefined): string => {
    if (!taxa || taxa === 0) return '-';
    return `${taxa}%`;
  };

  // Helper: formatar taxa de retenção (sempre mostra, "-" se zero/null)
  const formatTaxaRetencao = (taxa: number | undefined): string => {
    if (!taxa || taxa === 0) return '-';
    return `${taxa}%`;
  };

  // Helper: formatar valor de retenção (sempre mostra, "-" se zero/null)
  const formatValorRetencao = (valor: number | undefined): string => {
    if (!valor || valor === 0) return '-';
    return `-${formatKz(valor)}`;
  };

  // Helper: calcular taxa de retenção do item baseado no valor_retencao e base_tributavel
  const calcularTaxaRetencaoItem = (item: ItemDocumento): number | undefined => {
    if (!item.valor_retencao || item.valor_retencao === 0) return undefined;
    // Se tem valor_retencao > 0, tenta calcular a taxa ou usa a do item
    if (item.taxa_retencao && item.taxa_retencao > 0) return item.taxa_retencao;
    // Fallback: assume 6.5% se não tiver taxa definida mas tiver valor
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
            font-size: 12px;
            line-height: 1.4;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          .container { width: 80mm; padding: 4mm; }
          
          .text-center { text-align: center !important; }
          .center { margin-left: auto !important; margin-right: auto !important; display: block !important; }
          
          .logo-container { 
            text-align: center !important; 
            margin-bottom: 8px !important; 
            width: 100% !important;
          }
          .logo {
            width: 64px !important;
            height: 64px !important;
            object-fit: contain !important;
            margin: 0 auto !important;
            display: block !important;
          }
          
          .font-bold { font-weight: bold !important; }
          .text-lg { font-size: 14px !important; }
          .text-base { font-size: 12px !important; }
          .text-xs { font-size: 10px !important; }
          .text-10 { font-size: 10px !important; }
          .text-9 { font-size: 9px !important; }
          
          .border-b { border-bottom: 1px dashed #666 !important; }
          .border-b-2 { border-bottom: 2px dashed #666 !important; }
          .border-t { border-top: 1px dashed #666 !important; }
          .border-t-2 { border-top: 2px solid #333 !important; }
          .pb-2 { padding-bottom: 8px !important; }
          .pb-3 { padding-bottom: 12px !important; }
          .pt-1 { padding-top: 4px !important; }
          .pt-2 { padding-top: 8px !important; }
          .mb-1 { margin-bottom: 4px !important; }
          .mb-2 { margin-bottom: 8px !important; }
          .mb-3 { margin-bottom: 12px !important; }
          .mt-1 { margin-top: 4px !important; }
          .mt-2 { margin-top: 8px !important; }
          
          .flex { display: flex !important; }
          .justify-between { justify-content: space-between !important; }
          .w-1-2 { width: 50% !important; }
          .w-1-3 { width: 33.333% !important; }
          .w-1-6 { width: 16.666% !important; }
          
          .truncate { overflow: hidden !important; white-space: nowrap !important; text-overflow: ellipsis !important; }
          .break-all { word-break: break-all !important; }
          .uppercase { text-transform: uppercase !important; }
          
          .header-info {
            text-align: center !important;
            border-bottom: 2px dashed #666 !important;
            padding-bottom: 12px !important;
            margin-bottom: 12px !important;
          }
          .header-info h1 {
            text-align: center !important;
            font-size: 14px !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            margin-bottom: 4px !important;
          }
          .header-info p {
            text-align: center !important;
            font-size: 10px !important;
            margin-bottom: 2px !important;
          }
          
          .hash-section {
            text-align: center !important;
            margin-bottom: 8px !important;
          }
          .hash-section p {
            text-align: center !important;
            font-size: 9px !important;
            word-break: break-all !important;
            line-height: 1.3 !important;
          }
          .hash-label {
            font-weight: bold !important;
            text-align: center !important;
            margin-bottom: 2px !important;
          }
          
          .bank-section {
            text-align: center !important;
            padding-top: 8px !important;
            border-top: 1px dashed #666 !important;
          }
          .bank-section p {
            text-align: center !important;
            font-size: 10px !important;
            margin-bottom: 2px !important;
          }
          .bank-title {
            font-weight: bold !important;
            text-align: center !important;
            margin-bottom: 4px !important;
          }
          .thank-you {
            font-weight: bold !important;
            text-align: center !important;
            margin-top: 8px !important;
            font-size: 10px !important;
          }
          .end-doc {
            text-align: center !important;
            margin-top: 8px !important;
            font-size: 10px !important;
          }
          
          /* Taxas nos itens */
          .item-taxas {
            display: flex !important;
            justify-content: space-between !important;
            font-size: 9px !important;
            margin-top: 2px !important;
            color: #666 !important;
          }
          .taxa-iva {
            color: #2563eb !important;
          }
          .taxa-retencao {
            color: #dc2626 !important;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header-info">
            <div class="logo-container">
              <img src="/images/4.png" alt="Logo Faturajá" class="logo" width="64" height="64" />
            </div>
            <h1>Faturajá</h1>
            <p>NIF: ****************</p>
            <p>Endereço: **************</p>
            <p>Tel: +244 **************</p>
          </div>

          <div class="border-b pb-2 mb-2">
            <div class="flex justify-between font-bold">
              <span>${documentoFiscalService.getTipoDocumentoNome(documento.tipo_documento)}</span>
              <span>Nº ${documento.numero_documento}</span>
            </div>
            <div class="flex justify-between text-10">
              <span>Série: ${documento.serie}</span>
              <span>${new Date(documento.data_emissao).toLocaleDateString("pt-AO")} ${documento.hora_emissao || ''}</span>
            </div>
          </div>

          <div class="border-b pb-2 mb-2">
            <p class="font-bold">Cliente: ${documentoFiscalService.getNomeCliente(documento)}</p>
            ${documentoFiscalService.getNifCliente(documento) ? `<p class="text-10">NIF: ${documentoFiscalService.getNifCliente(documento)}</p>` : ''}
          </div>

          <div class="border-b-2 pb-2 mb-2">
            <div class="flex justify-between font-bold border-b pb-1 mb-1">
              <span class="w-1-2">Descrição</span>
              <span class="w-1-6 text-center">Qtd</span>
              <span class="w-1-3" style="text-align: right;">Total</span>
            </div>
            ${documento.itens && documento.itens.length > 0
        ? documento.itens.map((item: ItemDocumento) => {
          const taxaRet = calcularTaxaRetencaoItem(item);
          return `
                <div class="mb-1">
                  <div class="truncate text-10">${item.descricao}</div>
                  <div class="flex justify-between text-10">
                    <span class="w-1-2 truncate">${formatKz(item.preco_unitario)}</span>
                    <span class="w-1-6 text-center">${formatQuantidade(item.quantidade)}</span>
                    <span class="w-1-3 font-bold" style="text-align: right;">${formatKz(item.total_linha)}</span>
                  </div>
                  <!-- Taxas do item: IVA e Retenção -->
                  <div class="item-taxas">
                    <span class="taxa-iva">IVA: ${formatTaxaIva(item.taxa_iva)}</span>
                    <span class="taxa-retencao">Ret: ${formatTaxaRetencao(taxaRet)}</span>
                  </div>
                </div>
              `;
        }).join('')
        : '<div class="text-center text-10" style="color: #666; padding: 8px 0;">Nenhum item</div>'
      }
          </div>

          <div class="border-b pb-2 mb-2">
            <div class="flex justify-between">
              <span>Base Tributável:</span>
              <span>${formatKz(documento.base_tributavel)}</span>
            </div>
            <div class="flex justify-between">
              <span>Total IVA:</span>
              <span>${formatKz(documento.total_iva)}</span>
            </div>
            <!-- Total Retenção: sempre visível, "-" se não houver -->
            <div class="flex justify-between">
              <span>Total Retenção:</span>
              <span>${formatValorRetencao(documento.total_retencao)}</span>
            </div>
            <div class="flex justify-between font-bold text-lg border-t-2 pt-1 mt-1">
              <span>TOTAL:</span>
              <span>${formatKz(documento.total_liquido)}</span>
            </div>
          </div>

          ${documento.hash_fiscal ? `
            <div class="hash-section">
              <p class="hash-label">Hash:</p>
              <p>${documento.hash_fiscal}</p>
            </div>
          ` : ''}

          <div class="bank-section">
            <p class="bank-title">Coordenadas bancárias</p>
            <p>Bai: 00000000000000000000000000000</p>
            <p>Bic: 0000000000000000000000000000</p>
            <p class="thank-you">Obrigado pela preferência!</p>
            <p class="end-doc">*** Fim do Documento ***</p>
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
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="rounded-xl shadow-2xl w-full max-w-[400px] max-h-[95vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: colors.card }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex justify-between items-center shrink-0"
          style={{ backgroundColor: colors.primary }}
        >
          <div className="min-w-0 flex-1 mr-2">
            <h2 className="text-lg font-bold truncate text-white">
              {documento.tipo_documento === "RC" ? "Recibo" : "Fatura-Recibo"}
            </h2>
            <p className="text-xs truncate" style={{ color: `${colors.secondary}` }}>
              {documento.numero_documento}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg transition-colors touch-manipulation text-white hover:bg-white/20"
              title="Imprimir Talão"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors touch-manipulation text-white hover:bg-white/20"
              title="Fechar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div id="area-talao" className="flex-1 overflow-y-auto p-0" style={{ backgroundColor: colors.hover }}>
          <div className="mx-auto" style={{ width: '80mm', minHeight: '100%', backgroundColor: 'white' }}>
            <div className="p-4 font-mono text-xs leading-tight">
              {/* Header */}
              <div className="text-center border-b-2 border-dashed pb-3 mb-3" style={{ borderColor: colors.border }}>
                <div className="flex justify-center mb-2">
                  <Image src="/images/4.png" alt="Logo Faturajá" width={64} height={64} className="w-16 h-16 object-contain" />
                </div>
                <h1 className="text-lg font-bold uppercase mb-1 text-center" style={{ color: colors.primary }}>Faturajá</h1>
                <p className="text-[10px] text-center" style={{ color: colors.textSecondary }}>NIF: ****************</p>
                <p className="text-[10px] text-center" style={{ color: colors.textSecondary }}>Endereço:************** </p>
                <p className="text-[10px] text-center" style={{ color: colors.textSecondary }}>Tel: +244 **************</p>
              </div>

              {/* Document Info */}
              <div className="border-b border-dashed pb-2 mb-2" style={{ borderColor: colors.border }}>
                <div className="flex justify-between font-bold" style={{ color: colors.text }}>
                  <span>{documentoFiscalService.getTipoDocumentoNome(documento.tipo_documento)}</span>
                  <span>Nº {documento.numero_documento}</span>
                </div>
                <div className="flex justify-between text-[10px]" style={{ color: colors.textSecondary }}>
                  <span>Série: {documento.serie}</span>
                  <span>{new Date(documento.data_emissao).toLocaleDateString("pt-AO")} {documento.hora_emissao}</span>
                </div>
              </div>

              {/* Client */}
              <div className="border-b border-dashed pb-2 mb-2" style={{ borderColor: colors.border }}>
                <p className="font-bold" style={{ color: colors.text }}>Cliente:{documentoFiscalService.getNomeCliente(documento)}</p>
                {documentoFiscalService.getNifCliente(documento) && (
                  <p className="text-[10px]" style={{ color: colors.textSecondary }}>NIF: {documentoFiscalService.getNifCliente(documento)}</p>
                )}
              </div>

              {/* Items */}
              <div className="border-b-2 border-dashed pb-2 mb-2" style={{ borderColor: colors.border }}>
                <div className="flex justify-between font-bold border-b pb-1 mb-1" style={{ borderColor: colors.border }}>
                  <span className="w-1/2" style={{ color: colors.primary }}>Descrição</span>
                  <span className="w-1/6 text-center" style={{ color: colors.primary }}>Qtd</span>
                  <span className="w-1/6 text-center" style={{ color: colors.primary }}>Iva</span>
                  <span className="w-1/3 text-right" style={{ color: colors.primary }}>Total</span>
                </div>
                {documento.itens && documento.itens.length > 0 ? (
                  documento.itens.map((item: ItemDocumento, idx: number) => {
                    return (
                      <div key={idx} className="mb-1">
                        <div className="truncate text-[10px]" style={{ color: colors.text }}>{item.descricao}</div>
                        <div className="flex justify-between text-[10px]">
                          <span className="w-1/2 truncate" style={{ color: colors.textSecondary }}>{formatKz(item.preco_unitario)}</span>
                          <span className="w-1/6 text-center" style={{ color: colors.textSecondary }}>{formatQuantidade(item.quantidade)}</span>
                          <span className="w-1/6 text-center" style={{ color: colors.textSecondary }}>{formatTaxaIva(item.taxa_iva)} </span>
                          <span className="w-1/3 text-right font-semibold" style={{ color: colors.secondary }}>{formatKz(item.total_linha)}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-[10px] py-2" style={{ color: colors.textSecondary }}>Nenhum item</div>
                )}
              </div>

              {/* Totals */}
              <div className="border-b border-dashed pb-2 mb-2" style={{ borderColor: colors.border }}>
                <div className="flex justify-between" style={{ color: colors.textSecondary }}>
                  <span>Base Tributável:</span>
                  <span>{formatKz(documento.base_tributavel)}</span>
                </div>
                <div className="flex justify-between" style={{ color: colors.textSecondary }}>
                  <span>Total IVA:</span>
                  <span>{formatKz(documento.total_iva)}</span>
                </div>
                {/* Total Retenção: sempre visível, "-" se não houver */}
                <div className="flex justify-between" style={{ color: colors.textSecondary }}>
                  <span>Total Retenção:</span>
                  <span>{formatValorRetencao(documento.total_retencao)}</span>
                </div>

                <div className="flex justify-between font-bold text-base border-t-2 pt-1 mt-1"
                  style={{ borderColor: colors.primary, color: colors.primary }}>
                  <span>TOTAL:</span>
                  <span>{formatKz(documento.total_liquido)}</span>
                </div>
              </div>

              {/* Hash */}
              {documento.hash_fiscal && (
                <div className="text-center mb-2">
                  <p className="text-[9px] font-bold text-center" style={{ color: colors.textSecondary }}>Hash:</p>
                  <p className="text-[9px] break-all text-center leading-tight" style={{ color: colors.textSecondary }}>
                    {documento.hash_fiscal}
                  </p>
                </div>
              )}

              {/* Bank Info */}
              <div className="text-center pt-2 border-t border-dashed" style={{ borderColor: colors.border }}>
                <p className="text-[10px] font-bold text-center mb-1" style={{ color: colors.secondary }}>Coordenadas bancárias</p>
                <p className="text-[10px] text-center" style={{ color: colors.textSecondary }}>Bai:00000000000000000000000000000</p>
                <p className="text-[10px] text-center" style={{ color: colors.textSecondary }}>Bic:0000000000000000000000000000</p>
                <p className="mt-2 font-bold text-center text-[10px]" style={{ color: colors.secondary }}>
                  Obrigado pela preferência!
                </p>
                <p className="mt-2 text-center text-[10px]" style={{ color: colors.textSecondary }}>
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