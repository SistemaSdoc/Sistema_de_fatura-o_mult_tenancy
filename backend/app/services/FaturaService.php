<?php

namespace App\Services;

use App\Models\Fatura;
use App\Models\ItemFatura;
use App\Models\Venda;
use App\Models\Empresa;
use App\Models\SerieFiscal;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class FaturaService
{
    /**
     * Gerar fatura a partir dos dados do frontend
     */
    public function gerarFatura(array $dados)
    {
        Log::info('Itens recebidos do frontend:', $dados['itens'] ?? []);

        return DB::transaction(function () use ($dados) {

            $empresa = Empresa::firstOrFail();
            $aplicaIva = $empresa->sujeito_iva;
            $regime = $empresa->regime_fiscal;

            // =================== SÉRIE FISCAL ===================
            $tipo = $dados['tipo_documento'] ?? 'FT';
            $serieFiscal = SerieFiscal::where('tipo_documento', $tipo)
                                      ->where('ativa', true)
                                      ->where('ano', now()->year)
                                      ->lockForUpdate()
                                      ->first();

            if (!$serieFiscal) {
                throw new \Exception("Nenhuma série fiscal ativa encontrada para {$tipo}.");
            }

            $numero = $serieFiscal->ultimo_numero + 1;
            $numeroDocumento = $serieFiscal->serie . '-' . str_pad($numero, 5, '0', STR_PAD_LEFT);
            $serieFiscal->update(['ultimo_numero' => $numero]);

            $dataVencimento = now()->addDays(30)->toDateString();

            $totalBase = 0;
            $totalIva = 0;
            $totalRetencao = 0;

            // =================== CRIAR FATURA ===================
            $fatura = Fatura::create([
                'id' => Str::uuid(),
                'user_id' => Auth::id(),
                'venda_id' => $dados['venda_id'] ?? null,
                'cliente_id' => $dados['cliente_id'],
                'serie' => $serieFiscal->serie,
                'numero' => $numero,
                'numero_documento' => $numeroDocumento,
                'tipo_documento' => $tipo,
                'data_emissao' => now()->toDateString(),
                'hora_emissao' => now()->toTimeString(),
                'data_vencimento' => $dataVencimento,
                'base_tributavel' => 0,
                'total_iva' => 0,
                'total_retencao' => 0,
                'total_liquido' => 0,
                'estado' => 'emitido',
                'hash_fiscal' => null,
            ]);

            // =================== ITENS ===================
            foreach ($dados['itens'] as $item) {

                $produto = \App\Models\Produto::findOrFail($item['produto_id']);

                $quantidade = (int) ($item['quantidade'] ?? 1);
                $preco_venda = (float) ($item['preco_venda'] ?? 0);
                $desconto = (float) ($item['desconto'] ?? 0);

                // Garantir base tributável
                $baseTributavel = isset($item['base_tributavel'])
                    ? (float) $item['base_tributavel']
                    : max(($quantidade * $preco_venda - $desconto), 0);

                // Garantir IVA e retenção
                $taxaIva = ($aplicaIva && $regime === 'geral') ? (float) ($produto->taxa_iva ?? 14) : 0;
                $valorIva = isset($item['valor_iva']) ? (float) $item['valor_iva'] : round(($baseTributavel * $taxaIva) / 100, 2);
                $valorRetencao = isset($item['valor_retencao'])
                    ? (float) $item['valor_retencao']
                    : (($produto->tipo === 'servico') ? round($baseTributavel * 0.1, 2) : 0);

                $totalLinha = isset($item['subtotal'])
                    ? (float) $item['subtotal']
                    : round($baseTributavel + $valorIva - $valorRetencao, 2);

                // ================= LOGS =================
                Log::info('Criando ItemFatura:', [
                    'produto_id' => $produto->id,
                    'quantidade' => $quantidade,
                    'preco_unitario' => $preco_venda,
                    'base_tributavel' => $baseTributavel,
                    'valor_iva' => $valorIva,
                    'valor_retencao' => $valorRetencao,
                    'subtotal' => $totalLinha,
                ]);

                // ================= CREATE =================
                ItemFatura::create([
                    'id' => Str::uuid(),
                    'fatura_id' => $fatura->id,
                    'produto_id' => $produto->id,
                    'descricao' => $produto->nome,
                    'quantidade' => $quantidade,
                    'preco_unitario' => $preco_venda,
                    'base_tributavel' => $baseTributavel,
                    'taxa_iva' => $taxaIva,
                    'valor_iva' => $valorIva,
                    'valor_retencao' => $valorRetencao,
                    'desconto' => $desconto,
                    'total_linha' => $totalLinha,
                ]);

                $totalBase += $baseTributavel;
                $totalIva += $valorIva;
                $totalRetencao += $valorRetencao;
            }

            $totalLiquido = round($totalBase + $totalIva - $totalRetencao, 2);

            // ================= HASH FISCAL =================
            $hash = sha1(
                $fatura->numero_documento .
                $fatura->data_emissao .
                number_format($totalLiquido, 2, '.', '')
            );

            $fatura->update([
                'base_tributavel' => $totalBase,
                'total_iva' => $totalIva,
                'total_retencao' => $totalRetencao,
                'total_liquido' => $totalLiquido,
                'hash_fiscal' => $hash,
            ]);

            Log::info('Fatura gerada com sucesso:', [
                'fatura_id' => $fatura->id,
                'total_liquido' => $totalLiquido,
                'itens' => $dados['itens'],
            ]);

            return $fatura->load('itens.produto', 'cliente');
        });
    }

    // =================== CONSULTAS ===================
    public function listarFaturas()
    {
        return Fatura::with('cliente', 'venda', 'itens.produto')
            ->orderBy('data_emissao', 'desc')
            ->get();
    }

    public function buscarFatura(string $faturaId)
    {
        return Fatura::with('cliente', 'venda', 'itens.produto')
            ->findOrFail($faturaId);
    }
}
