"use client";

import { useEffect, useState } from "react";
import { Printer, Settings, Loader2 } from "lucide-react";
import { api } from "@/services/axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeColors } from "./ConfiguracoesComuns";
import ImpressoraManagerModal, { Impressora } from "./ImpressoraManagerModal";

type Props = { colors: ThemeColors };

export default function ImpressoraCard({ colors }: Props) {
  const [impressoras, setImpressoras] = useState<Impressora[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const r = await api.get("/api/impressoras");
      if (r.data.success) setImpressoras(r.data.data);
    } catch (err) {
      console.error("[ImpressoraCard] carregar:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  return (
    <>
      <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <CardHeader>
          <CardTitle style={{ color: colors.secondary }}>Impressoras térmicas</CardTitle>
          <CardDescription style={{ color: colors.textSecondary }}>
            Configure as impressoras disponíveis para esta empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: colors.textSecondary }}>
              <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
            </div>
          ) : impressoras.length === 0 ? (
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              Nenhuma impressora configurada.
            </p>
          ) : (
            <ul className="space-y-2">
              {impressoras.map((imp) => (
                <li
                  key={imp.id}
                  className="flex items-center justify-between rounded-md border p-2"
                  style={{ borderColor: colors.border }}>
                  <div className="flex min-w-0 items-center gap-2">
                    <Printer size={16} style={{ color: colors.secondary }} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium" style={{ color: colors.text }}>
                          {imp.nome}
                        </span>
                        {imp.is_default && (
                          <span
                            className="shrink-0 rounded px-2 py-0.5 text-xs font-semibold text-white"
                            style={{ backgroundColor: colors.primary }}>
                            padrão
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs" style={{ color: colors.textSecondary }}>
                        {imp.queue}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => setModalOpen(true)}
              style={{ borderColor: colors.border, color: colors.text }}>
              <Settings size={16} className="mr-2" />
              Gerir impressoras
            </Button>
          </div>
        </CardContent>
      </Card>

      <ImpressoraManagerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        colors={colors}
        onChange={carregar}
      />
    </>
  );
}