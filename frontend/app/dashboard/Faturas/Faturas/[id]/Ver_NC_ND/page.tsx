"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft,
    FileText,
    User,
    MinusCircle,
    PlusCircle,
    XCircle,
    Package,
    Building2,
    Hash,
    Printer,
    Download,
    Loader2
} from "lucide-react";
import MainEmpresa from "@/app/components/MainEmpresa";
import {
    documentoFiscalService,
    DocumentoFiscal,
    ItemDocumento,
    TipoDocumento
} from "@/services/DocumentoFiscal";
import { useThemeColors } from "@/context/ThemeContext";
import { useAuth } from "@/context/authprovider";

/* ==================== CONSTANTES ==================== */
const TIPO_LABEL: Record<TipoDocumento, string> = {
    'FT': 'Fatura',
    'FR': 'Fatura-Recibo',
    'FP': 'Fatura Proforma',
    'FA': 'Fatura de Adiantamento',
    'NC': 'Nota de Crédito',
    'ND': 'Nota de Débito',
    'RC': 'Recibo',
    'FRt': 'Fatura de Retificação'
};

/* ==================== FUNÇÕES UTILITÁRIAS ==================== */
const formatarPreco = (valor: number | undefined | null): string => {
    if (valor === undefined || valor === null) return '0,00 Kz';
    return Number(valor).toLocaleString('pt-AO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' Kz';
};

const formatarData = (data: string | undefined | null): string => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-AO');
};

const formatarDataHora = (data: string | undefined | null): string => {
    if (!data) return '-';
    return new Date(data).toLocaleString('pt-AO');
};

const formatarQuantidade = (valor: number | undefined | null): string => {
    if (valor === undefined || valor === null) return '0,0000';
    const num = Number(valor);
    if (isNaN(num)) return '0,0000';
    return num.toFixed(4);
};

/* ==================== COMPONENTES ==================== */

const EstadoBadge = ({ estado }: { estado: string }) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
        emitido: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <FileText className="w-3 h-3" />, label: 'Emitido' },
        cancelado: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-3 h-3" />, label: 'Cancelado' },
    };
    const { bg, text, icon, label } = config[estado] || config.emitido;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
            {icon}
            {label}
        </span>
    );
};

const InfoCard = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-white rounded-lg border overflow-hidden">{children}</div>
);

const CardSection = ({
    title,
    icon,
    children,
    noBorder,
}: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    noBorder?: boolean;
}) => (
    <div className={`p-4 ${!noBorder ? 'border-b' : ''}`}>
        <div className="flex items-center gap-2 mb-3">
            <div style={{ color: '#123859' }}>{icon}</div>
            <h3 className="text-sm font-semibold" style={{ color: '#123859' }}>{title}</h3>
        </div>
        {children}
    </div>
);

const InfoRow = ({
    label,
    value,
    className = "",
}: {
    label: string;
    value: React.ReactNode;
    className?: string;
}) => (
    <div className={`flex justify-between py-1.5 text-sm border-b border-gray-50 last:border-0 ${className}`}>
        <span className="text-gray-500">{label}:</span>
        <span className="font-medium text-right">{value}</span>
    </div>
);

const InfoGrid = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">{children}</div>
);

