'use client';

import React, {
    ReactNode,
    useState,
    useEffect,
    useCallback,
    useRef,
} from "react";
import Link from "next/link";
import {
    Home,
    Building2,
    Users,
    Settings,
    LogOut,
    ChevronDown,
    ChevronLeft,
    Bell,
    Loader2,
    X,
    Sun,
    Moon,
    Menu,
    AlertCircle,
    User,
    Shield,
    CreditCard,
    BarChart3,
    HelpCircle,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useLandlordAuth } from "@/context/LandlordAuthContext";
import { useTheme, useThemeColors } from "@/context/ThemeContext";
import { toast } from "sonner";

interface DropdownLink {
    label: string;
    path: string;
    icon?: LucideIcon;
}

interface MenuItem {
    label: string;
    icon: LucideIcon;
    path: string;
    links: DropdownLink[];
    isGroup?: boolean;
    roles?: string[]; // Apenas para consistência – landlord tem roles fixas
}

interface MainLandlordProps {
    children: ReactNode;
}

export default function MainLandlord({ children }: MainLandlordProps) {
    const pathname = usePathname();
    const router = useRouter();

    const { user, loading: userLoading, logout: authLogout } = useLandlordAuth();
    const { theme, toggleTheme } = useTheme();
    const colors = useThemeColors();

    // State management (idêntico ao MainEmpresa)
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState<Record<string, boolean>>({});
    const [isLoaded, setIsLoaded] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);
    const [logoutError, setLogoutError] = useState<string | null>(null);
    const [notificacoesAberto, setNotificacoesAberto] = useState(false);
    const [loadingNotificacoes, setLoadingNotificacoes] = useState(false);
    const [modalAnimating, setModalAnimating] = useState(false);
    const [panelAnimating, setPanelAnimating] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);

    // Refs para controlar chamadas
    const notificacoesRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);

    // Dados do utilizador landlord
    const userName = user?.name || "";
    const userRole = user?.role || "super_admin";
    const userEmail = user?.email || "";
    const userInitial = userName.charAt(0).toUpperCase();

    // Exemplo de notificações (podes substituir por dados reais de sistema)
    const [notificacoes, setNotificacoes] = useState<{ id: string; mensagem: string; tipo: 'info' | 'warning' | 'danger'; lida: boolean }[]>([]);
    const totalNotificacoes = notificacoes.filter(n => !n.lida).length;


    // Responsive detection (idêntico)
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) setSidebarOpen(true);
            else setSidebarOpen(false);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        if (isMobile) setSidebarOpen(false);
    }, [pathname, isMobile]);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    // Fechar menus ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                notificacoesRef.current &&
                !notificacoesRef.current.contains(event.target as Node)
            ) {
                setNotificacoesAberto(false);
            }
            if (
                userMenuRef.current &&
                !userMenuRef.current.contains(event.target as Node)
            ) {
                setUserMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ==================== NOTIFICAÇÕES (exemplo) ====================
    const buscarNotificacoes = useCallback(async (force = false) => {
        if (!user || userLoading) return;
        // Simular busca – podes chamar uma API real
        setLoadingNotificacoes(true);
        try {
            // Exemplo de dados estáticos
            const novas = [
                { id: '1', mensagem: 'Nova empresa registada: Padaria Central', tipo: 'info' as const, lida: false },
                { id: '2', mensagem: 'Subscrição da Empresa X expira amanhã', tipo: 'warning' as const, lida: false },
                { id: '3', mensagem: 'Erro crítico no servidor de ficheiros', tipo: 'danger' as const, lida: false },
            ];
            setNotificacoes(novas);
        } catch {
            toast.error("Erro ao carregar notificações");
        } finally {
            setLoadingNotificacoes(false);
        }
    }, [user, userLoading]);

    useEffect(() => {
        if (notificacoesAberto) {
            buscarNotificacoes();
        }
    }, [notificacoesAberto, buscarNotificacoes]);

    // ==================== HELPERS ====================
    const closeSidebar = () => setSidebarOpen(false);

    const toggleDropdown = (label: string) => {
        setDropdownOpen((prev) => ({ ...prev, [label]: !prev[label] }));
    };

    const handleMainItemClick = (item: MenuItem, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (item.links.length > 0) {
            if (sidebarOpen) {
                toggleDropdown(item.label);
            } else {
                setSubmenuOpen(item.label);
            }
        } else {
            if (isMobile) closeSidebar();
        }
    };

    const handleLinkClick = () => {
        if (isMobile) closeSidebar();
        setSubmenuOpen(null);
    };

    const toggleNotificacoes = () => {
        if (!user || userLoading) {
            toast.info("Aguarde, autenticando...");
            return;
        }
        if (!notificacoesAberto) {
            setNotificacoesAberto(true);
            setPanelAnimating(true);
            setTimeout(() => setPanelAnimating(false), 10);
        } else {
            setPanelAnimating(true);
            setTimeout(() => {
                setNotificacoesAberto(false);
                setPanelAnimating(false);
            }, 10);
        }
    };

    const abrirModalLogout = () => {
        setLogoutError(null);
        setModalAnimating(true);
        setLogoutModalOpen(true);
        setTimeout(() => setModalAnimating(false), 21);
    };

    const fecharModalLogout = () => {
        setModalAnimating(true);
        setTimeout(() => {
            setLogoutModalOpen(false);
            setLogoutError(null);
            setModalAnimating(false);
        }, 10);
    };

    const handleLogout = async () => {
        try {
            setLogoutLoading(true);
            setLogoutError(null);
            await authLogout();
            router.push("/landlord/login");
        } catch {
            setLogoutError("Erro inesperado. Redirecionando...");
            setTimeout(() => router.push("/landlord/login"), 10);
        } finally {
            setLogoutLoading(false);
            fecharModalLogout();
        }
    };

    const isActive = (path: string) => pathname === path;
    const isParentActive = (item: MenuItem) => {
        if (pathname === item.path && !item.isGroup) return true;
        return item.links.some((link) => pathname === link.path);
    };
    // Landlord tem sempre permissão total
    const temPermissao = () => true;

    // ==================== MENU ITEMS (LANDLORD) ====================
    const menuItems: MenuItem[] = [
        {
            label: "Dashboard",
            icon: Home,
            path: "/Landlorddash",
            links: [],
            isGroup: false,
        },

        {
            label: "Planos e Subscrições",
            icon: CreditCard,
            path: "/",
            links: [
                { label: "Planos", path: "/", icon: CreditCard },
                           ],
            isGroup: true,
        },
        {
            label: "Configurações",
            icon: Settings,
            path: "/Landlorddash/configuracoes",
            links: [],
            isGroup: false,
        },
        {
            label: "Ajuda",
            icon: HelpCircle,
            path: "/Landlorddash/ajuda",
            links: [],
            isGroup: false,
        },
        {
    label: "Perfil",
    icon: User,
    path: "/Landlorddash/perfil",
    links: [],
    isGroup: false,
},
    ];

    const menuItemsFiltrados = menuItems.filter(temPermissao);

    // ==================== LOADING ====================
    if (userLoading) {
        return (
            <div
                className="flex items-center justify-center w-screen h-screen"
                style={{ backgroundColor: colors.background }}
            >
                <Loader2
                    className="w-8 h-8 animate-spin"
                    style={{ color: colors.primary }}
                />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const currentPageLabel =
        menuItemsFiltrados.find((item) => isParentActive(item))?.label ||
        "Dashboard";
    const itemComSubmenu = menuItemsFiltrados.find(
        (item) => item.label === submenuOpen,
    );

    // ==================== RENDERIZAÇÃO (idêntica ao MainEmpresa) ====================
    return (
        <div
            className="flex w-screen h-screen overflow-hidden"
            style={{ backgroundColor: colors.background }}
        >
            {/* ==================== SIDEBAR ==================== */}
            <aside
                className="fixed left-0 top-0 z-40 flex flex-col h-screen transition-all duration-300 border-r md:relative md:z-0"
                style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    width: sidebarOpen
                        ? isMobile
                            ? "280px"
                            : "260px"
                        : isMobile
                            ? "0"
                            : "72px",
                    transform:
                        sidebarOpen || !isMobile
                            ? "translateX(0)"
                            : isMobile
                                ? "translateX(-100%)"
                                : "translateX(0)",
                }}
            >
                {!isMobile && (
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="absolute -right-3 top-8 z-50 p-1.5 text-white transition-all duration-200 hover:scale-110 active:scale-95 rounded-full shadow-md"
                        style={{ backgroundColor: colors.primary }}
                        title={sidebarOpen ? "Fechar sidebar" : "Abrir sidebar"}
                    >
                        <ChevronLeft
                            size={14}
                            style={{
                                transform: sidebarOpen ? "rotate(0)" : "rotate(180deg)",
                                transition: "transform 0.3s",
                            }}
                        />
                    </button>
                )}

                {/* Logo e título */}
{/* Logo e título */}
<div
    className="flex items-center justify-between gap-3 h-16 px-4 border-b transition-all duration-200"
    style={{ borderColor: colors.border }}
>
    {/* Esquerda: avatar/logo + nome */}
    <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
            className="flex items-center justify-center w-10 h-10 text-xs font-bold text-white flex-shrink-0 rounded-lg overflow-hidden"
            style={{ backgroundColor: colors.primary }}
        >
            {user?.avatar ? (
                <Image
                    src={user.avatar}
                    alt="Avatar"
                    width={40}
                    height={40}
                    className="object-cover"
                    unoptimized
                />
            ) : (
                <Shield size={20} />
            )}
        </div>
        {sidebarOpen && (
            <span
                className="text-sm font-semibold truncate flex-1"
                style={{ color: colors.text }}
            >
                FaturaJá
            </span>
        )}
    </div>

    {/* Direita: botão fechar (apenas mobile e quando sidebar aberta) */}
    {isMobile && sidebarOpen && (
        <button
            onClick={closeSidebar}
            className="p-1 transition-transform hover:scale-110 active:scale-95"
            style={{ color: colors.text }}
            title="Fechar sidebar"
        >
            <X size={20} />
        </button>
    )}
</div>
                {/* Menu Items */}
                <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
                    {isLoaded &&
                        menuItemsFiltrados.map((item) => {
                            const active = isParentActive(item);
                            const isOpen = dropdownOpen[item.label];
                            const hasLinks = item.links.length > 0;

                            return (
                                <div key={item.label}>
                                    {hasLinks ? (
                                        <div
                                            className="flex items-center justify-between px-3 py-2.5 transition-all duration-200 cursor-pointer select-none group"
                                            style={{
                                                backgroundColor: active
                                                    ? colors.secondary
                                                    : "transparent",
                                                color: active ? "white" : colors.text,
                                            }}
                                            onClick={(e) => handleMainItemClick(item, e)}
                                            title={!sidebarOpen ? item.label : ""}
                                            role="button"
                                            tabIndex={0}
                                        >
                                            <div className="flex items-center flex-1 gap-3 min-w-0">
                                                <item.icon
                                                    size={19}
                                                    style={{
                                                        color: active ? "white" : colors.secondary,
                                                        flexShrink: 0,
                                                    }}
                                                    className="transition-colors duration-200"
                                                />
                                                {sidebarOpen && (
                                                    <span
                                                        className="text-sm font-medium truncate transition-colors duration-200"
                                                        style={{ color: active ? "white" : colors.text }}
                                                    >
                                                        {item.label}
                                                    </span>
                                                )}
                                            </div>

                                            {sidebarOpen && (
                                                <div
                                                    className="ml-1 transition-transform duration-250"
                                                    style={{
                                                        transform: isOpen
                                                            ? "rotate(180deg)"
                                                            : "rotate(0deg)",
                                                    }}
                                                >
                                                    <ChevronDown
                                                        size={15}
                                                        style={{
                                                            color: active ? "white" : colors.textSecondary,
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            {!sidebarOpen && (
                                                <div
                                                    className="absolute right-2 w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    style={{ backgroundColor: colors.primary }}
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <Link
                                            href={item.path}
                                            className="flex items-center justify-between px-3 py-2.5 transition-all duration-200 cursor-pointer select-none group w-full"
                                            style={{
                                                backgroundColor: active
                                                    ? colors.secondary
                                                    : "transparent",
                                                color: active ? "white" : colors.text,
                                            }}
                                            onClick={handleLinkClick}
                                            title={!sidebarOpen ? item.label : ""}
                                        >
                                            <div className="flex items-center flex-1 gap-3 min-w-0">
                                                <item.icon
                                                    size={19}
                                                    style={{
                                                        color: active ? "white" : colors.secondary,
                                                        flexShrink: 0,
                                                    }}
                                                    className="transition-colors duration-200"
                                                />
                                                {sidebarOpen && (
                                                    <span
                                                        className="text-sm font-medium truncate transition-colors duration-200"
                                                        style={{ color: active ? "white" : colors.text }}
                                                    >
                                                        {item.label}
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    )}

                                    {/* Submenu */}
                                    {hasLinks && isOpen && sidebarOpen && (
                                        <div className="ml-3 mt-1 space-y-1 overflow-hidden animate-slide-down">
                                            {item.links.map((link) => {
                                                const linkActive = isActive(link.path);
                                                return (
                                                    <Link
                                                        key={link.path}
                                                        href={link.path}
                                                        onClick={handleLinkClick}
                                                    >
                                                        <div
                                                            className="flex items-center gap-3 px-3 py-2 border-l-2 transition-all duration-200"
                                                            style={{
                                                                borderColor: linkActive
                                                                    ? colors.primary
                                                                    : "transparent",
                                                                backgroundColor: linkActive
                                                                    ? `${colors.primary}15`
                                                                    : "transparent",
                                                            }}
                                                        >
                                                            {link.icon && (
                                                                <link.icon
                                                                    size={15}
                                                                    style={{ color: colors.text, flexShrink: 0 }}
                                                                />
                                                            )}
                                                            <span
                                                                className="text-xs truncate transition-all duration-200"
                                                                style={{
                                                                    color: linkActive
                                                                        ? colors.text
                                                                        : colors.textSecondary,
                                                                    fontWeight: linkActive ? "600" : "400",
                                                                }}
                                                            >
                                                                {link.label}
                                                            </span>
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </nav>

                {/* Logout Button */}
                <div
                    className="p-2 border-t transition-colors duration-200"
                    style={{ borderColor: colors.border }}
                >
                    <div
                        onClick={abrirModalLogout}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all duration-200 hover:translate-x-1 active:scale-98 group"
                        title={!sidebarOpen ? "Sair" : ""}
                        style={{ backgroundColor: `${colors.danger}10` }}
                    >
                        <LogOut
                            size={19}
                            className="text-red-500 transition-transform group-hover:scale-110"
                        />
                        {sidebarOpen && (
                            <span className="text-sm font-medium text-red-500">Sair</span>
                        )}
                    </div>
                </div>
            </aside>

            {/* ==================== MAIN CONTENT ==================== */}
            <div className="flex flex-col flex-1 w-full overflow-hidden">
                {/* Header */}
                <header
                    className="flex items-center justify-between gap-3 px-3 h-14 border-b shadow-sm md:h-16 md:px-6 transition-all duration-200"
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}
                >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        {isMobile && (
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="p-2 transition-all hover:scale-110 active:scale-95"
                                style={{
                                    color: colors.primary,
                                    backgroundColor: `${colors.primary}10`,
                                }}
                                title="Abrir menu"
                            >
                                <Menu size={20} />
                            </button>
                        )}
                        <h1
                            className="text-sm font-bold truncate md:text-base"
                            style={{ color: colors.text }}
                        >
                            {currentPageLabel}
                        </h1>
                    </div>

                    {/* Header Actions */}
                    <div className="flex items-center gap-1 md:gap-2">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 transition-all hover:scale-110 active:scale-95"
                            style={{ backgroundColor: colors.hover, color: colors.text }}
                            title="Alternar tema"
                        >
                            {theme === "dark" ? (
                                <Sun size={16} style={{ color: colors.secondary }} />
                            ) : (
                                <Moon size={16} style={{ color: colors.primary }} />
                            )}
                        </button>

                        {/* Notifications */}
                        <div className="relative" ref={notificacoesRef}>
                            <button
                                onClick={toggleNotificacoes}
                                className="relative p-2 transition-all hover:scale-110 active:scale-95"
                                style={{
                                    backgroundColor: notificacoesAberto
                                        ? colors.hover
                                        : "transparent",
                                }}
                                title="Notificações"
                            >
                                <Bell size={16} style={{ color: colors.secondary }} />
                                {totalNotificacoes > 0 && (
                                    <span
                                        className="absolute -top-1 -right-1 text-[10px] font-bold flex items-center justify-center px-1.5 py-0.5 text-white animate-pulse shadow-md"
                                        style={{
                                            backgroundColor: notificacoes.some(n => n.tipo === 'danger')
                                                ? colors.danger
                                                : "#f59e0b",
                                        }}
                                    >
                                        {totalNotificacoes > 9 ? "9+" : totalNotificacoes}
                                    </span>
                                )}
                            </button>

                            {/* Notifications Panel */}
                            {notificacoesAberto && (
                                <>
                                    <div
                                        className={`absolute right-0 z-50 mt-2 overflow-hidden border shadow-xl transition-all duration-200 ${panelAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
                                        style={{
                                            backgroundColor: colors.card,
                                            borderColor: colors.border,
                                            width: "min(380px, calc(100vw - 20px))",
                                            transformOrigin: "top right",
                                            maxHeight: "calc(100vh - 80px)",
                                        }}
                                    >
                                        <div
                                            className="p-3 border-b md:p-4"
                                            style={{ borderColor: colors.border }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <h3
                                                    className="text-sm font-semibold"
                                                    style={{ color: colors.text }}
                                                >
                                                    Notificações
                                                </h3>
                                                <button
                                                    onClick={() => setNotificacoesAberto(false)}
                                                    className="p-1 transition-transform hover:scale-110 active:scale-95"
                                                    title="Fechar"
                                                >
                                                    <X
                                                        size={16}
                                                        style={{ color: colors.textSecondary }}
                                                    />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="max-h-80 overflow-y-auto">
                                            {loadingNotificacoes ? (
                                                <div className="flex items-center justify-center py-6">
                                                    <Loader2
                                                        className="w-4 h-4 animate-spin"
                                                        style={{ color: colors.primary }}
                                                    />
                                                </div>
                                            ) : notificacoes.length > 0 ? (
                                                <div
                                                    style={{ borderColor: colors.border }}
                                                    className="divide-y"
                                                >
                                                    {notificacoes.map((notif, idx) => (
                                                        <div
                                                            key={notif.id}
                                                            className="p-3 transition-all duration-200 hover:translate-x-1"
                                                            style={{
                                                                animation: `fadeIn 0.2s ease-out ${idx * 0.03}s forwards`,
                                                            }}
                                                        >
                                                            <div className="flex gap-2">
                                                                <div
                                                                    className="p-1.5 rounded"
                                                                    style={{
                                                                        backgroundColor:
                                                                            notif.tipo === 'danger'
                                                                                ? colors.danger
                                                                                : notif.tipo === 'warning'
                                                                                    ? colors.warning
                                                                                    : colors.primary,
                                                                    }}
                                                                >
                                                                    <AlertCircle
                                                                        size={14}
                                                                        className="text-white"
                                                                    />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p
                                                                        className="text-xs font-medium truncate"
                                                                        style={{ color: colors.text }}
                                                                    >
                                                                        {notif.mensagem}
                                                                    </p>
                                                                    {!notif.lida && (
                                                                        <span
                                                                            className="text-[10px]"
                                                                            style={{ color: colors.secondary }}
                                                                        >
                                                                            Nova
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-8 text-center">
                                                    <p
                                                        className="text-xs"
                                                        style={{ color: colors.textSecondary }}
                                                    >
                                                        Sem notificações
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <div
                                            className="p-2 border-t text-center"
                                            style={{ borderColor: colors.border }}
                                        >
                                            <button
                                                onClick={() => buscarNotificacoes(true)}
                                                disabled={loadingNotificacoes}
                                                className="text-xs font-medium transition-all hover:scale-105 disabled:opacity-50 px-2 py-1"
                                                style={{ color: colors.primary }}
                                            >
                                                {loadingNotificacoes ? "Atualizando..." : "Atualizar"}
                                            </button>
                                        </div>
                                    </div>
                                    <div
                                        onClick={() => setNotificacoesAberto(false)}
                                        className="fixed inset-0 z-40"
                                    />
                                </>
                            )}
                        </div>

                        {/* User Menu */}
                        <div className="relative" ref={userMenuRef}>
                            <button
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="flex items-center gap-2 pl-2 border-l transition-all duration-200 hover:scale-105 active:scale-95 px-2 py-1"
                                style={{
                                    borderColor: colors.border,
                                    backgroundColor: userMenuOpen ? colors.hover : "transparent",
                                }}
                                title="Menu do utilizador"
                            >
                                <div className="hidden text-right md:block">
                                    <p
                                        className="text-xs font-semibold leading-tight"
                                        style={{ color: colors.text }}
                                    >
                                        {userName.split(" ")[0]}
                                    </p>
                                    <p
                                        className="text-[10px]"
                                        style={{ color: colors.textSecondary }}
                                    >
                                        
                                    </p>
                                </div>
                                <div
                                    className="flex items-center justify-center w-7 h-7 text-xs font-bold text-white md:w-8 md:h-8 transition-transform rounded"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary} 100%)`,
                                    }}
                                >
                                    {userInitial}
                                </div>
                            </button>

                            {/* User Dropdown Menu */}
                            {userMenuOpen && (
                                <>
                                    <div
                                        className={`absolute right-0 z-50 mt-2 w-64 overflow-hidden border shadow-xl transition-all duration-200`}
                                        style={{
                                            backgroundColor: colors.card,
                                            borderColor: colors.border,
                                            animation: "slideDown 0.2s ease-out forwards",
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div
                                            className="p-3 border-b md:p-4"
                                            style={{
                                                backgroundColor: `${colors.primary}10`,
                                                borderColor: colors.border,
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="flex items-center justify-center w-10 h-10 text-sm font-bold text-white flex-shrink-0"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary} 100%)`,
                                                    }}
                                                >
                                                    {userInitial}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p
                                                        className="text-sm font-semibold truncate"
                                                        style={{ color: colors.text }}
                                                    >
                                                        {userName}
                                                    </p>
                                                    <p
                                                        className="text-xs truncate"
                                                        style={{ color: colors.textSecondary }}
                                                    >
                                                        {userEmail}
                                                    </p>
                                                    <p
                                                        className="text-xs mt-1 font-medium"
                                                        style={{ color: colors.secondary }}
                                                    >
                                                        {userRole === "super_admin" ? "Super Admin" : "Suporte"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="py-1">
                                            <Link
                                                href="/Landlorddash/perfil"
                                                onClick={() => setUserMenuOpen(false)}
                                            >
                                                <div
                                                    className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium transition-all duration-200 hover:translate-x-1"
                                                    style={{
                                                        color: colors.text,
                                                        backgroundColor: "transparent",
                                                    }}
                                                >
                                                    <User size={14} />
                                                    <span>Perfil</span>
                                                </div>
                                            </Link>
                                            
                                            <Link
                                                href="/Landlord/dashboard/configuracoes"
                                                onClick={() => setUserMenuOpen(false)}
                                            >
                                                <div
                                                    className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium transition-all duration-200 hover:translate-x-1"
                                                    style={{
                                                        color: colors.text,
                                                        backgroundColor: "transparent",
                                                    }}
                                                >
                                                    <Settings size={14} />
                                                    <span>Configurações</span>
                                                </div>
                                            </Link>
                                        </div>

                                        <div
                                            style={{ borderColor: colors.border }}
                                            className="border-t"
                                        />

                                        <div className="p-1">
                                            <button
                                                onClick={() => {
                                                    setUserMenuOpen(false);
                                                    abrirModalLogout();
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium transition-all duration-200 hover:translate-x-1"
                                                style={{
                                                    color: "#ef4444",
                                                    backgroundColor: "transparent",
                                                }}
                                            >
                                                <LogOut size={14} />
                                                <span>Sair</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div
                                        onClick={() => setUserMenuOpen(false)}
                                        className="fixed inset-0 z-40"
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-auto p-3 md:p-6">
                    <div className="animate-fade-in">{children}</div>
                </main>
            </div>

            {/* ==================== SUBMENU MODAL (Sidebar Fechado) ==================== */}
            {submenuOpen && itemComSubmenu && (
                <>
                    <div
                        className={`fixed inset-0 z-50 transition-all duration-200 ${modalAnimating ? "opacity-0" : "opacity-100"}`}
                        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
                        onClick={() => setSubmenuOpen(null)}
                    />
                    <div
                        className={`fixed ${isMobile ? "bottom-0 left-0 right-0" : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"} z-50 max-h-96 overflow-auto border transition-all duration-200 ${isMobile ? "" : ""} ${modalAnimating ? (isMobile ? "translate-y-full opacity-0" : "scale-95 opacity-0") : isMobile ? "translate-y-0 opacity-100" : "scale-100 opacity-100"}`}
                        style={{
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            width: isMobile ? "100%" : "min(400px, 90vw)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            className="p-4 border-b sticky top-0"
                            style={{
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <h3
                                    className="text-sm font-bold"
                                    style={{ color: colors.text }}
                                >
                                    {itemComSubmenu.label}
                                </h3>
                                <button
                                    onClick={() => setSubmenuOpen(null)}
                                    className="p-1 transition-transform hover:scale-110 active:scale-95"
                                    style={{ color: colors.textSecondary }}
                                    title="Fechar"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="py-2">
                            {itemComSubmenu.links.map((link) => {
                                const linkActive = isActive(link.path);
                                return (
                                    <Link
                                        key={link.path}
                                        href={link.path}
                                        onClick={() => setSubmenuOpen(null)}
                                    >
                                        <div
                                            className="flex items-center gap-3 px-4 py-3 transition-all duration-200 border-l-4 mx-2"
                                            style={{
                                                borderColor: linkActive
                                                    ? colors.primary
                                                    : "transparent",
                                                backgroundColor: linkActive
                                                    ? `${colors.primary}15`
                                                    : "transparent",
                                            }}
                                        >
                                            {link.icon && (
                                                <link.icon
                                                    size={16}
                                                    style={{ color: colors.text, flexShrink: 0 }}
                                                />
                                            )}
                                            <span
                                                className="text-sm transition-all duration-200"
                                                style={{
                                                    color: linkActive
                                                        ? colors.text
                                                        : colors.textSecondary,
                                                    fontWeight: linkActive ? "600" : "400",
                                                }}
                                            >
                                                {link.label}
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* ==================== LOGOUT MODAL ==================== */}
            {logoutModalOpen && (
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${modalAnimating ? "opacity-0" : "opacity-100"}`}
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
                    onClick={fecharModalLogout}
                >
                    <div
                        className={`w-full max-w-sm overflow-hidden shadow-xl transition-all duration-200 ${modalAnimating ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
                        style={{ backgroundColor: colors.card }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            className="p-4 border-b text-center md:p-6 md:pb-4"
                            style={{ borderColor: colors.border }}
                        >
                            <h2
                                className="text-lg font-bold md:text-xl"
                                style={{ color: colors.text }}
                            >
                                Confirmar Saída
                            </h2>
                            <p
                                className="text-xs mt-1 md:text-sm"
                                style={{ color: colors.textSecondary }}
                            >
                                Deseja realmente sair da sua conta?
                            </p>
                        </div>

                        {logoutError && (
                            <div
                                className="p-3 mx-4 mb-3 text-xs text-center animate-shake"
                                style={{
                                    backgroundColor: theme === "dark" ? "#442200" : "#fef3c7",
                                    border: `1px solid ${theme === "dark" ? "#854d0e" : "#fbbf24"}`,
                                    color: theme === "dark" ? "#fbbf24" : "#92400e",
                                }}
                            >
                                {logoutError}
                            </div>
                        )}

                        <div
                            className="p-3 border-b md:p-4"
                            style={{
                                backgroundColor: theme === "dark" ? "#1a1a1a" : "#f9fafb",
                                borderColor: colors.border,
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="flex items-center justify-center w-8 h-8 text-xs font-bold text-white rounded-lg flex-shrink-0"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary} 100%)`,
                                    }}
                                >
                                    {userInitial}
                                </div>
                                <div className="min-w-0">
                                    <p
                                        className="text-xs font-medium truncate md:text-sm"
                                        style={{ color: colors.text }}
                                    >
                                        {userName}
                                    </p>
                                    <p
                                        className="text-[10px] truncate md:text-xs"
                                        style={{ color: colors.textSecondary }}
                                    >
                                        {userEmail}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 p-3 md:gap-3 md:p-4">
                            <button
                                onClick={fecharModalLogout}
                                disabled={logoutLoading}
                                className="flex-1 py-2 px-3 text-xs font-medium transition-all hover:scale-105 active:scale-95 md:text-sm"
                                style={{
                                    backgroundColor: theme === "dark" ? "#333" : "#e5e7eb",
                                    color: colors.text,
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleLogout}
                                disabled={logoutLoading}
                                className="flex-1 py-2 px-3 text-xs font-medium text-white transition-all flex items-center justify-center gap-1 hover:scale-105 active:scale-95 md:text-sm"
                                style={{ backgroundColor: colors.danger }}
                            >
                                {logoutLoading ? (
                                    <>
                                        <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                                        <span className="hidden sm:inline">Saindo...</span>
                                    </>
                                ) : (
                                    <>
                                        <LogOut size={14} />
                                        <span className="hidden sm:inline">Sair</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== ANIMATIONS ==================== */}
            <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-5px);
          }
          75% {
            transform: translateX(5px);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }

        .animate-slide-down {
          animation: slideDown 0.2s ease-out forwards;
        }

        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }

        .hover\\:scale-110:hover {
          transform: scale(1.1);
        }

        .hover\\:scale-105:hover {
          transform: scale(1.05);
        }

        .active\\:scale-95:active {
          transform: scale(0.95);
        }

        .active\\:scale-98:active {
          transform: scale(0.98);
        }

        .hover\\:translate-x-1:hover {
          transform: translateX(4px);
        }

        .transition-all {
          transition-property: all;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }

        .duration-200 {
          transition-duration: 200ms;
        }

        .duration-250 {
          transition-duration: 250ms;
        }

        .duration-300 {
          transition-duration: 300ms;
        }

        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: var(--scrollbar-color, #cbd5e1);
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: var(--scrollbar-hover-color, #94a3b8);
        }
      `}</style>
        </div>
    );
}