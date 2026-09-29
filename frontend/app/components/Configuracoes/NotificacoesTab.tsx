"use client";

import React, { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeColors, SaveButton, WithToast } from "./ConfiguracoesComuns";

interface NotifForm {
  email_notificacoes: boolean;
  sms_notificacoes: boolean;
  push_notificacoes: boolean;
  marketing_emails: boolean;
  relatorios_automaticos: boolean;
  alertas_estoque: boolean;
  alertas_pagamentos: boolean;
}

export interface NotificacoesTabProps extends WithToast {
  colors: ThemeColors;
}

export function NotificacoesTab({ colors, showToast }: NotificacoesTabProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<NotifForm>({
    email_notificacoes: true,
    sms_notificacoes: false,
    push_notificacoes: true,
    marketing_emails: false,
    relatorios_automaticos: true,
    alertas_estoque: true,
    alertas_pagamentos: true,
  });

  const canais = [
    {
      key: "email_notificacoes" as const,
      label: "E-mail",
      desc: "Notificações por e-mail",
    },
    {
      key: "sms_notificacoes" as const,
      label: "SMS",
      desc: "Notificações por SMS",
    },
    {
      key: "push_notificacoes" as const,
      label: "Push",
      desc: "Notificações no navegador",
    },
  ];
  const tipos = [
    {
      key: "alertas_estoque" as const,
      label: "Alertas de estoque",
      desc: "Produtos com estoque baixo",
    },
    {
      key: "alertas_pagamentos" as const,
      label: "Alertas de pagamento",
      desc: "Faturas próximas do vencimento",
    },
    {
      key: "relatorios_automaticos" as const,
      label: "Relatórios",
      desc: "Relatórios periódicos por e-mail",
    },
    {
      key: "marketing_emails" as const,
      label: "Marketing",
      desc: "Novidades e ofertas",
    },
  ];

  const handleSave = async () => {
    setLoading(true);
    try {
      // TODO: integrar com o backend quando o endpoint existir
      // await api.put("/api/empresa/notificacoes", form);
      await new Promise((r) => setTimeout(r, 300));

      showToast("Sucesso", "success", "Preferências guardadas com sucesso.");
    } catch (err) {
      console.error("[NotificacoesTab] erro ao guardar:", err);
      showToast("Erro", "error", "Não foi possível guardar as preferências.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ backgroundColor: colors.card, borderColor: colors.border }}>
      <CardHeader>
        <CardTitle style={{ color: colors.secondary }}>Preferências de Notificação</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {[
          { title: "Canais", items: canais },
          { title: "Tipos", items: tipos },
        ].map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <Separator style={{ backgroundColor: colors.border }} />}
            <div className="space-y-4">
              <h3 className="font-medium" style={{ color: colors.text }}>
                {group.title}
              </h3>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: colors.text }}>
                        {item.label}
                      </p>
                      <p className="text-xs" style={{ color: colors.textSecondary }}>
                        {item.desc}
                      </p>
                    </div>
                    <Switch
                      checked={form[item.key]}
                      disabled={loading}
                      onCheckedChange={(v) => setForm((p) => ({ ...p, [item.key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </React.Fragment>
        ))}
      </CardContent>

      <CardFooter className="flex justify-end border-t pt-6" style={{ borderColor: colors.border }}>
        <SaveButton
          onClick={() => void handleSave()}
          loading={loading}
          loadingText="A guardar..."
          colors={colors}>
          Guardar preferências
        </SaveButton>
      </CardFooter>
    </Card>
  );
}