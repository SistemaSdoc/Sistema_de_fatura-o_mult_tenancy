'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { pagamentoService } from '@/services/pagamentosplanos';

export default function VerComprovativoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [pagamento, setPagamento] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await pagamentoService.mostrar(id);
        setPagamento(response.pagamento);
      } catch (error) {
        toast.error('Erro ao carregar pagamento');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleAprovar = async () => {
    try {
      await pagamentoService.confirmar(id);
      toast.success('Pagamento aprovado!');
      router.push('/landlord/pagamentos/pendentes');
    } catch (error) {
      toast.error('Erro ao aprovar');
    }
  };

  const handleRejeitar = async () => {
    const motivo = prompt('Motivo da rejeição:');
    if (motivo === null) return;
    try {
      await pagamentoService.rejeitar(id, motivo);
      toast.success('Pagamento rejeitado.');
      router.push('/landlord/pagamentos/pendentes');
    } catch (error) {
      toast.error('Erro ao rejeitar');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!pagamento) {
    return <p className="text-center text-destructive">Pagamento não encontrado.</p>;
  }

  // ✅ Construir URL correta usando variável de ambiente
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.198:8000';
  const comprovativoUrl = pagamento.comprovativo_path
    ? `${apiBase}/storage/${pagamento.comprovativo_path}`
    : null;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Detalhe do Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <p><strong>ID:</strong> {pagamento.id}</p>
            <p><strong>Empresa:</strong> {pagamento.empresa_id}</p>
            <p><strong>Valor:</strong> {Number(pagamento.valor).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}</p>
            <p><strong>Status:</strong> <span className="font-semibold text-yellow-600">{pagamento.status}</span></p>
            <p><strong>Data:</strong> {new Date(pagamento.created_at).toLocaleString()}</p>
          </div>

          {comprovativoUrl ? (
            <div className="border rounded-lg p-4 bg-muted/20">
              <p className="font-medium mb-2">Comprovativo:</p>
              {comprovativoUrl.endsWith('.pdf') ? (
                <iframe src={comprovativoUrl} className="w-full h-[500px] border rounded" />
              ) : (
                <img src={comprovativoUrl} alt="Comprovativo" className="max-w-full max-h-[500px] object-contain" />
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum comprovativo enviado.</p>
          )}

          <div className="flex gap-3 mt-6 flex-wrap">
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleAprovar}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Aprovar Pagamento
            </Button>
            <Button variant="destructive" onClick={handleRejeitar}>
              <XCircle className="w-4 h-4 mr-2" />
              Rejeitar Pagamento
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}