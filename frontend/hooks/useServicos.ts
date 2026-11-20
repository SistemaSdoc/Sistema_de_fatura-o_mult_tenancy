
import { useState, useCallback, useRef } from "react";

import {
    produtoService,
    movimentoStockService,
    Produto,
    Categoria,
    MovimentoStock,
    AtualizarProdutoInput,
    PaginatedResponse,
} from "@/services/produtos";

// ============================================
// TIPOS
// ============================================

interface ModalConfirmacaoState {
    isOpen: boolean;
    tipo: "delete" | "restore" | "warning";
    produto: Produto | null;
}

type ApiError = {
    response?: {
        data?: {
            message?: string;
        };
    };
    message?: string;
};

const getApiError = (error: unknown): ApiError =>
    typeof error === "object" && error !== null
        ? (error as ApiError)
        : {};

const getCollection = <T,>(
    value: T[] | PaginatedResponse<T>
): T[] => {
    return Array.isArray(value) ? value : value.data || [];
};

// ============================================
// HOOK useServicos
// ============================================

export function useServicos() {
    // ========================================
    // ESTADOS
    // ========================================

    const [loading, setLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const [itens, setItens] = useState<Produto[]>([]);
    const [itensDeletados, setItensDeletados] = useState<Produto[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [movimentacoes, setMovimentacoes] = useState<MovimentoStock[]>([]);

    // Filtros
    const [busca, setBusca] = useState("");
    const [categoriaFiltro, setCategoriaFiltro] = useState("");
    const [filtroEstoque, setFiltroEstoque] = useState<
        "todos" | "baixo" | "zerado"
    >("todos");

    // Modais
    const [modalEntradaAberto, setModalEntradaAberto] = useState(false);
    const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
    const [itemSelecionado, setItemSelecionado] = useState<Produto | null>(null);

    const [modalConfirmacao, setModalConfirmacao] =
        useState<ModalConfirmacaoState>({
            isOpen: false,
            tipo: "delete",
            produto: null,
        });

    // Abas
    const [abaAtiva, setAbaAtiva] = useState<"itens" | "deletados">("itens");

    // ========================================
    // PROTECÇÃO DE CARREGAMENTOS SIMULTÂNEOS
    // ========================================

    const carregarDadosEmCurso = useRef<Promise<void> | null>(null);
    const carregarDeletadosEmCurso = useRef<Promise<void> | null>(null);
    const carregarMovimentacoesEmCurso = useRef<Promise<void> | null>(null);

    // ========================================
    // CARREGAR SERVIÇOS E CATEGORIAS
    // ========================================

    const carregarDados = useCallback((): Promise<void> => {
        if (carregarDadosEmCurso.current) {
            console.log(
                "[SERVIÇOS] Carregamento já em curso. Pedido reutilizado."
            );

            return carregarDadosEmCurso.current;
        }

        const pedido = (async () => {
            setLoading(true);

            try {
                console.count("[SERVIÇOS] Carregamento de dados");

                const [itensData, cats] = await Promise.all([
                    produtoService.listarProdutos({
                        tipo: "servico",
                    }),
                    produtoService.listarCategorias(),
                ]);

                setItens(getCollection(itensData.produtos));
                setCategorias(cats);
            } catch (error: unknown) {
                console.error("Erro ao carregar serviços:", error);
            } finally {
                setLoading(false);
                setIsInitialLoad(false);
                carregarDadosEmCurso.current = null;
            }
        })();

        carregarDadosEmCurso.current = pedido;

        return pedido;
    }, []);

    // ========================================
    // CARREGAR MOVIMENTAÇÕES
    // ========================================

    const carregarMovimentacoes = useCallback((): Promise<void> => {
        if (carregarMovimentacoesEmCurso.current) {
            return carregarMovimentacoesEmCurso.current;
        }

        const pedido = (async () => {
            try {
                const movs = await movimentoStockService.listarMovimentos({
                    paginar: true,
                    per_page: 50,
                });

                setMovimentacoes(getCollection(movs.movimentos));
            } catch (error: unknown) {
                console.error("Erro ao carregar movimentações:", error);
            } finally {
                carregarMovimentacoesEmCurso.current = null;
            }
        })();

        carregarMovimentacoesEmCurso.current = pedido;

        return pedido;
    }, []);

    // ========================================
    // CARREGAR SERVIÇOS ELIMINADOS
    // ========================================

    const carregarDeletados = useCallback((): Promise<void> => {
        if (carregarDeletadosEmCurso.current) {
            return carregarDeletadosEmCurso.current;
        }

        const pedido = (async () => {
            try {
                const response = await produtoService.listarDeletados({
                    paginar: false,
                    tipo: "servico",
                });

                const deletados = getCollection(response.produtos);

                setItensDeletados(
                    deletados.filter((item) => item.tipo === "servico")
                );
            } catch (error: unknown) {
                console.error("Erro ao carregar serviços eliminados:", error);
            } finally {
                carregarDeletadosEmCurso.current = null;
            }
        })();

        carregarDeletadosEmCurso.current = pedido;

        return pedido;
    }, []);

    // ========================================
    // APLICAR FILTROS
    // ========================================

    const aplicarFiltros = useCallback(async (): Promise<void> => {
        setLoading(true);

        try {
            const filtros: Parameters<
                typeof produtoService.listarProdutos
            >[0] = {
                tipo: "servico",
            };

            if (busca.trim()) {
                filtros.busca = busca.trim();
            }

            if (categoriaFiltro) {
                filtros.categoria_id = categoriaFiltro;
            }

            if (filtroEstoque === "baixo") {
                filtros.estoque_baixo = true;
            }

            if (filtroEstoque === "zerado") {
                filtros.sem_estoque = true;
            }

            console.count("[SERVIÇOS] Aplicação de filtros");

            const data = await produtoService.listarProdutos(filtros);

            setItens(getCollection(data.produtos));
        } catch (error: unknown) {
            console.error("Erro ao filtrar serviços:", error);
        } finally {
            setLoading(false);
        }
    }, [busca, categoriaFiltro, filtroEstoque]);

    // ========================================
    // REGISTAR ENTRADA
    // ========================================

    const handleEntrada = useCallback(
        async (
            quantidade: number,
            motivo: string
        ): Promise<void> => {
            if (!itemSelecionado) return;

            await movimentoStockService.criarMovimento({
                produto_id: itemSelecionado.id,
                quantidade,
                motivo,
                tipo: "entrada",
                tipo_movimento: "ajuste",
            });

            await carregarDados();

            setModalEntradaAberto(false);
        },
        [itemSelecionado, carregarDados]
    );

    // ========================================
    // EDITAR SERVIÇO
    // ========================================

    const handleEditarItem = useCallback(
        async (
            dados: AtualizarProdutoInput
        ): Promise<{ success: boolean; error?: string }> => {
            if (!itemSelecionado) {
                return {
                    success: false,
                    error: "Nenhum serviço seleccionado",
                };
            }

            try {
                const dadosAtualizacao = {
                    nome: dados.nome,
                    descricao: dados.descricao,
                    preco_venda: dados.preco_venda,
                    status: dados.status,
                    taxa_iva: dados.taxa_iva,
                    sujeito_iva: dados.sujeito_iva,
                    taxa_retencao: dados.taxa_retencao,
                    duracao_estimada: dados.duracao_estimada,
                    unidade_medida: dados.unidade_medida,
                    codigo_isencao: dados.codigo_isencao,
                };

                await produtoService.atualizarProduto(
                    itemSelecionado.id,
                    dadosAtualizacao
                );

                await carregarDados();

                setModalEdicaoAberto(false);
                setItemSelecionado(null);

                return { success: true };
            } catch (error: unknown) {
                const apiError = getApiError(error);

                console.error("Erro ao editar serviço:", error);

                return {
                    success: false,
                    error:
                        apiError.response?.data?.message ||
                        apiError.message ||
                        "Erro ao guardar alterações",
                };
            }
        },
        [itemSelecionado, carregarDados]
    );

    // ========================================
    // MOVER PARA A LIXEIRA
    // ========================================

    const handleDeletarItem = useCallback(async (): Promise<void> => {
        if (!modalConfirmacao.produto) return;

        try {
            await produtoService.moverParaLixeira(
                modalConfirmacao.produto.id
            );

            await carregarDados();

            setModalConfirmacao({
                isOpen: false,
                tipo: "delete",
                produto: null,
            });
        } catch (error: unknown) {
            console.error("Erro ao eliminar serviço:", error);
        }
    }, [modalConfirmacao.produto, carregarDados]);

    // ========================================
    // RESTAURAR SERVIÇO
    // ========================================

    const handleRestaurarItem = useCallback(async (): Promise<void> => {
        if (!modalConfirmacao.produto) return;

        try {
            await produtoService.restaurarProduto(
                modalConfirmacao.produto.id
            );

            await carregarDeletados();
            await carregarDados();

            setModalConfirmacao({
                isOpen: false,
                tipo: "restore",
                produto: null,
            });
        } catch (error: unknown) {
            console.error("Erro ao restaurar serviço:", error);
        }
    }, [modalConfirmacao.produto, carregarDeletados, carregarDados]);

    // ========================================
    // ELIMINAÇÃO PERMANENTE
    // ========================================

    const handleForceDelete = useCallback(async (): Promise<void> => {
        if (!modalConfirmacao.produto) return;

        try {
            await produtoService.deletarPermanentemente(
                modalConfirmacao.produto.id
            );

            await carregarDeletados();

            setModalConfirmacao({
                isOpen: false,
                tipo: "delete",
                produto: null,
            });
        } catch (error: unknown) {
            console.error("Erro ao eliminar serviço permanentemente:", error);
        }
    }, [modalConfirmacao.produto, carregarDeletados]);

    // ========================================
    // ABRIR MODAIS
    // ========================================

    const abrirModalEntrada = useCallback(
        (_item: Produto): void => {
            alert("Serviços não têm controlo de stock.");
        },
        []
    );

    const abrirModalEditar = useCallback((item: Produto): void => {
        setItemSelecionado(item);
        setModalEdicaoAberto(true);
    }, []);

    const abrirModalDeletar = useCallback((item: Produto): void => {
        setModalConfirmacao({
            isOpen: true,
            tipo: "delete",
            produto: item,
        });
    }, []);

    const abrirModalRestaurar = useCallback((item: Produto): void => {
        setModalConfirmacao({
            isOpen: true,
            tipo: "restore",
            produto: item,
        });
    }, []);

    const abrirModalForceDelete = useCallback((item: Produto): void => {
        setModalConfirmacao({
            isOpen: true,
            tipo: "warning",
            produto: item,
        });
    }, []);

    // ========================================
    // FECHAR MODAIS
    // ========================================

    const fecharModais = useCallback((): void => {
        setModalEntradaAberto(false);
        setModalEdicaoAberto(false);

        setModalConfirmacao({
            isOpen: false,
            tipo: "delete",
            produto: null,
        });

        setItemSelecionado(null);
    }, []);

    // ========================================
    // RETORNO DO HOOK
    // ========================================

    return {
        // Estados
        loading,
        isInitialLoad,
        itens,
        itensDeletados,
        categorias,
        movimentacoes,
        busca,
        categoriaFiltro,
        filtroEstoque,
        abaAtiva,
        modalEntradaAberto,
        modalEdicaoAberto,
        itemSelecionado,
        modalConfirmacao,

        // Setters
        setBusca,
        setCategoriaFiltro,
        setFiltroEstoque,
        setAbaAtiva,

        // Acções
        carregarDados,
        carregarMovimentacoes,
        carregarDeletados,
        aplicarFiltros,
        abrirModalEntrada,
        abrirModalEditar,
        abrirModalDeletar,
        abrirModalRestaurar,
        abrirModalForceDelete,
        fecharModais,
        handleEntrada,
        handleEditarItem,
        handleDeletarItem,
        handleRestaurarItem,
        handleForceDelete,
    };
}
