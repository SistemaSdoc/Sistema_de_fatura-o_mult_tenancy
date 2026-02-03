<?php

namespace App\Services;

use App\Models\Venda;
use App\Models\Compra;
use App\Models\Fatura;
use App\Models\Produto;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Excel as ExcelFormat;

class RelatoriosService
{
    protected $stockService;

    public function __construct()
    {
        $this->stockService = app(\App\Services\StockService::class);
    }

    /**
     * Relatório detalhado de vendas
     */
    public function relatorioVendas($dataInicio = null, $dataFim = null)
    {
        $query = Venda::with('cliente', 'itens.produto');

        if ($dataInicio) $query->where('data_venda', '>=', $dataInicio);
        if ($dataFim) $query->where('data_venda', '<=', $dataFim);

        return $query->get();
    }

    /**
     * Relatório detalhado de compras
     */
    public function relatorioCompras($dataInicio = null, $dataFim = null)
    {
        $query = Compra::with('fornecedor', 'itens');

        if ($dataInicio) $query->where('data', '>=', $dataInicio);
        if ($dataFim) $query->where('data', '<=', $dataFim);

        return $query->get();
    }

    /**
     * Relatório detalhado de faturação
     */
    public function relatorioFaturacao($dataInicio = null, $dataFim = null)
    {
        $query = Fatura::with('cliente', 'venda', 'itens.produto');

        if ($dataInicio) $query->where('data_emissao', '>=', $dataInicio);
        if ($dataFim) $query->where('data_emissao', '<=', $dataFim);

        return $query->get();
    }

    /**
     * Relatório detalhado de stock
     */
    public function relatorioStock()
    {
        $produtos = Produto::select(
            'id',
            'nome',
            'estoque_atual',
            'estoque_minimo',
            'preco_compra',
            'preco_venda',
            'custo_medio'
        )->get();

        $produtos->each(function($produto){
            $produto->margem_lucro = $produto->preco_compra > 0
                ? (($produto->preco_venda - $produto->preco_compra) / $produto->preco_compra) * 100
                : 0;
            $produto->valor_total_stock = $produto->estoque_atual * ($produto->custo_medio ?? $produto->preco_compra);
            $produto->em_risco = $produto->estoque_atual <= $produto->estoque_minimo;
        });

        return $produtos;
    }

    /**
     * Exportar relatório para Excel
     */
    public function exportarRelatorioExcel(string $tipo, $dataInicio = null, $dataFim = null)
    {
        $arquivo = now()->format('Ymd_His') . "_relatorio_{$tipo}.xlsx";

        return Excel::download(new class($tipo, $dataInicio, $dataFim) implements \Maatwebsite\Excel\Concerns\FromCollection, \Maatwebsite\Excel\Concerns\WithHeadings {

            protected $tipo;
            protected $dataInicio;
            protected $dataFim;

            public function __construct($tipo, $dataInicio, $dataFim)
            {
                $this->tipo = $tipo;
                $this->dataInicio = $dataInicio;
                $this->dataFim = $dataFim;
            }

            public function collection()
            {
                switch($this->tipo){
                    case 'vendas':
                        $query = Venda::with('cliente', 'itens.produto');
                        if($this->dataInicio) $query->where('data_venda', '>=', $this->dataInicio);
                        if($this->dataFim) $query->where('data_venda', '<=', $this->dataFim);
                        return $query->get()->map(function($v){
                            return [
                                'ID' => $v->id,
                                'Cliente' => $v->cliente->nome ?? '---',
                                'Data' => $v->data_venda,
                                'Total' => $v->total,
                                'Itens' => $v->itens->count()
                            ];
                        });
                    case 'compras':
                        $query = Compra::with('fornecedor', 'itens');
                        if($this->dataInicio) $query->where('data', '>=', $this->dataInicio);
                        if($this->dataFim) $query->where('data', '<=', $this->dataFim);
                        return $query->get()->map(function($c){
                            return [
                                'ID' => $c->id,
                                'Fornecedor' => $c->fornecedor->nome ?? '---',
                                'Data' => $c->data,
                                'Total' => $c->total,
                                'Itens' => $c->itens->count()
                            ];
                        });
                    case 'faturacao':
                        $query = Fatura::with('cliente', 'itens.produto');
                        if($this->dataInicio) $query->where('data_emissao', '>=', $this->dataInicio);
                        if($this->dataFim) $query->where('data_emissao', '<=', $this->dataFim);
                        return $query->get()->map(function($f){
                            return [
                                'ID' => $f->id,
                                'Cliente' => $f->cliente->nome ?? '---',
                                'Data Emissão' => $f->data_emissao,
                                'Total Líquido' => $f->total_liquido,
                                'Itens' => $f->itens->count()
                            ];
                        });
                    case 'stock':
                        return Produto::all()->map(function($p){
                            $margem = $p->preco_compra > 0 ? (($p->preco_venda - $p->preco_compra)/$p->preco_compra)*100 : 0;
                            return [
                                'ID' => $p->id,
                                'Nome' => $p->nome,
                                'Stock Atual' => $p->estoque_atual,
                                'Stock Minimo' => $p->estoque_minimo,
                                'Preco Compra' => $p->preco_compra,
                                'Preco Venda' => $p->preco_venda,
                                'Custo Medio' => $p->custo_medio ?? $p->preco_compra,
                                'Margem Lucro (%)' => $margem,
                                'Valor Total Stock' => $p->estoque_atual * ($p->custo_medio ?? $p->preco_compra),
                                'Em Risco' => $p->estoque_atual <= $p->estoque_minimo ? 'SIM' : 'NÃO'
                            ];
                        });
                }
            }

            public function headings(): array
            {
                switch($this->tipo){
                    case 'vendas': return ['ID', 'Cliente', 'Data', 'Total', 'Itens'];
                    case 'compras': return ['ID', 'Fornecedor', 'Data', 'Total', 'Itens'];
                    case 'faturacao': return ['ID', 'Cliente', 'Data Emissão', 'Total Líquido', 'Itens'];
                    case 'stock': return ['ID', 'Nome', 'Stock Atual', 'Stock Minimo', 'Preco Compra', 'Preco Venda', 'Custo Medio', 'Margem Lucro (%)', 'Valor Total Stock', 'Em Risco'];
                }
                return [];
            }
        }, $arquivo, ExcelFormat::XLSX);
    }

    public function dashboard()
{
    return [
        'total_vendas' => Venda::sum('total'),
        'total_compras' => Compra::sum('total'),
        'total_faturado' => Fatura::sum('total_liquido'),
        'stock_total' => Produto::sum(DB::raw('estoque_atual * preco_compra')),
        'produtos_estoque_baixo' => Produto::whereColumn('estoque_atual', '<=', 'estoque_minimo')->count(),
    ];
}

}
