<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Services\AuditLogger;
use Carbon\Carbon;

class AuditoriaController extends Controller
{
    /**
     * GET /api/auditoria/logs
     *
     * Query params opcionais:
     *   data       (YYYY-MM-DD)  -> default: hoje
     *   usuario    (string, busca parcial)
     *   acao       (string, busca parcial)
     *   area       (string, busca parcial)
     *   pagina     (int, default 1)
     *   por_pagina (int, default 25, max 100)
     */

    /**
     * GET /api/landlord/auditoria/logs
     * Mesmo comportamento do index(), mas acessível pelo landlord (sem tenant).
     */
    public function indexLandlord(Request $request): JsonResponse
    {
        return $this->index($request);
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->query('data', now()->format('Y-m-d'));

        // Valida formato da data para evitar path traversal
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data)) {
            return response()->json(['erro' => 'Data inválida. Use o formato YYYY-MM-DD.'], 422);
        }

        $arquivo = storage_path("logs/auditoria-{$data}.log");

        if (!file_exists($arquivo)) {
            return response()->json([
                'data' => $data,
                'total' => 0,
                'pagina' => 1,
                'por_pagina' => (int) $request->query('por_pagina', 25),
                'total_paginas' => 0,
                'linhas' => [],
            ]);
        }

        $conteudo = file_get_contents($arquivo);
        $blocos = preg_split('/\n(?=\[)/', trim($conteudo));

        $entradas = collect($blocos)
            ->map(fn($bloco) => $this->parseLinha($bloco))
            ->filter() // remove linhas que não deram parse (ex: stack traces de erro)
            ->reverse() // mais recente primeiro
            ->values();

        // Filtros
        $usuario = $request->query('usuario');
        $acao = $request->query('acao');
        $area = $request->query('area');

        if ($usuario) {
            $entradas = $entradas->filter(
                fn($e) => str_contains(mb_strtolower($e['usuario']), mb_strtolower($usuario))
            )->values();
        }

        if ($acao) {
            $entradas = $entradas->filter(
                fn($e) => str_contains(mb_strtolower($e['acao']), mb_strtolower($acao))
            )->values();
        }

        if ($area) {
            $entradas = $entradas->filter(
                fn($e) => str_contains(mb_strtolower($e['area']), mb_strtolower($area))
            )->values();
        }

        $total = $entradas->count();
        $porPagina = min((int) $request->query('por_pagina', 25), 100);
        $pagina = max((int) $request->query('pagina', 1), 1);
        $totalPaginas = $porPagina > 0 ? (int) ceil($total / $porPagina) : 0;

        $paginado = $entradas
            ->slice(($pagina - 1) * $porPagina, $porPagina)
            ->values();

        return response()->json([
            'data' => $data,
            'total' => $total,
            'pagina' => $pagina,
            'por_pagina' => $porPagina,
            'total_paginas' => $totalPaginas,
            'linhas' => $paginado,
        ]);
    }

    /**
     * GET /api/auditoria/datas
     * Lista as datas (arquivos) de log disponíveis, mais recente primeiro.
     */
    public function datasDisponiveis(): JsonResponse
    {
        $arquivos = glob(storage_path('logs/auditoria-*.log')) ?: [];

        $datas = collect($arquivos)
            ->map(function ($caminho) {
                preg_match('/auditoria-(\d{4}-\d{2}-\d{2})\.log$/', $caminho, $m);
                return $m[1] ?? null;
            })
            ->filter()
            ->sortDesc()
            ->values();

        return response()->json(['datas' => $datas]);
    }

    public function storeEvento(Request $request): JsonResponse
    {
        $request->validate([
            'acao' => 'required|string|max:255',
            'area' => 'nullable|string|max:255',
            'emoji' => 'nullable|string|max:20',
            'detalhes' => 'nullable|array',
        ]);

        $detalhes = $request->input('detalhes', []);
        $area = $request->input('area', null);
        $emoji = $request->input('emoji') ?? '';
        $acao = $request->input('acao', 'Evento');

        $acaoFormatada = $this->formatarAcaoInterface($acao, $detalhes);

        AuditLogger::log($acaoFormatada, $emoji, [
            'area' => $area ?? $this->resolverAreaDaPagina($detalhes),
            'detalhes' => $detalhes,
        ]);

        return response()->json(['success' => true, 'message' => 'Evento registado']);
    }

    private function formatarAcaoInterface(string $acao, array $detalhes): string
    {
        if ($acao === 'Página Visualizada') {
            $caminho = $detalhes['caminho'] ?? '/';
            $caminhoLegivel = $this->normalizarCaminho($caminho);
            return "Acessou a página {$caminhoLegivel}";
        }

        if ($acao === 'Elemento Clicado') {
            $elemento = $detalhes['elemento'] ?? $detalhes['rotulo'] ?? 'um elemento';
            $caminho = $detalhes['caminho'] ?? '/';
            $caminhoLegivel = $this->normalizarCaminho($caminho);

            $rotulo = is_string($elemento) && trim($elemento) !== '' ? trim($elemento) : 'um elemento';

            return $this->descreverClique($rotulo, $caminhoLegivel);
        }

        if ($acao === 'Formulário Enviado') {
            $formulario = $detalhes['formulario'] ?? 'um formulário';
            $caminho = $detalhes['caminho'] ?? '/';
            $campos = $detalhes['campos'] ?? 0;
            $caminhoLegivel = $this->normalizarCaminho($caminho);

            return "Submeteu o formulário \"{$formulario}\" com {$campos} campo(s) na página {$caminhoLegivel}";
        }

        return $acao;
    }

    private function descreverClique(string $rotulo, string $caminho): string
    {
        $rotuloLimpo = trim($rotulo);
        $rotuloNormalizado = mb_strtolower($rotuloLimpo);

        if (preg_match('/\b(nova|adicionar|criar|registar)\b/', $rotuloNormalizado)) {
            return "Iniciou a criação de {$rotuloLimpo} na página {$caminho}";
        }

        if (preg_match('/\b(editar|alterar|atualizar|guardar|salvar)\b/', $rotuloNormalizado)) {
            return "Atualizou o registo através de {$rotuloLimpo} na página {$caminho}";
        }

        if (preg_match('/\b(importar|carregar ficheiro|anexar)\b/', $rotuloNormalizado)) {
            return "Iniciou a importação de dados através de {$rotuloLimpo} na página {$caminho}";
        }

        if (preg_match('/\b(concluir|finalizar|confirmar|prosseguir)\b/', $rotuloNormalizado)) {
            return "Concluiu a operação {$rotuloLimpo} na página {$caminho}";
        }

        if (preg_match('/\b(cancelar|fechar|voltar)\b/', $rotuloNormalizado)) {
            return "Cancelou ou abandonou a operação {$rotuloLimpo} na página {$caminho}";
        }

        if (preg_match('/\b(ver detalhes|detalhes|abrir)\b/', $rotuloNormalizado)) {
            return "Consultou os detalhes de {$rotuloLimpo} na página {$caminho}";
        }

        if (str_contains($rotuloNormalizado, 'enviar comprovativo')) {
            return "Enviou o comprovativo de pagamento na página {$caminho}";
        }

        if (str_contains($rotuloNormalizado, 'facturação')) {
            return "Acessou a funcionalidade {$rotuloLimpo} na página {$caminho}";
        }

        return "Interagiu com {$rotuloLimpo} na página {$caminho}";
    }

    /**
     * Normaliza o caminho para ser mais legível no log
     * Ex: /dashboard/produtos -> Produtos (Dashboard)
     */
    private function normalizarCaminho(string $caminho): string
    {
        $caminho = trim($caminho, '/');
        if ($caminho === '') {
            return 'Dashboard';
        }

        $partes = explode('/', $caminho);
        $nome = end($partes);

        // Remover IDs (UUIDs e números) e query strings
        $nome = preg_replace('/^[0-9a-f]{8}-[0-9a-f]{4}-/i', '', $nome);
        $nome = preg_replace('/^\d+$/', '', $nome);
        $nome = explode('?', $nome)[0];

        if (!$nome) {
            $nome = reset($partes);
        }

        // Formatar para título (ex: produtos -> Produtos)
        $nome = str_replace(['-', '_'], ' ', $nome);
        $nome = ucfirst($nome);

        return $nome;
    }

    private function resolverAreaDaPagina(array $detalhes): ?string
    {
        $caminho = $detalhes['caminho'] ?? null;
        if (!$caminho) {
            return null;
        }

        $caminho = trim($caminho, '/');
        if ($caminho === '') {
            return 'Geral';
        }

        $partes = explode('/', $caminho);
        return $partes[0] ?: 'Geral';
    }

    /**
     * Faz o parsing de uma linha (ou bloco multilinha) do log de auditoria
     * e devolve um array estruturado, ou null se não bater com o formato esperado.
     */
    private function parseLinha(string $bloco): ?array
    {
        $linha = trim(explode("\n", $bloco)[0] ?? '');

        if (!preg_match(
            '/^\[(?<timestamp>[^\]]+)\]\s+\S+\.(?<nivel>\w+):\s*(?<acao>[^:]+):\s+(?<resto>.+)$/u',
            $linha,
            $m
        )) {
            return null;
        }

        $campos = [
            'usuario' => null,
            'hora' => null,
            'data' => null,
            'area' => null,
            'url' => null,
            'ip' => null,
            'sistema_operativo' => null,
            'navegador' => null,
            'dispositivo' => null,
            'localizacao' => null,
        ];

        $partes = explode(' | ', $m['resto']);

        foreach ($partes as $parte) {
            $parte = trim($parte);

            if (str_starts_with($parte, 'Usuário:')) {
                $campos['usuario'] = trim(substr($parte, strlen('Usuário:')));
            } elseif (str_starts_with($parte, 'Data/Hora:')) {
                $valor = trim(substr($parte, strlen('Data/Hora:')));
                [$hora, $data] = array_pad(explode('||', $valor), 2, null);
                $campos['hora'] = trim($hora ?? '');
                $campos['data'] = trim($data ?? '');
            } elseif (str_starts_with($parte, 'Área Atual:')) {
                $campos['area'] = trim(substr($parte, strlen('Área Atual:')));
            } elseif (str_starts_with($parte, 'URL:')) {
                $campos['url'] = trim(substr($parte, strlen('URL:')));
            } elseif (str_starts_with($parte, 'IP:')) {
                $campos['ip'] = trim(substr($parte, strlen('IP:')));
            } elseif (str_starts_with($parte, 'Sistema Operativo:')) {
                $campos['sistema_operativo'] = trim(substr($parte, strlen('Sistema Operativo:')));
            } elseif (str_starts_with($parte, 'Navegador:')) {
                $campos['navegador'] = trim(substr($parte, strlen('Navegador:')));
            } elseif (str_starts_with($parte, 'Dispositivo:')) {
                $campos['dispositivo'] = trim(substr($parte, strlen('Dispositivo:')));
            } elseif (str_starts_with($parte, 'Localização:')) {
                // remove a bandeira/emoji no final
                $loc = trim(substr($parte, strlen('Localização:')));
                $campos['localizacao'] = trim(preg_replace('/\p{So}+$/u', '', $loc));
            }
        }

        return [
            'timestamp' => $m['timestamp'],
            'nivel' => $m['nivel'],
            'emoji' => $m['emoji'] ?? '',
            'acao' => trim($m['acao']),
            ...$campos,
        ];
    }
}
