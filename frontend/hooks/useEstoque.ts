// src/app/(empresa)/estoque/hooks/useEstoque.ts
import { useState, useCallback } from "react";
import {
    produtoService,
    movimentoStockService,
    Produto,
    Categoria,
    MovimentoStock,
    AtualizarProdutoInput,
    PaginatedResponse,
    ResumoStockResponse,
} from "@/services/produtos";

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
    typeof error === "object" && error !== null ? (error as ApiError) : {};

const getCollection = <T,>(value: T[] | PaginatedResponse<T>): T[] =>
    Array.isArray(value) ? value : value.data || [];

export function useEstoque() {
    const [loading, setLoading] = useState(true);
    const [resumo, setResumo] = useState<ResumoStockResponse | null>(null);
    const [itens, setItens] = useState<Produto[]>([]);
    const [itensDeletados, setItensDeletados] = useState<Produto[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [movimentacoes, setMovimentacoes] = useState<MovimentoStock[]>([]);
    const [totalMovimentacoes, setTotalMovimentacoes] = useState(0);
    const [totalPaginasMovimentacoes, setTotalPaginasMovimentacoes] = useState(1);

    // Filtros
    const [busca, setBusca] = useState("");
    const [categoriaFiltro, setCategoriaFiltro] = useState("");
    const [filtroEstoque, setFiltroEstoque] = useState<"todos" | "baixo" | "zerado">("todos");

    // Modais
    const [modalEntradaAberto, setModalEntradaAberto] = useState(false);
    const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
    const [itemSelecionado, setItemSelecionado] = useState<Produto | null>(null);
    const [modalConfirmacao, setModalConfirmacao] = useState<ModalConfirmacaoState>({
        isOpen: false,
        tipo: "delete",
        produto: null,
    });

    // Tabs
    const [abaAtiva, setAbaAtiva] = useState<"itens" | "movimentacoes" | "deletados">("itens");

    const carregarDados = useCallback(async () => {
        setLoading(true);
        try {
            const [resumoData, itensData, cats] = await Promise.all([
                movimentoStockService.resumo(),
                produtoService.listarProdutos({ tipo: "produto" }),
                produtoService.listarCategorias(),
            ]);

            setResumo(resumoData);
            setItens(getCollection(itensData.produtos));
            setCategorias(cats);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const carregarMovimentacoes = useCallback(async (page = 1) => {
        try {
            const movs = await movimentoStockService.listarMovimentos({
                paginar: true,
                page,
                per_page: 10,
            });
            const dadosMovimentacoes = movs.movimentos;
            setMovimentacoes(getCollection(dadosMovimentacoes));
            if (Array.isArray(dadosMovimentacoes)) {
                setTotalMovimentacoes(dadosMovimentacoes.length);
                setTotalPaginasMovimentacoes(1);
            } else {
                setTotalMovimentacoes(dadosMovimentacoes.total);
                setTotalPaginasMovimentacoes(dadosMovimentacoes.last_page);
            }
        } catch (error) {
            console.error("Erro ao carregar movimentações:", error);
        }
    }, []);

    const carregarDeletados = useCallback(async () => {
        try {
            const response = await produtoService.listarDeletados({ 
                paginar: false, 
                tipo: "produto" 
            });
            // Filtrar apenas produtos (garantia extra)
            const deletados = getCollection(response.produtos);
            setItensDeletados(deletados.filter(item => item.tipo === "produto"));
        } catch (error) {
            console.error("Erro ao carregar itens deletados:", error);
        }
    }, []);

    const aplicarFiltros = useCallback(async () => {
        setLoading(true);
        try {
            const filtros: Parameters<typeof produtoService.listarProdutos>[0] = { tipo: "produto" };
            if (busca) filtros.busca = busca;
            if (categoriaFiltro) filtros.categoria_id = categoriaFiltro;
            if (filtroEstoque === "baixo") filtros.estoque_baixo = true;
            if (filtroEstoque === "zerado") filtros.sem_estoque = true;

            const data = await produtoService.listarProdutos(filtros);
            setItens(getCollection(data.produtos));
        } catch (error) {
            console.error("Erro ao filtrar:", error);
        } finally {
            setLoading(false);
        }
    }, [busca, categoriaFiltro, filtroEstoque]);

    const handleEntrada = useCallback(async (quantidade: number, motivo: string) => {
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
    }, [itemSelecionado, carregarDados]);

    const handleEditarItem = useCallback(async (dados: AtualizarProdutoInput): Promise<{ success: boolean; error?: string }> => {
        if (!itemSelecionado) {
            return { success: false, error: "Nenhum item selecionado" };
        }
        
        try {
            // Prepara os dados para atualização (apenas produtos)
            const dadosAtualizacao = {
                nome: dados.nome,
                descricao: dados.descricao,
                preco_venda: dados.preco_venda,
                status: dados.status,
                categoria_id: dados.categoria_id || null,
                codigo: dados.codigo,
                preco_compra: dados.preco_compra,
                estoque_minimo: dados.estoque_minimo,
                fornecedor_id: dados.fornecedor_id || null,
            };

            await produtoService.atualizarProduto(itemSelecionado.id, dadosAtualizacao);
            await carregarDados();
            setModalEdicaoAberto(false);
            setItemSelecionado(null);
            
            return { success: true };
        } catch (error: unknown) {
            const apiError = getApiError(error);
            console.error("Erro ao editar item:", error);
            return { success: false, error: apiError.response?.data?.message || apiError.message || "Erro ao salvar alterações" };
        }
    }, [itemSelecionado, carregarDados]);

    const handleDeletarItem = useCallback(async () => {
        if (!modalConfirmacao.produto) return;
        await produtoService.moverParaLixeira(modalConfirmacao.produto.id);
        await carregarDados();
        setModalConfirmacao({ isOpen: false, tipo: "delete", produto: null });
    }, [modalConfirmacao.produto, carregarDados]);

    const handleRestaurarItem = useCallback(async () => {
        if (!modalConfirmacao.produto) return;
        await produtoService.restaurarProduto(modalConfirmacao.produto.id);
        await carregarDeletados();
        await carregarDados();
        setModalConfirmacao({ isOpen: false, tipo: "restore", produto: null });
    }, [modalConfirmacao.produto, carregarDeletados, carregarDados]);

    const handleForceDelete = useCallback(async () => {
        if (!modalConfirmacao.produto) return;
        await produtoService.deletarPermanentemente(modalConfirmacao.produto.id);
        await carregarDeletados();
        setModalConfirmacao({ isOpen: false, tipo: "delete", produto: null });
    }, [modalConfirmacao.produto, carregarDeletados]);

    const abrirModalEntrada = useCallback((item: Produto) => {
        setItemSelecionado(item);
        setModalEntradaAberto(true);
    }, []);

    const abrirModalEditar = useCallback((item: Produto) => {
        setItemSelecionado(item);
        setModalEdicaoAberto(true);
    }, []);

    const abrirModalDeletar = useCallback((item: Produto) => {
        setModalConfirmacao({ isOpen: true, tipo: "delete", produto: item });
    }, []);

    const abrirModalRestaurar = useCallback((item: Produto) => {
        setModalConfirmacao({ isOpen: true, tipo: "restore", produto: item });
    }, []);

    const abrirModalForceDelete = useCallback((item: Produto) => {
        setModalConfirmacao({ isOpen: true, tipo: "warning", produto: item });
    }, []);

    const fecharModais = useCallback(() => {
        setModalEntradaAberto(false);
        setModalEdicaoAberto(false);
        setModalConfirmacao({ isOpen: false, tipo: "delete", produto: null });
        setItemSelecionado(null);
    }, []);

    return {
        // Estados
        loading,
        resumo,
        itens,
        itensDeletados,
        categorias,
        movimentacoes,
        totalMovimentacoes,
        totalPaginasMovimentacoes,
        busca,
        categoriaFiltro,
        filtroEstoque,
        abaAtiva,
        modalEntradaAberto,
        modalEdicaoAberto,
        itemSelecionado,
        modalConfirmacao,
        produtos: itens, // Todos os itens são produtos

        // Setters
        setBusca,
        setCategoriaFiltro,
        setFiltroEstoque,
        setAbaAtiva,

        // Actions
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