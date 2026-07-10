"use client";

import React, { useState } from "react";
import { User, Building2, Settings, XCircle, CheckCircle, AlertCircle } from "lucide-react";
import MainEmpresa from "@/app/components/MainEmpresa";
import { useThemeColors, useTheme } from "@/context/ThemeContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PerfilTab } from "@/app/components/Configuracoes/PerfilTab";
import { EmpresaTab } from "@/app/components/Configuracoes/EmpresaTab";
import { FreelancerConfigTab } from "@/app/components/Configuracoes/FreelancerConfigTab";
import { UsuariosTab } from "@/app/components/Configuracoes/UsuariosTab";
//import { NotificacoesTab } from "@/app/components/Configuracoes/NotificacoesTab";
import { SistemaTab } from "@/app/components/Configuracoes/SistemaTab";
import { User as UserType } from "@/services/User";
import { useAuth } from "@/context/authprovider";

/* ── Componente de Notificação Toast com Animação ── */
interface ToastNotificationProps {
  message: string;
  type: "success" | "error" | "warning" | "info";
  onClose: () => void;
  colors: any;
  description?: string;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ message, type, onClose, colors, description }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle size={24} style={{ color: colors.success }} />;
      case "error":
        return <AlertCircle size={24} style={{ color: colors.danger }} />;
      case "warning":
        return <AlertCircle size={24} style={{ color: colors.warning }} />;
      case "info":
        return <CheckCircle size={24} style={{ color: colors.primary }} />;
      default:
        return <CheckCircle size={24} style={{ color: colors.success }} />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case "success":
        return colors.success;
      case "error":
        return colors.danger;
      case "warning":
        return colors.warning;
      case "info":
        return colors.primary;
      default:
        return colors.success;
    }
  };

  return (
    <div
      className="fixed top-6 right-6 z-[9999] max-w-md"
      style={{
        backgroundColor: colors.card,
        borderLeft: `4px solid ${getBorderColor()}`,
        boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
        animation: "slideInRight 0.3s ease-out forwards",
      }}>
      <div className="flex items-start gap-4 p-4">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: colors.text }}>
            {message}
          </p>
          {description && (
            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
              {description}
            </p>
          )}
        </div>
        <button onClick={onClose} className="flex-shrink-0 transition-opacity hover:opacity-70" style={{ color: colors.textSecondary }}>
          <XCircle size={18} />
        </button>
      </div>
    </div>
  );
};

export default function ConfiguracoesPage() {
  const colors = useThemeColors();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("perfil");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "warning" | "info";
    description?: string;
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "warning" | "info" = "info", description?: string) => {
    setToast({ message, type, description });
  };

  // Verifica se é freelancer (pessoa singular/oauth)
  const isFreelancer = user?.oauth_verified === true;

  const tabs = [
    { value: "perfil", icon: User, label: "Perfil" },
    ...(isFreelancer
      ? [{ value: "empresa", icon: Building2, label: "Dados da Empresa" }]
      : [
          { value: "empresa", icon: Building2, label: "Empresa" },
          { value: "usuarios", icon: User, label: "Utilizadores" },
        ]),
    // { value: "notificacoes", icon: Bell,      label: "Notificações" },
    { value: "sistema", icon: Settings, label: "Sistema" },
  ];

  return (
    <>
      {/* Toast Notification - Fora do MainEmpresa para ficar acima de tudo */}
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          colors={colors}
          description={toast.description}
        />
      )}

      <MainEmpresa>
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 min-h-screen" style={{ backgroundColor: colors.background }}>
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8" style={{ color: colors.secondary }} />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: colors.secondary }}>
                Configurações
              </h1>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Gerencie sua conta e preferências do sistema
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList
              className="w-full justify-start overflow-x-auto flex-nowrap"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-opacity-20 gap-2"
                  style={{ color: colors.textSecondary }}>
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="perfil">
              <PerfilTab colors={colors} showToast={showToast} />
            </TabsContent>
            <TabsContent value="empresa">
              {isFreelancer ? (
                <FreelancerConfigTab colors={colors} showToast={showToast} />
              ) : (
                <EmpresaTab colors={colors} showToast={showToast} />
              )}
            </TabsContent>
            {!isFreelancer && (
              <TabsContent value="usuarios">
                <UsuariosTab colors={colors} currentUser={user as UserType | null} showToast={showToast} />
              </TabsContent>
            )}
            {/* <TabsContent value="notificacoes">
                        <NotificacoesTab colors={colors} showToast={showToast} />
                    </TabsContent> */}
            <TabsContent value="sistema">
              <SistemaTab colors={colors} theme={theme} toggleTheme={toggleTheme} />
            </TabsContent>
          </Tabs>
        </div>
      </MainEmpresa>
    </>
  );
}