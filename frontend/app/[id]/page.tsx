"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function DocumentoProofRedirectPage() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("A abrir comprovativo...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const pathSegments = window.location.pathname.split("/").filter(Boolean);
    const id = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : null;
    if (!id) {
      setError("ID do documento não encontrado.");
      return;
    }

    const empresaQuery = searchParams.get("empresa");
    const tenantStorage = localStorage.getItem("tenant_id");
    const empresaId = empresaQuery || tenantStorage;

    const backendBase = `${window.location.protocol}//${window.location.hostname}:8000`;
    const backendUrl = new URL(`${backendBase}/api/documentos-fiscais/${id}/prova`);

    if (empresaId) {
      backendUrl.searchParams.set("empresa", empresaId);
    }

    setMessage("Redirecionando para o comprovativo do documento...");
    window.location.replace(backendUrl.toString());
  }, [searchParams]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "#f3f4f6" }}>
      <div style={{ maxWidth: 560, width: "100%", background: "#ffffff", borderRadius: 16, boxShadow: "0 24px 80px rgba(0, 0, 0, 0.08)", padding: 32, textAlign: "center" }}>
        <h1 style={{ fontSize: 24, marginBottom: 16, color: "#111827" }}>A carregar comprovativo</h1>
        <p style={{ color: "#4b5563", marginBottom: 24 }}>{message}</p>
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginTop: 12 }}>
          <span style={{ width: 12, height: 12, borderRadius: 6, background: "#2563eb", animation: "pulse 1.2s infinite" }}></span>
          <span style={{ color: "#6b7280" }}>Se não redirecionar automaticamente, atualize a página.</span>
        </div>
        <style>{`
          @keyframes pulse {
            0% { opacity: 0.3; transform: scale(0.95); }
            50% { opacity: 1; transform: scale(1.05); }
            100% { opacity: 0.3; transform: scale(0.95); }
          }
        `}</style>
      </div>
    </div>
  );
}
