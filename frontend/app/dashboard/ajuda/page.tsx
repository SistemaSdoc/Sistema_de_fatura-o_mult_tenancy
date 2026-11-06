"use client";

import { useState, useMemo } from "react";
import {
  HelpCircle,
  Mail,
  Phone,
  ChevronDown,
  ChevronRight,
  Search,
  Package,
  Users,
  FileSpreadsheet,
  Settings,
  DollarSign,
  Building2,
  Printer,
  FileText, // Ícone adicionado para a nova categoria
} from "lucide-react";
import { useThemeColors } from "@/context/ThemeContext";

import MainEmpresa from "@/app/components/MainEmpresa";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
  tags?: string[];
  videoUrl?: string;
  docsUrl?: string;
}

interface Category {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

export default function AjudaPage() {
  const colors = useThemeColors() as any;
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("todas");

  // ==================== FAQS FOCADOS NO UTILIZADOR ====================
  const faqs = useMemo<FAQItem[]>(
    () => [
      // PRODUTOS E SERVIÇOS
      {
        question: "Como cadastrar um novo produto ou serviço?",
        answer:
          'Vá ao menu "Gestão de Stock" e clique em "Stock". Depois clique no botão "Novo Produto" para cadastrar individualmente. Preencha o nome, descrição, preço de venda, quantidade em stock e a categoria. Para serviços, pode definir "Serviço" e o stock fica automático como 0. Não se esqueça de definir o IVA (se aplicável) e a margem de lucro. Dica: Se tiver muitos produtos para cadastrar, pode usar a opção "Importar" na página de Stock. Baixe o modelo Excel, preencha os campos do documento e faça o upload. O sistema irá processar e cadastrar todos de uma só vez, poupando tempo e evitando erros de digitação!',
        category: "produtos",
        tags: ["produto", "serviço", "cadastro", "stock", "importar", "Excel"],
      },
      {
        question: "O que é o stock mínimo e para que serve?",
        answer:
          "O stock mínimo é a quantidade que você considera como limite de aviso. Quando o seu produto chega a essa quantidade, o sistema mostra um alerta na sua página inicial (campainha de notificações). Isto ajuda a evitar ficar sem produtos importantes.",
        category: "produtos",
        tags: ["stock", "alerta", "inventário"],
      },
      {
        question: "Como definir preços diferentes para o mesmo produto?",
        answer:
          'Para produtos com variações (tamanhos, cores, etc.), pode criar produtos separados com preços diferentes ou usar a função "Variações" que permite definir múltiplas opções de preço para um mesmo produto base.',
        category: "produtos",
        tags: ["preço", "variação", "produto"],
      },

      // CLIENTES
      {
        question: "Como cadastrar um cliente?",
        answer:
          'Vá ao menu "Clientes" e clique em "Novo Cliente". Preencha o NIF, nome, email, telefone e morada. O cliente fica guardado para uso em futuras facturas, poupando tempo de digitação.',
        category: "clientes",
        tags: ["cliente", "cadastro", "NIF"],
      },
      {
        question: "Preciso do NIF para todos os clientes?",
        answer:
          "Para facturas com valor superior a 5.000 Kz, é obrigatório ter o NIF do cliente para emissão fiscal. Para valores menores, pode emitir sem NIF, mas recomendamos sempre registar para manter o histórico.",
        category: "clientes",
        tags: ["NIF", "factura", "obrigação fiscal"],
      },
      {
        question: "Como consultar o histórico de compras de um cliente?",
        answer:
          "Ao abrir o cliente na lista, clicando no nome ou no ícone de visualização, verá todas as vendas e facturas associadas a ele. Pode também gerar um relatório de compras por cliente.",
        category: "clientes",
        tags: ["histórico", "compras", "relatório"],
      },

      // FACTURAÇÃO GERAL
      {
        question: "Como emitir uma factura-recibo?",
        answer:
          'No menu "Facturação" escolha "Gerar factura-recibo". Selecione o cliente (ou crie um novo), adicione os produtos/serviços, defina a quantidade e o preço. O sistema calcula automaticamente o IVA e o total. Depois, clique em "Emitir" e escolha como quer entregar: imprimir, enviar por email ou baixar o PDF.',
        category: "faturacao",
        tags: ["factura-recibo", "emissão", "FR"],
      },
      {
        question: "Como emitir uma factura normal (sem recibo)?",
        answer:
          'No menu "Facturação" escolha "Gerar facturas". O processo é semelhante à factura-recibo, mas com a diferença que pode ser usada para empresas que trabalham com recebimentos posteriormente. Lembre-se de que em Angola, para a maioria das vendas ao público, a factura-recibo é a mais comum.',
        category: "faturacao",
        tags: ["factura", "FT", "emissão"],
      },
      {
        question: "Como emitir uma proforma (orçamento)?",
        answer:
          'No menu "Facturação" escolha "Gerar proformas". Preencha os dados do cliente e itens, e o sistema gerará um orçamento provisório, que não é um documento fiscal. Pode converter uma proforma em factura depois que o cliente aceitar o orçamento.',
        category: "faturacao",
        tags: ["proforma", "orçamento", "FP"],
      },
      {
        question: "Como regularizar uma Fatura de Adiantamento?",
        answer:
          'Depois de emitir a factura definitiva (FT) para o mesmo cliente, abra a Fatura de Adiantamento (FA) e escolha "Regularizar com NC". Selecione a FT. O sistema emite uma Nota de Crédito pelo valor total da FA, referencia a NC à FA e aplica o crédito à FT. A FA original não é alterada; o saldo pendente da FT passa a mostrar o valor restante.',
        category: "faturacao",
        tags: ["adiantamento", "FA", "regularização", "nota de crédito", "NC"],
      },
      {
        question: "Como aplicar descontos ou acrescentos?",
        answer:
          'Durante a criação da factura, existe um campo "Desconto" onde pode aplicar uma percentagem de desconto sobre o total. Também pode adicionar taxas extras, como serviço de entrega, antes de finalizar.',
        category: "faturacao",
        tags: ["desconto", "acréscimo", "taxas"],
      },
      {
        question: "O que fazer se errar um valor na factura?",
        answer:
          'Se a factura já foi emitida, não pode ser alterada. Deve emitir uma Nota de Crédito para anular a factura errada e depois emitir uma nova factura com os dados corretos. O sistema tem uma opção "Nota de Crédito" para este fim.',
        category: "faturacao",
        tags: ["erro", "correção", "nota de crédito", "NC"],
      },
      {
        question: "Como gerar uma Nota de Crédito?",
        answer:
          'Vá à página da factura que deseja corrigir, clique em "Emitir Nota de Crédito". Preencha o motivo (obrigatório, mínimo 10 caracteres) e os itens a serem creditados. O sistema irá gerar um novo documento que anula parcial ou totalmente a factura original.',
        category: "faturacao",
        tags: ["nota de crédito", "NC", "correção"],
      },

      // ⭐ DOCUMENTOS FISCAIS ESPECÍFICOS (Baseados nas Leis 71/25 e 683/25)
      {
        question: "O que é a Autofacturação (AF) e quando devo usá-la?",
        answer:
          "A Autofacturação (código AF) está prevista no Artigo 3.º, alínea c) do Decreto Presidencial n.º 71/25. É usada quando o adquirente (o cliente) emite a factura-recibo em substituição do fornecedor. Isto acontece, por exemplo, quando o fornecedor não está registado para emitir facturas em Angola. No FaturaJa, esta opção tem um fluxo próprio. Ao emitir, o sistema gera um documento com o tipo AF, identificando claramente quem está a emitir (Adquirente) e quem é o fornecedor substituído, com os respetivos NIFs.",
        category: "documentos_fiscais",
        tags: ["autofacturação", "AF", "fornecedor", "adquirente"],
      },
      {
        question: "Qual é a diferença entre Recibo (RC) e Outros Recibos (RG)?",
        answer:
          "A diferença está no meio de pagamento. Segundo as especificações da AGT (Decreto Executivo n.º 683/25), o código RC deve ser usado exclusivamente para pagamentos em dinheiro (numerário). Para pagamentos por transferência bancária, cheque, cartão ou multibanco, o documento correto é o RG (Outros Recibos). O sistema faz esta distinção automaticamente com base no método de pagamento que selecionar. Se o cliente pagar em dinheiro, o sistema emite RC; se pagar por transferência, emite RG.",
        category: "documentos_fiscais",
        tags: ["recibo", "RC", "RG", "numerário", "transferência"],
      },
      {
        question: "Como funciona o Estorno (RE) e quando devo usá-lo?",
        answer:
          "O Estorno (RE) é o documento utilizado para anular ou reverter um recibo (RC ou RG) que foi emitido com erro ou cujo pagamento foi revertido (ex.: um cheque devolvido). Em vez de apagar o recibo original, o que é proibido pela lei, emite-se um RE que referencia o recibo original e anula os seus efeitos. No FaturaJa, basta abrir o recibo que deseja anular e selecionar a opção 'Estornar'. O sistema gera o RE e atualiza o saldo da factura de origem, repondo a dívida.",
        category: "documentos_fiscais",
        tags: ["estorno", "RE", "anulação", "recibo"],
      },
      {
        question: "O que são o Aviso de Cobrança (AC) e o Aviso de Cobrança/Recibo (ACR)?",
        answer:
          "Estes documentos são exclusivos para o setor segurador, conforme o Artigo 3.º, alínea d) do Decreto n.º 71/25. O AC é emitido pela seguradora para formalizar a cobrança do prémio do seguro. O ACR é a versão que já comprova o pagamento no mesmo documento, substituindo a necessidade de emitir um recibo separado (Artigo 6.º). No FaturaJa, estes tipos só ficam disponíveis se a empresa estiver configurada como 'Seguradora' nas definições.",
        category: "documentos_fiscais",
        tags: ["aviso de cobrança", "AC", "ACR", "seguradora"],
      },
      {
        question: "Para que serve a Factura Genérica (FGEN)?",
        answer:
          "A Factura Genérica (FGEN) é um documento sectorial restrito a instituições financeiras (bancos), conforme previsto no Artigo 3.º do Decreto n.º 71/25. Serve para faturar, de forma consolidada e mensal, todos os serviços e comissões bancárias cobrados a um cliente. Se a sua empresa não for uma instituição financeira, não deve emitir FGEN. O sistema está preparado para validar esta restrição.",
        category: "documentos_fiscais",
        tags: ["factura genérica", "FGEN", "banco", "financeira"],
      },
      {
        question: "Quando devo emitir um Talão de Venda (TV)?",
        answer:
          "O Talão de Venda (TV) é um documento simplificado, previsto no Artigo 3.º, alínea p) do Decreto n.º 71/25, para vendas a consumidor final sem NIF (quando a lei dispensa a emissão de factura). No FaturaJa, o TV exige pagamento imediato e não aceita NIF. Se o cliente fornecer o NIF, deve ser emitida uma Factura-Recibo (FR) em vez de TV.",
        category: "documentos_fiscais",
        tags: ["talão de venda", "TV", "consumidor final", "sem NIF"],
      },
      {
        question: "Posso usar a Nota de Débito (ND) para adicionar um produto a uma factura?",
        answer:
          "Não. A Nota de Débito (ND) não serve para adicionar produtos ou serviços a uma factura existente. Segundo o Artigo 3.º, alínea m) do Decreto n.º 71/25, a ND serve para documentar débitos quando não há obrigação de emitir factura e sem liquidação de IVA (ex.: carregamento de vales pré-pagos ou repasse de despesas). Para corrigir ou adicionar itens a uma factura, o documento correto é sempre a Nota de Crédito (NC).",
        category: "documentos_fiscais",
        tags: ["nota de débito", "ND", "produto", "correção"],
      },

      // FORNECEDORES E COMPRAS
      {
        question: "Como cadastrar um fornecedor?",
        answer:
          'Vá ao menu "Fornecedores" e clique em "Novo Fornecedor". Preencha os dados como NIF, nome, contacto e morada. Isso facilita quando for fazer uma compra de mercadoria.',
        category: "fornecedores",
        tags: ["fornecedor", "cadastro", "NIF"],
      },
      {
        question: "Como registrar a compra de produtos?",
        answer:
          'No menu "Compras" (se disponível) ou em "Gestão de Stock" há a opção de registrar entrada de produtos. Informe o fornecedor, os produtos adquiridos, as quantidades e o preço de custo. O stock é automaticamente atualizado.',
        category: "fornecedores",
        tags: ["compra", "entrada", "stock"],
      },

      // RELATÓRIOS E ANÁLISE
      {
        question: "Como ver o total facturado num período?",
        answer:
          'No menu "Relatórios" escolha "Vendas". Defina a data de início e fim, e o sistema mostrará gráficos e totais: valor total facturado, produtos mais vendidos, clientes que mais compraram, etc.',
        category: "relatorios",
        tags: ["facturação", "período", "relatório"],
      },
      {
        question: "Como ver a rentabilidade dos produtos?",
        answer:
          'Em "Relatórios" há a opção "Margem de Lucro". O sistema calcula automaticamente a diferença entre o preço de venda e o preço de custo, mostrando qual produto dá mais lucro.',
        category: "relatorios",
        tags: ["rentabilidade", "margem", "lucro"],
      },

      // IMPRESSORAS TÉRMICAS
      {
        question: "Como adicionar uma nova impressora térmica?",
        answer:
          'Vá a "Configurações" e na secção "Empresa" encontrará o cartão "Impressoras térmicas". Clique em "Gerir impressoras" e depois preencha o nome (ex.: Epson Caixa 1), escolha a fila CUPS na lista (ex.: Epson_TM-T88IV_Raw) e o tipo (CUPS, USB direto ou Windows). Clique em "Adicionar". A primeira impressora adicionada fica automaticamente como padrão. Pode adicionar quantas quiser — cada caixa pode ter a sua.',
        category: "impressoras",
        tags: ["impressora", "adicionar", "configurar", "CUPS"],
      },
      {
        question: "Como mudar a impressora padrão?",
        answer:
          'Em "Configurações → Empresa → Impressoras térmicas", clique em "Gerir impressoras". Na lista, ao lado de cada impressora que não é padrão, aparece uma estrela (⭐). Basta clicar nela e a impressora passa a ser a padrão para toda a empresa. A alteração é imediata — não precisa reiniciar nada.',
        category: "impressoras",
        tags: ["padrão", "default", "estrela", "mudar"],
      },
      {
        question: "Como escolher uma impressora diferente só para imprimir um documento?",
        answer:
          'No topo da página "Facturas" (e noutras páginas de documentos) existe um botão com o ícone de impressora 🖨️ e o nome da impressora atual. Clique nele e escolha outra impressora da lista. Essa escolha vale apenas para a sua sessão — os outros utilizadores continuam a usar a padrão. Ao imprimir o próximo talão, ele sairá na impressora que escolheu.',
        category: "impressoras",
        tags: ["escolher", "selecionar", "trocar", "rápido"],
      },
      {
        question: "Qual a diferença entre CUPS, USB direto e Windows?",
        answer:
          'CUPS é o sistema de impressão padrão do Linux e é o recomendado para a maioria dos casos — a impressora aparece como uma fila e o sistema envia os dados ESC/POS corretamente. USB direto envia os comandos diretamente para o dispositivo (/dev/usb/lp0) e é útil quando a fila CUPS não está configurada. Windows aplica-se apenas se o servidor estiver a correr em Windows, onde usa o nome da impressora do sistema. Na dúvida, escolha CUPS.',
        category: "impressoras",
        tags: ["CUPS", "USB", "Windows", "tipo", "diferença"],
      },
      {
        question: "A impressora não imprime. O que fazer?",
        answer:
          'Verifique 3 coisas: (1) A impressora está ligada e com papel? (2) No "Gerir impressoras", a fila escolhida está correta e ativa? (3) Se estiver noutro computador ou rede, a impressora está acessível? Se a fila CUPS existir mas continuar sem imprimir, no terminal Linux confirme com "lpstat -p". Se nada funcionar, contacte o suporte com o nome da fila e a hora exata da tentativa — o registo do erro está nos logs do servidor.',
        category: "impressoras",
        tags: ["não imprime", "erro", "problema", "falha"],
      },
      {
        question: "Posso ter impressoras diferentes em caixas diferentes?",
        answer:
          'Sim. Cada empresa pode ter várias impressoras registadas (por exemplo: "Caixa 1 - Epson", "Caixa 2 - Xprinter", "Armazém - Epson"). Cada utilizador pode escolher a sua no topo da página de facturas, ou pode definir uma como padrão para a empresa inteira. Uma impressora definida como padrão é a que todos os utilizadores usam quando não escolhem outra.',
        category: "impressoras",
        tags: ["várias", "múltiplas", "caixas", "empresa"],
      },
      {
        question: "Como testar se a impressora está a funcionar?",
        answer:
          'O sistema testa automaticamente antes de enviar cada talão. Se a fila não responder, verá uma mensagem "Impressora não encontrada ou inativa". Para testar manualmente: em "Gerir impressoras", adicione a impressora, escolha-a no topo da página de facturas e clique em "Imprimir 80mm" num documento recente. Se sair o talão, está tudo bem. Se não sair, verifique os cabos e se o driver está carregado no sistema operativo.',
        category: "impressoras",
        tags: ["testar", "verificar", "funcionar", "teste"],
      },
      {
        question: "Apaguei a impressora por engano. Posso recuperar?",
        answer:
          'Não é possível recuperar automaticamente, mas basta adicionar de novo. Em "Gerir impressoras", preencha o nome que tinha antes e escolha novamente a fila CUPS na lista. Como as filas CUPS são do sistema (e não do sistema de facturação), não se perderam — só o registo interno da empresa é que foi apagado. Se a impressora apagada era a padrão, a próxima que adicionar ficará como padrão.',
        category: "impressoras",
        tags: ["apagar", "recuperar", "engano", "remover"],
      },

      // SISTEMA E CONFIGURAÇÕES
      {
        question: "Como mudar o logotipo da minha empresa?",
        answer:
          'Vá ao menu "Configurações" e na secção "Empresa" tem a opção de fazer upload de uma nova imagem. O logo aparecerá nas facturas e no topo do sistema.',
        category: "configuracoes",
        tags: ["logótipo", "logo", "personalização"],
      },
      {
        question: "Como alterar o regime fiscal ou IVA padrão?",
        answer:
          'Em "Configurações", na secção "Fiscal", pode escolher entre regime simplificado ou geral. Se for geral, defina a percentagem de IVA padrão que será aplicada automaticamente nas facturas.',
        category: "configuracoes",
        tags: ["regime fiscal", "IVA", "configuração"],
      },
      {
        question: 'O que significa "sujeito a IVA"?',
        answer:
          "Se a sua empresa está sujeita ao IVA (Imposto sobre o Valor Acrescentado), significa que deve cobrar IVA nas suas vendas e entregar ao Estado. Se não estiver (regime simplificado), não cobra IVA, mas também não pode deduzir IVA nas suas compras.",
        category: "configuracoes",
        tags: ["IVA", "sujeito a IVA", "regime"],
      },

      // DÚVIDAS COMUNS
      {
        question: "Como recuperar uma senha esquecida?",
        answer:
          'Na tela de login, clique em "Esqueceu a senha?". Digite o seu email e receberá um link para redefinir a sua palavra-passe.',
        category: "geral",
        tags: ["senha", "recuperação", "login"],
      },
      {
        question: "Posso usar o sistema no telemóvel?",
        answer:
          "Sim! O FacturaJá é totalmente responsivo. Pode aceder pelo navegador do seu telemóvel e terá a mesma experiência adaptada à tela pequena. Recomendamos usar o Chrome ou Safari.",
        category: "geral",
        tags: ["mobile", "telemóvel", "responsivo"],
      },
      {
        question: "Como obter suporte técnico?",
        answer:
          "No final desta página, tem os contactos da nossa equipa de suporte. Pode nos enviar um email ou ligar. Respondemos em até 24 horas úteis.",
        category: "geral",
        tags: ["suporte", "contacto", "ajuda"],
      },
      {
        question: "O que fazer se o sistema estiver lento?",
        answer:
          "Verifique a sua ligação à internet. Se o problema persistir, pode limpar a cache do navegador (Ctrl+Shift+Delete no Windows). Caso ainda esteja lento, contacte o suporte técnico.",
        category: "geral",
        tags: ["lentidão", "performance", "cache"],
      },
    ],
    []
  );

  const categories = useMemo<Category[]>(
    () => [
      { id: "todas", label: "Todas", icon: HelpCircle, description: "Todas as perguntas" },
      { id: "produtos", label: "Produtos", icon: Package, description: "Gestão de produtos e stock" },
      { id: "clientes", label: "Clientes", icon: Users, description: "Cadastro e histórico" },
      { id: "faturacao", label: "Faturação", icon: FileSpreadsheet, description: "Facturas, recibos e proformas" },
      { id: "documentos_fiscais", label: "Documentos Fiscais", icon: FileText, description: "AF, RC, RG, RE, AC, ACR, TV, FGEN" },
      { id: "fornecedores", label: "Fornecedores", icon: Building2, description: "Cadastro e compras" },
      { id: "relatorios", label: "Relatórios", icon: DollarSign, description: "Análise de vendas e rentabilidade" },
      { id: "impressoras", label: "Impressoras", icon: Printer, description: "Configuração e uso de impressoras térmicas" },
      { id: "configuracoes", label: "Configurações", icon: Settings, description: "Empresa, fiscal e impressão" },
      { id: "geral", label: "Geral", icon: HelpCircle, description: "Dúvidas gerais" },
    ],
    []
  );

  // ==================== FILTROS ====================
  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchCategory = activeCategory === "todas" || faq.category === activeCategory;
      const matchSearch =
        faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (faq.tags && faq.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())));
      return matchCategory && matchSearch;
    });
  }, [faqs, searchTerm, activeCategory]);

  const toggleFaq = (question: string) => {
    setExpandedFaq(expandedFaq === question ? null : question);
  };

  // Agrupa FAQs por categoria para a contagem
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { todas: faqs.length };
    faqs.forEach((faq) => {
      counts[faq.category] = (counts[faq.category] || 0) + 1;
    });
    return counts;
  }, [faqs]);

  // ==================== RENDER ====================
  return (
    <MainEmpresa>
      <div className="space-y-6 pb-8">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: colors.secondary }}>
              Ajuda & Suporte
            </h1>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              Tire suas dúvidas sobre como usar o sistema. Faturação, produtos, clientes e muito mais.
            </p>
          </div>
        </div>

        {/* Barra de pesquisa */}
        <div className="relative border p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="flex items-center gap-3">
            <Search size={18} style={{ color: colors.textSecondary }} />
            <input
              type="text"
              placeholder="O que você precisa? (Ex: como emitir factura, configurar impressora...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: colors.text }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="p-1 hover:opacity-60" style={{ color: colors.textSecondary }}>
                ✕
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="mt-2 text-xs" style={{ color: colors.textSecondary }}>
              {filteredFaqs.length} resultado{filteredFaqs.length !== 1 ? "s" : ""} encontrado{filteredFaqs.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Categorias */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            const count = categoryCounts[cat.id] || 0;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5 ${isActive ? "text-white" : ""}`}
                style={{
                  backgroundColor: isActive ? colors.primary : colors.hover,
                  color: isActive ? "#fff" : colors.textSecondary,
                }}>
                <cat.icon size={14} />
                {cat.label}
                <span className={`ml-0.5 text-[10px] px-1.5  ${isActive ? "bg-white/20 text-white" : "bg-black/5 text-gray-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* FAQs */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="p-8 text-center border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <HelpCircle size={32} style={{ color: colors.textSecondary, opacity: 0.4 }} />
              <p className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
                Nenhuma pergunta encontrada para "{searchTerm}".
              </p>
              <button
                onClick={() => setSearchTerm("")}
                className="mt-2 text-sm underline hover:opacity-70"
                style={{ color: colors.secondary }}>
                Limpar pesquisa
              </button>
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isExpanded = expandedFaq === faq.question;
              const categoryLabel = categories.find((c) => c.id === faq.category)?.label || faq.category;
              return (
                <div
                  key={faq.question}
                  className=" border transition-all overflow-hidden"
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  }}>
                  <button
                    onClick={() => toggleFaq(faq.question)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:opacity-80 transition">
                    <span className="text-sm font-medium" style={{ color: colors.text }}>
                      {faq.question}
                    </span>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span
                        className="text-[10px] px-2 py-0.5 hidden sm:inline"
                        style={{
                          backgroundColor: colors.hover,
                          color: colors.textSecondary,
                        }}>
                        {categoryLabel}
                      </span>
                      {isExpanded ? (
                        <ChevronDown size={16} style={{ color: colors.textSecondary }} />
                      ) : (
                        <ChevronRight size={16} style={{ color: colors.textSecondary }} />
                      )}
                    </div>
                  </button>
                  {isExpanded && (
                    <div
                      className="px-4 pb-4 pt-1 text-sm leading-relaxed border-t"
                      style={{
                        borderColor: colors.border,
                        color: colors.textSecondary,
                      }}>
                      {faq.answer}
                      {faq.tags && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {faq.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-2 py-0.5 "
                              style={{
                                backgroundColor: colors.hover,
                                color: colors.textSecondary,
                              }}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Contacto - com linguagem amigável */}
        <div
          className="p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{
            backgroundColor: `${colors.primary}`,
            borderColor: colors.primary,
          }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: colors.secondary }}>
              <Mail size={18} color="#fff" />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: colors.text }}>
                Ainda não encontrou a resposta?
              </p>
              <p className="text-xs" style={{ color: colors.textSecondary }}>
                A nossa equipa de suporte está disponível para ajudar.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="mailto:sistema.sdoca@sdoca.it.ao"
              className="px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition hover:opacity-80"
              style={{ backgroundColor: colors.card, color: colors.text }}>
              <Mail size={14} /> sistema.sdoca@sdoca.it.ao
            </a>
            <a
              href="tel:+244923678529"
              className="px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition hover:opacity-80"
              style={{ backgroundColor: colors.card, color: colors.text }}>
              <Phone size={14} /> +244 927 800 505
            </a>
          </div>
        </div>
      </div>
    </MainEmpresa>
  );
}