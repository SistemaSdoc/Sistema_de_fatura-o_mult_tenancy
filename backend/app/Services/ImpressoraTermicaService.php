<?php

namespace App\Services;

use App\Models\Tenant\DocumentoFiscal;
use Mike42\Escpos\PrintConnectors\DummyPrintConnector;
use Mike42\Escpos\Printer;
use Mike42\Escpos\PrintConnectors\WindowsPrintConnector;
use Mike42\Escpos\PrintConnectors\CupsPrintConnector;
use Mike42\Escpos\PrintConnectors\NetworkPrintConnector;
use Mike42\Escpos\CapabilityProfile;
use Mike42\Escpos\EscposImage;
use Illuminate\Support\Facades\Log;

class ImpressoraTermicaService
{
    protected int $L = 42;

    protected ?Printer $printer = null;

    protected string $nomeImpressora = 'AUTO-THERMAL';
    // =====================================================
    // CONFIGURAÇÕES ESTÁTICAS — altere à vontade
    // =====================================================

    /** Caminho relativo a public/ para o logo (PNG recomendado; deixe vazio para não exibir) */
    protected string $logo = 'images/mwamba.png';

    /** Slogan exibido abaixo do nome da empresa */
    protected string $slogan = 'A sua solução em tecnologia';

    /** Endereço completo da empresa */
    protected string $endereco = 'Rua do Paiol, Bairro Gameke,(Proximo da Farmacia Pedrito),
Provincia de Luanda';
    /** Telefone principal */
    protected string $telefone = '+244 938 747 267';

    /** Telefone alternativo (deixe vazio para ocultar) */
    protected string $telefone2 = '+244 941 177 948';

    /** E-mail de contacto */
    protected string $email = 'mwambacomercial@gmail.com';

    /** Texto da política de devolução (deixe vazio para ocultar) */
    protected string $politicaDevolucao = 'Trocas e devoluções em até 7 dias com recibo.';

    /** Texto de agradecimento personalizado */
    protected string $mensagemFinal = 'Obrigado pela sua preferência!';
    public function __construct()
    {
        $this->nomeImpressora = env('IMPRESSORA_TERMICA', 'AUTO-THERMAL');
    }

    /** Texto legal obrigatório */
    protected string $textoProcessamento = 'Processado por computador';

    /** Rótulo do QR Code (conforme regulamento AGT) */
    protected string $rotuloQrCode = 'QR AGT DP71/25';

    /** Número máximo de caracteres do hash exibido */
    protected int $hashMaxChars = 26;

    // =====================================================
    // FIM DAS CONFIGURAÇÕES ESTÁTICAS
    // =====================================================


    public function gerarEscposBytes(DocumentoFiscal $documento, array $dados): string
    {
        $printer = null;

        try {
            $connector = new DummyPrintConnector();
            $profile   = CapabilityProfile::load('default');
            $printer   = new Printer($connector, $profile);

            $docInfo = $this->resolverDocInfo($documento);

            $empresa = $dados['empresa'] ?? [];
            $cliente = $dados['cliente'] ?? [];
            $itens   = $dados['itens'] ?? [];
            $qrCode  = $dados['qr_code'] ?? null;

            $this->bloco1Cabecalho($printer, $empresa);
            $this->bloco2TipoNumero($printer, $documento);

            if ($documento->tipo_documento === 'RC' && $docInfo !== $documento) {
                $this->bloco3OrigemRc($printer, $docInfo);
            }

            $this->bloco4Cliente($printer, $cliente);
            $this->bloco5Itens($printer, $itens);
            $this->bloco6Totais($printer, $documento, $docInfo);

            if (!empty($qrCode))                  $this->bloco7QrCode($printer, $qrCode);
            if (!empty($documento->hash_fiscal))  $this->bloco8Hash($printer, $documento->hash_fiscal);

            $this->bloco9Rodape($printer);

            $printer->cut();

            $bytes = $connector->getData();

            return $bytes;
        } catch (\Exception $e) {
            Log::error('Erro ao gerar ESC/POS', [
                'documento_id' => $documento->id ?? null,
                'mensagem'     => $e->getMessage(),
                'linha'        => $e->getLine()
            ]);

            throw new \Exception('Falha ao gerar o arquivo de impressão térmica.');
        } finally {
            if ($printer) {
                try {
                    $printer->close();
                } catch (\Throwable $e) {
                }
            }
        }
    }

    // ─────────────────────────────────────────────────────
    // HELPERS INTERNOS
    // ─────────────────────────────────────────────────────

