"use client";

import React, { useState } from "react";
import { User, Building2, Bell, Settings } from "lucide-react";
import MainEmpresa from "@/app/components/MainEmpresa";
import { useThemeColors, useTheme } from "@/context/ThemeContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PerfilTab } from "@/app/components/Configuracoes/PerfilTab";
import { EmpresaTab } from "@/app/components/Configuracoes/EmpresaTab";
import { UsuariosTab } from "@/app/components/Configuracoes/UsuariosTab";
//import { NotificacoesTab } from "@/app/components/Configuracoes/NotificacoesTab";
import { SistemaTab } from "@/app/components/Configuracoes/SistemaTab";
import { User as UserType } from "@/services/User";
import { useAuth } from "@/context/authprovider";

export default function ConfiguracoesPage() {
    const colors = useThemeColors();
    const { theme, toggleTheme } = useTheme();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("perfil");

    const tabs = [
        { value: "perfil",       icon: User,      label: "Perfil"       },
        { value: "empresa",      icon: Building2, label: "Empresa"      },
        { value: "usuarios",     icon: User,      label: "Utilizadores" },
       // { value: "notificacoes", icon: Bell,      label: "Notificações" },
        { value: "sistema",      icon: Settings,  label: "Sistema"      },
    ];

    return (
        <MainEmpresa>
            <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 min-h-screen"
                style={{ backgroundColor: colors.background }}>

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
                    <TabsList className="w-full justify-start overflow-x-auto flex-nowrap"
                        style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                        {tabs.map(tab => (
                            <TabsTrigger
                                key={tab.value} value={tab.value}
                                className="data-[state=active]:bg-opacity-20 gap-2"
                                style={{ color: colors.textSecondary }}>
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="perfil">
                        <PerfilTab colors={colors} />
                    </TabsContent>
                    <TabsContent value="empresa">
                        <EmpresaTab colors={colors} />
                    </TabsContent>
                    <TabsContent value="usuarios">
                        <UsuariosTab colors={colors} currentUser={user as UserType | null} />
                    </TabsContent>
                    {/* <TabsContent value="notificacoes">
                        <NotificacoesTab colors={colors} />
                    </TabsContent> */}
                    <TabsContent value="sistema">
                        <SistemaTab colors={colors} theme={theme} toggleTheme={toggleTheme} />
                    </TabsContent>
                </Tabs>
            </div>
        </MainEmpresa>
    );
}