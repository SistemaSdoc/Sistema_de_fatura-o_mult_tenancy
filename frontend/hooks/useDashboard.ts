import { useEffect, useState } from "react";
import api from "@/services/axios";
import { DashboardData } from "@/services/vendas";

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await api.get<DashboardData>("/api/dashboard");
        setData(response.data);
      } catch (e) {
        console.error(e);
        setError("Erro ao carregar dashboard");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  return { data, loading, error };
}
