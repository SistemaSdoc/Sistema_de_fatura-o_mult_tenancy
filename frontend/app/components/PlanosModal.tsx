'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useThemeColors } from '@/context/ThemeContext';
import { planosService } from '@/services/planos';

interface PlanosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FEATURES_VISIVEIS = 5;

export default function PlanosModal({ isOpen, onClose }: PlanosModalProps) {
  const colors = useThemeColors();

  const [planos, setPlanos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<'mensal' | 'trimestral' | 'semestral' | 'anual'>('mensal');
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';

    const fetchPlanos = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await planosService.listarAtivos();
        const planosFormatados = data.map((plano: any) => ({
          id: plano.id,
          name: plano.nome,
          valor_mensal: plano.valor_mensal,
          valor_trimestral: plano.valor_trimestral || null,
          valor_semestral: plano.valor_semestral || null,
          valor_anual: plano.valor_anual || null,
          features: plano.features.map((f: any) => {
            let featureText = f.nome;
            if (f.pivot?.quantidade && f.pivot?.quantidade > 0) {
              const qtd = f.pivot.quantidade === 0 ? 'Ilimitados' : f.pivot.quantidade;
              const unidade = f.pivot.unidade || '';
              featureText = `${qtd} ${unidade} ${f.nome}`.trim();
            }
            return featureText;
          }),
        }));
        setPlanos(planosFormatados);
      } catch (err) {
        console.error('Erro ao buscar planos:', err);
        setError('Não foi possível carregar os planos.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlanos();

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getPreco = (plan: any) => {
    switch (periodo) {
      case 'trimestral':
        return plan.valor_trimestral ?? plan.valor_mensal * 3;
      case 'semestral':
        return plan.valor_semestral ?? plan.valor_mensal * 6;
      case 'anual':
        return plan.valor_anual ?? plan.valor_mensal * 12;
      default:
        return plan.valor_mensal;
    }
  };

  const getIntervalo = () => {
    switch (periodo) {
      case 'trimestral': return '/trimestre';
      case 'semestral': return '/semestre';
      case 'anual': return '/ano';
      default: return '/mês';
    }
  };

  const handleAssinar = (plan: any) => {
    const isGratis = plan.name === 'Experimental' || plan.name === 'Grátis' || plan.valor_mensal === 0;
    const href = isGratis
      ? `/register?plano_id=${plan.id}`
      : `/checkout?plano_id=${plan.id}&periodo=${periodo}`;
    window.location.href = href;
  };

  const toggleExpandir = (id: string) => {
    setExpandido((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Conteúdo do Modal */}
      <div
        className="relative w-full max-w-5xl max-h-[92vh] sm:max-h-[88vh] rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        style={{ backgroundColor: colors.card }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b sticky top-0 z-10 shrink-0"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <h2 className="text-base sm:text-xl font-extrabold leading-tight" style={{ color: colors.text }}>
            Escolha o Plano Certo para Si
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-full transition hover:opacity-70 shrink-0"
            style={{ color: colors.textSecondary }}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo com scroll */}
        <div className="overflow-y-auto overscroll-contain px-3 sm:px-6 py-4 sm:py-6">
          {/* Seletor de período */}
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-5 sm:mb-6">
            {[
              { label: 'Mensal', value: 'mensal' },
              { label: 'Trimestral', value: 'trimestral' },
              { label: 'Semestral', value: 'semestral' },
              { label: 'Anual', value: 'anual' },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriodo(p.value as any)}
                className="px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition duration-200"
                style={{
                  backgroundColor: periodo === p.value ? colors.primary : colors.hover,
                  color: periodo === p.value ? '#fff' : colors.textSecondary,
                  border: `1px solid ${periodo === p.value ? colors.primary : colors.border}`,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-16">
              <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: colors.primary }} />
              <p className="mt-4" style={{ color: colors.textSecondary }}>Carregando planos...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-red-500">{error}</p>
            </div>
          ) : planos.length === 0 ? (
            <div className="text-center py-16" style={{ color: colors.textSecondary }}>
              Nenhum plano disponível no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-start">
              {planos.map((plan) => {
                const preco = getPreco(plan);
                const precoFormatado = `${Number(preco).toLocaleString('pt-AO')} KZ`;
                const isGratis = plan.name === 'Experimental' || plan.name === 'Grátis' || plan.valor_mensal === 0;
                const estaExpandido = !!expandido[plan.id];
                const featuresVisiveis = estaExpandido
                  ? plan.features
                  : plan.features.slice(0, FEATURES_VISIVEIS);
                const temMais = plan.features.length > FEATURES_VISIVEIS;

                return (
                  <div
                    key={plan.id}
                    className="flex flex-col p-4 sm:p-5 rounded-lg sm:rounded-xl border transition duration-300 hover:shadow-lg"
                    style={{ backgroundColor: colors.background, borderColor: colors.border }}
                  >
                    <h3 className="text-base sm:text-lg font-bold mb-1.5" style={{ color: colors.text }}>
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline mb-3 sm:mb-4">
                      <span className="text-2xl font-extrabold" style={{ color: colors.text }}>
                        {precoFormatado}
                      </span>
                      <span className="text-xs font-medium ml-1" style={{ color: colors.textSecondary }}>
                        {getIntervalo()}
                      </span>
                    </div>

                    <ul className="space-y-1.5 mb-2">
                      {featuresVisiveis.map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5 text-xs sm:text-sm">
                          <CheckCircle2 size={14} className="shrink-0 mt-0.5" style={{ color: colors.secondary }} />
                          <span style={{ color: colors.textSecondary }}>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {temMais && (
                      <button
                        onClick={() => toggleExpandir(plan.id)}
                        className="flex items-center gap-1 text-xs font-medium mb-4 self-start"
                        style={{ color: colors.primary }}
                      >
                        {estaExpandido ? (
                          <>Ver menos <ChevronUp size={14} /></>
                        ) : (
                          <>Ver mais {plan.features.length - FEATURES_VISIVEIS} recursos <ChevronDown size={14} /></>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => handleAssinar(plan)}
                      className="mt-auto px-4 py-2 sm:py-2.5 rounded-full text-sm font-semibold transition duration-300 hover:scale-[1.02]"
                      style={{
                        backgroundColor: colors.primary,
                        color: 'white',
                      }}
                    >
                      {isGratis ? 'Experimente Agora' : 'Assinar'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}