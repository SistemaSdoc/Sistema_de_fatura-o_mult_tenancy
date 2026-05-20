import { formatarKwanza, formatarData, LABELS_TIPO_MOVIMENTO } from "@/services/relatorios";

type TipoRelatorio = "vendas" | "documentos" | "pagamentos" | "movimentos_stock";

export async function exportarPDF(tab: TipoRelatorio, dados: any, periodo: string) {
  const jsPDFModule = await import("jspdf");
  const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
  const autoTableModule = await import("jspdf-autotable");
  const autoTableFn = autoTableModule.default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

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
    vendas: "RELATÓRIO DE VENDAS E FATURAÇÃO",
    documentos: "RELATÓRIO DE DOCUMENTOS FISCAIS E PROFORMAS",
    pagamentos: "RELATÓRIO DE PAGAMENTOS PENDENTES",
    movimentos_stock: "RELATÓRIO DE MOVIMENTOS DE STOCK",
  };

  doc.setFillColor(...P);
  doc.rect(0, 0, pw, 26, "F");
  doc.setTextColor(...WH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(titulos[tab], 14, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Período: ${periodo}`, 14, 18);
  doc.text(`Emitido em: ${new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })}`, pw - 14, 18, { align: "right" });
  doc.setDrawColor(230, 230, 230);
  doc.line(0, 26, pw, 26);

  let y = 34;

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
    const t = v.totais || {};

    secTitle("Resumo de Vendas");
    autoT({
      startY: y,
      head: [["Indicador", "Valor"]],
      body: [
        ["Total de Vendas", formatarKwanza(t.total_valor ?? 0)],
        ["Número de Transações", String(t.total_vendas ?? 0)],
        ["Base Tributável", formatarKwanza(t.total_base_tributavel ?? 0)],
        ["Total de IVA", formatarKwanza(t.total_iva ?? 0)],
        ["Total de Retenções", formatarKwanza(t.total_retencao ?? 0)],
        ["Serviços", String(t.total_servicos ?? 0)],
      ],
      columnStyles: { 1: { halign: "right" } },
      ...tableDefaults,
    });
    y = lastY();

    secTitle("Resumo de Faturação");
    autoT({
      startY: y,
      head: [["Indicador", "Valor"]],
      body: [
        ["Faturação Total", formatarKwanza(f.faturacao_total ?? 0)],
        ["Faturação Paga", formatarKwanza(f.faturacao_paga ?? 0)],
        ["Faturação Pendente", formatarKwanza(f.faturacao_pendente ?? 0)],
      ],
      columnStyles: { 1: { halign: "right" } },
      ...tableDefaults,
    });
    y = lastY();

    if (v.vendas?.length > 0) {
      secTitle("Detalhe de Vendas");
      autoT({
        startY: y,
        head: [["#", "Cliente", "Total (Kz)", "Estado"]],
        body: v.vendas.slice(0, 100).map((vd: any, i: number) => [
          String(i + 1),
          typeof vd.cliente === "string" ? vd.cliente : vd.cliente?.nome ?? "-",
          formatarKwanza(Number(vd.total) ?? 0),
          vd.estado_pagamento ?? "-",
        ]),
        columnStyles: { 0: { halign: "center", cellWidth: 10 }, 2: { halign: "right" }, 3: { halign: "center" } },
        ...tableDefaults,
      });
      y = lastY();
    }

    if (f.por_tipo && Object.keys(f.por_tipo).length > 0) {
      secTitle("Documentos por Tipo");
      autoT({
        startY: y,
        head: [["Tipo de Documento", "Quantidade", "Valor Total (Kz)"]],
        body: Object.entries(f.por_tipo).map(([tipo, d]: any) => [
          tipo, String(d?.quantidade ?? 0), formatarKwanza(d?.total_liquido ?? 0),
        ]),
        columnStyles: { 1: { halign: "center" }, 2: { halign: "right" } },
        ...tableDefaults,
      });
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
      ],
      columnStyles: { 1: { halign: "right" } },
      ...tableDefaults,
    });
    y = lastY();

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
        body: p.proformas.slice(0, 100).map((pf: any) => [
          pf.numero_documento ?? "-",
          typeof pf.cliente === "string" ? pf.cliente : pf.cliente?.nome ?? "-",
          formatarData(pf.data_emissao),
          formatarKwanza(Number(pf.total_liquido) ?? 0),
          pf.estado ?? "-",
        ]),
        columnStyles: { 3: { halign: "right" }, 4: { halign: "center" } },
        ...tableDefaults,
      });
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
        ["Quantidade de Faturas Pendentes", String(r.quantidade_faturas ?? 0)],
        ["Retenção Pendente", formatarKwanza(r.retencao_pendente ?? 0)],
      ],
      columnStyles: { 1: { halign: "right" } },
      ...tableDefaults,
    });
    y = lastY();

    if (dados.faturas_pendentes?.length > 0) {
      secTitle("Faturas Pendentes");
      autoT({
        startY: y,
        head: [["Nº Documento", "Cliente", "Valor Pendente (Kz)", "Dias em Atraso"]],
        body: dados.faturas_pendentes.slice(0, 100).map((f: any) => [
          f.numero_documento ?? "-",
          typeof f.cliente === "string" ? f.cliente : f.cliente?.nome ?? "-",
          formatarKwanza(Number(f.valor_pendente) ?? 0),
          (f.dias_atraso ?? 0) > 0 ? `${f.dias_atraso} dias` : "Em dia",
        ]),
        columnStyles: { 2: { halign: "right" }, 3: { halign: "center" } },
        ...tableDefaults,
      });
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
        head: [["Produto", "Tipo", "Movimento", "Qtd", "Stock Ant.", "Stock Novo", "Utilizador", "Data"]],
        body: dados.movimentos.slice(0, 200).map((m: any) => [
          m.produto_nome ?? "-",
          m.tipo === "entrada" ? "Entrada" : "Saída",
          LABELS_TIPO_MOVIMENTO[m.tipo_movimento] ?? m.tipo_movimento,
          String(m.quantidade ?? 0),
          String(m.estoque_anterior ?? 0),
          String(m.estoque_novo ?? 0),
          m.user ?? "Sistema",
          m.data ? m.data.substring(0, 16) : "-",
        ]),
        columnStyles: {
          1: { halign: "center" },
          3: { halign: "center" },
          4: { halign: "center" },
          5: { halign: "center" },
        },
        ...tableDefaults,
      });
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
    doc.text("FacturaJá — Sistema de Faturação", 14, ph - 4);
    doc.text(`Pág. ${i} de ${totalPages}`, pw - 14, ph - 4, { align: "right" });
  }

  doc.save(`relatorio_${tab}_${new Date().toISOString().slice(0, 10)}.pdf`);
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
      ["Faturação Total", formatarKwanza(ft.faturacao_total ?? 0)],
      ["Faturação Paga", formatarKwanza(ft.faturacao_paga ?? 0)],
      ["Faturação Pendente", formatarKwanza(ft.faturacao_pendente ?? 0)],
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
      ["Faturas Pendentes", r.quantidade_faturas ?? 0],
      ["Retenção Pendente", formatarKwanza(r.retencao_pendente ?? 0)],
    ]);
    if (dados.faturas_pendentes?.length > 0) {
      addSheet("Faturas Pendentes", [
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