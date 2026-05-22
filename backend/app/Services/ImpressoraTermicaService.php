<?php

namespace App\Services;

use App\Models\Tenant\DocumentoFiscal;
use Mike42\Escpos\Printer;
use Mike42\Escpos\PrintConnectors\FilePrintConnector;
use Mike42\Escpos\PrintConnectors\WindowsPrintConnector;
use Mike42\Escpos\CapabilityProfile;
use Mike42\Escpos\EscposImage;
use Illuminate\Support\Facades\Log;

class ImpressoraTermicaService
{
    protected int $L = 42;
    protected ?Printer $printer = null;

    // Configurações da empresa
    protected string $logo             = 'images/mwamba.png';
    protected string $slogan           = 'A sua solução em tecnologia';
    protected string $endereco         = 'Rua do Paiol, Bairro Gameke, (Proximo da Farmacia Pedrito), Provincia de Luanda';
    protected string $telefone         = '+244 938 747 267';
    protected string $telefone2        = '+244 941 177 948';
    protected string $email            = 'mwambacomercial@gmail.com';
    protected string $politicaDevolucao = 'Trocas e devoluções em até 7 dias com recibo.';
    protected string $mensagemFinal    = 'Obrigado pela sua preferência!';
    protected string $textoProcessamento = 'Processado por computador';
    protected string $rotuloQrCode     = 'QR AGT DP71/25';
    protected int    $hashMaxChars     = 26;

    // ⭐ APENAS USB - SEM IP ⭐
    protected string $caminhoUSB  = '/dev/usb/lp0';

    public function __construct()
    {
        $caminhoEnv = env('IMPRESSORA_USB_PATH');
        if (!empty($caminhoEnv)) {
            $this->caminhoUSB = $caminhoEnv;
        }

        $so = strtoupper(substr(PHP_OS, 0, 3));
        if ($so === 'WIN') {
            $this->caminhoUSB = env('IMPRESSORA_USB_PATH', 'XPrinter XP-80T');
        }
    }

    /* =====================================================================
     | TESTA CONEXÃO — APENAS USB
     | ================================================================== */

    public function testarConexao(?string $destino = null): bool
    {
        // IGNORA completamente o parâmetro $destino, usa apenas USB
        $destino = $this->caminhoUSB;

        try {
            $so = strtoupper(substr(PHP_OS, 0, 3));
            
            // Windows: nome de impressora
            if ($so === 'WIN') {
                $connector = new WindowsPrintConnector($destino);
                $profile   = CapabilityProfile::load('default');
                $printer   = new Printer($connector, $profile);
                $printer->close();
                return true;
            }

            // Linux/macOS: dispositivo USB
            if (file_exists($destino)) {
                $fh = @fopen($destino, 'w');
                if ($fh) {
                    fwrite($fh, "\x1b\x40");
                    fclose($fh);
                    return true;
                }
            }

            Log::warning("Impressora USB não encontrada ou sem permissão: {$destino}");
            return false;

        } catch (\Throwable $e) {
            Log::error('Falha no teste de conexão USB: ' . $e->getMessage());
            return false;
        }
    }

    /* =====================================================================
     | MÉTODO PRINCIPAL — APENAS USB (IGNORA COMPLETAMENTE O USER)
     | ================================================================== */

