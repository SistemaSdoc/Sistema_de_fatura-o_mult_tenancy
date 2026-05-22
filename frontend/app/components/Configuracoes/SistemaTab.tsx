"use client";

import React from "react";
import {
  Download,
  Upload,
  RefreshCcw,
  Sun,
  Moon,
  Globe,
  LogOut,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeColors } from "./ConfiguracoesComuns";

export function SistemaTab({
  colors,
  theme,
  toggleTheme,
}: {
  colors: ThemeColors;
  theme: string;
  toggleTheme: () => void;
}) {
  return (
    <div className="space-y-6">
      <Card
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <CardHeader>
          <CardTitle style={{ color: colors.secondary }}>Aparência</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium" style={{ color: colors.text }}>
                Tema
              </p>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Alterne entre claro e escuro
              </p>
            </div>
            <Button
              type="button"
              onClick={toggleTheme}
              variant="outline"
              className="gap-2"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              {theme === "dark" ? (
                <>
                  <Sun className="w-4 h-4" /> Tema Claro
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4" /> Tema Escuro
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

    {/*  <Card
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <CardHeader>
          <CardTitle style={{ color: colors.primary }}>Backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: Download,
                label: "Exportar",
                fn: () => toast.success("Exportação iniciada!"),
              },
              {
                icon: Upload,
                label: "Importar",
                fn: () => toast.info("Em desenvolvimento..."),
              },
              {
                icon: RefreshCcw,
                label: "Limpar cache",
                fn: () => toast.success("Cache limpo!"),
              },
            ].map((btn) => (
              <Button
                key={btn.label}
                type="button"
                onClick={btn.fn}
                variant="outline"
                className="gap-2"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                <btn.icon className="w-4 h-4" /> {btn.label}
              </Button>
            ))}
          </div>
          <div
            className="p-4 text-sm rounded-md"
            style={{
              backgroundColor: colors.hover,
              color: colors.textSecondary,
            }}
          >
            Último backup: {new Date().toLocaleDateString("pt-PT")} às 23:00
          </div>
        </CardContent>
      </Card>

      <Card
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <CardHeader>
          <CardTitle style={{ color: colors.primary }}>
            Sessões Ativas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              device: "Chrome • Windows",
              location: "Luanda, Angola • Ativo agora",
              current: true,
            },
            {
              device: "Safari • iPhone",
              location: "Luanda, Angola • há 2 dias",
              current: false,
            },
          ].map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ backgroundColor: colors.hover }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-md"
                  style={{
                    backgroundColor: s.current
                      ? `${colors.success}20`
                      : `${colors.textSecondary}20`,
                  }}
                >
                  <Globe
                    className="w-4 h-4"
                    style={{
                      color: s.current ? colors.success : colors.textSecondary,
                    }}
                  />
                </div>
                <div>
                  <p className="font-medium" style={{ color: colors.text }}>
                    {s.device}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: colors.textSecondary }}
                  >
                    {s.location}
                  </p>
                </div>
              </div>
              {s.current ? (
                <Badge
                  style={{
                    backgroundColor: `${colors.success}20`,
                    color: colors.success,
                  }}
                >
                  Atual
                </Badge>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  style={{ color: colors.danger }}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>*/}

      <Card
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <CardHeader>
          <CardTitle style={{ color: colors.danger }}>Zona de Perigo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium" style={{ color: colors.danger }}>
                Excluir conta
              </p>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Ação irreversível. Todos os dados serão perdidos.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              className="gap-2"
              style={{ backgroundColor: colors.danger }}
              onClick={() => toast.error("Funcionalidade restrita")}
              disabled
            >
              <Trash2 className="w-4 h-4" /> Excluir
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
