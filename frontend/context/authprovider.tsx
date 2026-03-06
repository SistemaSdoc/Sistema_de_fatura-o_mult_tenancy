'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/axios";
import { toast } from "sonner";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isOperador: boolean;
  isContablista: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextData | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {

  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isOperador, setIsOperador] = useState(false);
  const [isContablista, setIsContablista] = useState(false);

  // 🔎 Verifica se já existe sessão
  useEffect(() => {
    const checkUser = async () => {
      try {
        await api.get("/sanctum/csrf-cookie"); // garante token CSRF
        const { data } = await api.get<{ user: User }>("/me");
        setUser(data.user || null);

        // Roles
        setIsAdmin(data.user?.role === "admin");
        setIsOperador(data.user?.role === "operador");
        setIsContablista(data.user?.role === "contablista");

      } catch {
        setUser(null);
        setIsAdmin(false);
        setIsOperador(false);
        setIsContablista(false);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  // 🔑 Login
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      await api.get("/sanctum/csrf-cookie");
      await api.post("/login", { email, password });

      const { data } = await api.get<{ user: User }>("/me");
      if (!data.user) throw new Error("Usuário não autenticado");

      setUser(data.user);

      // Roles
      setIsAdmin(data.user.role === "admin");
      setIsOperador(data.user.role === "operador");
      setIsContablista(data.user.role === "contablista");

      return true;

    } catch (err) {
      setUser(null);
      setIsAdmin(false);
      setIsOperador(false);
      setIsContablista(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔒 Logout
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await api.post("/logout");

      setUser(null);
      setIsAdmin(false);
      setIsOperador(false);
      setIsContablista(false);

      toast.success("Logout realizado com sucesso");
      router.replace("/login");
      
      

      return { success: true } ;
    } catch (err) {
      const message = (err as Error).message || "Erro ao fazer logout";
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isOperador, isContablista, login, logout }}>
      {children}  
    </AuthContext.Provider>
  );
}

// 🔗 Hook para usar o AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro do AuthProvider");
  return context;
}