const ItensTable = ({ itens, tipo }: { itens: ItemDocumento[]; tipo: 'NC' | 'ND' }) => {
    const itensFormatados = itens.map(item => ({
        ...item,
        quantidade: Number(item.quantidade) || 0,
        preco_unitario: Number(item.preco_unitario) || 0,
        taxa_iva: Number(item.taxa_iva) || 0,
        total_linha: Number(item.total_linha) || 0,
    }));

    return (
        <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                    <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Descrição</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-700 w-16">Qtd</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700 w-28">Preço</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700 w-16">IVA</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700 w-28">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {itensFormatados.map((item, index) => (
                        <tr key={item.id || index} className="hover:bg-gray-50">
                            <td className="px-4 py-2">
                                <div className="font-medium text-gray-900">{item.descricao}</div>
                                {item.codigo_produto && (
                                    <div className="text-xs text-gray-500">Ref: {item.codigo_produto}</div>
                                )}
                                {item.eh_servico && (
                                    <span className="text-xs text-blue-600 mt-0.5 inline-block">Serviço</span>
                                )}
                            </td>
                            <td className="px-4 py-2 text-center">{formatarQuantidade(item.quantidade)}</td>
                            <td className="px-4 py-2 text-right font-medium">{formatarPreco(item.preco_unitario)}</td>
                            <td className="px-4 py-2 text-right text-gray-600">{item.taxa_iva.toFixed(2)}%</td>
                            <td className={`px-4 py-2 text-right font-bold ${tipo === 'NC' ? 'text-red-600' : 'text-green-600'}`}>
                                {tipo === 'NC' ? '- ' : '+ '}{formatarPreco(item.total_linha)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const SkeletonLoader = () => (
    <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/3"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
    </div>
);

/* ==================== COMPONENTE PRINCIPAL ==================== */
export default function VisualizarNotaPage() {
    const router = useRouter();
    const params = useParams();
    const notaId = params?.id as string;
    const colors = useThemeColors();
    const { user } = useAuth();

    const [nota, setNota] = useState<DocumentoFiscal | null>(null);
    const [documentoOrigem, setDocumentoOrigem] = useState<DocumentoFiscal | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [baixandoPdf, setBaixandoPdf] = useState(false);

    const isNC = nota?.tipo_documento === 'NC';

    useEffect(() => {
        const carregarNota = async () => {
            if (!notaId) {
                setError('ID da nota não fornecido');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const doc = await documentoFiscalService.buscarPorId(notaId);
                setNota(doc);

                if ((doc.tipo_documento === 'NC' || doc.tipo_documento === 'ND') && doc.documentoOrigem?.id) {
                    const origem = await documentoFiscalService.buscarPorId(doc.documentoOrigem.id);
                    setDocumentoOrigem(origem);
                }
            } catch (err) {
                console.error('Erro ao carregar nota:', err);
                setError(err instanceof Error ? err.message : 'Erro ao carregar nota');
            } finally {
                setLoading(false);
            }
        };

        carregarNota();
    }, [notaId]);

    /* ==================== HANDLERS ==================== */

    /** Impressão directa da página actual */
    const handleImprimir = () => window.print();

    /**
     * Download do PDF via backend (DomPDF).
     * GET /api/documentos-fiscais/{id}/pdf/download
     */
    const handleDownloadPDF = async () => {
        if (!nota?.id) return;
        try {
            setBaixandoPdf(true);
            const nomeArquivo = `${nota.tipo_documento}_${nota.numero_documento || nota.id}.pdf`;
            await documentoFiscalService.downloadPdf(nota.id, nomeArquivo);
        } catch (err) {
            console.error('Erro ao baixar PDF:', err);
            alert('Erro ao baixar PDF. Tente novamente.');
        } finally {
            setBaixandoPdf(false);
        }
    };

    const handleVoltarParaOrigem = () => {
        if (documentoOrigem) {
            router.push(`/dashboard/Faturas/Faturas/${documentoOrigem.id}`);
        }
    };

    /* ==================== RENDER ==================== */
    if (loading) {
        return (
            <MainEmpresa>
                <div className="p-4 max-w-5xl mx-auto">
                    <SkeletonLoader />
                </div>
            </MainEmpresa>
        );
    }

    if (error || !nota) {
        return (
            <MainEmpresa>
                <div className="p-4 max-w-5xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                        <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                        <p className="text-red-700 font-medium mb-2">Erro ao carregar nota</p>
                        <p className="text-red-600 text-sm mb-4">{error || 'Nota não encontrada'}</p>
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 text-white rounded-lg hover:opacity-90 text-sm"
                            style={{ backgroundColor: colors.primary }}
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            </MainEmpresa>
        );
    }

    const nomeCliente = documentoFiscalService.getNomeCliente(nota);
    const nifCliente = documentoFiscalService.getNifCliente(nota);
    const nomeEmissor = nota.user?.name || user?.name || 'Sistema';

    const totalRetencao = Number(nota.total_retencao) || 0;
    const baseTributavel = Number(nota.base_tributavel) || 0;
    const totalIva = Number(nota.total_iva) || 0;
    const totalLiquido = Number(nota.total_liquido) || 0;
    const percentualRetencao = baseTributavel > 0 ? (totalRetencao / baseTributavel) * 100 : 0;
    const percentualIva = baseTributavel > 0 ? (totalIva / baseTributavel) * 100 : 0;

    return (
        <MainEmpresa>
            <div className="p-3 sm:p-4 max-w-5xl mx-auto space-y-3">

                {/* Cabeçalho */}
                <div className="bg-white rounded-lg border p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => router.back()}
                                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors shrink-0"
                            >
                                <ArrowLeft className="w-4 h-4" style={{ color: colors.primary }} />
                            </button>
                            <div className="min-w-0 flex-1">
                                <h1
                                    className="text-base sm:text-lg font-bold flex items-center gap-1.5 truncate"
                                    style={{ color: colors.primary }}
                                >
                                    {isNC
                                        ? <MinusCircle className="w-4 h-4 shrink-0" />
                                        : <PlusCircle className="w-4 h-4 shrink-0" />
                                    }
                                    <span className="truncate">{nota.numero_documento}</span>
                                </h1>
                                <p className="text-xs text-gray-500">
                                    {TIPO_LABEL[nota.tipo_documento]} • {formatarData(nota.data_emissao)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto justify-end">
                            {/* Impressão directa */}
                            <button
                                onClick={handleImprimir}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Imprimir"
                            >
                                <Printer className="w-4 h-4" />
                            </button>

                            {/* Download PDF via backend */}
                            <button
                                onClick={handleDownloadPDF}
                                disabled={baixandoPdf}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                title="Download PDF"
                            >
                                {baixandoPdf
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Download className="w-4 h-4" />
                                }
                            </button>

                            <EstadoBadge estado={nota.estado} />
                        </div>
                    </div>
                </div>

                {/* CARD ÚNICO COM TODAS AS INFORMAÇÕES */}
                <InfoCard>
                    {/* Seção 1: Documento e Cliente */}
                    <CardSection title="Documento" icon={<FileText className="w-4 h-4" />}>
                        <InfoGrid>
                            <div>
                                <InfoRow label="Tipo" value={TIPO_LABEL[nota.tipo_documento]} />
                                <InfoRow label="Série" value={nota.serie} />
                                <InfoRow label="Data de Emissão" value={formatarDataHora(nota.data_emissao)} />
                                {nota.motivo && <InfoRow label="Motivo" value={nota.motivo} />}
                            </div>
                            <div>
                                <InfoRow label="Cliente" value={nomeCliente} />
                                {nifCliente && <InfoRow label="NIF" value={nifCliente} />}
                                {nota.cliente?.telefone && <InfoRow label="Telefone" value={nota.cliente.telefone} />}
                                {nota.cliente?.email && <InfoRow label="Email" value={nota.cliente.email} />}
                            </div>
                        </InfoGrid>
                    </CardSection>

                    {/* Seção 2: Documento de Origem */}
                    {documentoOrigem && (
                        <CardSection title="Documento de Origem" icon={<FileText className="w-4 h-4" />}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{documentoOrigem.numero_documento}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {TIPO_LABEL[documentoOrigem.tipo_documento]} • {formatarData(documentoOrigem.data_emissao)}
                                    </p>
                                </div>
                                <button
                                    onClick={handleVoltarParaOrigem}
                                    className="px-3 py-1 text-xs font-medium rounded-md border hover:bg-gray-50"
                                    style={{ borderColor: colors.border }}
                                >
                                    Ver Original
                                </button>
                            </div>
                        </CardSection>
                    )}

                    {/* Seção 3: Emissor e Valores */}
                    <CardSection title="Emissão e Valores" icon={<Building2 className="w-4 h-4" />}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-600">Emissor:</span>
                                    <span className="font-medium">{nomeEmissor}</span>
                                </div>
                                {nota.observacoes && (
                                    <div className="text-sm bg-gray-50 p-2 rounded">
                                        <span className="text-gray-500">Obs:</span>
                                        <p className="mt-1 text-gray-700">{nota.observacoes}</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1 bg-gray-50 p-3 rounded-lg">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Base Tributável:</span>
                                    <span className="font-medium">{formatarPreco(baseTributavel)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">IVA ({percentualIva.toFixed(1)}%):</span>
                                    <span className="font-medium">{formatarPreco(totalIva)}</span>
                                </div>
                                {totalRetencao > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Retenção ({percentualRetencao.toFixed(1)}%):</span>
                                        <span className="font-medium text-red-600">-{formatarPreco(totalRetencao)}</span>
                                    </div>
                                )}
                                <div
                                    className={`flex justify-between text-base font-bold pt-2 border-t border-gray-200 mt-2 ${
                                        isNC ? 'text-red-600' : 'text-green-600'
                                    }`}
                                >
                                    <span>TOTAL {isNC ? '(CRÉDITO)' : '(DÉBITO)'}:</span>
                                    <span>{isNC ? '- ' : '+ '}{formatarPreco(totalLiquido)}</span>
                                </div>
                            </div>
                        </div>
                    </CardSection>

                    {/* Seção 4: Itens */}
                    {nota.itens && nota.itens.length > 0 && (
                        <CardSection title="Itens" icon={<Package className="w-4 h-4" />} noBorder>
                            <ItensTable itens={nota.itens} tipo={isNC ? 'NC' : 'ND'} />
                        </CardSection>
                    )}

                    {/* Seção 5: Hash Fiscal */}
                    {nota.hash_fiscal && (
                        <CardSection title="Autenticação" icon={<Hash className="w-4 h-4" />} noBorder>
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs break-all font-mono">{nota.hash_fiscal}</p>
                            </div>
                        </CardSection>
                    )}
                </InfoCard>
            </div>
        </MainEmpresa>
    );
}