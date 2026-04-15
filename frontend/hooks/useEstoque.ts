// src/app/(empresa)/estoque/hooks/useEstoque.ts
import { useState, useCallback } from "react";
import {
    produtoService,
    movimentoStockService,
    Produto,
    Categoria,
    MovimentoStock,
    isServico,
    isProduto
} from "@/services/produtos";

interface ModalConfirmacaoState {
    isOpen: boolean;
    tipo: "delete" | "restore" | "warning";
    produto: Produto | null;
}

interface ModalEdicaoState {
    isOpen: boolean;
    item: Produto | null;
}

export function useEstoque() {
    const [loading, setLoading] = useState(true);
    const [resumo, setResumo] = useState<any>(null);
    const [itens, setItens] = useState<Produto[]>([]);
    const [itensDeletados, setItensDeletados] = useState<Produto[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [movimentacoes, setMovimentacoes] = useState<MovimentoStock[]>([]);

    // Filtros
    const [busca, setBusca] = useState("");
    const [categoriaFiltro, setCategoriaFiltro] = useState("");
    const [tipoFiltro, setTipoFiltro] = useState<"todos" | "produto" | "servico">("todos");
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
            const [resumoData, itensData, cats, movs] = await Promise.all([
                movimentoStockService.resumo(),
                produtoService.listarProdutos({}),
                produtoService.listarCategorias(),
                movimentoStockService.listarMovimentos({ paginar: false }),
            ]);

            setResumo(resumoData);
            const listaItens = Array.isArray(itensData.produtos)
                ? itensData.produtos
                : (itensData.produtos as any)?.data || [];
            setItens(listaItens);
            setCategorias(cats);
            const listaMovs = Array.isArray(movs.movimentos)
                ? movs.movimentos
                : (movs.movimentos as any)?.data || [];
            setMovimentacoes(listaMovs);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const carregarDeletados = useCallback(async () => {
        try {
            const response = await produtoService.listarDeletados({ paginar: false });
            const listaDeletados = Array.isArray(response.produtos)
                ? response.produtos
                : (response.produtos as any)?.data || [];
            setItensDeletados(listaDeletados);
        } catch (error) {
            console.error("Erro ao carregar itens deletados:", error);
        }
    }, []);

    const aplicarFiltros = useCallback(async () => {
        setLoading(true);
        try {
            const filtros: Parameters<typeof produtoService.listarProdutos>[0] = {};
            if (busca) filtros.busca = busca;
            if (categoriaFiltro) filtros.categoria_id = categoriaFiltro;
            if (tipoFiltro === "produto") filtros.tipo = "produto";
            if (tipoFiltro === "servico") filtros.tipo = "servico";
            if (filtroEstoque === "baixo") filtros.estoque_baixo = true;
            if (filtroEstoque === "zerado") filtros.sem_estoque = true;

            const data = await produtoService.listarProdutos(filtros);
            const listaItens = Array.isArray(data.produtos)
                ? data.produtos
                : (data.produtos as any)?.data || [];
            setItens(listaItens);
        } catch (error) {
            console.error("Erro ao filtrar:", error);
        } finally {
            setLoading(false);
        }
    }, [busca, categoriaFiltro, tipoFiltro, filtroEstoque]);

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

    const handleEditarItem = useCallback(async (dados: any): Promise<{ success: boolean; error?: any }> => {
        if (!itemSelecionado) {
            return { success: false, error: "Nenhum item selecionado" };
        }
        
        try {
            // Prepara os dados para atualização
            const dadosAtualizacao = {
                nome: dados.nome,
                descricao: dados.descricao,
                preco_venda: dados.preco_venda,
                status: dados.status,
                ...(itemSelecionado.tipo === "produto" && {
                    categoria_id: dados.categoria_id || null, // ✅ IVA vem da categoria
                    codigo: dados.codigo,
                    preco_compra: dados.preco_compra,
                    // ✅ REMOVIDO: taxa_iva e sujeito_iva (vem da categoria)
                    estoque_minimo: dados.estoque_minimo,
                    fornecedor_id: dados.fornecedor_id || null,
                }),
                ...(itemSelecionado.tipo === "servico" && {
                    // ✅ Serviços mantêm próprio IVA
                    taxa_iva: dados.taxa_iva,
                    sujeito_iva: dados.sujeito_iva,
                    taxa_retencao: dados.taxa_retencao,
                    duracao_estimada: dados.duracao_estimada,
                    unidade_medida: dados.unidade_medida,
                    codigo_isencao: dados.codigo_isencao,
                }),
            };

            await produtoService.atualizarProduto(itemSelecionado.id, dadosAtualizacao);
            await carregarDados();
            setModalEdicaoAberto(false);
            setItemSelecionado(null);
            
            return { success: true };
        } catch (error: any) {
            console.error("Erro ao editar item:", error);
            return { success: false, error: error.response?.data?.message || error.message || "Erro ao salvar alterações" };
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
        if (isServico(item)) {
            alert("Serviços não têm controle de estoque");
            return;
        }
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

    const produtos = itens.filter(isProduto);
    const servicos = itens.filter(isServico);

    return {
        // Estados
        loading,
        resumo,
        itens,
        itensDeletados,
        categorias,
        movimentacoes,
        busca,
        categoriaFiltro,
        tipoFiltro,
        filtroEstoque,
        abaAtiva,
        modalEntradaAberto,
        modalEdicaoAberto,
        itemSelecionado,
        modalConfirmacao,
        produtos,
        servicos,

        // Setters
        setBusca,
        setCategoriaFiltro,
        setTipoFiltro,
        setFiltroEstoque,
        setAbaAtiva,

        // Actions
        carregarDados,
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