    private function resolverDocInfo(DocumentoFiscal $documento): DocumentoFiscal
    {
        if ($documento->tipo_documento === 'RC' && $documento->fatura_id) {
            $origem = DocumentoFiscal::find($documento->fatura_id);
            return $origem ?? $documento;
        }
        return $documento;
    }

    /** Centraliza texto dentro da largura $this->L */
    private function centrar(string $texto): string
    {
        $len = mb_strlen($texto);
        if ($len >= $this->L) return $texto;
        $pad = (int)(($this->L - $len) / 2);
        return str_repeat(' ', $pad) . $texto;
    }

    /** Linha com dois campos alinhados (esquerda | direita) */
    private function linhaLR(string $esquerda, string $direita): string
    {
        $tamanho = $this->L - mb_strlen($direita);
        return str_pad($esquerda, $tamanho) . $direita . "\n";
    }

    // ====================== BLOCOS ======================

private function bloco1Cabecalho(Printer $p, array $empresa = []): void
{
    $empresa = is_array($empresa) ? $empresa : [];
    $L = $this->L ?? 48;

    $p->setJustification(Printer::JUSTIFY_CENTER);

    // — Logo (opcional) —
    if (!empty($this->logo) && file_exists(public_path($this->logo))) {
        try {
            $img = EscposImage::load(public_path($this->logo), false);
            $p->bitImage($img);
        } catch (\Throwable $e) {
            error_log("Erro ao carregar logo: " . $e->getMessage());
        }
    }

    // — Nome da empresa —
    $p->setEmphasis(true);
    $p->setTextSize(2, 1);
    $p->text(mb_strtoupper($empresa['nome'] ?? 'EMPRESA', 'UTF-8') . "\n");
    $p->setTextSize(1, 1);
    $p->setEmphasis(false);

    // — Slogan —
    if (!empty($this->slogan)) {
        $p->text($this->slogan . "\n");
    }

    $p->text(str_repeat('-', $L) . "\n");

    // — Endereço —
    if (!empty($this->endereco)) {
        $p->text($this->endereco . "\n");
    }

    // — NIF —
    $p->text('NIF: ' . ($empresa['nif'] ?? '') . "\n");
    $p->text(str_repeat('-', $L) . "\n");

    // — Contactos —
    $linhas = [];
    if (!empty($this->telefone)) {
        $linha = 'Tel: ' . $this->telefone;
        if (!empty($this->telefone2)) $linha .= ' / ' . $this->telefone2;
        $linhas[] = $linha;
    }
    if (!empty($this->email)) $linhas[] = 'Email: ' . $this->email;

    foreach ($linhas as $linha) {
        $p->text($linha . "\n");
    }

    $p->text(str_repeat('=', $L) . "\n");
    $p->setJustification(Printer::JUSTIFY_LEFT);
}

    private function bloco2TipoNumero(Printer $p, DocumentoFiscal $d): void
    {
        $p->setJustification(Printer::JUSTIFY_CENTER);
        $p->setEmphasis(true);
        $p->text(
            ($d->tipo_documento_nome ?? $d->tipo_documento)
                . ' N '
                . ($d->numero_documento ?? '')
                . "\n"
        );
        $p->setEmphasis(false);
        $p->setJustification(Printer::JUSTIFY_LEFT);

        $data = date('d/m/Y', strtotime($d->data_emissao ?? now()));
        $hora = $d->hora_emissao ? substr($d->hora_emissao, 0, 5) : '';

        // — Série à esquerda, data+hora à direita (dado original) —
        $p->text($this->linhaLR('Serie: ' . ($d->serie ?? ''), $data . ' ' . $hora));

        $p->text(str_repeat('-', $this->L) . "\n");
    }

private function conectar(): void
{
    $so = strtoupper(substr(PHP_OS, 0, 3));

    if ($so === 'WIN') {
        // Windows — usar nome da impressora compartilhada/local correto
        $nomeWindows = 'AUTHO-THERMAL';
        $connector = new WindowsPrintConnector($nomeWindows);
    } elseif ($so === 'LIN') {
        // Linux (CUPS)
        $connector = new CupsPrintConnector("AUTO-THERMAL");
    } else {
        // Rede TCP/IP fallback
        $connector = new NetworkPrintConnector($this->nomeImpressora, 9100);
    }

    $profile       = CapabilityProfile::load('default');
    $this->printer = new Printer($connector, $profile);
}

