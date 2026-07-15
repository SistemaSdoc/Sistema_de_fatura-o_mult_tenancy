'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import {
  Copy,
  CheckCircle,
  ArrowLeft,
  Loader2,
  XCircle,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { pagamentoService } from '@/services/pagamentosplanos';

const IBAN_EMPRESA = process.env.NEXT_PUBLIC_IBAN_EMPRESA || '';
const NOME_BENEFICIARIO = process.env.NEXT_PUBLIC_NOME_BENEFICIARIO || '';

type PagamentoEstado = 'pendente' | 'em_analise' | 'pago' | 'rejeitado' | 'desconhecido';

// Componente que usa useSearchParams
function PagamentoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const referencia = searchParams.get('referencia') || '';
  const valor = searchParams.get('valor') || '0';
  const metodo = searchParams.get('metodo') || 'transferencia';
  const pagamentoId = searchParams.get('pagamento') || '';

  const [estado, setEstado] = useState<PagamentoEstado>('desconhecido');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const processedRef = useRef(false);

  const fetchStatus = useCallback(async () => {
    if (!pagamentoId) return;

    try {
      const response = await pagamentoService.mostrar(pagamentoId);
      const data = response.pagamento;
      if (!data) {
        setError('Pagamento não encontrado.');
        setIsLoading(false);
        return;
      }

      const novoEstado = data.status as PagamentoEstado;
      setEstado(novoEstado);
      setMotivoRejeicao(data.motivo_rejeicao || null);

      if (novoEstado === 'pago' && !processedRef.current) {
        processedRef.current = true;
        clearPolling();
        setIsLoading(false);
        toast.success('Pagamento confirmado! A sua assinatura está ativa.');
        setTimeout(() => router.push('/dashboard'), 1500);
        return;
      }

      if (novoEstado === 'rejeitado') {
        clearPolling();
        setIsLoading(false);
        toast.error('Pagamento rejeitado. Verifique o motivo abaixo.');
        return;
      }

      if (novoEstado === 'em_analise') {
        setIsLoading(false);
      }

      if (novoEstado === 'pendente') {
        setIsLoading(false);
      }

      setRetryCount(0);
    } catch (err) {
      console.error('Erro ao buscar estado:', err);
      setRetryCount(prev => prev + 1);
      if (retryCount >= 4) {
        clearPolling();
        setIsLoading(false);
        setError('Não foi possível contactar o servidor. Verifique a sua ligação ou recarregue a página.');
      } else {
        toast.error('Falha ao verificar estado. A tentar novamente...');
      }
    }
  }, [pagamentoId, router, retryCount]);

  const clearPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!pagamentoId) {
      setError('ID do pagamento não fornecido.');
      setIsLoading(false);
      return;
    }

    fetchStatus();

    intervalRef.current = setInterval(fetchStatus, 15000);

    return () => clearPolling();
  }, [pagamentoId, fetchStatus]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Selecione um ficheiro primeiro.');
      return;
    }
    if (!pagamentoId) {
      toast.error('ID do pagamento não encontrado.');
      return;
    }

    setUploading(true);
    try {
      await pagamentoService.enviarComprovativo(pagamentoId, file);
      toast.success('Comprovativo enviado com sucesso! Aguarde a análise.');
      await fetchStatus();
      setFile(null);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (input) input.value = '';
    } catch (err) {
      console.error('Erro no upload:', err);
      toast.error('Falha ao enviar comprovativo. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const renderConteudo = () => {
    if (error) {
      return (
        <div className="text-center py-8">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Erro</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Recarregar página
          </Button>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">A verificar estado do pagamento...</p>
        </div>
      );
    }

    switch (estado) {
      case 'pago':
        return (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Pagamento confirmado!</h3>
            <p className="text-muted-foreground">A sua assinatura está ativa. A redirecionar...</p>
          </div>
        );

      case 'rejeitado':
        return (
          <div className="space-y-6">
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <h4 className="font-semibold text-destructive">Pagamento rejeitado</h4>
                  <p className="text-sm text-muted-foreground">
                    {motivoRejeicao || 'Não foi possível validar o comprovativo enviado.'}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-sm">
                Pode reenviar um novo comprovativo com as informações correctas.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A enviar...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Reenviar comprovativo
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        );

      case 'em_analise':
        return (
          <div className="text-center py-8 space-y-4">
            <div className="flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
              <h3 className="text-lg font-semibold mt-4">Comprovativo em análise</h3>
              <p className="text-muted-foreground max-w-md">
                O administrador está a verificar o seu comprovativo. Este processo pode demorar até 24 horas úteis.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Assim que for aprovado, a sua assinatura será activada e será redireccionado.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => fetchStatus()}
              className="mt-4"
            >
              Verificar novamente
            </Button>
          </div>
        );

      case 'pendente':
      default:
        return (
          <div className="space-y-6">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Valor a pagar:</span>
                <span className="text-2xl font-bold text-primary">
                  {Number(valor).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-muted-foreground">Método:</span>
                <span className="capitalize font-semibold">
                  {metodo === 'transferencia' ? 'Transferência bancária' : metodo.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-lg border">
              <h3 className="font-semibold mb-2">Instruções:</h3>
              {metodo === 'transferencia' && (
                <div className="space-y-2 text-sm">
                  <p>Efectue a transferência com os seguintes dados:</p>
                  <div className="p-3 bg-muted rounded-md space-y-1">
                    <div className="flex justify-between items-center">
                      <span>Beneficiário:</span>
                      <span className="font-semibold">{NOME_BENEFICIARIO}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>IBAN:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs sm:text-sm">{IBAN_EMPRESA}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(IBAN_EMPRESA)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Referência:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{referencia}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(referencia)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2">
                    É crucial que a referência <span className="font-bold">{referencia}</span> seja incluída na descrição da transferência.
                  </p>
                </div>
              )}
              {metodo === 'multicaixa' && (
                <p className="text-sm">Dirija-se a um ATM ou use o Multicaixa Express e seleccione "Pagamento por referência".</p>
              )}
              {metodo === 'cartao_credito' && (
                <p className="text-sm">O pagamento com cartão é processado em minutos. Se não for actualizado, contacte o suporte.</p>
              )}
            </div>

            <div className="p-4 border rounded-lg bg-card">
              <h3 className="font-semibold mb-3">Envie o comprovativo de pagamento</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Após efectuar a transferência, faça upload do comprovativo (imagem ou PDF) para agilizar a confirmação.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A enviar...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Enviar comprovativo
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="text-xs text-center text-muted-foreground">
              <p>O comprovativo será analisado pelo administrador. A activação pode demorar até 24 horas úteis.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 mt-6 lg:mt-10">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            {estado === 'pago' && <CheckCircle className="w-8 h-8 text-green-500" />}
            {estado === 'em_analise' && <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />}
            {estado === 'rejeitado' && <XCircle className="w-8 h-8 text-destructive" />}
            {(estado === 'pendente' || estado === 'desconhecido') && (
              <CheckCircle className="w-8 h-8 text-yellow-500" />
            )}
            <div>
              <CardTitle className="text-xl">
                {estado === 'pendente' && 'Aguardando Pagamento'}
                {estado === 'em_analise' && 'Comprovativo em Análise'}
                {estado === 'pago' && 'Pagamento Confirmado'}
                {estado === 'rejeitado' && 'Pagamento Rejeitado'}
                {estado === 'desconhecido' && 'Estado do Pagamento'}
              </CardTitle>
              <CardDescription>
                {estado === 'pendente' && 'Siga as instruções para concluir o pagamento.'}
                {estado === 'em_analise' && 'Aguarde a validação do administrador.'}
                {estado === 'pago' && 'A sua assinatura está activa.'}
                {estado === 'rejeitado' && 'Reenvie um comprovativo válido.'}
                {estado === 'desconhecido' && 'A carregar informações...'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>{renderConteudo()}</CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 border-t pt-6">
          {estado === 'pendente' && (
            <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Actualizar página
            </Button>
          )}
          {estado === 'em_analise' && (
            <Button variant="outline" className="w-full" onClick={() => fetchStatus()}>
              <Loader2 className="w-4 h-4 mr-2" />
              Verificar novamente
            </Button>
          )}
          {estado === 'rejeitado' && (
            <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao início
            </Button>
          )}
          {estado === 'pago' && (
            <Button className="w-full" onClick={() => router.push('/dashboard')}>
              Ir para o Dashboard
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

// Página principal com Suspense
export default function AguardandoPagamentoPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <PagamentoContent />
    </Suspense>
  );
}