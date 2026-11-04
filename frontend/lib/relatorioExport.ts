import { formatarKwanza, formatarData, LABELS_TIPO_MOVIMENTO } from "@/services/relatorios";

type TipoRelatorio = "vendas" | "documentos" | "pagamentos" | "movimentos_stock";

interface EmpresaRelatorio {
  nome?: string | null;
  nif?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  logo?: string | null;
}

function formatarDataHoraRelatorio(valor: string | null | undefined): string {
  if (!valor) return "-";

  const mesAno = valor.match(/(?:^|[^\d])(\d{1,2})\/(\d{4})(?!\d)/);
  const anoMes = valor.match(/(?:^|[^\d])(\d{4})-(\d{2})(?:-\d{2})?/);
  const horaMatches = [...valor.matchAll(/(?:^|\s|T)(\d{2}):(\d{2})(?::(\d{2}))?/g)];
  const ultimaHora = horaMatches.at(-1);
  const mes = mesAno?.[1] ?? anoMes?.[2];
  const ano = mesAno?.[2] ?? anoMes?.[1];

  if (!mes || !ano) return valor;
  const data = `${mes.padStart(2, "0")}/${ano}`;
  if (!ultimaHora) return data;

  const hora = `${ultimaHora[1]}:${ultimaHora[2]}${ultimaHora[3] ? `:${ultimaHora[3]}` : ""}`;
  return `${data} ${hora}`;
}

