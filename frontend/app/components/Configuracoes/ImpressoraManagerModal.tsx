"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Star, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/axios";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeColors } from "./ConfiguracoesComuns";

export type Impressora = {
  id: string;
  nome: string;
  queue: string;
  tipo: "cups" | "windows" | "usb";
  is_default: boolean;
  ativo: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  colors: ThemeColors;
  onChange?: () => void;
};

export default function ImpressoraManagerModal({ isOpen, onClose, colors, onChange }: Props) {
  const [impressoras, setImpressoras] = useState<Impressora[]>([]);
  const [cups, setCups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState("");
  const [queue, setQueue] = useState("");
  const [tipo, setTipo] = useState<"cups" | "windows" | "usb">("cups");

  async function carregar() {
    setLoading(true);
    try {
      const r = await api.get("/api/impressoras");
      if (r.data.success) setImpressoras(r.data.data);
    } catch (err) {
      console.error("[ImpressoraManagerModal] carregar:", err);
      toast.error("Não foi possível carregar as impressoras.");
    } finally {
      setLoading(false);
    }
  }

  async function carregarCups() {
    try {
      const r = await api.get("/api/impressoras/cups");
      if (r.data.success) setCups(r.data.data);
    } catch {
      /* silencioso */
    }
  }

  useEffect(() => {
    if (isOpen) {
      carregar();
      carregarCups();
    }
  }, [isOpen]);

  async function criar() {
    if (!nome.trim() || !queue.trim()) {
      toast.warning("Preencha o nome e escolha uma fila.");
      return;
    }
    setSalvando(true);
    try {
      await api.post("/api/impressoras", { nome, queue, tipo });
      toast.success("Impressora adicionada.");
      setNome("");
      setQueue("");
      await carregar();
      onChange?.();
    } catch (err) {
      console.error("[ImpressoraManagerModal] criar:", err);
      toast.error("Não foi possível adicionar a impressora.");
    } finally {
      setSalvando(false);
    }
  }

async function definirDefault(id: string) {
    const anteriores = impressoras;

    // ⚡ Optimistic update — a UI muda no instante do clique
    setImpressoras((prev) =>
        prev.map((i) => ({ ...i, is_default: i.id === id }))
    );

    try {
        await api.post(`/api/impressoras/${id}/default`);
        toast.success("Impressora padrão definida.");
        // Re-sincroniza com o servidor (para garantir consistência)
        await carregar();
        onChange?.();
    } catch (err) {
        console.error("[ImpressoraManagerModal] definirDefault:", err);
        // Reverte em caso de erro
        setImpressoras(anteriores);
        toast.error("Erro ao definir a impressora padrão.");
    }
}

const listaOrdenada = [...impressoras].sort((a, b) => {
    if (a.is_default === b.is_default) return a.nome.localeCompare(b.nome);
    return a.is_default ? -1 : 1;
});

  async function apagar(id: string) {
    if (!confirm("Apagar esta impressora?")) return;
    try {
      await api.delete(`/api/impressoras/${id}`);
      toast.success("Impressora removida.");
      await carregar();
      onChange?.();
    } catch {
      toast.error("Erro ao apagar a impressora.");
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-2xl"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <DialogHeader>
          <DialogTitle style={{ color: colors.text }}>Gerir impressoras</DialogTitle>
          <DialogDescription style={{ color: colors.textSecondary }}>
            Configure as impressoras térmicas disponíveis para esta empresa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Lista */}
          <div>
            <Label style={{ color: colors.text }} className="mb-2 block">
              Impressoras configuradas
            </Label>
            {loading ? (
              <div className="flex items-center gap-2 py-3 text-sm" style={{ color: colors.textSecondary }}>
                <Loader2 className="animate-spin" size={16} /> A carregar…
              </div>
            ) : impressoras.length === 0 ? (
              <p className="py-3 text-sm" style={{ color: colors.textSecondary }}>
                Nenhuma impressora configurada. Adicione a primeira abaixo.
              </p>
            ) : (
              <ul className="divide-y rounded-md border" style={{ borderColor: colors.border }}>
                {listaOrdenada.map((imp) => (
                  <li key={imp.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Printer size={18} style={{ color: colors.secondary }} />
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
                          {imp.queue} · {imp.tipo}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {!imp.is_default && (
                        <button
                          onClick={() => void definirDefault(imp.id)}
                          title="Definir como padrão"
                          className="rounded p-1.5 hover:opacity-80"
                          style={{ color: colors.primary }}>
                          <Star size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => void apagar(imp.id)}
                        title="Apagar"
                        className="rounded p-1.5 hover:opacity-80"
                        style={{ color: colors.danger }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Form */}
          <div className="space-y-3 rounded-md border p-3" style={{ borderColor: colors.border }}>
            <Label style={{ color: colors.text }}>Adicionar impressora</Label>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome (ex.: Epson Caixa 1)"
                className="h-10 rounded-md border px-3 text-sm"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              />
              <Select value={queue} onValueChange={setQueue}>
                <SelectTrigger
                  style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}>
                  <SelectValue placeholder="— Escolher fila CUPS —" />
                </SelectTrigger>
                <SelectContent style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                  {cups.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      Nenhuma fila CUPS encontrada
                    </SelectItem>
                  ) : (
                    cups.map((q) => (
                      <SelectItem key={q} value={q}>
                        {q}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Select value={tipo} onValueChange={(v) => setTipo(v as "cups" | "windows" | "usb")}>
                <SelectTrigger
                  style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                  <SelectItem value="cups">CUPS</SelectItem>
                  <SelectItem value="usb">USB direto</SelectItem>
                  <SelectItem value="windows">Windows</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => void criar()}
              disabled={salvando || !nome.trim() || !queue.trim()}
              style={{ backgroundColor: colors.primary, color: "#fff" }}>
              {salvando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus size={16} className="mr-2" />
              )}
              Adicionar
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} style={{ borderColor: colors.border, color: colors.text }}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}