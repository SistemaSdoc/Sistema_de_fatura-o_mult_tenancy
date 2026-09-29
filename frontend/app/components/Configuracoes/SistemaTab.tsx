"use client";

import React from "react";
import { Sun, Moon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeColors, WithToast } from "./ConfiguracoesComuns";

export interface SistemaTabProps extends WithToast {
  colors: ThemeColors;
  theme: string;
  toggleTheme: () => void;
}

export function SistemaTab({ colors, theme, toggleTheme, showToast }: SistemaTabProps) {
  const handleDeleteConta = () => {
    showToast(
      "Aviso",
      "warning",
      "A exclusão de conta está temporariamente indisponível. Contacte o suporte.",
    );
  };

  return (
    <div className="space-y-6">
      {/* Aparência */}
      <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
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
              style={{ borderColor: colors.border, color: colors.text }}>
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

      {/* Zona de Perigo */}
      <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <CardHeader>
          <CardTitle style={{ color: colors.danger }}>Zona de Perigo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 flex-wrap">
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
              onClick={handleDeleteConta}>
              <Trash2 className="w-4 h-4" /> Excluir
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}