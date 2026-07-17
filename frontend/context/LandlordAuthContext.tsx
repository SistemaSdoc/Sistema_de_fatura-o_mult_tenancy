// contexts/LandlordAuthContext.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { landAuthApi, landlordApi } from "@/services/axios";
import { usePathname, useRouter } from "next/navigation";
import { clearTenant } from "@/services/axios";

interface LandlordUser {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "suporte";
}

interface LandlordAuthContextType {
  user: LandlordUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const LandlordAuthContext = createContext({} as LandlordAuthContextType);

export const useLandlordAuth = () => useContext(LandlordAuthContext);

export function LandlordAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LandlordUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchMe = async () => {
    try {
      const response = await landAuthApi.me();
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  useEffect(() => {
    const publicPaths = ["/landlord/login", "/landlord/register"];
    if (loading) return;
    if (!user && !publicPaths.includes(pathname)) {
      router.replace("/landlord/login");
    }
  }, [loading, pathname, router, user]);

  const login = async (email: string, password: string) => {
    await landAuthApi.getCsrf(); // sempre antes do login
    const response = await landAuthApi.login(email, password);
    setUser(response.data.user);
    router.push("/landlord/dashboard/empresas"); // redireciona para lista/criação de empresas
  };

  const logout = async () => {
    await landAuthApi.logout();
    setUser(null);
    clearTenant();
    router.push("/landlord/login");
  };

  return (
    <LandlordAuthContext.Provider value={{ user, loading, login, logout, refreshUser: fetchMe }}>{children}</LandlordAuthContext.Provider>
  );
}
