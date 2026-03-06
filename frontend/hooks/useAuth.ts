// src/hooks/useAuth.ts

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/axios";
import { toast } from "sonner";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const useAuth = () => {

  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isOperador, setIsOperador] = useState(false);
  const [isContablista, setIsContablista] = useState(false);

  // buscar usuário logado
  useEffect(() => {

    const fetchUser = async () => {

      try {

        const { data } = await api.get("/me");

        setUser(data.user || null);

        setIsAdmin(data.user?.role === "admin");
        setIsOperador(data.user?.role === "operador");
        setIsContablista(data.user?.role === "contablista");

      } catch {

        setUser(null);

      } finally {

        setLoading(false);

      }

    };

    fetchUser();

  }, []);

  // logout correto
  const logout = async () => {

    setLoading(true);

    try {

      await api.post("/logout");

      setUser(null);

      setIsAdmin(false);
      setIsOperador(false);
      setIsContablista(false);

      toast.success("Logout realizado com sucesso");

      router.replace("/login");

      return { success: true };

    } catch (err) {

      const message = (err as Error).message;

      toast.error(message);

      return { success: false };

    } finally {

      setLoading(false);

    }

  };

  return {
    user,
    loading,
    logout,
    isAdmin,
    isOperador,
    isContablista,
  };

};