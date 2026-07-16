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

      // FACTURAÇÃO
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
      // NOVA: Documentos fiscais
      {
        question: "Como gerar uma Nota de Crédito?",
        answer:
          'Vá à página da factura que deseja corrigir, clique em "Emitir Nota de Crédito". Preencha o motivo (obrigatório, mínimo 10 caracteres) e os itens a serem creditados. O sistema irá gerar um novo documento que anula parcial ou totalmente a factura original.',
        category: "faturacao",
        tags: ["nota de crédito", "NC", "correção"],
      },
      {
        question: "Como gerar uma Nota de Débito?",
        answer:
          'Para emitir uma Nota de Débito, a factura original deve ser do tipo FT (Factura). A nota de débito só pode ser usada para serviços (não produtos físicos) e tem prazo máximo de 30 dias após a emissão da factura. Vá à página da factura e clique em "Emitir Nota de Débito".',
        category: "faturacao",
        tags: ["nota de débito", "ND", "serviços"],
      },
      // NOVA: Impressão
      {
        question: "Como configurar a impressão em talão térmico?",
        answer:
          'Em "Configurações", secção "Impressão", defina o tipo de impressora (USB ou rede) e o caminho. Para USB, normalmente é /dev/usb/lp0 no Linux. Para rede, informe o IP da impressora. Teste a conexão antes de usar.',
        category: "configuracoes",
        tags: ["impressão", "térmica", "talão", "USB"],
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
      { id: "fornecedores", label: "Fornecedores", icon: Building2, description: "Cadastro e compras" },
      { id: "relatorios", label: "Relatórios", icon: DollarSign, description: "Análise de vendas e rentabilidade" },
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
              placeholder="O que você precisa? (Ex: como emitir factura, cadastrar produto...)"
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
