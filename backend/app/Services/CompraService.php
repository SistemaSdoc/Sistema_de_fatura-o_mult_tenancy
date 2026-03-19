<?php

namespace App\Services;

use App\Models\Compra;
use App\Models\ItemCompra;
use App\Models\Produto;
use App\Models\SerieFiscal;
use App\Models\LogFiscal;
use App\Models\ApuramentoIva;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class CompraService
{
    /**
     * Criar nova compra com itens, cálculos fiscais, logs e apuramento IVA
     */
    public function criarCompra(array $dados)
    {
        return DB::transaction(function () use ($dados) {

            $userId = Auth::id();

            // 1️⃣ Obter série fiscal ativa
            $serie = SerieFiscal::where('tipo_documento', 'fatura')->where('ativo', 1)->first();
            if (!$serie) {
                throw new \Exception("Nenhuma série fiscal ativa encontrada para faturas.");
            }

            $numero = $serie->numero_atual + 1;
            $numero_documento = $serie->serie . '-' . str_pad($numero, 4, '0', STR_PAD_LEFT);

            // Atualizar número da série
            $serie->update(['numero_atual' => $numero]);

            // 2️⃣ Criar a compra
            $compra = Compra::create([
                'id' => Str::uuid(),
                'user_id' => $userId,
                'fornecedor_id' => $dados['fornecedor_id'],
                'data' => $dados['data'],
                'tipo_documento' => $dados['tipo_documento'] ?? 'fatura',
                'numero_documento' => $numero_documento,
                'data_emissao' => $dados['data_emissao'] ?? $dados['data'],
                'base_tributavel' => 0,
                'total_iva' => 0,
                'total_fatura' => 0,
                'validado_fiscalmente' => $dados['validado_fiscalmente'] ?? true,
                'total' => 0,
            ]);

            $total = 0;
            $total_base_tributavel = 0;
            $total_iva = 0;

            foreach ($dados['itens'] as $item) {

                $produto = Produto::findOrFail($item['produto_id']);

                $subtotal = $item['quantidade'] * $item['preco_compra'];

                // Cálculo fiscal do item
                $base_tributavel_item = round($subtotal / 1.14, 2); // IVA 14%
                $valor_iva_item = round($subtotal - $base_tributavel_item, 2);

                ItemCompra::create([
                    'id' => Str::uuid(),
                    'compra_id' => $compra->id,
                    'produto_id' => $produto->id,
                    'quantidade' => $item['quantidade'],
                    'preco_compra' => $item['preco_compra'],
                    'subtotal' => $subtotal,
                    'base_tributavel' => $base_tributavel_item,
                    'valor_iva' => $valor_iva_item,
                ]);

                // Atualizar stock
                $produto->estoque_atual += $item['quantidade'];
                $produto->save();

                // Acumulando totais
                $total += $subtotal;
                $total_base_tributavel += $base_tributavel_item;
                $total_iva += $valor_iva_item;
            }

            // Atualizar compra com totais fiscais
            $compra->update([
                'total' => $total,
                'base_tributavel' => $total_base_tributavel,
                'total_iva' => $total_iva,
                'total_fatura' => $total,
            ]);

            // 3️⃣ Registrar log fiscal
            LogFiscal::create([
                'id' => Str::uuid(),
                'user_id' => $userId,
                'fatura_id' => $compra->id,
                'acao' => 'criação',
                'status' => 'sucesso',
                'descricao' => "Compra criada com valor total {$total} e número {$numero_documento}",
            ]);

            // 4️⃣ Atualizar apuramento de IVA
            $periodo = Carbon::parse($compra->data)->startOfMonth()->toDateString();
            $apuramento = ApuramentoIva::firstOrCreate(
                ['periodo_inicio' => $periodo],
                ['total_base_tributavel' => 0, 'total_iva' => 0, 'total_faturas' => 0]
            );

            $apuramento->increment('total_base_tributavel', $total_base_tributavel);
            $apuramento->increment('total_iva', $total_iva);
            $apuramento->increment('total_faturas', 1);

            return $compra->load('itens.produto', 'fornecedor', 'user');
        });
    }

    /**
     * Listar todas as compras
     */
    public function listarCompras()
    {
        return Compra::with('itens.produto', 'fornecedor', 'user')
                     ->orderBy('data', 'desc')
                     ->get();
    }

    /**
     * Buscar compra específica
     */
    public function buscarCompra(string $compraId)
    {
        return Compra::with('itens.produto', 'fornecedor', 'user')
                     ->findOrFail($compraId);
    }
}
