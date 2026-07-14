<?php

namespace App\Imports;

use App\Models\Shared\Produto as SharedProduto;
use App\Models\Tenant\Produto as TenantProduto;
use App\Services\ProdutoService;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Illuminate\Support\Facades\Log;

/**
 * Lê a folha "Serviços" do template FaturaJa_Template_Importacao.xlsx.
 * Ver ProdutosSheetImport para a explicação da abordagem sem WithHeadingRow.
 */
class ServicosSheetImport implements ToCollection
{
    public array $sucesso = [];
    public array $erros = [];
    public array $ignorados = []; // linhas puladas por já existirem (não são erro)

    private string $modo;

    private const TAXAS_VALIDAS = [0, 2, 5, 6.5, 10, 15];
    private const CODIGOS_ISENCAO_VALIDOS = ['M00', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M99'];
    private const UNIDADES_VALIDAS = ['hora', 'dia', 'semana', 'mes'];

    /** Linha (1-indexed) onde está o cabeçalho real da tabela nesta folha. */
    private const HEADING_ROW = 12;

    public function __construct()
    {
        $empresa = app('current.empresa');
        $this->modo = session('tenant_modo', $empresa?->modo ?? 'colectivo');
    }

    public function collection(Collection $rows)
    {
        $headerIndex = self::HEADING_ROW - 1; // 0-based dentro de $rows
        $headerRow = $rows->get($headerIndex, collect());

        $map = [];
        foreach ($headerRow as $colIndex => $label) {
            $key = $this->normalizeHeader($label);
            if ($key !== null) {
                $map[$key] = $colIndex;
            }
        }

        $service = app(ProdutoService::class);

        foreach ($rows->slice($headerIndex + 1) as $offset => $row) {
            $linhaExcel = self::HEADING_ROW + 1 + $offset;

            $get = fn (string $key) => isset($map[$key]) ? ($row[$map[$key]] ?? null) : null;

            $nome = $get('nome');
            $tipo = $get('tipo');

            if (empty($nome) || empty($tipo)) {
                continue;
            }

            if (strtolower(trim((string) $tipo)) !== 'servico') {
                continue;
            }

            try {
                $dados = $this->mapearLinha($get);

                if ($this->jaExiste($dados)) {
                    $this->ignorados[] = [
                        'linha' => $linhaExcel,
                        'nome' => $dados['nome'],
                        'motivo' => "Já existe um serviço com o nome '{$dados['nome']}' — linha ignorada.",
                    ];
                    continue;
                }

                $produto = $service->criarProduto($dados);

                $this->sucesso[] = [
                    'linha' => $linhaExcel,
                    'servico_id' => $produto->id,
                    'nome' => $produto->nome,
                ];
            } catch (\Throwable $e) {
                Log::warning('[ServicosSheetImport] Erro ao importar linha', [
                    'linha' => $linhaExcel,
                    'erro' => $e->getMessage(),
                ]);

                $this->erros[] = [
                    'linha' => $linhaExcel,
                    'nome' => $nome ?: '(sem nome)',
                    'erro' => $e->getMessage(),
                ];
            }
        }
    }

    private function mapearLinha(callable $get): array
    {
        $taxaRetencao = $get('taxa_retencao');
        $taxaRetencao = ($taxaRetencao !== null && in_array((float) $taxaRetencao, self::TAXAS_VALIDAS, true))
            ? (float) $taxaRetencao
            : null; // deixa o ProdutoService aplicar o default de 6.5%

        $codigoIsencao = strtoupper(trim((string) $get('codigo_isencao')));
        $codigoIsencao = in_array($codigoIsencao, self::CODIGOS_ISENCAO_VALIDOS, true) ? $codigoIsencao : null;

        $unidade = strtolower(trim((string) $get('unidade_medida')));
        if (!in_array($unidade, self::UNIDADES_VALIDAS, true)) {
            throw new \Exception("unidade_medida inválida: '{$get('unidade_medida')}'");
        }

        $sujeitoIva = strtolower(trim((string) $get('sujeito_iva')));
        $sujeitoIva = in_array($sujeitoIva, ['sim', '1', 'true', 'yes']);

        return [
            'tipo'             => 'servico',
            'nome'             => trim((string) $get('nome')),
            'descricao'        => $get('descricao') ?: null,
            'preco_venda'      => (float) ($get('preco_venda') ?: 0),
            'taxa_iva'         => (float) ($get('taxa_iva') ?: 0),
            'sujeito_iva'      => $sujeitoIva,
            'taxa_retencao'    => $taxaRetencao,
            'codigo_isencao'   => $codigoIsencao,
            'duracao_estimada' => trim((string) $get('duracao_estimada')),
            'unidade_medida'   => $unidade,
            'status'           => in_array(strtolower((string) $get('status')), ['ativo', 'inativo'])
                ? strtolower($get('status'))
                : 'ativo',
        ];
    }

    /**
     * Verifica se já existe um serviço com este nome no tenant atual.
     * Serviços não têm campo `codigo`, então a verificação é por nome + tipo.
     */
    private function jaExiste(array $dados): bool
    {
        return $this->queryProdutos()
            ->where('nome', $dados['nome'])
            ->where('tipo', 'servico')
            ->exists();
    }

    private function queryProdutos()
    {
        if ($this->modo === 'colectivo') {
            return SharedProduto::doTenant();
        }
        return TenantProduto::query();
    }

    /**
     * Normaliza o texto de um cabeçalho: remove tudo entre parênteses
     * (ex: "(opcional)"), tira espaços/acentos e devolve em snake_case.
     */
    private function normalizeHeader(mixed $label): ?string
    {
        if ($label === null || trim((string) $label) === '') {
            return null;
        }

        $label = preg_replace('/\(.*?\)/u', '', (string) $label);
        $label = trim($label);
        $label = mb_strtolower($label);
        $label = strtr($label, [
            'á' => 'a', 'à' => 'a', 'ã' => 'a', 'â' => 'a',
            'é' => 'e', 'ê' => 'e',
            'í' => 'i',
            'ó' => 'o', 'ô' => 'o', 'õ' => 'o',
            'ú' => 'u', 'ç' => 'c',
        ]);
        $label = preg_replace('/\s+/', '_', $label);
        $label = trim($label, '_');

        return $label !== '' ? $label : null;
    }
}