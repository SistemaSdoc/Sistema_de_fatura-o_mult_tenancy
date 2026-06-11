"use client";

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
    FileText,
    Users,
    BarChart2,
    LogOut,
    ChevronDown,
    ShoppingCart,
    Package,
    Archive,
    Truck,
    ChevronLeft,
    Settings,
    Bell,
    Loader2,
    X,
    Sun,
    Moon,
    Menu,
    AlertCircle,
    TrendingDown,
    User,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/authprovider";
import { estoqueService } from "@/services/estoque";
import { produtoService, Produto } from "@/services/produtos";
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
    roles?: string[];
}

interface MainEmpresaProps {
    children: ReactNode;
    companyLogo?: string;
    companyName?: string;
}

export default function MainEmpresa({
    children,
    companyLogo,
    companyName,
}: MainEmpresaProps) {
    const pathname = usePathname();
    const router = useRouter();

    const { user, loading: userLoading, logout: authLogout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const colors = useThemeColors();

    // State management
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState<Record<string, boolean>>({});
    const [isLoaded, setIsLoaded] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);
    const [logoutError, setLogoutError] = useState<string | null>(null);
    const [notificacoesAberto, setNotificacoesAberto] = useState(false);
    const [produtosEstoqueBaixo, setProdutosEstoqueBaixo] = useState<Produto[]>(
        [],
    );
    const [produtosSemEstoque, setProdutosSemEstoque] = useState<Produto[]>([]);
    const [loadingNotificacoes, setLoadingNotificacoes] = useState(false);
    const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
    const [abaAtiva, setAbaAtiva] = useState<"baixo" | "zero">("baixo");
    const [modalAnimating, setModalAnimating] = useState(false);
    const [panelAnimating, setPanelAnimating] = useState(false);
    const [logoError, setLogoError] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);

    // Refs para controlar chamadas concorrentes
    const fetchingNotificacoesRef = useRef(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const notificacoesRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);

    // User data
    const userName = user?.name || "";
    const userRole = user?.role || "";
    const userEmail = user?.email || "";
    const userInitial = userName.charAt(0).toUpperCase();
    const logoFromServer =`http://192.168.1.192:8000/storage/${companyLogo || user?.empresa?.logo || null}`;

    // FUNÇÃO PARA VALIDAR E FORMATAR URL DA IMAGEM
    const getValidImageUrl = (logo: string | null | undefined): string | null => {
        if (!logo || logoError) return null;

        if (logo.startsWith("http://") || logo.startsWith("https://")) {
            return logo;
        }

        if (logo.startsWith("/")) {
            return logo;
        }

        if (logo.trim() !== "") {
            return `/${logo}`;
        }

        return null;
    };

    const validImageUrl = getValidImageUrl(logoFromServer);
    const empresaLogo = validImageUrl || "";
    const nomeEmpresa = companyName || user?.empresa?.nome || "";

    useEffect(() => {
        setLogoError(false);
    }, [user?.empresa?.logo, companyLogo]);

    // Responsive detection
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

// ==================== NOTIFICAÇÕES DE ESTOQUE ====================
const buscarNotificacoesEstoque = useCallback(async () => {
  if (!user || userLoading) return;
  if (fetchingNotificacoesRef.current) return;

  // Apenas roles que realmente têm permissão no backend
  const rolesComPermissaoEstoque = ["admin", "operador", "gestor"];

  if (!rolesComPermissaoEstoque.includes(userRole)) {
    setProdutosEstoqueBaixo([]);
    setProdutosSemEstoque([]);
    setUltimaAtualizacao(new Date());
    fetchingNotificacoesRef.current = false;
    return;
  }

  fetchingNotificacoesRef.current = true;
  setLoadingNotificacoes(true);

  try {
    const resumo = await estoqueService.obterResumo();
    const produtosCriticos = resumo.produtos_criticos || [];
    
    const baixo = produtosCriticos.filter(
      (p: Produto) => p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo
    );
    setProdutosEstoqueBaixo(baixo);

    // Apenas admin e operador veem produtos sem estoque
    if (userRole === 'admin' || userRole === 'operador') {
      const responseSemEstoque = await produtoService.listarProdutos({
        sem_estoque: true,
        tipo: "produto",
        paginar: false,
      });

      const produtosSemStock = Array.isArray(responseSemEstoque.produtos)
        ? responseSemEstoque.produtos
        : responseSemEstoque.produtos?.data || [];

      const zero = produtosSemStock.filter((p: Produto) => p.estoque_atual === 0);
      setProdutosSemEstoque(zero);
    } else {
      setProdutosSemEstoque([]);
    }

    setUltimaAtualizacao(new Date());
  } catch (error: any) {
    console.error("[MainEmpresa] Erro ao buscar notificações:", error);
    
    // Opcional: só mostrar toast em erros que não sejam 403
    if (error.response?.status !== 403) {
      toast.error("Erro ao carregar alertas de estoque");
    }
  } finally {
    setLoadingNotificacoes(false);
    fetchingNotificacoesRef.current = false;
  }
}, [user, userLoading, userRole]);

