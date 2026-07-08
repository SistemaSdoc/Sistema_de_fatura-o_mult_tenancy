'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { pagamentoService, Pagamento } from '@/services/pagamentosplanos';

// Usamos o tipo Pagamento do serviço, com comprovativo_path opcional
type PagamentoPendente = Pagamento & {
  empresa?: { nome: string };
  plano?: { nome: string };
};

export default function PagamentosPendentesPage() {
  const router = useRouter();
  const [pagamentos, setPagamentos] = useState<PagamentoPendente[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPendentes = async () => {
    try {
      // ✅ Usar o serviço existente, que chama /api/pagamentos-plano?status=em_analise
      const response = await pagamentoService.listar({ status: 'em_analise' });
      setPagamentos(response.pagamentos as PagamentoPendente[]);
    } catch (error) {
      console.error('Erro ao carregar pendentes:', error);
      toast.error('Erro ao carregar pagamentos pendentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendentes();
  }, []);

  const handleAprovar = async (id: string) => {
    try {
      await pagamentoService.confirmar(id);
      toast.success('Pagamento aprovado com sucesso!');
      fetchPendentes(); // recarrega
    } catch (error) {
      toast.error('Erro ao aprovar pagamento');
    }
  };

  const handleRejeitar = async (id: string) => {
    const motivo = prompt('Motivo da rejeição:');
    if (motivo === null) return;
    try {
      await pagamentoService.rejeitar(id, motivo);
      toast.success('Pagamento rejeitado.');
      fetchPendentes();
    } catch (error) {
      toast.error('Erro ao rejeitar pagamento');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Pagamentos Pendentes</h1>
      {pagamentos.length === 0 ? (
        <p className="text-muted-foreground">Nenhum pagamento aguardando análise.</p>
      ) : (
        <div className="space-y-4">
          {pagamentos.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="text-lg flex justify-between flex-wrap gap-2">
                  <span>Empresa: {p.empresa?.nome || p.empresa_id}</span>
                  <span className="text-primary font-bold">
                    {Number(p.valor).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>Plano: {p.plano?.nome || p.plano_id}</p>
                <p className="text-sm text-muted-foreground">
                  Enviado em: {new Date(p.created_at).toLocaleString()}
                </p>
                <div className="flex gap-3 mt-4 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/landlord/pagamentos/${p.id}`)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver comprovativo
                  </Button>
                  <Button
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleAprovar(p.id)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprovar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleRejeitar(p.id)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rejeitar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}