    private function fechar(): void
    {
        try {
            $this->printer?->close();
        } catch (\Throwable) {
        }
    }

    private function bloco3OrigemRc(Printer $p, DocumentoFiscal $origem): void
    {
        $p->text(
            'Ref.: '
                . ($origem->tipo_documento_nome ?? $origem->tipo_documento)
                . ' N '
                . $origem->numero_documento
                . "\n"
        );
        $p->text(str_repeat('-', $this->L) . "\n");
    }

    private function bloco4Cliente(Printer $p, array $cliente): void
    {
        $p->setEmphasis(true);
        $p->text('Cliente: ' . ($cliente['nome'] ?? 'Consumidor Final') . "\n");
        $p->setEmphasis(false);
        if (!empty($cliente['nif'])) $p->text('NIF: ' . $cliente['nif'] . "\n");
        $p->text(str_repeat('-', $this->L) . "\n");
    }

    private function bloco5Itens(Printer $p, iterable $itens): void
    {
        $p->setEmphasis(true);
        $p->text("Desc                  Qtd     Total\n");
        $p->setEmphasis(false);
        $p->text(str_repeat('-', $this->L) . "\n");

        foreach ($itens as $item) {
            $desc  = substr($item->descricao ?? 'Item', 0, 20);
            $qtd   = number_format((float)($item->quantidade ?? 1), 0);
            $total = number_format((float)($item->total_linha ?? 0), 2, ',', '.') . ' Kz';

            $p->text(
                str_pad($desc, 20) .
                    str_pad($qtd,  8, ' ', STR_PAD_LEFT) .
                    str_pad($total, 15, ' ', STR_PAD_LEFT) . "\n"
            );
        }

        $p->text(str_repeat('=', $this->L) . "\n");
    }

    private function bloco6Totais(Printer $p, DocumentoFiscal $d, DocumentoFiscal $docInfo): void
    {
        $p->text("Base Tributavel: " . number_format((float)($docInfo->base_tributavel ?? 0), 2, ',', '.') . " Kz\n");
        $p->text("Total IVA:       " . number_format((float)($docInfo->total_iva       ?? 0), 2, ',', '.') . " Kz\n");

        if ((float)($docInfo->total_retencao ?? 0) > 0) {
            $p->text("Retencao:       -" . number_format((float)$docInfo->total_retencao, 2, ',', '.') . " Kz\n");
        }

        $p->text(str_repeat('-', $this->L) . "\n");

        $p->setEmphasis(true);
        $p->text("TOTAL:           " . number_format((float)$d->total_liquido, 2, ',', '.') . " Kz\n");
        $p->setEmphasis(false);

        $p->text(str_repeat('=', $this->L) . "\n");
    }

private function bloco7QrCode(Printer $p, string $qrCode): void
{
    $L = $this->L ?? 48; // largura da linha, padrão 48 se não definido

    $p->setJustification(Printer::JUSTIFY_CENTER);

    if (!empty($this->rotuloQrCode)) {
        $p->text($this->rotuloQrCode . "\n");
    }

    try {
        $p->qrCode($qrCode, Printer::QR_ECLEVEL_M, 3);
    } catch (\Throwable $e) {
        error_log("Erro ao imprimir QR Code: " . $e->getMessage());
        $p->text("[QR Code]\n");
    }

    $p->setJustification(Printer::JUSTIFY_LEFT);
    $p->text(str_repeat('-', $L) . "\n");
}

    private function bloco8Hash(Printer $p, string $hash): void
    {
        $p->text("Hash: " . substr($hash, 0, $this->hashMaxChars) . "\n");
        $p->text(str_repeat('-', $this->L) . "\n");
    }

    private function bloco9Rodape(Printer $p): void
    {
        $p->setJustification(Printer::JUSTIFY_CENTER);

        // — Política de devolução (estático, opcional) —
        if (!empty($this->politicaDevolucao)) {
            $p->text(str_repeat('-', $this->L) . "\n");
            // Quebra o texto em linhas para caber na largura do talão
            $linhas = wordwrap($this->politicaDevolucao, $this->L, "\n", true);
            $p->text($linhas . "\n");
        }

        $p->text(str_repeat('=', $this->L) . "\n");
        $p->text($this->textoProcessamento . "\n");   // dado original
        $p->text($this->mensagemFinal . "\n");          // estático configurável
        $p->text("*** Fim do Documento ***\n");          // dado original
        $p->setJustification(Printer::JUSTIFY_LEFT);
        $p->feed(3);
    }
}