async function carregarLogoEmpresa(
  logo: string | null | undefined
): Promise<{ data: string; format: string; width: number; height: number } | null> {
  if (!logo || typeof window === "undefined") return null;

  const backendUrl = (process.env.NEXT_PUBLIC_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`).replace(/\/+$/, "");
  const logoUrl = /^https?:\/\//i.test(logo)
    ? logo
    : `${backendUrl}/${logo.replace(/^\/+/, "").startsWith("storage/") ? logo.replace(/^\/+/, "") : `storage/${logo.replace(/^\/+/, "")}`}`;

  try {
    const response = await fetch(logoUrl, { credentials: "include" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const larguraOriginal = bitmap.width;
    const alturaOriginal = bitmap.height;
    const escala = Math.min(1, 600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * escala));
    canvas.height = Math.max(1, Math.round(bitmap.height * escala));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a imagem da empresa");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    return { data: canvas.toDataURL("image/png"), format: "PNG", width: larguraOriginal, height: alturaOriginal };
  } catch (error) {
    console.warn("Não foi possível carregar o logótipo da empresa para o relatório PDF.", error);
    return null;
  }
}

export async function exportarPDF(
  tab: TipoRelatorio,
  dados: any,
  periodo: string,
  empresa?: EmpresaRelatorio | null
) {
  const jsPDFModule = await import("jspdf");
  const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
  const autoTableModule = await import("jspdf-autotable");
  const autoTableFn = autoTableModule.default;

  const orientation = tab === "pagamentos" ? "portrait" : "landscape";
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });

  if (typeof (doc as any).autoTable !== "function" && typeof autoTableFn === "function") {
    (doc as any).autoTable = function (options: any) {
      return autoTableFn(doc, options);
    };
  }

  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const P: [number, number, number] = [18, 56, 89];
  const WH: [number, number, number] = [255, 255, 255];
  const GR: [number, number, number] = [80, 80, 80];
  const ST: [number, number, number] = [250, 251, 253];

  const autoT = (opts: any) => {
    if (typeof (doc as any).autoTable === "function") {
      (doc as any).autoTable(opts);
    } else if (typeof autoTableFn === "function") {
      autoTableFn(doc, opts);
    }
  };
  const lastY = () => ((doc as any).lastAutoTable?.finalY ?? 0) + 10;

  const titulos: Record<TipoRelatorio, string> = {
    vendas: "RELATÓRIO DE VENDAS E FACTURAÇÃO",
    documentos: "RELATÓRIO DE DOCUMENTOS FISCAIS E PROFORMAS",
    pagamentos: "RELATÓRIO DE PAGAMENTOS PENDENTES",
    movimentos_stock: "RELATÓRIO DE MOVIMENTOS DE STOCK",
  };

  const nomeEmpresa = empresa?.nome?.trim() || "Empresa";
  const periodoFormatado = periodo
    .split(" a ")
    .map((data) => /^\d{4}-\d{2}-\d{2}$/.test(data) ? formatarData(data) : data)
    .join(" a ");
  const logo = await carregarLogoEmpresa(empresa?.logo);
  doc.setFillColor(...P);
  doc.rect(0, 0, pw, 38, "F");
  let xEmpresa = 14;
  if (logo) {
    const escalaLogo = Math.min(22 / logo.width, 18 / logo.height);
    const larguraLogo = logo.width * escalaLogo;
    const alturaLogo = logo.height * escalaLogo;
    doc.addImage(logo.data, logo.format, 14, 5 + (18 - alturaLogo) / 2, larguraLogo, alturaLogo);
    xEmpresa = 14 + larguraLogo + 6;
  }
  doc.setTextColor(...WH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(nomeEmpresa, xEmpresa, 10, { maxWidth: pw - xEmpresa - 14 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const dadosEmpresa = [
    empresa?.nif ? `NIF: ${empresa.nif}` : null,
    empresa?.telefone ? `Tel.: ${empresa.telefone}` : null,
    empresa?.email || null,
    empresa?.endereco || null,
  ].filter((valor): valor is string => Boolean(valor));
  if (dadosEmpresa.length > 0) {
    doc.text(dadosEmpresa.slice(0, 2).join("  |  "), xEmpresa, 15, { maxWidth: pw - xEmpresa - 14 });
    if (dadosEmpresa.length > 2) {
      doc.text(dadosEmpresa.slice(2).join("  |  "), xEmpresa, 19, { maxWidth: pw - xEmpresa - 14 });
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(titulos[tab], 14, 29, { maxWidth: pw - 28 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Período: ${periodoFormatado}`, 14, 35);
  doc.text(`Emitido em: ${new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })}`, pw - 14, 35, { align: "right" });
  doc.setDrawColor(230, 230, 230);
  doc.line(0, 38, pw, 38);

  let y = 46;

  const secTitle = (title: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GR);
    doc.text(title.toUpperCase(), 14, y);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y + 1.5, pw - 14, y + 1.5);
    y += 6;
  };

  const tableDefaults = {
    theme: "grid" as const,
    headStyles: {
      fillColor: P,
      textColor: WH,
      fontSize: 7.5,
      fontStyle: "bold" as const,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: { top: 2.5, right: 4, bottom: 2.5, left: 4 },
    },
    alternateRowStyles: { fillColor: ST },
    styles: { lineColor: [220, 220, 220] as [number, number, number] },
    margin: { left: 14, right: 14 },
  };

  /* ── VENDAS ── */
  if (tab === "vendas" && dados) {
    const v = dados.vendas || {};
    const f = dados.faturacao || {};
    const t = v.kpis || v.totais || {};

    secTitle("Resumo de Vendas");
    autoT({
      startY: y,
      head: [["Indicador", "Valor"]],
      body: [
        ["Total de Vendas", formatarKwanza(t.total_vendas ?? t.total_valor ?? 0)],
        ["Número de Transações", String(t.quantidade_vendas ?? t.total_vendas_count ?? 0)],
        ["Ticket Médio", formatarKwanza(t.ticket_medio ?? 0)],
        ["Clientes no Período", String(t.clientes_periodo ?? 0)],
        ["Produtos Diferentes", String(t.produtos_vendidos ?? 0)],
        ["Base Tributável", formatarKwanza(t.total_base_tributavel ?? 0)],
        ["Total de IVA", formatarKwanza(t.total_iva ?? 0)],
        ["Total de Retenções", formatarKwanza(t.total_retencao ?? 0)],
        ["Serviços", String(t.total_servicos ?? 0)],
        ["Transações Pagas", String(t.vendas_por_status?.pagas ?? 0)],
        ["Transações Pendentes", String(t.vendas_por_status?.pendentes ?? 0)],
        ["Transações Canceladas", String(t.vendas_por_status?.canceladas ?? 0)],
      ],
      columnStyles: { 1: { halign: "right" } },
      ...tableDefaults,
    });
    y = lastY();

    secTitle("Resumo de Facturação");
    autoT({
      startY: y,
      head: [["Indicador", "Valor"]],
      body: [
        ["Facturação Total", formatarKwanza(f.faturacao_total ?? 0)],
        ["Facturação Paga", formatarKwanza(f.faturacao_paga ?? 0)],
        ["Facturação Pendente", formatarKwanza(f.faturacao_pendente ?? 0)],
      ],
      columnStyles: { 1: { halign: "right" } },
      ...tableDefaults,
    });
    y = lastY();

    if (v.vendas?.length > 0) {
      secTitle("Detalhe de Vendas");
      autoT({
        startY: y,
        head: [["#", "Documento", "Tipo", "Data", "Cliente", "Base (Kz)", "IVA (Kz)", "Total (Kz)", "Estado"]],
        body: v.vendas.slice(0, 1000).map((vd: any, i: number) => [
          String(i + 1),
          vd.numero_documento ?? "-",
          vd.tipo_documento ?? "-",
          `${formatarData(vd.data)}${vd.hora ? ` ${vd.hora}` : ""}`,
          typeof vd.cliente === "string" ? vd.cliente : vd.cliente?.nome ?? "-",
          formatarKwanza(Number(vd.base_tributavel ?? 0)),
          formatarKwanza(Number(vd.total_iva ?? 0)),
          formatarKwanza(Number(vd.total) ?? 0),
          vd.estado_pagamento ?? "-",
        ]),
        columnStyles: {
          0: { halign: "center", cellWidth: 8 },
          5: { halign: "right" },
          6: { halign: "right" },
          7: { halign: "right" },
          8: { halign: "center" },
        },
        ...tableDefaults,
      });
      y = lastY();
      if (v.vendas.length > 1000) {
        doc.setFontSize(7);
        doc.text(`A mostrar 1.000 de ${v.vendas.length} registos.`, 14, y);
        y += 6;
      }
    }

    if (f.por_tipo && Object.keys(f.por_tipo).length > 0) {
      secTitle("Documentos por Tipo");
      autoT({
        startY: y,
        head: [["Tipo de Documento", "Quantidade", "Base (Kz)", "IVA (Kz)", "Retenção (Kz)", "Valor Total (Kz)"]],
        body: Object.entries(f.por_tipo).map(([tipo, d]: any) => [
          tipo,
          String(d?.quantidade ?? d?.quantidade_emitida ?? 0),
          formatarKwanza(d?.total_base ?? 0),
          formatarKwanza(d?.total_iva ?? 0),
          formatarKwanza(d?.total_retencao ?? 0),
          formatarKwanza(d?.total_liquido ?? d?.valor_emitido ?? 0),
        ]),
        columnStyles: {
          1: { halign: "center" },
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right" },
          5: { halign: "right" },
        },
        ...tableDefaults,
      });
      y = lastY();
    }
  }

  /* ── DOCUMENTOS ── */
  if (tab === "documentos" && dados) {
    const d = dados.documentos || {};
    const p = dados.proformas || {};
    const e = d.estatisticas || {};

    secTitle("Resumo de Documentos Fiscais");
    autoT({
      startY: y,
      head: [["Indicador", "Valor"]],
      body: [
        ["Total de Documentos", String(e.total_documentos ?? 0)],
        ["Valor Total", formatarKwanza(e.total_valor ?? 0)],
        ["Total de IVA", formatarKwanza(e.total_iva ?? 0)],
        ["Total de Retenções", formatarKwanza(e.total_retencao ?? 0)],
        ["Base Tributável", formatarKwanza(e.total_base ?? 0)],
      ],
      columnStyles: { 1: { halign: "right" } },
      ...tableDefaults,
    });
    y = lastY();
    if (e.por_estado && Object.keys(e.por_estado).length > 0) {
      secTitle("Documentos por Estado");
      autoT({
        startY: y,
        head: [["Estado", "Quantidade"]],
        body: Object.entries(e.por_estado).map(([estado, quantidade]) => [estado, String(quantidade)]),
        columnStyles: { 1: { halign: "center" } },
        ...tableDefaults,
      });
      y = lastY();
    }

    secTitle("Resumo de Proformas");
    autoT({
      startY: y,
      head: [["Indicador", "Valor"]],
      body: [
        ["Total de Proformas", String(p.total ?? 0)],
        ["Valor Total", formatarKwanza(p.valor_total ?? 0)],
      ],
      columnStyles: { 1: { halign: "right" } },
      ...tableDefaults,
    });
    y = lastY();

    if (e.por_tipo && Object.keys(e.por_tipo).length > 0) {
      secTitle("Documentos por Tipo");
      autoT({
        startY: y,
        head: [["Tipo", "Quantidade", "Valor (Kz)", "Retenção (Kz)"]],
        body: Object.entries(e.por_tipo).map(([tipo, dt]: any) => [
          tipo, String(dt?.quantidade ?? 0),
          formatarKwanza(dt?.valor ?? 0), formatarKwanza(dt?.retencao ?? 0),
        ]),
        columnStyles: { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right" } },
        ...tableDefaults,
      });
      y = lastY();
    }

    if (p.proformas?.length > 0) {
      secTitle("Lista de Proformas");
      autoT({
        startY: y,
        head: [["Nº Documento", "Cliente", "Data", "Valor (Kz)", "Estado"]],
        body: p.proformas.slice(0, 1000).map((pf: any) => [
          pf.numero_documento ?? "-",
          typeof pf.cliente === "string" ? pf.cliente : pf.cliente?.nome ?? "-",
          formatarData(pf.data_emissao),
          formatarKwanza(Number(pf.total_liquido) ?? 0),
          pf.estado ?? "-",
        ]),
        columnStyles: { 3: { halign: "right" }, 4: { halign: "center" } },
        ...tableDefaults,
      });
      y = lastY();
    }

    if (d.documentos?.length > 0) {
      secTitle("Detalhe de Documentos Fiscais");
      autoT({
        startY: y,
        head: [["Nº Documento", "Tipo", "Data", "Cliente", "Base (Kz)", "IVA (Kz)", "Retenção (Kz)", "Total (Kz)", "Pendente (Kz)", "Estado"]],
        body: d.documentos.slice(0, 1000).map((documento: any) => [
          documento.numero_documento ?? "-",
          documento.tipo_documento ?? "-",
          formatarData(documento.data_emissao),
          typeof documento.cliente === "string" ? documento.cliente : documento.cliente?.nome ?? "-",
          formatarKwanza(Number(documento.base_tributavel ?? 0)),
          formatarKwanza(Number(documento.total_iva ?? 0)),
          formatarKwanza(Number(documento.total_retencao ?? 0)),
          formatarKwanza(Number(documento.total_liquido ?? 0)),
          formatarKwanza(Number(documento.valor_pendente ?? 0)),
          documento.estado ?? "-",
        ]),
        columnStyles: {
          4: { halign: "right" },
          5: { halign: "right" },
          6: { halign: "right" },
          7: { halign: "right" },
          8: { halign: "right" },
          9: { halign: "center" },
        },
        ...tableDefaults,
      });
      y = lastY();
      if (d.documentos.length > 1000) {
        doc.setFontSize(7);
        doc.text(`A mostrar 1.000 de ${d.documentos.length} documentos.`, 14, y);
      }
    }
  }

  /* ── PAGAMENTOS ── */
  if (tab === "pagamentos" && dados) {
    const r = dados.resumo ?? {};
    secTitle("Resumo de Pagamentos");
    autoT({
      startY: y,
      head: [["Indicador", "Valor"]],
      body: [
        ["Total Pendente", formatarKwanza(r.total_pendente ?? 0)],
        ["Total em Atraso", formatarKwanza(r.total_atrasado ?? 0)],
        ["Quantidade de Facturas Pendentes", String(r.quantidade_faturas ?? 0)],
        ["Quantidade de Adiantamentos Pendentes", String(r.quantidade_adiantamentos ?? 0)],
        ["Documentos Vencidos", String([
          ...(dados.faturas_pendentes ?? []),
          ...(dados.adiantamentos_pendentes ?? []),
        ].filter((documento: any) => Number(documento.dias_atraso ?? 0) > 0).length)],
        ["Retenção Pendente", formatarKwanza(r.retencao_pendente ?? 0)],
      ],
      columnStyles: { 1: { halign: "right" } },
      ...tableDefaults,
    });
    y = lastY();

    const pendentes = [
      ...(dados.faturas_pendentes ?? []).map((f: any) => ({ ...f, categoria: "Factura" })),
      ...(dados.adiantamentos_pendentes ?? []).map((f: any) => ({ ...f, categoria: "Adiantamento" })),
    ];
    if (pendentes.length > 0) {
      secTitle("Facturas e Adiantamentos Pendentes");
      autoT({
        startY: y,
        head: [["Categoria", "Nº Documento", "Cliente", "Emissão", "Vencimento", "Total (Kz)", "Pendente (Kz)", "Dias em Atraso"]],
        body: pendentes.slice(0, 1000).map((f: any) => [
          f.categoria,
          f.numero_documento ?? "-",
          typeof f.cliente === "string" ? f.cliente : f.cliente?.nome ?? "-",
          formatarData(f.data_emissao),
          formatarData(f.data_vencimento),
          formatarKwanza(Number(f.valor_total ?? 0)),
          formatarKwanza(Number(f.valor_pendente) ?? 0),
          (f.dias_atraso ?? 0) > 0 ? `${f.dias_atraso} dias` : "Em dia",
        ]),
        columnStyles: {
          5: { halign: "right" },
          6: { halign: "right" },
          7: { halign: "center" },
        },
        ...tableDefaults,
      });
      y = lastY();
      if (pendentes.length > 1000) {
        doc.setFontSize(7);
        doc.text(`A mostrar 1.000 de ${pendentes.length} registos pendentes.`, 14, y);
      }
    }
  }

  /* ── MOVIMENTOS DE STOCK ── */
  if (tab === "movimentos_stock" && dados) {
    const r = dados.resumo ?? {};
    secTitle("Resumo de Movimentos de Stock");
    autoT({
      startY: y,
      head: [["Indicador", "Valor"]],
      body: [
        ["Total de Movimentos", String(r.total_movimentos ?? 0)],
        ["Total de Entradas (unid.)", String(r.total_entradas ?? 0)],
        ["Total de Saídas (unid.)", String(r.total_saidas ?? 0)],
        ["Balanço (unid.)", String(r.balanco ?? 0)],
        ["Produtos Movimentados", String(new Set((dados.movimentos ?? []).map((movimento: any) => movimento.produto_id)).size)],
      ],
      columnStyles: { 1: { halign: "right" } },
      ...tableDefaults,
    });
    y = lastY();

    if (r.por_tipo_movimento && Object.keys(r.por_tipo_movimento).length > 0) {
      secTitle("Movimentos por Tipo");
      autoT({
        startY: y,
        head: [["Tipo de Movimento", "Nº Registos", "Quantidade Total"]],
        body: Object.entries(r.por_tipo_movimento).map(([tipo, d]: any) => [
          LABELS_TIPO_MOVIMENTO[tipo] ?? tipo,
          String(d?.total ?? 0),
          String(d?.quantidade_total ?? 0),
        ]),
        columnStyles: { 1: { halign: "center" }, 2: { halign: "center" } },
        ...tableDefaults,
      });
      y = lastY();
    }

    if (dados.movimentos?.length > 0) {
      secTitle("Detalhe de Movimentos");
      autoT({
        startY: y,
        head: [["Produto", "Código", "Tipo", "Movimento", "Qtd", "Stock Ant.", "Stock Novo", "Custo Médio (Kz)", "Referência", "Observação", "Utilizador", "Data"]],
        body: dados.movimentos.slice(0, 1000).map((m: any) => [
          m.produto_nome ?? "-",
          m.produto_codigo ?? "-",
          m.tipo === "entrada" ? "Entrada" : "Saída",
          LABELS_TIPO_MOVIMENTO[m.tipo_movimento] ?? m.tipo_movimento,
          String(m.quantidade ?? 0),
          String(m.estoque_anterior ?? 0),
          String(m.estoque_novo ?? 0),
          formatarKwanza(Number(m.custo_medio ?? 0)),
          m.referencia ?? "-",
          m.observacao ?? "-",
          m.user ?? "Sistema",
          formatarDataHoraRelatorio(m.data),
        ]),
        columnStyles: {
          4: { halign: "center" },
          5: { halign: "center" },
          6: { halign: "center" },
          7: { halign: "right" },
        },
        ...tableDefaults,
      });
      y = lastY();
      if (dados.movimentos.length > 1000) {
        doc.setFontSize(7);
        doc.text(`A mostrar 1.000 de ${dados.movimentos.length} movimentos.`, 14, y);
      }
    }
  }

  // ── Rodapé ──
  const totalPages = (doc as any).internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...P);
    doc.rect(0, ph - 10, pw, 10, "F");
    doc.setTextColor(...WH);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${nomeEmpresa} | Relatório gerado pelo FaturaJá`, 14, ph - 4, { maxWidth: pw - 60 });
    doc.text(`Pág. ${i} de ${totalPages}`, pw - 14, ph - 4, { align: "right" });
  }

  const nomeSeguro = nomeEmpresa
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  doc.save(`relatorio_${nomeSeguro || "empresa"}_${tab}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportarExcel(tab: TipoRelatorio, dados: any, periodo: string) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const header = [`Período: ${periodo}`, `Gerado: ${new Date().toLocaleDateString("pt-PT")}`];

  const addSheet = (nome: string, rows: any[][]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31));
  };

  if (tab === "vendas" && dados) {
    const vd = dados.vendas || {};
    const ft = dados.faturacao || {};
    const t = vd.totais || {};
    addSheet("Resumo", [
      header, [],
      ["Indicador", "Valor"],
      ["Total Vendas", formatarKwanza(t.total_valor ?? 0)],
      ["Base Tributável", formatarKwanza(t.total_base_tributavel ?? 0)],
      ["Total IVA", formatarKwanza(t.total_iva ?? 0)],
      ["Retenções", formatarKwanza(t.total_retencao ?? 0)],
      ["Nº Vendas", t.total_vendas ?? 0],
      [],
      ["Facturação Total", formatarKwanza(ft.faturacao_total ?? 0)],
      ["Facturação Paga", formatarKwanza(ft.faturacao_paga ?? 0)],
      ["Facturação Pendente", formatarKwanza(ft.faturacao_pendente ?? 0)],
    ]);
    if (vd.vendas?.length > 0) {
      addSheet("Vendas", [
        ["Cliente", "Total", "Status"],
        ...vd.vendas.map((v: any) => [
          typeof v.cliente === "string" ? v.cliente : v.cliente?.nome ?? "-",
          Number(v.total) ?? 0,
          v.estado_pagamento ?? "-",
        ]),
      ]);
    }
    if (ft.por_tipo) {
      addSheet("Por Tipo", [
        ["Tipo", "Quantidade", "Valor"],
        ...Object.entries(ft.por_tipo).map(([tipo, d]: any) => [tipo, d?.quantidade ?? 0, d?.total_liquido ?? 0]),
      ]);
    }
  }

  if (tab === "documentos" && dados) {
    const d = dados.documentos || {};
    const p = dados.proformas || {};
    const e = d.estatisticas || {};
    addSheet("Resumo", [
      header, [],
      ["Indicador", "Valor"],
      ["Total Documentos", e.total_documentos ?? 0],
      ["Valor Total", formatarKwanza(e.total_valor ?? 0)],
      ["Total IVA", formatarKwanza(e.total_iva ?? 0)],
      ["Retenções", formatarKwanza(e.total_retencao ?? 0)],
      [],
      ["Total Proformas", p.total ?? 0],
      ["Valor Proformas", formatarKwanza(p.valor_total ?? 0)],
    ]);
    if (e.por_tipo) {
      addSheet("Por Tipo", [
        ["Tipo", "Quantidade", "Valor", "Retenção"],
        ...Object.entries(e.por_tipo).map(([tipo, d]: any) => [tipo, d?.quantidade ?? 0, d?.valor ?? 0, d?.retencao ?? 0]),
      ]);
    }
    if (p.proformas?.length > 0) {
      addSheet("Proformas", [
        ["Nº Doc.", "Cliente", "Data", "Valor", "Estado"],
        ...p.proformas.map((pf: any) => [
          pf.numero_documento ?? "-",
          typeof pf.cliente === "string" ? pf.cliente : pf.cliente?.nome ?? "-",
          formatarData(pf.data_emissao),
          Number(pf.total_liquido) ?? 0,
          pf.estado ?? "-",
        ]),
      ]);
    }
  }

  if (tab === "pagamentos" && dados) {
    const r = dados.resumo ?? {};
    addSheet("Resumo", [
      header, [],
      ["Indicador", "Valor"],
      ["Total Pendente", formatarKwanza(r.total_pendente ?? 0)],
      ["Total Atrasado", formatarKwanza(r.total_atrasado ?? 0)],
      ["Facturas Pendentes", r.quantidade_faturas ?? 0],
      ["Retenção Pendente", formatarKwanza(r.retencao_pendente ?? 0)],
    ]);
    if (dados.faturas_pendentes?.length > 0) {
      addSheet("Facturas Pendentes", [
        ["Documento", "Cliente", "Pendente", "Dias Atraso"],
        ...dados.faturas_pendentes.map((f: any) => [
          f.numero_documento ?? "-",
          typeof f.cliente === "string" ? f.cliente : f.cliente?.nome ?? "-",
          Number(f.valor_pendente) ?? 0,
          f.dias_atraso ?? 0,
        ]),
      ]);
    }
  }

  if (tab === "movimentos_stock" && dados) {
    const r = dados.resumo ?? {};
    addSheet("Resumo", [
      header, [],
      ["Indicador", "Valor"],
      ["Total Movimentos", r.total_movimentos ?? 0],
      ["Total Entradas (unid.)", r.total_entradas ?? 0],
      ["Total Saídas (unid.)", r.total_saidas ?? 0],
      ["Balanço (unid.)", r.balanco ?? 0],
    ]);

    if (r.por_tipo_movimento && Object.keys(r.por_tipo_movimento).length > 0) {
      addSheet("Por Tipo", [
        ["Tipo de Movimento", "Nº Registos", "Quantidade Total"],
        ...Object.entries(r.por_tipo_movimento).map(([tipo, d]: any) => [
          LABELS_TIPO_MOVIMENTO[tipo] ?? tipo,
          d?.total ?? 0,
          d?.quantidade_total ?? 0,
        ]),
      ]);
    }

    if (dados.movimentos?.length > 0) {
      addSheet("Movimentos", [
        ["Produto", "Código", "Tipo", "Tipo Movimento", "Quantidade", "Stock Anterior", "Stock Novo", "Custo Médio", "Referência", "Observação", "Utilizador", "Data"],
        ...dados.movimentos.map((m: any) => [
          m.produto_nome ?? "-",
          m.produto_codigo ?? "-",
          m.tipo === "entrada" ? "Entrada" : "Saída",
          LABELS_TIPO_MOVIMENTO[m.tipo_movimento] ?? m.tipo_movimento,
          m.quantidade ?? 0,
          m.estoque_anterior ?? 0,
          m.estoque_novo ?? 0,
          m.custo_medio ?? 0,
          m.referencia ?? "-",
          m.observacao ?? "-",
          m.user ?? "Sistema",
          m.data ?? "-",
        ]),
      ]);
    }
  }

  XLSX.writeFile(wb, `relatorio_${tab}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}