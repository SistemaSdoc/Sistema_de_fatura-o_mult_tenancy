"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useThemeColors } from "@/context/ThemeContext";
import { landlordApi } from "@/services/axios";
import MainLandlord from "@/app/components/MainLandlord";

interface LinhaAuditoria {
  timestamp: string;
  nivel: string;
  acao: string;
  usuario: string | null;
  hora: string | null;
  data: string | null;
  area: string | null;
  url: string | null;
  ip: string | null;
  sistema_operativo: string | null;
  navegador: string | null;
  dispositivo: string | null;
  localizacao: string | null;
}

interface RespostaLogs {
  data: string;
  total: number;
  pagina: number;
  por_pagina: number;
  total_paginas: number;
  linhas: LinhaAuditoria[];
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function AuditoriaPageContent() {
  const colors = useThemeColors();
  const [dataFiltro, setDataFiltro] = useState(hojeISO());
  const [usuario, setUsuario] = useState("");
  const [acao, setAcao] = useState("");
  const [pagina, setPagina] = useState(1);
  const [resposta, setResposta] = useState<RespostaLogs | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [autoAtualizar, setAutoAtualizar] = useState(false);

  const buscar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const params = new URLSearchParams({
        data: dataFiltro,
        pagina: String(pagina),
        por_pagina: "25",
      });
      if (usuario.trim()) params.set("usuario", usuario.trim());
      if (acao.trim()) params.set("acao", acao.trim());

      const res = await landlordApi.get<RespostaLogs>(`/api/landlord/auditoria/logs`, {
        params,
      });

      setResposta(res.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido ao carregar logs.");
    } finally {
      setCarregando(false);
    }
  }, [dataFiltro, usuario, acao, pagina]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (autoAtualizar) {
      intervaloRef.current = setInterval(buscar, 15000);
    }
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, [autoAtualizar, buscar]);

  const linhas = resposta?.linhas ?? [];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: colors.text }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Logs de Auditoria</h1>
        <button
          onClick={buscar}
          disabled={carregando}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: `1px solid ${colors.border}`,
            background: carregando ? colors.hover : colors.card,
            color: colors.text,
            cursor: carregando ? "default" : "pointer",
          }}>
          {carregando ? "Atualizando..." : " Atualizar"}
        </button>
      </div>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.8rem", marginBottom: "4px" }}>Data</label>
          <input
            type="date"
            value={dataFiltro}
            onChange={(e) => {
              setPagina(1);
              setDataFiltro(e.target.value);
            }}
            style={{
              padding: "6px 8px",
              border: `1px solid ${colors.border}`,
              borderRadius: "6px",
              background: colors.card,
              color: colors.text,
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.8rem", marginBottom: "4px" }}>Usuário</label>
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={usuario}
            onChange={(e) => {
              setPagina(1);
              setUsuario(e.target.value);
            }}
            style={{
              padding: "6px 8px",
              border: `1px solid ${colors.border}`,
              borderRadius: "6px",
              background: colors.card,
              color: colors.text,
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.8rem", marginBottom: "4px" }}>Ação</label>
          <input
            type="text"
            placeholder="Ex: Fatura Criada"
            value={acao}
            onChange={(e) => {
              setPagina(1);
              setAcao(e.target.value);
            }}
            style={{
              padding: "6px 8px",
              border: `1px solid ${colors.border}`,
              borderRadius: "6px",
              background: colors.card,
              color: colors.text,
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
            <input type="checkbox" checked={autoAtualizar} onChange={(e) => setAutoAtualizar(e.target.checked)} />
            Auto-atualizar (15s)
          </label>
        </div>
      </div>

      {erro && (
        <div style={{ padding: "10px 14px", background: "#fdecea", color: "#a83226", borderRadius: "6px", marginBottom: "16px" }}>
          {erro}
        </div>
      )}

      <div
        style={{
          overflowX: "auto",
          border: `1px solid ${colors.border}`,
          borderRadius: "8px",
          background: colors.card,
          marginBottom: "20px",
        }}>
        <table style={{ width: "100%", minWidth: "1400px", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ background: colors.hover, textAlign: "left", position: "sticky", top: 0 }}>
              <th style={{ ...thStyle, width: "30%", minWidth: "300px" }}>Ação Realizada</th>
              <th style={{ ...thStyle, width: "12%", minWidth: "100px" }}>Usuário</th>
              <th style={{ ...thStyle, width: "15%", minWidth: "120px" }}>Data/Hora</th>
              <th style={{ ...thStyle, width: "12%", minWidth: "100px" }}>Seção</th>
              <th style={{ ...thStyle, width: "10%", minWidth: "90px" }}>IP</th>
              <th style={{ ...thStyle, width: "15%", minWidth: "130px" }}>SO / Navegador</th>
              <th style={{ ...thStyle, width: "6%", minWidth: "80px" }}>Local</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && !carregando && (
              <tr>
                <td colSpan={7} style={{ padding: "24px", textAlign: "center", color: colors.textSecondary }}>
                  Nenhum registo encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
            {linhas.map((l, i) => (
              <tr
                key={`${l.timestamp}-${i}`}
                style={{ borderTop: `1px solid ${colors.border}`, transition: "background 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = colors.hover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <td style={{ ...tdStyle, fontWeight: 500, wordWrap: "break-word", whiteSpace: "normal", maxWidth: "300px" }}>
                  {l.acao || "—"}
                </td>
                <td style={tdStyle}>{l.usuario ?? "—"}</td>
                <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                  {l.hora} {l.data ? `| ${l.data}` : ""}
                </td>
                <td style={tdStyle}>{l.area ?? "—"}</td>
                <td style={{ ...tdStyle, fontSize: "0.85rem" }}>{l.ip ?? "—"}</td>
                <td style={{ ...tdStyle, fontSize: "0.85rem" }}>
                  {l.sistema_operativo} / {l.navegador}
                </td>
                <td style={{ ...tdStyle, fontSize: "0.85rem", whiteSpace: "normal", wordWrap: "break-word" }}>{l.localizacao ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resposta && resposta.total_paginas > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px" }}>
          <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina <= 1} style={pagBtnStyle(pagina <= 1)}>
            ← Anterior
          </button>
          <span style={{ fontSize: "0.85rem" }}>
            Página {resposta.pagina} de {resposta.total_paginas} ({resposta.total} registos)
          </span>
          <button
            onClick={() => setPagina((p) => Math.min(resposta.total_paginas, p + 1))}
            disabled={pagina >= resposta.total_paginas}
            style={pagBtnStyle(pagina >= resposta.total_paginas)}>
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "12px 14px", fontWeight: 600, whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "12px 14px", whiteSpace: "normal", verticalAlign: "top" };
const pagBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: "6px 12px",
  borderRadius: "6px",
  border: "1px solid #d0d0d0",
  background: disabled ? "#f5f5f5" : "#fff",
  color: disabled ? "#aaa" : "#000",
  cursor: disabled ? "default" : "pointer",
});

export default function AuditoriaPage() {
  return (
    <MainLandlord>
      <AuditoriaPageContent />
    </MainLandlord>
  );
}