useEffect(() => {
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  const rolesPermitidos = ["admin", "operador", "gestor"];

  if (user && !userLoading && rolesPermitidos.includes(userRole)) {
    const timeoutId = setTimeout(() => {
      buscarNotificacoesEstoque();
    }, 100);

    intervalRef.current = setInterval(() => {
      buscarNotificacoesEstoque();
    }, 300000); // 5 minutos

    return () => {
      clearTimeout(timeoutId);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }
}, [user, userLoading, userRole, buscarNotificacoesEstoque]);

    // ==================== HELPERS ====================
    const closeSidebar = () => setSidebarOpen(false);

    const toggleDropdown = (label: string) => {
        setDropdownOpen((prev) => ({ ...prev, [label]: !prev[label] }));
    };

    const handleMainItemClick = (item: MenuItem, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (item.links.length > 0) {
            // Tem sublinks
            if (sidebarOpen) {
                // Sidebar aberto: toggle dropdown normal
                toggleDropdown(item.label);
            } else {
                // Sidebar fechado: abrir submenu em modal/sheet
                setSubmenuOpen(item.label);
            }
        } else {
            // Sem sublinks: navega diretamente
            if (isMobile) {
                closeSidebar();
            }
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
            buscarNotificacoesEstoque();
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
            const result = await authLogout();
            if (result.success) {
                router.push("/");
            } else {
                setLogoutError(result.message || "Erro ao fazer logout");
                setTimeout(() => router.push("/login"), 10);
            }
        } catch {
            setLogoutError("Erro inesperado. Redirecionando...");
            setTimeout(() => router.push("/login"), 10);
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
    const temPermissao = (item: MenuItem): boolean => {
        if (!item.roles || item.roles.length === 0) return true;
        return item.roles.includes(userRole);
    };

    const menuItems: MenuItem[] = [
        {
            label: "Dashboard",
            icon: Home,
            path: "/dashboard",
            links: [],
            roles: ["admin", "contablista", "gestor"],
        },
        {
            label: "Faturação",
            icon: FileText,
            path: "/dashboard/Vendas",
            links:
                userRole === "admin" || userRole === "operador" || userRole === "gestor"
                    ? [
                        {
                            label: "Gerar fatura-recibo",
                            path: "/dashboard/Vendas/Nova_venda",
                            icon: ShoppingCart,
                        },
                        {
                            label: "Gerar faturas",
                            path: "/dashboard/Faturas/Fatura_Normal",
                            icon: FileText,
                        },
                        {
                            label: "Gerar proformas",
                            path: "/dashboard/Faturas/Faturas_Proforma",
                            icon: FileText,
                        },
                        {
                            label: "Vendas geradas",
                            path: "/dashboard/Faturas/Faturas",
                            icon: FileText,
                        },
                    ]
                    : [],
            isGroup: true,
            roles: ["admin", "operador", "gestor"],
        },
        {
            label: "Outros documentos",
            icon: FileText,
            path: "/dashboard/Faturas/DC",
            links: [],
            isGroup: false,
            roles: ["admin", "operador"],
        },
        {
            label: "Gestão de Stock",
            icon: Package,
            path: "/dashboard/Produtos_servicos",
            links: [
                {
                    label: "Stock",
                    path: "/dashboard/Produtos_servicos/Stock",
                    icon: Package,
                },
                {
                    label: "Categorias",
                    path: "/dashboard/Produtos_servicos/categorias",
                    icon: Archive,
                },
            ],
            isGroup: true,
            roles: ["admin", "gestor"],
        },
        {
            label: "Fornecedores",
            icon: Truck,
            path: "/dashboard/Fornecedores/Novo_fornecedor",
            links: [],
            roles: ["admin", "gestor"],
        },
        {
            label: "Clientes",
            icon: Users,
            path: "/dashboard/Clientes/Novo_cliente",
            links: [],
            roles: ["admin"],
        },
        {
            label: "Relatórios",
            icon: BarChart2,
            path: "/dashboard/relatorios",
            links: [],
            roles: ["admin", "contablista"],
        },
        {
            label: "Configurações",
            icon: Settings,
            path: "/dashboard/configuracoes",
            links: [],
            roles: ["admin"],
        },
    ];

    const menuItemsFiltrados = menuItems.filter(temPermissao);
    const totalNotificacoes =
        produtosEstoqueBaixo.length + produtosSemEstoque.length;

    if (userLoading) {
        return (
            <div
                className="flex items-center justify-center w-screen h-screen rounded"
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

                {/* Logo e nome da empresa */}
                <div
                    className="flex items-center justify-between gap-3 h-16 px-4 border-b transition-all duration-200"
                    style={{ borderColor: colors.border }}
                >
                    {empresaLogo && !logoError && validImageUrl ? (
                        <Image
                            src={validImageUrl}
                            alt="Logo"
                            width={40}
                            height={40}
                            className="object-contain flex-shrink-0"
                            onError={() => setLogoError(true)}
                            unoptimized={validImageUrl.startsWith("http")}
                        />
                    ) : (
                        <div
                            className="flex items-center justify-center w-10 h-10 text-xs font-bold text-white  flex-shrink-0"
                            style={{ backgroundColor: colors.primary }}
                        >
                            {nomeEmpresa.charAt(0).toUpperCase()}
                        </div>
                    )}
                    {sidebarOpen && (
                        <>
                            <span
                                className="text-sm font-semibold truncate flex-1"
                                style={{ color: colors.text }}
                            >
                                {nomeEmpresa}
                            </span>
                            {isMobile && (
                                <button
                                    onClick={closeSidebar}
                                    className="p-1 transition-transform hover:scale-110 active:scale-95"
                                    style={{ color: colors.text }}
                                    title="Fechar sidebar"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </>
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
                                        // Item com sublinks - apenas botão, nunca Link
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

                                            {/* Chevron para dropdown (apenas quando aberto) */}
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

                                            {/* Indicador visual para menu com sublinks (quando sidebar fechado) */}
                                            {!sidebarOpen && (
                                                <div
                                                    className="absolute right-2 w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    style={{ backgroundColor: colors.primary }}
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        // Item sem sublinks - Link normal
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

                                    {/* Submenu (apenas quando sidebar aberto E item tem links) */}
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
                        {(userRole === "admin" ||
                            userRole === "operador" ||
                            userRole === "gestor") && (
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
                                                    backgroundColor:
                                                        produtosSemEstoque.length > 0
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
                                                {/* Header */}
                                                <div
                                                    className="p-3 border-b md:p-4"
                                                    style={{ borderColor: colors.border }}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <h3
                                                            className="text-sm font-semibold"
                                                            style={{ color: colors.text }}
                                                        >
                                                            Alertas de Estoque
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
                                                    {ultimaAtualizacao && (
                                                        <p
                                                            className="text-xs mt-2"
                                                            style={{ color: colors.textSecondary }}
                                                        >
                                                            Atualizado às{" "}
                                                            {ultimaAtualizacao.toLocaleTimeString("pt-PT")}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Tabs */}
                                                <div
                                                    className="flex border-b"
                                                    style={{ borderColor: colors.border }}
                                                >
                                                    <button
                                                        onClick={() => setAbaAtiva("baixo")}
                                                        className="flex-1 py-2 px-3 text-xs font-medium transition-all hover:scale-105 relative"
                                                        style={{
                                                            color:
                                                                abaAtiva === "baixo"
                                                                    ? colors.text
                                                                    : colors.textSecondary,
                                                        }}
                                                    >
                                                        Baixo ({produtosEstoqueBaixo.length})
                                                        {abaAtiva === "baixo" && (
                                                            <div
                                                                className="absolute bottom-0 left-0 right-0 h-0.5 "
                                                                style={{ backgroundColor: colors.secondary }}
                                                            />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => setAbaAtiva("zero")}
                                                        className="flex-1 py-2 px-3 text-xs font-medium transition-all hover:scale-105 relative"
                                                        style={{
                                                            color:
                                                                abaAtiva === "zero"
                                                                    ? colors.text
                                                                    : colors.textSecondary,
                                                        }}
                                                    >
                                                        Zero ({produtosSemEstoque.length})
                                                        {abaAtiva === "zero" && (
                                                            <div
                                                                className="absolute bottom-0 left-0 right-0 h-0.5 "
                                                                style={{ backgroundColor: colors.secondary }}
                                                            />
                                                        )}
                                                    </button>
                                                </div>

                                                {/* Content */}
                                                <div className="max-h-80 overflow-y-auto">
                                                    {loadingNotificacoes ? (
                                                        <div className="flex items-center justify-center py-6">
                                                            <Loader2
                                                                className="w-4 h-4 animate-spin"
                                                                style={{ color: colors.primary }}
                                                            />
                                                        </div>
                                                    ) : abaAtiva === "baixo" &&
                                                        produtosEstoqueBaixo.length > 0 ? (
                                                        <div
                                                            style={{ borderColor: colors.border }}
                                                            className="divide-y"
                                                        >
                                                            {produtosEstoqueBaixo.map((produto, idx) => (
                                                                <div
                                                                    key={produto.id}
                                                                    className="p-3 transition-all duration-200 hover:translate-x-1"
                                                                    style={{
                                                                        animation: `fadeIn 0.2s ease-out ${idx * 0.03}s forwards`,
                                                                    }}
                                                                >
                                                                    <div className="flex gap-2">
                                                                        <div
                                                                            className="p-1.5 rounded"
                                                                            style={{ backgroundColor: colors.warning }}
                                                                        >
                                                                            <TrendingDown
                                                                                size={14}
                                                                                className="text-white"
                                                                            />
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <p
                                                                                className="text-xs font-medium truncate"
                                                                                style={{ color: colors.text }}
                                                                            >
                                                                                {produto.nome}
                                                                            </p>
                                                                            <p
                                                                                className="text-xs mt-0.5"
                                                                                style={{ color: colors.textSecondary }}
                                                                            >
                                                                                {produto.estoque_atual} /{" "}
                                                                                {produto.estoque_minimo} unidades
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : abaAtiva === "zero" &&
                                                        produtosSemEstoque.length > 0 ? (
                                                        <div
                                                            style={{ borderColor: colors.border }}
                                                            className="divide-y"
                                                        >
                                                            {produtosSemEstoque.map((produto, idx) => (
                                                                <div
                                                                    key={produto.id}
                                                                    className="p-3 transition-all duration-200 hover:translate-x-1"
                                                                    style={{
                                                                        animation: `fadeIn 0.2s ease-out ${idx * 0.03}s forwards`,
                                                                    }}
                                                                >
                                                                    <div className="flex gap-2">
                                                                        <div
                                                                            className="p-1.5 rounded"
                                                                            style={{ backgroundColor: colors.danger }}
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
                                                                                {produto.nome}
                                                                            </p>
                                                                            <p
                                                                                className="text-xs mt-0.5"
                                                                                style={{ color: colors.textSecondary }}
                                                                            >
                                                                                Sem estoque
                                                                            </p>
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
                                                                {loadingNotificacoes
                                                                    ? "Carregando..."
                                                                    : "Sem alertas"}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Footer */}
                                                <div
                                                    className="p-2 border-t text-center"
                                                    style={{ borderColor: colors.border }}
                                                >
                                                    <button
                                                        onClick={buscarNotificacoesEstoque}
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
                            )}

                        {/* User Menu */}
                        <div className="relative" ref={userMenuRef}>
                            <button
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="flex items-center gap-2 pl-2 border-l transition-all duration-200 hover:scale-105 active:scale-95 px-2 py-1"
                                style={{
                                    borderColor: colors.border,
                                    backgroundColor: userMenuOpen ? colors.hover : "transparent",
                                }}
                                title="Menu do usuário"
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
                                        {userRole === "admin"
                                            ? "Admin"
                                            : userRole === "contablista"
                                                ? "Contab."
                                                : userRole === "gestor"
                                                    ? "Gest."
                                                    : "Op."}
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
                                        {/* User Info Section */}
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
                                                        {userRole === "admin"
                                                            ? "Administrador"
                                                            : userRole === "contablista"
                                                                ? "Contabilista"
                                                                : userRole === "gestor"
                                                                    ? "Gestor"
                                                                    : "Operador"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="py-1">
                                            <Link
                                                href="/dashboard/configuracoes"
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
                                                href="/dashboard/configuracoes"
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

                                        {/* Divider */}
                                        <div
                                            style={{ borderColor: colors.border }}
                                            className="border-t"
                                        />

                                        {/* Logout */}
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
                        {/* Header */}
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

                        {/* Error Message */}
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

                        {/* User Info */}
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

                        {/* Actions */}
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

        .hover\:scale-110:hover {
          transform: scale(1.1);
        }

        .hover\:scale-105:hover {
          transform: scale(1.05);
        }

        .active\:scale-95:active {
          transform: scale(0.95);
        }

        .active\:scale-98:active {
          transform: scale(0.98);
        }

        .hover\:translate-x-1:hover {
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

        /* Scrollbar customizado */
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