    public function imprimirDocumento(DocumentoFiscal $documento, array $dados, $user = null): void
    {
        // ⭐ FORÇA USO APENAS DO USB - IGNORA COMPLETAMENTE $user->printer_ip ⭐
        $destino = $this->caminhoUSB;

        try {
            $this->conectarUSB($destino);

            $docInfo = $this->resolverDocInfo($documento);

            $empresa = $dados['empresa'] ?? [];
            $cliente = $dados['cliente'] ?? [];
            $itens   = $dados['itens']   ?? $docInfo->itens ?? [];
            $qrCode  = $dados['qr_code'] ?? null;

            $this->imprimirCabecalho($empresa);
            $this->imprimirTipoNumero($documento);

            if ($documento->tipo_documento === 'RC' && $docInfo !== $documento) {
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

            $this->imprimirRodape();

            $this->printer->cut();
            $this->printer->close();

            Log::info('Impressão térmica concluída via USB', [
                'documento_id' => $documento->id ?? null,
                'destino' => $destino,
            ]);

        } catch (\Throwable $e) {
            Log::error('Erro na impressão térmica USB', [
                'documento_id' => $documento->id ?? null,
                'destino'      => $destino,
                'error'        => $e->getMessage(),
                'line'         => $e->getLine(),
            ]);
            throw new \RuntimeException('Falha ao imprimir via USB: ' . $e->getMessage(), 0, $e);
        } finally {
            $this->fechar();
        }
    }

    /* =====================================================================
     | CONEXÃO — APENAS USB (SEM REDE)
     | ================================================================== */

    private function conectarUSB(string $destino): void
    {
        $so = strtoupper(substr(PHP_OS, 0, 3));

        try {
            // Windows: spooler
            if ($so === 'WIN') {
                $connector   = new WindowsPrintConnector($destino);
                $profile     = CapabilityProfile::load('default');
                $this->printer = new Printer($connector, $profile);
                $this->inicializarImpressora();
                Log::info("Impressora conectada via Windows USB: {$destino}");
                return;
            }

            // Linux / macOS: dispositivo USB
            if (!file_exists($destino)) {
                throw new \RuntimeException(
                    "Dispositivo USB não encontrado: {$destino}. Verifique o cabo e execute: ls /dev/usb/"
                );
            }
            if (!is_writable($destino)) {
                throw new \RuntimeException(
                    "Sem permissão no dispositivo: {$destino}. Execute: sudo chmod 666 {$destino}"
                );
            }

            $connector   = new FilePrintConnector($destino);
            $profile     = CapabilityProfile::load('default');
            $this->printer = new Printer($connector, $profile);
            $this->inicializarImpressora();
            Log::info("Impressora conectada via Linux USB: {$destino}");

        } catch (\Throwable $e) {
            Log::error('Erro ao conectar à impressora USB: ' . $e->getMessage());
            throw new \RuntimeException(
                'Não foi possível conectar à impressora USB (' . $destino . '): ' . $e->getMessage(), 0, $e
            );
        }
    }

    /**
     * Inicializa a impressora e força o codepage correto para a XP-80T.
     */
    private function inicializarImpressora(): void
    {
        // ESC @ — reset completo da impressora
        $this->printer->initialize();

        // ESC t 0 — seleciona codepage PC437 (padrão XP-80T)
        $this->printer->getPrintConnector()->write("\x1b\x74\x00");

        // Garante espaçamento de linha padrão
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

    private function resolverDocInfo(DocumentoFiscal $documento): DocumentoFiscal
    {
        if ($documento->tipo_documento === 'RC' && $documento->fatura_id) {
            $origem = DocumentoFiscal::find($documento->fatura_id);
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

        // Logo (opcional)
        if (!empty($this->logo) && file_exists(public_path($this->logo))) {
            try {
                $img = EscposImage::load(public_path($this->logo));
                $this->printer->bitImage($img);
            } catch (\Throwable $e) {
                Log::warning('Erro ao carregar logo: ' . $e->getMessage());
            }
        }

        // Nome da empresa em negrito e tamanho duplo
        $this->printer->setEmphasis(true);
        $this->printer->setTextSize(2, 1);
        $this->printer->text(mb_strtoupper($empresa['nome'] ?? 'MWAMBA COMERCIAL', 'UTF-8') . "\n");
        $this->printer->setTextSize(1, 1);
        $this->printer->setEmphasis(false);

        if (!empty($this->slogan)) {
            $this->printer->text($this->slogan . "\n");
        }

        $this->printer->text(str_repeat('-', $this->L) . "\n");

        if (!empty($this->endereco)) {
            foreach (explode("\n", wordwrap($this->endereco, $this->L, "\n", true)) as $linha) {
                $this->printer->text($linha . "\n");
            }
        }

        $this->printer->text('NIF: ' . ($empresa['nif'] ?? '') . "\n");
        $this->printer->text(str_repeat('-', $this->L) . "\n");

        if (!empty($this->telefone)) {
            $tel = 'Tel: ' . $this->telefone;
            if (!empty($this->telefone2)) {
                $tel .= ' / ' . $this->telefone2;
            }
            $this->printer->text($tel . "\n");
        }

        if (!empty($this->email)) {
            $this->printer->text('Email: ' . $this->email . "\n");
        }

        $this->printer->text(str_repeat('=', $this->L) . "\n");
        $this->printer->setJustification(Printer::JUSTIFY_LEFT);
    }

    private function imprimirTipoNumero(DocumentoFiscal $d): void
    {
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
        $this->printer->text(str_repeat('-', $this->L) . "\n");
    }

    private function imprimirOrigemRc(DocumentoFiscal $origem): void
    {
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
        $this->printer->setEmphasis(true);
        $this->printer->text("ITEM                     QTD     TOTAL\n");
        $this->printer->setEmphasis(false);
        $this->printer->text(str_repeat('-', $this->L) . "\n");

        foreach ($itens as $item) {
            $desc  = substr($item->produto->nome ?? $item->descricao ?? 'Item', 0, 22);
            $qtd   = number_format((float)($item->quantidade ?? 1), 0);
            $total = number_format((float)($item->total ?? $item->total_linha ?? 0), 2, ',', '.') . ' Kz';

            $linha = str_pad($desc, 22)
                   . str_pad($qtd, 8, ' ', STR_PAD_LEFT)
                   . str_pad($total, 12, ' ', STR_PAD_LEFT);

            $this->printer->text($linha . "\n");
        }

        $this->printer->text(str_repeat('=', $this->L) . "\n");
    }

    private function imprimirTotais(DocumentoFiscal $d, DocumentoFiscal $docInfo): void
    {
        $this->printer->text(
            "Base Tributavel: "
            . number_format((float)($docInfo->base_tributavel ?? 0), 2, ',', '.')
            . " Kz\n"
        );
        $this->printer->text(
            "Total IVA:       "
            . number_format((float)($docInfo->total_iva ?? 0), 2, ',', '.')
            . " Kz\n"
        );

        if ((float)($docInfo->total_retencao ?? 0) > 0) {
            $this->printer->text(
                "Retencao:        -"
                . number_format((float)$docInfo->total_retencao, 2, ',', '.')
                . " Kz\n"
            );
        }

        $this->printer->text(str_repeat('-', $this->L) . "\n");

        $this->printer->setEmphasis(true);
        $this->printer->text(
            "TOTAL:           "
            . number_format((float)$d->total_liquido, 2, ',', '.')
            . " Kz\n"
        );
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
            $this->printer->qrCode($qrCode, Printer::QR_ECLEVEL_M, 8);
        } catch (\Throwable $e) {
            Log::warning('Erro ao imprimir QR Code: ' . $e->getMessage());
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

    private function imprimirRodape(): void
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