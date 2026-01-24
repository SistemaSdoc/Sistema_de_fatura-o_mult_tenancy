'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/authprovider";
import api from "@/services/axios";

interface User {
  id: string;
  name: string;
  email: string;
  role?: string | null;
}

interface DashboardData {
  user: User;
  faturasEmitidas: number;
  clientesAtivos: number;
  receitaMensal: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user: authUser, loading } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 🔐 Proteção simples
  useEffect(() => {
    if (!loading && !authUser) {
      router.push("/login");
    }
  }, [loading, authUser, router]);

  // 📡 Fetch do dashboard
  useEffect(() => {
    if (!authUser) return;

    const fetchData = async () => {
      try {
        const res = await api.get<DashboardData>("/api/dashboard");
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar dashboard");
      }
    };

    fetchData();
  }, [authUser]);

  if (loading || !authUser) {
    return <p style={{ padding: 20 }}>Carregando usuário...</p>;
  }

  if (error) {
    return <p style={{ padding: 20, color: "red" }}>{error}</p>;
  }

  if (!data) {
    return <p style={{ padding: 20 }}>Carregando dados...</p>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Dashboard</h1>

      <p>Bem-vindo, <strong>{data.user.name}</strong>!</p>

      <ul>
        <li>Faturas Emitidas: {data.faturasEmitidas}</li>
        <li>Clientes Ativos: {data.clientesAtivos}</li>
        <li>Receita Mensal: AOA {data.receitaMensal}</li>
      </ul>
    </div>
  );
}
