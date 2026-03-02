"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft,
    FileText,
    User,
    CreditCard,
    Banknote,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Clock,
    RotateCcw,
    Loader2,
    Receipt,
    MinusCircle,
    PlusCircle,
    Save,
    Trash2,
    Link as LinkIcon,
    Info,
    RefreshCw
} from "lucide-react";
import MainEmpresa from "@/app/components/MainEmpresa";
import {
    documentoFiscalService,
    DocumentoFiscal,
    TipoDocumento,
    ItemDocumento
} from "@/services/DocumentoFiscal";

/* ==================== FUNÇÕES UTILITÁRIAS ==================== */
const formatarPreco = (valor: number | undefined | null): string => {
    if (valor === undefined || valor === null) return '0,00 Kz';
    return valor.toLocaleString('pt-AO', {
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

const getNomeTipoDocumento = (tipo: TipoDocumento): string => {
    const nomes: Record<TipoDocumento, string> = {
        'FT': 'Fatura',
        'FR': 'Fatura-Recibo',
        'FP': 'Fatura Proforma',
        'FA': 'Fatura de Adiantamento',
        'NC': 'Nota de Crédito',
        'ND': 'Nota de Débito',
        'RC': 'Recibo',
        'FRt': 'Fatura de Retificação'
    };
    return nomes[tipo] || tipo;
};

const getMetodoPagamentoNome = (metodo: string | undefined | null): string => {
    if (!metodo) return '-';
    const nomes: Record<string, string> = {
        'transferencia': 'Transferência Bancária',
        'multibanco': 'Multibanco',
        'dinheiro': 'Dinheiro',
        'cheque': 'Cheque',
        'cartao': 'Cartão'
    };
    return nomes[metodo] || metodo;
};

/* ==================== CONSTANTES ==================== */
const COLORS = {
    primary: '#123859',
    secondary: '#F9941F',
    background: '#F2F2F2',
    white: '#FFFFFF',
    text: '#333333',
    textLight: '#666666',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#17a2b8',
    border: '#e5e7eb'
};

/* ==================== COMPONENTE PRINCIPAL ==================== */
export default function VisualizarDocumentoPage() {
    const router = useRouter();
    const params = useParams();
    const documentoId = params?.id as string;

    const [documento, setDocumento] = useState<DocumentoFiscal | null>(null);
    const [faturaOrigemCompleta, setFaturaOrigemCompleta] = useState<DocumentoFiscal | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingFaturaOrigem, setLoadingFaturaOrigem] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorFaturaOrigem, setErrorFaturaOrigem] = useState<string | null>(null);
    const [acaoLoading, setAcaoLoading] = useState<string | null>(null);

    // Modal NC/ND
    const [showModalNota, setShowModalNota] = useState(false);
    const [tipoNota, setTipoNota] = useState<'NC' | 'ND' | null>(null);
    const [motivoNota, setMotivoNota] = useState('');
    const [itensNota, setItensNota] = useState<ItemDocumento[]>([]);
    const [salvandoNota, setSalvandoNota] = useState(false);

    /* ==================== CARREGAR DOCUMENTO ==================== */
    const carregarDocumento = useCallback(async () => {
        if (!documentoId) {
            setError('ID do documento não fornecido');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            console.log('[DEBUG] Carregando documento:', documentoId);
            const doc = await documentoFiscalService.buscarPorId(documentoId);
            console.log('[DEBUG] Documento carregado:', doc.tipo_documento, doc.numero_documento);
            console.log('[DEBUG] Documento completo:', doc);
            console.log('[DEBUG] documentoOrigem:', doc.documentoOrigem);
            console.log('[DEBUG] fatura_id:', doc.fatura_id);
            console.log('[DEBUG] Itens do documento:', doc.itens);
            setDocumento(doc);

            // Se for recibo, tentar buscar a fatura de origem de várias formas
            if (doc.tipo_documento === 'RC') {
                await carregarFaturaOrigem(doc);
            }
        } catch (err: Error | unknown) {
            const error = err instanceof Error ? err : new Error('Erro desconhecido');
            console.error('Erro ao carregar documento:', error);
            setError(error.message || 'Erro ao carregar documento');
        } finally {
            setLoading(false);
        }
    }, [documentoId]);

    /* ==================== CARREGAR FATURA ORIGEM ==================== */
    const carregarFaturaOrigem = async (doc: DocumentoFiscal) => {
        // Tentar obter ID da fatura origem de várias fontes possíveis
        let faturaOrigemId: string | null = null;

        // Opção 1: documentoOrigem.id
        if (doc.documentoOrigem?.id) {
            faturaOrigemId = doc.documentoOrigem.id;
            console.log('[DEBUG] Usando documentoOrigem.id:', faturaOrigemId);
        }
        // Opção 2: fatura_id (campo direto no recibo)
        else if (doc.fatura_id) {
            faturaOrigemId = doc.fatura_id;
            console.log('[DEBUG] Usando fatura_id:', faturaOrigemId);
        }
        // Opção 3: venda_id (se existir)
        else if (doc.venda_id) {
            // Aqui você pode precisar buscar a venda primeiro, depois a fatura
            console.log('[DEBUG] Tem venda_id, mas precisa buscar venda:', doc.venda_id);
        }

        if (!faturaOrigemId) {
            console.error('[DEBUG] Recibo sem referência à fatura origem');
            setErrorFaturaOrigem('Recibo não possui fatura de origem vinculada');
            return;
        }

        try {
            setLoadingFaturaOrigem(true);
            setErrorFaturaOrigem(null);

            console.log('[DEBUG] Buscando fatura origem:', faturaOrigemId);
            const origem = await documentoFiscalService.buscarPorId(faturaOrigemId);

            console.log('[DEBUG] Fatura origem carregada:', origem.numero_documento);
            console.log('[DEBUG] Itens na fatura origem:', origem.itens?.length || 0, origem.itens);

            if (!origem.itens || origem.itens.length === 0) {
                console.warn('[DEBUG] Fatura origem sem itens:', origem);
            }

            setFaturaOrigemCompleta(origem);
        } catch (err: Error | unknown) {
            const error = err instanceof Error ? err : new Error('Erro desconhecido');
            console.error('[DEBUG] Erro ao carregar fatura origem:', error);
            setErrorFaturaOrigem(`Erro ao carregar fatura origem: ${error.message}`);
        } finally {
            setLoadingFaturaOrigem(false);
        }
    };

    useEffect(() => {
        carregarDocumento();
    }, [carregarDocumento]);

    /* ==================== HELPERS ==================== */

    // Retorna os itens que devem ser exibidos na visualização
    const getItensParaExibicao = (): ItemDocumento[] => {
        if (!documento) return [];

        // Se for recibo e tiver fatura origem completa com itens, usar itens dela
        if (documento.tipo_documento === 'RC' && faturaOrigemCompleta?.itens && faturaOrigemCompleta.itens.length > 0) {
            console.log('[DEBUG] Usando itens da fatura origem para exibição:', faturaOrigemCompleta.itens.length);
            return faturaOrigemCompleta.itens;
        }

        // Se for recibo mas ainda está carregando a origem
        if (documento.tipo_documento === 'RC' && loadingFaturaOrigem) {
            console.log('[DEBUG] Recibo carregando fatura origem...');
            return [];
        }

        // Se for recibo e deu erro ao carregar origem
        if (documento.tipo_documento === 'RC' && errorFaturaOrigem) {
            console.log('[DEBUG] Recibo com erro ao carregar fatura origem');
            return [];
        }

        // Para outros documentos, usar próprios itens
        console.log('[DEBUG] Usando itens do documento atual:', documento.itens?.length || 0);
        return documento.itens || [];
    };

    // Retorna os itens para o modal de NC/ND
    const getItensParaModal = async (): Promise<ItemDocumento[] | null> => {
        if (!documento) return null;

        // Recibo: buscar da fatura origem
        if (documento.tipo_documento === 'RC') {
            // Se já temos a fatura completa com itens
            if (faturaOrigemCompleta?.itens && faturaOrigemCompleta.itens.length > 0) {
                console.log('[DEBUG] Modal usando itens da fatura origem (já carregada):', faturaOrigemCompleta.itens.length);
                return faturaOrigemCompleta.itens;
            }

            // Se não temos, tentar buscar novamente
            const faturaOrigemId = faturaOrigemCompleta?.id || documento.documentoOrigem?.id || documento.fatura_id;

            if (faturaOrigemId) {
                try {
                    console.log('[DEBUG] Modal buscando fatura origem da API:', faturaOrigemId);
                    const origem = await documentoFiscalService.buscarPorId(faturaOrigemId);
                    setFaturaOrigemCompleta(origem);

                    if (origem.itens && origem.itens.length > 0) {
                        console.log('[DEBUG] Modal itens carregados da API:', origem.itens.length);
                        return origem.itens;
                    }
                } catch (err) {
                    console.error('[DEBUG] Erro ao buscar fatura origem para modal:', err);
                    return null;
                }
            }
            return null;
        }

        // FT/FR: usar próprios itens
        if (documento.itens && documento.itens.length > 0) {
            return documento.itens;
        }

        return null;
    };

    /* ==================== HANDLERS ==================== */

    const handleAbrirModalNC = async () => {
        console.log('[DEBUG] Abrindo modal NC');
        const itens = await getItensParaModal();

        if (!itens || itens.length === 0) {
            alert('Não foi possível carregar os itens do documento base.');
            return;
        }

        const itensInicializados = itens.map(item => ({
            ...item,
            quantidade_original: item.quantidade,
            quantidade: 0,
            total_linha: 0,
            valor_iva: 0
        }));

        console.log('[DEBUG] Itens inicializados no modal:', itensInicializados.length);
        setItensNota(itensInicializados);
        setTipoNota('NC');
        setMotivoNota('');
        setShowModalNota(true);
    };

    const handleAbrirModalND = async () => {
        console.log('[DEBUG] Abrindo modal ND');
        const itens = await getItensParaModal();

        if (!itens || itens.length === 0) {
            alert('Não foi possível carregar os itens do documento base.');
            return;
        }

        const itensInicializados = itens.map(item => ({
            ...item,
            quantidade_original: item.quantidade,
            quantidade: 0,
            total_linha: 0,
            valor_iva: 0
        }));

        setItensNota(itensInicializados);
        setTipoNota('ND');
        setMotivoNota('');
        setShowModalNota(true);
    };

    const handleAtualizarQuantidadeItem = (index: number, novaQuantidade: number) => {
        const item = itensNota[index];
        if (!item) return;

        const quantidadeOriginal = item.quantidade_original || 0;
        const quantidadeValida = Math.max(0, Math.min(novaQuantidade, quantidadeOriginal));

        setItensNota(prev => {
            const novosItens = [...prev];
            const itemAtual = novosItens[index];

            const precoUnitario = itemAtual.preco_unitario || 0;
            const desconto = itemAtual.desconto || 0;
            const taxaIva = itemAtual.taxa_iva || 0;

            const valorDesconto = precoUnitario * (desconto / 100);
            const precoComDesconto = precoUnitario - valorDesconto;
            const subtotal = quantidadeValida * precoComDesconto;
            const valorIva = subtotal * (taxaIva / 100);
            const totalLinha = subtotal + valorIva;

            novosItens[index] = {
                ...itemAtual,
                quantidade: quantidadeValida,
                total_linha: totalLinha,
                valor_iva: valorIva
            };

            return novosItens;
        });
    };

    const handleRemoverItem = (index: number) => {
        handleAtualizarQuantidadeItem(index, 0);
    };

    const calcularTotaisNota = () => {
        const itensValidos = itensNota.filter(item => item.quantidade > 0);

        const baseTributavel = itensValidos.reduce((sum, item) => {
            const precoUnitario = item.preco_unitario || 0;
            const desconto = item.desconto || 0;
            const quantidade = item.quantidade || 0;
            const valorDesconto = precoUnitario * (desconto / 100);
            const precoComDesconto = precoUnitario - valorDesconto;
            return sum + (quantidade * precoComDesconto);
        }, 0);

        const totalIva = itensValidos.reduce((sum, item) => sum + (item.valor_iva || 0), 0);
        const totalLiquido = itensValidos.reduce((sum, item) => sum + (item.total_linha || 0), 0);

        return { baseTributavel, totalIva, totalLiquido, itensValidos };
    };

    const handleSalvarNota = async () => {
        if (!documento || !tipoNota) return;

        const { itensValidos, totalLiquido } = calcularTotaisNota();

        if (itensValidos.length === 0) {
            alert('Selecione pelo menos um item.');
            return;
        }

        if (!motivoNota.trim()) {
            alert('Informe o motivo.');
            return;
        }

        try {
            setSalvandoNota(true);

            const dados = {
                itens: itensValidos.map(item => ({
                    produto_id: item.produto_id,
                    descricao: item.descricao,
                    quantidade: item.quantidade,
                    preco_unitario: item.preco_unitario,
                    desconto: item.desconto,
                    taxa_iva: item.taxa_iva,
                    taxa_retencao: item.taxa_retencao,
                    eh_servico: item.eh_servico
                })),
                motivo: motivoNota
            };

            // ID do documento base (fatura origem para recibos)
            const documentoBaseId = documento.tipo_documento === 'RC'
                ? (faturaOrigemCompleta?.id || documento.documentoOrigem?.id || documento.fatura_id || documento.id)
                : documento.id;

            console.log('[DEBUG] Criando nota no documento base:', documentoBaseId);

            let notaGerada;
            if (tipoNota === 'NC') {
                notaGerada = await documentoFiscalService.criarNotaCredito(documentoBaseId, dados);
            } else {
                notaGerada = await documentoFiscalService.criarNotaDebito(documentoBaseId, dados);
            }

            console.log('[DEBUG] Nota gerada:', notaGerada.numero_documento);

            setShowModalNota(false);
            await carregarDocumento();
            router.push(`/dashboard/Faturas/Faturas/${notaGerada.id}`);

        } catch (err: Error | unknown) {
            const error = err instanceof Error ? err : new Error('Erro desconhecido');
            console.error('[DEBUG] Erro ao salvar nota:', error);
            alert(error.message || `Erro ao gerar nota`);
        } finally {
            setSalvandoNota(false);
        }
    };

    const handleCancelar = async () => {
        if (!documento) return;
        if (!confirm('Tem certeza que deseja cancelar este documento?')) return;

        try {
            setAcaoLoading('cancelar');
            const motivo = prompt('Motivo do cancelamento:');
            if (!motivo) return;

            await documentoFiscalService.cancelar(documento.id, { motivo });
            await carregarDocumento();
        } catch (err: Error | unknown) {
            const error = err instanceof Error ? err : new Error('Erro desconhecido');
            alert(error.message || 'Erro ao cancelar');
        } finally {
            setAcaoLoading(null);
        }
    };

    const tentarRecarregarFaturaOrigem = () => {
        if (documento) {
            carregarFaturaOrigem(documento);
        }
    };

    /* ==================== RENDER HELPERS ==================== */
    const getEstadoBadge = (estado: string) => {
        const config: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
            emitido: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock className="w-3 h-3" />, label: 'Emitido' },
            paga: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Pago' },
            parcialmente_paga: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <AlertTriangle className="w-3 h-3" />, label: 'Parcial' },
            cancelado: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-3 h-3" />, label: 'Cancelado' },
            expirado: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <AlertTriangle className="w-3 h-3" />, label: 'Expirado' },
        };
        return config[estado] || config.emitido;
    };

    const getTipoIcone = (tipo: TipoDocumento) => {
        const icons: Record<string, React.ReactNode> = {
            FT: <FileText className="w-4 h-4" />,
            FR: <FileText className="w-4 h-4" />,
            FP: <FileText className="w-4 h-4" />,
            FA: <CreditCard className="w-4 h-4" />,
            NC: <MinusCircle className="w-4 h-4" />,
            ND: <PlusCircle className="w-4 h-4" />,
            RC: <Banknote className="w-4 h-4" />,
            FRt: <RotateCcw className="w-4 h-4" />,
        };
        return icons[tipo] || <FileText className="w-4 h-4" />;
    };

    // Dados computados
    const isReciboDocumento = documento?.tipo_documento === 'RC';
    const faturaOrigem = faturaOrigemCompleta || documento?.documentoOrigem;

    // ITENS PARA EXIBIÇÃO (visualização do recibo)
    const itensParaExibir = getItensParaExibicao();
    const temItensParaExibir = itensParaExibir.length > 0;

    // Valores para exibição
    const valoresParaExibir = useMemo(() => {
        // Priorizar fatura origem completa
        if (faturaOrigemCompleta && faturaOrigemCompleta.base_tributavel > 0) {
            return {
                base_tributavel: faturaOrigemCompleta.base_tributavel,
                total_iva: faturaOrigemCompleta.total_iva,
                total_retencao: faturaOrigemCompleta.total_retencao,
                total_liquido: faturaOrigemCompleta.total_liquido,
                tem_valores_reais: true
            };
        }

        // Fallback para documento atual
        const total = documento?.total_liquido || 0;
        const taxaIvaEstimada = 0.14;
        const baseEstimada = total / (1 + taxaIvaEstimada);

        return {
            base_tributavel: baseEstimada,
            total_iva: total - baseEstimada,
            total_retencao: documento?.total_retencao || 0,
            total_liquido: total,
            tem_valores_reais: false
        };
    }, [documento, faturaOrigemCompleta]);

    // Permissões
    const podeGerarNotaCredito = useMemo(() => {
        if (!documento || documento.estado === 'cancelado') return false;
        if (isReciboDocumento) {
            // Só permite se tiver fatura origem carregada com sucesso
            return !!faturaOrigemCompleta?.id && !!faturaOrigemCompleta?.itens?.length;
        }
        return ['FT', 'FR'].includes(documento.tipo_documento) && temItensParaExibir;
    }, [documento, isReciboDocumento, faturaOrigemCompleta, temItensParaExibir]);

    const podeGerarNotaDebito = podeGerarNotaCredito;

    const podeCancelar = useMemo(() =>
        documento && documentoFiscalService.podeCancelar(documento),
        [documento]);

    // Loading e Error states
    if (loading) {
        return (
            <MainEmpresa>
                <div className="p-6 max-w-5xl mx-auto">
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: COLORS.secondary }} />
                    </div>
                </div>
            </MainEmpresa>
        );
    }

    if (error || !documento) {
        return (
            <MainEmpresa>
                <div className="p-6 max-w-5xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-700 text-lg font-medium mb-2">Erro ao carregar documento</p>
                        <p className="text-red-600 mb-4">{error || 'Documento não encontrado'}</p>
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 text-white rounded-lg hover:opacity-90 text-sm"
                            style={{ backgroundColor: COLORS.primary }}
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            </MainEmpresa>
        );
    }

    const estadoConfig = getEstadoBadge(documento.estado);
    const nomeCliente = documentoFiscalService.getNomeCliente(documento);
    const nifCliente = documentoFiscalService.getNifCliente(documento);
    const { itensValidos, totalLiquido } = calcularTotaisNota();

    return (
        <MainEmpresa>
            <div className="p-4 max-w-5xl mx-auto space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.back()}
                            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" style={{ color: COLORS.primary }} />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: COLORS.primary }}>
                                {getTipoIcone(documento.tipo_documento)}
                                {documento.numero_documento}
                            </h1>
                            <p className="text-xs text-gray-500">
                                {getNomeTipoDocumento(documento.tipo_documento)} • {formatarData(documento.data_emissao)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {podeGerarNotaCredito && (
                            <button
                                onClick={handleAbrirModalNC}
                                disabled={acaoLoading === 'nc'}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-md hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: COLORS.danger }}
                            >
                                {acaoLoading === 'nc' ? <Loader2 className="w-3 h-3 animate-spin" /> : <MinusCircle className="w-3 h-3" />}
                                NC
                            </button>
                        )}

                        {podeGerarNotaDebito && (
                            <button
                                onClick={handleAbrirModalND}
                                disabled={acaoLoading === 'nd'}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-md hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: COLORS.warning }}
                            >
                                {acaoLoading === 'nd' ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlusCircle className="w-3 h-3" />}
                                ND
                            </button>
                        )}

                        {podeCancelar && (
                            <button
                                onClick={handleCancelar}
                                disabled={acaoLoading === 'cancelar'}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md hover:opacity-90 disabled:opacity-50 border"
                                style={{ borderColor: COLORS.danger, color: COLORS.danger }}
                            >
                                {acaoLoading === 'cancelar' ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                Cancelar
                            </button>
                        )}

                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${estadoConfig.bg} ${estadoConfig.text}`}>
                            {estadoConfig.icon}
                            {estadoConfig.label}
                        </span>
                    </div>
                </div>

                {/* Conteúdo Principal */}
                <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">

                    {/* Cabeçalho Documento */}
                    <div className="border-b pb-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                                    {getNomeTipoDocumento(documento.tipo_documento)}
                                </h2>
                                <p className="text-sm font-medium">{documento.numero_documento}</p>
                                <p className="text-xs text-gray-500 mt-1">Série: {documento.serie}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500">Data de Emissão</p>
                                <p className="text-sm font-medium">{formatarDataHora(documento.data_emissao)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Dados Cliente */}
                    <table className="w-full text-sm">
                        <tbody>
                            <tr>
                                <td className="py-1 w-24 text-gray-500">Cliente:</td>
                                <td className="py-1 font-medium">{nomeCliente}</td>
                            </tr>
                            {nifCliente && (
                                <tr>
                                    <td className="py-1 text-gray-500">NIF:</td>
                                    <td className="py-1">{nifCliente}</td>
                                </tr>
                            )}
                            {documento.cliente?.endereco && (
                                <tr>
                                    <td className="py-1 text-gray-500">Endereço:</td>
                                    <td className="py-1">{documento.cliente.endereco}</td>
                                </tr>
                            )}
                            {documento.cliente?.telefone && (
                                <tr>
                                    <td className="py-1 text-gray-500">Telefone:</td>
                                    <td className="py-1">{documento.cliente.telefone}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Info Recibo */}
                    {isReciboDocumento && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-start gap-3">
                                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm flex-1">
                                    <p className="font-medium text-blue-900">Recibo de Pagamento</p>

                                    {faturaOrigemCompleta ? (
                                        <p className="text-blue-700 text-xs mt-1">
                                            Referente à fatura{' '}
                                            <button
                                                onClick={() => router.push(`/dashboard/Faturas/Faturas/${faturaOrigemCompleta.id}`)}
                                                className="font-semibold underline hover:text-blue-900 inline-flex items-center gap-1"
                                            >
                                                {faturaOrigemCompleta.numero_documento}
                                                <LinkIcon className="w-3 h-3" />
                                            </button>
                                        </p>
                                    ) : errorFaturaOrigem ? (
                                        <div className="mt-2">
                                            <p className="text-red-600 text-xs">{errorFaturaOrigem}</p>
                                            <button
                                                onClick={tentarRecarregarFaturaOrigem}
                                                className="mt-2 inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                            >
                                                <RefreshCw className="w-3 h-3" />
                                                Tentar novamente
                                            </button>
                                        </div>
                                    ) : loadingFaturaOrigem ? (
                                        <p className="text-blue-600 text-xs mt-1 flex items-center gap-1">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            Carregando fatura de origem...
                                        </p>
                                    ) : (
                                        <p className="text-amber-600 text-xs mt-1">
                                            Fatura de origem não encontrada
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ==================== ITENS DA FATURA (VISUALIZAÇÃO) ==================== */}
                    {temItensParaExibir ? (
                        <div>
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: COLORS.primary }}>
                                <FileText className="w-4 h-4" />
                                Itens {isReciboDocumento && faturaOrigemCompleta && (
                                    <span className="text-xs font-normal text-gray-500">
                                        (da fatura {faturaOrigemCompleta.numero_documento})
                                    </span>
                                )}
                            </h3>

                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b">
                                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Descrição</th>
                                            <th className="px-4 py-3 text-center font-semibold text-gray-700 w-20">Qtd</th>
                                            <th className="px-4 py-3 text-right font-semibold text-gray-700 w-32">Preço</th>
                                            <th className="px-4 py-3 text-right font-semibold text-gray-700 w-20">IVA</th>
                                            <th className="px-4 py-3 text-right font-semibold text-gray-700 w-32">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {itensParaExibir.map((item, index) => (
                                            <tr key={item.id || index} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900">{item.descricao}</div>
                                                    {item.codigo_produto && (
                                                        <div className="text-xs text-gray-500">Ref: {item.codigo_produto}</div>
                                                    )}
                                                    {item.eh_servico && (
                                                        <div className="text-xs text-blue-600 mt-1">Serviço</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {Number(item.quantidade || 0).toFixed(4)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium">
                                                    {formatarPreco(item.preco_unitario)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-600">
                                                    {Number(item.taxa_iva || 0).toFixed(2)}%
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold" style={{ color: COLORS.primary }}>
                                                    {formatarPreco(item.total_linha)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : isReciboDocumento && loadingFaturaOrigem ? (
                        /* Recibo ainda carregando fatura origem */
                        <div className="py-8 text-center border rounded-lg bg-gray-50">
                            <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-gray-400" />
                            <p className="text-sm text-gray-600">Carregando itens da fatura de origem...</p>
                            <p className="text-xs text-gray-500 mt-1">Aguarde um momento</p>
                        </div>
                    ) : isReciboDocumento && errorFaturaOrigem ? (
                        /* Erro ao carregar fatura origem */
                        <div className="py-8 text-center border rounded-lg bg-red-50">
                            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-400" />
                            <p className="text-sm text-red-600">{errorFaturaOrigem}</p>
                            <button
                                onClick={tentarRecarregarFaturaOrigem}
                                className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-sm bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Tentar carregar novamente
                            </button>
                        </div>
                    ) : (
                        /* Sem itens */
                        <div className="py-8 text-center border rounded-lg bg-gray-50">
                            <Info className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-600">Este documento não possui itens detalhados</p>
                            <p className="text-xs text-gray-500 mt-1">O valor total foi consolidado</p>
                        </div>
                    )}

                    {/* Totais */}
                    <div className="flex justify-end pt-4 border-t">
                        <div className="w-72">
                            <div className="flex justify-between py-2 text-sm">
                                <span className="text-gray-600">Base Tributável:</span>
                                <span className="font-medium">{formatarPreco(valoresParaExibir.base_tributavel)}</span>
                            </div>
                            <div className="flex justify-between py-2 text-sm">
                                <span className="text-gray-600">Total IVA:</span>
                                <span className="font-medium">{formatarPreco(valoresParaExibir.total_iva)}</span>
                            </div>
                            {valoresParaExibir.total_retencao > 0 && (
                                <div className="flex justify-between py-2 text-sm">
                                    <span className="text-gray-600">Retenção:</span>
                                    <span className="font-medium text-red-600">-{formatarPreco(valoresParaExibir.total_retencao)}</span>
                                </div>
                            )}
                            <div className="flex justify-between py-3 text-lg font-bold border-t-2" style={{ color: COLORS.primary, borderColor: COLORS.primary }}>
                                <span>TOTAL:</span>
                                <span>{formatarPreco(valoresParaExibir.total_liquido)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Pagamento */}
                    {documento.metodo_pagamento && (
                        <div className="border-t pt-4 text-sm">
                            <h4 className="font-semibold mb-2 flex items-center gap-2" style={{ color: COLORS.primary }}>
                                <CreditCard className="w-4 h-4" />
                                Informações de Pagamento
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <p>
                                    <span className="text-gray-500">Método:</span>{' '}
                                    <span className="font-medium">{getMetodoPagamentoNome(documento.metodo_pagamento)}</span>
                                </p>
                                {documento.referencia_pagamento && (
                                    <p>
                                        <span className="text-gray-500">Referência:</span>{' '}
                                        <span className="font-medium">{documento.referencia_pagamento}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Hash */}
                    {documento.hash_fiscal && (
                        <div className="border-t pt-3 text-xs text-gray-400 break-all">
                            <span className="font-medium">Hash Fiscal:</span> {documento.hash_fiscal}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal NC/ND */}
            {showModalNota && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="px-6 py-4 border-b flex justify-between items-center" style={{ backgroundColor: COLORS.primary }}>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                {tipoNota === 'NC' ? <MinusCircle className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
                                Gerar Nota de {tipoNota === 'NC' ? 'Crédito' : 'Débito'}
                                {isReciboDocumento && faturaOrigemCompleta && (
                                    <span className="text-xs font-normal ml-2 px-2 py-0.5 rounded-full bg-white/20">
                                        via {faturaOrigemCompleta.numero_documento}
                                    </span>
                                )}
                            </h3>
                            <button
                                onClick={() => setShowModalNota(false)}
                                className="text-white/80 hover:text-white"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Conteúdo */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            {/* Info */}
                            {isReciboDocumento && faturaOrigemCompleta && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                                    <p className="text-blue-800">
                                        <strong>Documento Base:</strong> {faturaOrigemCompleta.numero_documento}
                                    </p>
                                </div>
                            )}

                            {/* Motivo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Motivo *
                                </label>
                                <textarea
                                    value={motivoNota}
                                    onChange={(e) => setMotivoNota(e.target.value)}
                                    placeholder="Informe o motivo..."
                                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={2}
                                />
                            </div>

                            {/* Itens */}
                            <div>
                                <h4 className="text-sm font-semibold mb-2" style={{ color: COLORS.primary }}>
                                    Selecione os itens
                                </h4>

                                {itensNota.length === 0 ? (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                                        <AlertTriangle className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                                        <p className="text-sm text-yellow-700">Nenhum item disponível</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm border-collapse border rounded-lg overflow-hidden">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="px-3 py-2 text-left">Descrição</th>
                                                <th className="px-3 py-2 text-center w-20">Disp.</th>
                                                <th className="px-3 py-2 text-center w-20">Qtd.</th>
                                                <th className="px-3 py-2 text-right w-28">Preço</th>
                                                <th className="px-3 py-2 text-right w-28">Total</th>
                                                <th className="px-3 py-2 text-center w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {itensNota.map((item, index) => (
                                                <tr key={item.id || index} className={item.quantidade > 0 ? 'bg-blue-50' : ''}>
                                                    <td className="px-3 py-2">
                                                        <div className="font-medium">{item.descricao}</div>
                                                        {item.codigo_produto && (
                                                            <div className="text-xs text-gray-500">Ref: {item.codigo_produto}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-center text-gray-500">
                                                        {Number(item.quantidade_original || item.quantidade || 0).toFixed(4)}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={Number(item.quantidade_original || item.quantidade || 0)}
                                                            value={item.quantidade || 0}
                                                            onChange={(e) => handleAtualizarQuantidadeItem(index, parseInt(e.target.value) || 0)}
                                                            className="w-full px-2 py-1 border rounded text-center text-sm"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        {formatarPreco(item.preco_unitario)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-medium">
                                                        {formatarPreco(item.total_linha)}
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        {item.quantidade > 0 && (
                                                            <button
                                                                onClick={() => handleRemoverItem(index)}
                                                                className="text-red-500 hover:text-red-700"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Resumo */}
                            {itensValidos.length > 0 && (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="text-sm font-semibold mb-2">Resumo</h4>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Itens selecionados:</span>
                                            <span>{itensValidos.length}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Base Tributável: </span>
                                            <span>{formatarPreco(calcularTotaisNota().baseTributavel)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Total IVA:</span>
                                            <span>{formatarPreco(calcularTotaisNota().totalIva)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-lg pt-2 border-t" style={{ color: COLORS.primary }}>
                                            <span>TOTAL:</span>
                                            <span>{formatarPreco(totalLiquido)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setShowModalNota(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSalvarNota}
                                disabled={salvandoNota || itensValidos.length === 0 || !motivoNota.trim()}
                                className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                                style={{ backgroundColor: tipoNota === 'NC' ? COLORS.danger : COLORS.warning }}
                            >
                                {salvandoNota ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Gerar Nota
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainEmpresa>
    );
}