export const DOCUMENT_GROUPS = [
  { key: "faturacao", label: "Facturação de Vendas", color: "#123859", types: ["FT", "FR", "FG", "FGR", "TV", "AF"] },
  { key: "recebimentos", label: "Recebimentos", color: "#10B981", types: ["RC", "RG", "ACR"] },
  { key: "correcoes", label: "Correcções e Estornos", color: "#EF4444", types: ["NC", "ND", "RE"] },
  { key: "pre_venda", label: "Adiantamentos e Propostas", color: "#F59E0B", types: ["FA", "FP"] },
  { key: "sectoriais", label: "Sectoriais", color: "#8B5CF6", types: ["AC", "FGEN"] },
] as const;

const IMPACT_GROUPS = [
  { key: "faturacao", label: "Facturação Bruta", color: "#123859", types: ["FT", "FR", "FG", "FGR", "TV", "AF"] },
  { key: "recebimentos", label: "Recebimentos", color: "#10B981", types: ["RC", "RG", "ACR"] },
  { key: "regularizacoes", label: "Saídas/Reduções", color: "#EF4444", types: ["NC", "RE"] },
  { key: "pendente", label: "Valores Pendentes", color: "#F59E0B", types: ["FT", "FA"] },
] as const;

const PAGOS_POR_TIPO = new Set(["FR", "RC", "RG", "ACR", "FGR", "TV"]);
const ESTADOS_CANCELADOS = new Set(["cancelado", "cancelada", "estornado", "parcialmente_estornado"]);

export interface TipoDocumentoResumo {
  quantidade?: number;
  valor?: number;
  total_liquido?: number;
  quantidade_mes?: number;
  valor_mes?: number;
  quantidade_emitida?: number;
  valor_emitido?: number;
  valor_pendente?: number;
}

export interface DocumentoEstadoResumo {
  tipo: string;
  estado: string;
  quantidade: number;
}

export interface DocumentoItemEstado {
  tipo_documento: string;
  estado: string;
  total_liquido?: number;
  valor_pendente?: number;
}

export interface GrupoGrafico {
  grupo: string;
  quantidade: number;
  valor: number;
  cor: string;
}

export function agruparPorFuncao(porTipo: Record<string, TipoDocumentoResumo>): GrupoGrafico[] {
  return DOCUMENT_GROUPS.map((grupo) => ({
    grupo: grupo.label,
    cor: grupo.color,
    quantidade: grupo.types.reduce((total, tipo) => total + Number(porTipo[tipo]?.quantidade_mes ?? porTipo[tipo]?.quantidade_emitida ?? porTipo[tipo]?.quantidade ?? 0), 0),
    valor: grupo.types.reduce((total, tipo) => total + Number(porTipo[tipo]?.valor_mes ?? porTipo[tipo]?.valor_emitido ?? porTipo[tipo]?.valor ?? porTipo[tipo]?.total_liquido ?? 0), 0),
  }));
}

export function agruparImpactoFinanceiro(porTipo: Record<string, TipoDocumentoResumo>): GrupoGrafico[] {
  return IMPACT_GROUPS.map((grupo) => ({
    grupo: grupo.label,
    cor: grupo.color,
    quantidade: grupo.types.reduce((total, tipo) => total + Number(porTipo[tipo]?.quantidade_mes ?? porTipo[tipo]?.quantidade_emitida ?? porTipo[tipo]?.quantidade ?? 0), 0),
    valor: grupo.types.reduce((total, tipo) => {
      if (grupo.key === "pendente") return total + Number(porTipo[tipo]?.valor_pendente ?? 0);
      return total + Number(porTipo[tipo]?.valor_mes ?? porTipo[tipo]?.valor_emitido ?? porTipo[tipo]?.valor ?? porTipo[tipo]?.total_liquido ?? 0);
    }, 0),
  }));
}

function classificarEstado(tipo: string, estado: string): string {
  const normalizado = estado.toLowerCase();
  if (ESTADOS_CANCELADOS.has(normalizado) || tipo === "RE") return "Cancelados/Estornados";
  if (PAGOS_POR_TIPO.has(tipo) || ["paga", "pago", "liquidado"].includes(normalizado)) return "Pagos/Liquidados";
  return "Emitidos/A Receber";
}

export function agruparEstadosPorTipo(rows: DocumentoEstadoResumo[]): GrupoGrafico[] {
  const result = new Map<string, number>();
  for (const row of rows) {
    const grupo = classificarEstado(row.tipo, row.estado);
    result.set(grupo, (result.get(grupo) ?? 0) + Number(row.quantidade ?? 0));
  }
  return [
    { grupo: "Pagos/Liquidados", quantidade: result.get("Pagos/Liquidados") ?? 0, valor: 0, cor: "#10B981" },
    { grupo: "Emitidos/A Receber", quantidade: result.get("Emitidos/A Receber") ?? 0, valor: 0, cor: "#F59E0B" },
    { grupo: "Cancelados/Estornados", quantidade: result.get("Cancelados/Estornados") ?? 0, valor: 0, cor: "#EF4444" },
  ];
}

export function agruparEstadosDocumentos(documents: DocumentoItemEstado[]): GrupoGrafico[] {
  const result = new Map<string, number>();
  for (const document of documents) {
    const grupo = classificarEstado(document.tipo_documento, document.estado);
    result.set(grupo, (result.get(grupo) ?? 0) + 1);
  }
  return [
    { grupo: "Pagos/Liquidados", quantidade: result.get("Pagos/Liquidados") ?? 0, valor: 0, cor: "#10B981" },
    { grupo: "Emitidos/A Receber", quantidade: result.get("Emitidos/A Receber") ?? 0, valor: 0, cor: "#F59E0B" },
    { grupo: "Cancelados/Estornados", quantidade: result.get("Cancelados/Estornados") ?? 0, valor: 0, cor: "#EF4444" },
  ];
}

export function resumirDocumentos(documents: DocumentoItemEstado[]): Record<string, TipoDocumentoResumo> {
  const result: Record<string, TipoDocumentoResumo> = {};
  for (const document of documents) {
    if (ESTADOS_CANCELADOS.has(document.estado.toLowerCase())) continue;
    const tipo = document.tipo_documento;
    const resumo = result[tipo] ?? { quantidade: 0, valor: 0, valor_pendente: 0 };
    const valor = Number(document.total_liquido ?? 0);
    resumo.quantidade = Number(resumo.quantidade ?? 0) + 1;
    resumo.valor = Number(resumo.valor ?? 0) + valor;
    if (["FT", "FA"].includes(tipo) && ["emitido", "parcialmente_paga"].includes(document.estado)) {
      resumo.valor_pendente = Number(resumo.valor_pendente ?? 0) + Number(document.valor_pendente ?? valor);
    }
    result[tipo] = resumo;
  }
  return result;
}
