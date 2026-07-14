<?php

namespace App\Imports;

use App\Models\Shared\Categoria as SharedCategoria;
use App\Models\Tenant\Categoria as TenantCategoria;
use App\Models\Shared\Produto as SharedProduto;
use App\Models\Tenant\Produto as TenantProduto;
use App\Services\ProdutoService;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Illuminate\Support\Facades\Log;

/**
 * Lê a folha "Produtos" do template FaturaJa_Template_Importacao.xlsx.
 *
 * Não usa WithHeadingRow porque o texto do cabeçalho tem sufixos como
 * "(opcional)" que não queremos ter de repetir como chave em todo o código.
 * Em vez disso, normalizamos o cabeçalho nós próprios (normalizeHeader),
 * o que também torna a importação tolerante a pequenas variações de
 * espaçamento/maiúsculas no ficheiro.
 */
class ProdutosSheetImport implements ToCollection
{
    public array $sucesso = [];
    public array $erros = [];
    public array $ignorados = []; // linhas puladas por já existirem (não são erro)

    private string $modo;

    /** Linha (1-indexed) onde está o cabeçalho real da tabela nesta folha. */
    private const HEADING_ROW = 11;

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

            // Ignora linhas vazias (fim da tabela)
            if (empty($nome) || empty($tipo)) {
                continue;
            }

            if (strtolower(trim((string) $tipo)) !== 'produto') {
                continue; // segurança: só processa linhas marcadas como produto
            }

            try {
                $dados = $this->mapearLinha($get);

                if ($this->jaExiste($dados)) {
                    $motivo = !empty($dados['codigo'])
                        ? "Já existe um produto com o código '{$dados['codigo']}' — linha ignorada."
                        : "Já existe um produto com o nome '{$dados['nome']}' nesta categoria — linha ignorada.";

                    $this->ignorados[] = [
                        'linha' => $linhaExcel,
                        'nome' => $dados['nome'],
                        'motivo' => $motivo,
                    ];
                    continue;
                }

                $produto = $service->criarProduto($dados);

                $this->sucesso[] = [
                    'linha' => $linhaExcel,
                    'produto_id' => $produto->id,
                    'nome' => $produto->nome,
                ];
            } catch (\Throwable $e) {
                Log::warning('[ProdutosSheetImport] Erro ao importar linha', [
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
        $categoriaNome = $get('categoria');
        $categoriaId = $this->resolverCategoriaId($categoriaNome);
        if (!$categoriaId) {
            throw new \Exception("Categoria '{$categoriaNome}' não encontrada.");
        }

        $tipoPreco = strtolower(trim((string) ($get('tipo_preco') ?: 'fixo')));

        return [
            'tipo'                => 'produto',
            'nome'                => trim((string) $get('nome')),
            'descricao'           => $get('descricao') ?: null,
            'categoria_id'        => $categoriaId,
            'fornecedor_id'       => null, // template não inclui fornecedor
            'codigo'              => $get('codigo') ?: null,
            'preco_compra'        => (float) ($get('preco_compra') ?: 0),
            'tipo_preco'          => in_array($tipoPreco, ['fixo', 'margem', 'markup']) ? $tipoPreco : 'fixo',
            'preco_venda'         => $get('preco_venda') !== null ? (float) $get('preco_venda') : null,
            'margem_lucro'        => $get('margem_lucro') !== null ? (float) $get('margem_lucro') : null,
            'markup'              => $get('markup') !== null ? (float) $get('markup') : null,
            'despesas_adicionais' => (float) ($get('despesas_adicionais') ?: 0),
            'estoque_atual'       => (int) ($get('estoque_atual') ?: 0),
            'estoque_minimo'      => (int) ($get('estoque_minimo') ?: 5),
            'status'              => in_array(strtolower((string) $get('status')), ['ativo', 'inativo'])
                ? strtolower($get('status'))
                : 'ativo',
        ];
    }

    /**
     * Verifica se este produto já existe no tenant atual, ANTES de tentar
     * criar — evita bater na constraint única de `codigo` e rebentar a
     * transação com um erro de SQL feio no meio da importação.
     *
     * - Se a linha tem `codigo`, verifica por código (é o campo com unique
     *   index na tabela `produtos`).
     * - Se não tem código, verifica por nome + categoria (heurística, já
     *   que não há unicidade garantida pela base de dados nesse caso).
     */
    private function jaExiste(array $dados): bool
    {
        $codigo = trim((string) ($dados['codigo'] ?? ''));

        if ($codigo !== '') {
            return $this->queryProdutos()->where('codigo', $codigo)->exists();
        }

        return $this->queryProdutos()
            ->where('nome', $dados['nome'])
            ->where('categoria_id', $dados['categoria_id'])
            ->exists();
    }

    private function queryProdutos()
    {
        if ($this->modo === 'colectivo') {
            return SharedProduto::doTenant();
        }
        return TenantProduto::query();
    }

    private function resolverCategoriaId(?string $nome): ?string
    {
        if (!$nome) {
            return null;
        }

        $nome = trim($nome);

        if ($this->modo === 'colectivo') {
            return SharedCategoria::doTenant()->where('nome', $nome)->value('id');
        }

        return TenantCategoria::where('nome', $nome)->value('id');
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