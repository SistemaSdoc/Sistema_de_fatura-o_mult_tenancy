<?php

namespace App\Services;

use App\Services\PrintConnectors\LprRawPrintConnector;
use App\Models\Shared\DocumentoFiscal as SharedDocumentoFiscal;
use App\Models\Tenant\DocumentoFiscal as TenantDocumentoFiscal;
use App\Models\Empresa;
use App\Models\LandlordUser;
use App\Models\Shared\User as SharedUser;
use App\Models\Tenant\User as TenantUser;
use Mike42\Escpos\Printer;
use Mike42\Escpos\PrintConnectors\FilePrintConnector;
use Mike42\Escpos\PrintConnectors\WindowsPrintConnector;
use Mike42\Escpos\CapabilityProfile;
use Mike42\Escpos\EscposImage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class ImpressoraTermicaService
{
    protected int $L = 42;
    protected ?Printer $printer = null;

    // ⭐ CONFIGURAÇÕES PADRÃO
    protected string $logo              = 'images/mwamba.png';
    protected string $slogan            = 'A sua solução em tecnologia';
    protected string $endereco          = 'Rua do Paiol, Bairro Gameke, (Proximo da Farmacia Pedrito), Provincia de Luanda';
    protected string $telefone          = '+244 938 747 267';
    protected string $telefone2         = '+244 941 177 948';
    protected string $email             = 'mwambacomercial@gmail.com';
    protected string $politicaDevolucao = 'Trocas e devoluções em até 7 dias com recibo.';
    protected string $mensagemFinal     = 'Obrigado pela sua preferência!';
    protected string $textoProcessamento = 'Processado por computador';
    protected string $rotuloQrCode      = 'QR AGT DP71/25';
    protected int    $hashMaxChars      = 26;

    // ⭐ APENAS USB / CUPS
    protected string $caminhoUSB  = '/dev/usb/lp0';

    // ⭐ CONTEXTO DO TENANT
    protected ?Empresa $empresa = null;
    protected string $modo = 'colectivo';
    protected ?string $tenantId = null;
    protected ?object $tenantUser = null;

    public function __construct()
    {
        // ✅ OBTÉM CONTEXTO DA SESSÃO
        $this->empresa = app('current.empresa');
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
        $this->tenantId = $this->empresa?->id ?? null;

        $caminhoEnv = env('IMPRESSORA_USB_PATH');
        if (!empty($caminhoEnv)) {
            $this->caminhoUSB = $caminhoEnv;
        }

        $so = strtoupper(substr(PHP_OS, 0, 3));
        if ($so === 'WIN') {
            $this->caminhoUSB = env('IMPRESSORA_USB_PATH', 'XPrinter XP-80T');
        }

        // ⭐ CARREGAR CONFIGURAÇÕES DA EMPRESA
        $this->carregarConfiguracoesEmpresa();

        Log::debug('[ImpressoraTermicaService] Inicializado', [
            'modo'       => $this->modo,
            'empresa_id' => $this->empresa?->id,
            'caminhoUSB' => $this->caminhoUSB,
        ]);
    }

    /* =====================================================================
     | HELPERS
     | ================================================================== */

    protected function getModo(): string
    {
        $this->modo = session('tenant_modo', $this->empresa?->modo ?? 'colectivo');
        return $this->modo;
    }

    protected function getEmpresa(): ?Empresa
    {
        if (!$this->empresa) {
            $this->empresa = app('current.empresa');
        }
        return $this->empresa;
    }

    protected function isColectivo(): bool
    {
        return $this->getModo() === 'colectivo';
    }

    protected function isSingular(): bool
    {
        return $this->getModo() === 'singular';
    }

    /* =====================================================================
     | VERIFICAÇÃO DE ACESSO
     | ================================================================== */

    protected function verificarAcessoUsuario(): void
    {
        Log::debug('[ImpressoraTermicaService] Verificando acesso');

        // 1️⃣ Obtém a empresa
        $this->empresa = app('current.empresa');
        if (!$this->empresa) {
            Log::error('[ImpressoraTermicaService] Empresa não identificada.');
            throw new \Exception('Empresa não identificada.', 400);
        }

        // ✅ Atualiza o modo
        $this->modo = $this->empresa->modo ?? 'colectivo';

        // 2️⃣ Obtém o landlord user
        $landlordUser = Auth::guard('landlord')->user();

        // 3️⃣ Fallback: tenta obter da sessão
        if (!$landlordUser) {
            $landlordId = session('landlord_user_id');
            if ($landlordId) {
                $landlordUser = LandlordUser::find($landlordId);
            }
        }

        if (!$landlordUser) {
            Log::error('[ImpressoraTermicaService] Utilizador landlord não autenticado.');
            throw new \Exception('Usuário não autenticado.', 401);
        }

        // 4️⃣ Busca o TenantUser correspondente
        $tenantUser = $this->buscarUsuario($this->empresa, $landlordUser->email);
        if (!$tenantUser) {
            Log::error('[ImpressoraTermicaService] Utilizador tenant não encontrado.', [
                'email' => $landlordUser->email,
            ]);
            throw new \Exception('Usuário não tem permissão para aceder a esta empresa.', 403);
        }

        $this->tenantUser = $tenantUser;

        Log::info('[ImpressoraTermicaService] Acesso verificado com sucesso', [
            'modo'     => $this->modo,
            'user_id'  => $tenantUser->id,
            'email'    => $tenantUser->email,
        ]);
    }

    protected function buscarUsuario(Empresa $empresa, string $email): ?object
    {
        if ($empresa->modo === 'singular') {
            return TenantUser::on('tenant')->where('email', $email)->first();
        }
        return SharedUser::on('shared')
            ->where('email', $email)
            ->where('tenant_id', $empresa->id)
            ->first();
    }

    protected function getUserId(): ?string
    {
        return $this->tenantUser?->id;
    }

    /* =====================================================================
     | CARREGAR CONFIGURAÇÕES DA EMPRESA
     | ================================================================== */

    protected function carregarConfiguracoesEmpresa(): void
    {
        if (!$this->empresa) {
            return;
        }

        if (!empty($this->empresa->endereco)) {
            $this->endereco = $this->empresa->endereco;
        }

        if (!empty($this->empresa->telefone)) {
            $this->telefone = $this->empresa->telefone;
        }

        if (!empty($this->empresa->email)) {
            $this->email = $this->empresa->email;
        }

        if (!empty($this->empresa->logo)) {
            if (Storage::disk('public')->exists($this->empresa->logo)) {
                $this->logo = Storage::disk('public')->path($this->empresa->logo);
            } elseif (file_exists(public_path($this->empresa->logo))) {
                $this->logo = public_path($this->empresa->logo);
            }
        }

        if (!empty($this->empresa->configuracoes)) {
            $configs = is_array($this->empresa->configuracoes)
                ? $this->empresa->configuracoes
                : json_decode($this->empresa->configuracoes, true);

            if (!empty($configs['slogan'])) {
                $this->slogan = $configs['slogan'];
            }
            if (!empty($configs['politica_devolucao'])) {
                $this->politicaDevolucao = $configs['politica_devolucao'];
            }
            if (!empty($configs['mensagem_final'])) {
                $this->mensagemFinal = $configs['mensagem_final'];
            }
        }

        Log::debug('[ImpressoraTermicaService] Configurações carregadas', [
            'empresa_id' => $this->empresa->id,
            'modo'       => $this->modo,
        ]);
    }

    /* =====================================================================
     | BUSCAR DOCUMENTOS COM SCOPE CORRETO
     | ================================================================== */

    protected function buscarDocumento(string $documentoId): ?object
    {
        if ($this->isColectivo()) {
            return SharedDocumentoFiscal::doTenant()
                ->where('id', $documentoId)
                ->first();
        }

        return TenantDocumentoFiscal::where('id', $documentoId)->first();
    }

    protected function buscarDocumentoOrigem(string $faturaId): ?object
    {
        if ($this->isColectivo()) {
            return SharedDocumentoFiscal::doTenant()
                ->where('id', $faturaId)
                ->first();
        }

        return TenantDocumentoFiscal::where('id', $faturaId)->first();
    }

    /* =====================================================================
     | TESTA CONEXÃO
     | ================================================================== */

    public function testarConexao(?string $destino = null): bool
    {
        $so = strtoupper(substr(PHP_OS, 0, 3));

        try {
            if ($so === 'WIN') {
                $destino   = $destino ?: $this->caminhoUSB;
                $connector = new WindowsPrintConnector($destino);
                $profile   = CapabilityProfile::load('default');
                $printer   = new Printer($connector, $profile);
                $printer->close();
                return true;
            }

            // Linux → verifica se a fila CUPS existe e está pronta
            $queue = env('IMPRESSORA_CUPS_QUEUE', 'Epson_TM-T88IV_Raw');

            exec('lpstat -p ' . escapeshellarg($queue) . ' 2>&1', $out, $code);

            if ($code !== 0) {
                Log::warning("[ImpressoraTermicaService] Fila CUPS não encontrada: {$queue}", [
                    'output' => $out,
                ]);
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('[ImpressoraTermicaService] Falha no teste de conexão: ' . $e->getMessage());
            return false;
        }
    }

    /* =====================================================================
     | MÉTODO PRINCIPAL — IMPRIMIR DOCUMENTO
     | ================================================================== */

    public function imprimirDocumento(
        \App\Models\Shared\DocumentoFiscal|\App\Models\Tenant\DocumentoFiscal $documento,
        array $dados,
        $user = null
    ): void {
        // ✅ Verifica acesso
        $this->verificarAcessoUsuario();

        $destino = $this->caminhoUSB;
        $modo    = $this->getModo();

        Log::info('[ImpressoraTermicaService] Iniciando impressão', [
            'documento_id' => $documento->id ?? null,
            'tipo'         => $documento->tipo_documento ?? null,
            'modo'         => $modo,
            'destino'      => $destino,
        ]);

        try {
            $this->conectarUSB($destino);

            // ⭐ RESOLVER DOCUMENTO COM SCOPE CORRETO
            $docInfo = $this->resolverDocInfo($documento);

            $empresa = $dados['empresa'] ?? $this->getDadosEmpresa();
            $cliente = $dados['cliente'] ?? [];
            $itens   = $dados['itens']   ?? $docInfo->itens ?? [];
            $qrCode  = $dados['qr_code'] ?? null;

            $this->imprimirCabecalho($empresa);
            $this->imprimirTipoNumero($documento);

            if (in_array($documento->tipo_documento, ['RC', 'RG'], true) && $docInfo !== $documento) {
                $this->imprimirOrigemRc($docInfo);
            }

            $this->imprimirCliente($cliente);
            $this->imprimirItens($itens);
            $this->imprimirTotais($documento, $docInfo);

            if (!empty($qrCode)) {
                $this->imprimirQrCode($qrCode);
            }

            if (!empty($documento->hash_fiscal)) {
                $this->imprimirHash($documento->hash_fiscal);
            }

            $this->imprimirRodape($modo);

            $this->printer->cut();
            $this->printer->close();

            Log::info('[ImpressoraTermicaService] Impressão concluída', [
                'documento_id' => $documento->id ?? null,
                'modo'         => $modo,
            ]);
        } catch (\Throwable $e) {
            Log::error('[ImpressoraTermicaService] Erro na impressão', [
                'documento_id' => $documento->id ?? null,
                'destino'      => $destino,
                'modo'         => $modo,
                'error'        => $e->getMessage(),
                'line'         => $e->getLine(),
            ]);
            throw new \RuntimeException('Falha ao imprimir: ' . $e->getMessage(), 0, $e);
        } finally {
            $this->fechar();
        }
    }

    /* =====================================================================
     | OBTÉM DADOS DA EMPRESA PARA IMPRESSÃO
     | ================================================================== */

    protected function getDadosEmpresa(): array
    {
        $this->getEmpresa();

        if (!$this->empresa) {
            return [
                'nome'     => 'Empresa',
                'nif'      => '',
                'endereco' => $this->endereco,
                'telefone' => $this->telefone,
                'email'    => $this->email,
                'modo'     => $this->modo,
            ];
        }

        return [
            'nome'     => $this->empresa->nome ?? 'Empresa',
            'nif'      => $this->empresa->nif ?? '',
            'endereco' => $this->empresa->endereco ?? $this->endereco,
            'telefone' => $this->empresa->telefone ?? $this->telefone,
            'email'    => $this->empresa->email ?? $this->email,
            'logo'     => $this->empresa->logo ?? $this->logo,
            'modo'     => $this->modo,
        ];
    }

    /* =====================================================================
     | CONEXÃO
     | ================================================================== */

    private function conectarUSB(string $destino): void
    {
        $so = strtoupper(substr(PHP_OS, 0, 3));

        try {
            if ($so === 'WIN') {
                $connector = new WindowsPrintConnector($destino);
                $profile   = CapabilityProfile::load('default');
                $this->printer = new Printer($connector, $profile);
                $this->inicializarImpressora();
                Log::info("[ImpressoraTermicaService] Conectado via Windows USB: {$destino}");
                return;
            }

            $queue     = env('IMPRESSORA_CUPS_QUEUE', 'Epson_TM-T88IV_Raw');
            $connector = new LprRawPrintConnector($queue);
            $profile   = CapabilityProfile::load('default');
            $this->printer = new Printer($connector, $profile);
            $this->inicializarImpressora();

            Log::info("[ImpressoraTermicaService] Conectado via CUPS raw queue: {$queue}");
        } catch (\Throwable $e) {
            Log::error('[ImpressoraTermicaService] Erro ao conectar à impressora: ' . $e->getMessage());
            throw new \RuntimeException(
                'Não foi possível conectar à impressora: ' . $e->getMessage(), 0, $e
            );
        }
    }

private function inicializarImpressora(): void
{
    $this->printer->initialize();
    // CP850 via comando ESC/POS direto (compatível com todas as versões)
    $this->printer->getPrintConnector()->write("\x1b\x74\x02");
    $this->printer->setLineSpacing(24);
}

    /* =====================================================================
     | UTILITÁRIOS
     | ================================================================== */

    private function fechar(): void
    {
        try {
            $this->printer?->close();
        } catch (\Throwable) {
            // silencioso
        }
    }

    private function resolverDocInfo(
        \App\Models\Shared\DocumentoFiscal|\App\Models\Tenant\DocumentoFiscal $documento
    ): \App\Models\Shared\DocumentoFiscal|\App\Models\Tenant\DocumentoFiscal {
        if (in_array($documento->tipo_documento, ['RC', 'RG'], true) && $documento->fatura_id) {
            $origem = $this->buscarDocumentoOrigem($documento->fatura_id);
            return $origem ?? $documento;
        }
        return $documento;
    }

    private function centrar(string $texto): string
    {
        $len = mb_strlen($texto);
        if ($len >= $this->L) return $texto;
        $pad = (int)(($this->L - $len) / 2);
        return str_repeat(' ', $pad) . $texto;
    }

    private function linhaLR(string $esquerda, string $direita): string
    {
        $tamanho = $this->L - mb_strlen($direita);
        return str_pad($esquerda, $tamanho) . $direita;
    }

    /* =====================================================================
     | BLOCOS DE IMPRESSÃO
     | ================================================================== */

    private function imprimirCabecalho(array $empresa = []): void
    {
        $this->printer->setJustification(Printer::JUSTIFY_CENTER);

        // LOGO
        $logoPath = $empresa['logo'] ?? $this->logo;
        if (!empty($logoPath)) {
            $fileExists = false;
            $fullPath   = '';

            if (Storage::disk('public')->exists($logoPath)) {
                $fullPath   = Storage::disk('public')->path($logoPath);
                $fileExists = true;
            } elseif (file_exists(public_path($logoPath))) {
                $fullPath   = public_path($logoPath);
                $fileExists = true;
            } elseif (file_exists($logoPath)) {
                $fullPath   = $logoPath;
                $fileExists = true;
            }

            if ($fileExists) {
                try {
                    $img = EscposImage::load($fullPath);
                    $this->printer->bitImage($img);
                } catch (\Throwable $e) {
                    Log::warning('[ImpressoraTermicaService] Erro ao carregar logo: ' . $e->getMessage());
                }
            }
        }

        // Nome da empresa
        $nomeEmpresa = $empresa['nome'] ?? 'Empresa';
        $this->printer->setEmphasis(true);
        $this->printer->setTextSize(2, 1);
        $this->printer->text(mb_strtoupper($nomeEmpresa, 'UTF-8') . "\n");
        $this->printer->setTextSize(1, 1);
        $this->printer->setEmphasis(false);

        if (!empty($this->slogan)) {
            $this->printer->text($this->slogan . "\n");
        }

        $this->printer->text(str_repeat('-', $this->L) . "\n");

        // Endereço
        $endereco = $empresa['endereco'] ?? $this->endereco;
        if (!empty($endereco)) {
            foreach (explode("\n", wordwrap($endereco, $this->L, "\n", true)) as $linha) {
                $this->printer->text($linha . "\n");
            }
        }

        $nif = $empresa['nif'] ?? '';
        if (!empty($nif)) {
            $this->printer->text('NIF: ' . $nif . "\n");
        }

        $this->printer->text(str_repeat('-', $this->L) . "\n");

        // Telefone
        $telefone = $empresa['telefone'] ?? $this->telefone;
        if (!empty($telefone)) {
            $tel = 'Tel: ' . $telefone;
            if (!empty($this->telefone2)) {
                $tel .= ' / ' . $this->telefone2;
            }
            $this->printer->text($tel . "\n");
        }

        // Email
        $email = $empresa['email'] ?? $this->email;
        if (!empty($email)) {
            $this->printer->text('Email: ' . $email . "\n");
        }

        $this->printer->text(str_repeat('=', $this->L) . "\n");
        $this->printer->setJustification(Printer::JUSTIFY_LEFT);
    }

    private function imprimirTipoNumero(
        \App\Models\Shared\DocumentoFiscal|\App\Models\Tenant\DocumentoFiscal $d
    ): void {
        $this->printer->setJustification(Printer::JUSTIFY_CENTER);
        $this->printer->setEmphasis(true);
        $this->printer->text(
            ($d->tipo_documento_nome ?? $d->tipo_documento)
                . ' N ' . ($d->numero_documento ?? '')
                . "\n"
        );
        $this->printer->setEmphasis(false);
        $this->printer->setJustification(Printer::JUSTIFY_LEFT);

        $data = date('d/m/Y', strtotime($d->data_emissao ?? now()));
        $hora = $d->hora_emissao ? substr($d->hora_emissao, 0, 5) : '';

        $this->printer->text($this->linhaLR('Serie: ' . ($d->serie ?? ''), $data . ' ' . $hora) . "\n");
        $numeroVia = (int) ($d->print_count ?? 0);
        $via       = $numeroVia <= 1 ? 'Original' : $numeroVia . '.ª via';
        $this->printer->text('Via: ' . $via . "\n");
        $this->printer->text(str_repeat('-', $this->L) . "\n");
    }

    private function imprimirOrigemRc(
        \App\Models\Shared\DocumentoFiscal|\App\Models\Tenant\DocumentoFiscal $origem
    ): void {
        $this->printer->text(
            'Ref.: '
                . ($origem->tipo_documento_nome ?? $origem->tipo_documento)
                . ' N ' . $origem->numero_documento
                . "\n"
        );
        $this->printer->text(str_repeat('-', $this->L) . "\n");
    }

    private function imprimirCliente(array $cliente): void
    {
        $this->printer->setEmphasis(true);
        $this->printer->text('Cliente: ' . ($cliente['nome'] ?? 'Consumidor Final') . "\n");
        $this->printer->setEmphasis(false);

        if (!empty($cliente['nif'])) {
            $this->printer->text('NIF: ' . $cliente['nif'] . "\n");
        }

        $this->printer->text(str_repeat('-', $this->L) . "\n");
    }

private function imprimirItens(iterable $itens): void
{
    // Cabeçalho alinhado com as colunas dos dados
    $this->printer->setEmphasis(true);
    $this->printer->text(
        str_pad('ITEM', 21) .
        str_pad('QTD', 4, ' ', STR_PAD_LEFT) .
        str_pad('TOTAL', 17, ' ', STR_PAD_LEFT) . "\n"
    );
    $this->printer->setEmphasis(false);
    $this->printer->text(str_repeat('-', $this->L) . "\n");

    foreach ($itens as $item) {
        // null-safe + mb_substr para não cortar caracteres multibyte (ç, ã, é)
        $nome = $item->produto?->nome ?? $item->descricao ?? 'Item';
        $desc = mb_substr($nome, 0, 21, 'UTF-8');

        $qtd = number_format((float) ($item->quantidade ?? 1), 0);

        $valor = (float) ($item->total ?? $item->total_linha ?? 0);
        $total = number_format($valor, 2, ',', '.') . ' Kz';

        // Colunas: descrição (21) + quantidade (4) + total (17) = 42
        $linha =
            str_pad($desc, 21) .
            str_pad($qtd, 4, ' ', STR_PAD_LEFT) .
            str_pad($total, 17, ' ', STR_PAD_LEFT);

        $this->printer->text($linha . "\n");
    }

    $this->printer->text(str_repeat('=', $this->L) . "\n");
}

private function imprimirTotais(
    \App\Models\Shared\DocumentoFiscal|\App\Models\Tenant\DocumentoFiscal $d,
    \App\Models\Shared\DocumentoFiscal|\App\Models\Tenant\DocumentoFiscal $docInfo
): void {
    $base     = number_format((float) ($docInfo->base_tributavel ?? 0), 2, ',', '.');
    $iva      = number_format((float) ($docInfo->total_iva ?? 0), 2, ',', '.');
    $retencao = number_format((float) ($docInfo->total_retencao ?? 0), 2, ',', '.');
    $total    = number_format((float) $d->total_liquido, 2, ',', '.');

    // Colunas: rótulo (24) + valor (18) = 42
    $linha = function (string $label, string $valor): string {
        return str_pad($label, 24) . str_pad($valor . ' Kz', 18, ' ', STR_PAD_LEFT) . "\n";
    };

    $this->printer->text($linha('Base Tributavel:', $base));
    $this->printer->text($linha('Total IVA:', $iva));

    if ((float) ($docInfo->total_retencao ?? 0) > 0) {
        $this->printer->text($linha('Retencao:', '-' . $retencao));
    }

    $this->printer->text(str_repeat('-', $this->L) . "\n");

    $this->printer->setEmphasis(true);
    $this->printer->text($linha('TOTAL:', $total));
    $this->printer->setEmphasis(false);
    $this->printer->text(str_repeat('=', $this->L) . "\n");
}

    private function imprimirQrCode(string $qrCode): void
    {
        $this->printer->setJustification(Printer::JUSTIFY_CENTER);

        if (!empty($this->rotuloQrCode)) {
            $this->printer->text($this->rotuloQrCode . "\n");
        }

        try {
            // tamanho 6 (~30mm) é mais seguro que 8 para papel de 80mm
            $this->printer->qrCode($qrCode, Printer::QR_ECLEVEL_M, 6);
        } catch (\Throwable $e) {
            Log::warning('[ImpressoraTermicaService] Erro ao imprimir QR Code: ' . $e->getMessage());
            $this->printer->text('[QR: ' . substr($qrCode, 0, 30) . "...]\n");
        }

        $this->printer->setJustification(Printer::JUSTIFY_LEFT);
        $this->printer->text(str_repeat('-', $this->L) . "\n");
    }

    private function imprimirHash(string $hash): void
    {
        $this->printer->text('Hash: ' . substr($hash, 0, $this->hashMaxChars) . "\n");
        $this->printer->text(str_repeat('-', $this->L) . "\n");
    }

    private function imprimirRodape(string $modo = 'colectivo'): void
    {
        $this->printer->setJustification(Printer::JUSTIFY_CENTER);

        if (!empty($this->politicaDevolucao)) {
            $this->printer->text(str_repeat('-', $this->L) . "\n");
            foreach (explode("\n", wordwrap($this->politicaDevolucao, $this->L, "\n", true)) as $linha) {
                $this->printer->text($linha . "\n");
            }
        }

        $this->printer->text(str_repeat('=', $this->L) . "\n");
        $this->printer->text($this->textoProcessamento . "\n");
        $this->printer->text($this->mensagemFinal . "\n");
        $this->printer->text("*** Fim do Documento ***\n");


        $this->printer->setJustification(Printer::JUSTIFY_LEFT);
        $this->printer->feed(3);
    }
}