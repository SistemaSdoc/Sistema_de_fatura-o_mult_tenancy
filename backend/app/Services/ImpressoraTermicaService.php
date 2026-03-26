<?php

namespace App\Services;

use App\Models\DocumentoFiscal;
use Mike42\Escpos\PrintConnectors\CupsPrintConnector;
use Mike42\Escpos\PrintConnectors\WindowsPrintConnector;
use Mike42\Escpos\PrintConnectors\NetworkPrintConnector;
use Mike42\Escpos\Printer;
use Mike42\Escpos\CapabilityProfile;
use Mike42\Escpos\EscposImage;
use Illuminate\Support\Facades\Log;

/**
 * ImpressoraTermicaService — Talão térmico 80mm compacto
 *
 * Estrutura:
 *  1. Logo (pequeno, centrado) + Empresa + NIF + Morada + Tel
 *  2. Tipo | Nº   /   Série | Data Hora
 *  3. Referência de origem (só RC)
 *  4. Cliente
 *  5. Itens  (desc 20 | qtd 4 | total)  +  IVA / Ret
 *  6. Totais (base, IVA, retenção, TOTAL)
 *  7. QR Code AGT (DP 71/25)
 *  8. Hash Fiscal
 *  9. Rodapé + Dados Bancários
 */
class ImpressoraTermicaService
{
    protected string   $nomeImpressora;
    protected ?Printer $printer = null;

    /**
     * Largura da linha em caracteres (Font A, papel 80mm).
     * POS-80 típica = 48. Ajusta se necessário.
     */
    protected int $L = 42;

    public function __construct()
    {
        $this->nomeImpressora = env('IMPRESSORA_TERMICA', 'POS-80');
    }

    /* ── Público: imprimir ─────────────────────────────────────────── */

    public function imprimirDocumento(DocumentoFiscal $documento, array $dados): bool
    {
        try {
            $this->conectar();

            $docInfo = $documento;
            if ($documento->tipo_documento === 'RC' && $documento->fatura_id) {
                $origem = DocumentoFiscal::find($documento->fatura_id);
                if ($origem) $docInfo = $origem;
            }

            $empresa = $dados['empresa'] ?? [];
            $cliente = $dados['cliente'] ?? [];
            $itens   = $dados['itens']   ?? [];
            $qrCode  = $dados['qr_code'] ?? null;

            $this->bloco1Cabecalho($empresa);
            $this->bloco2TipoNumero($documento);
            if ($documento->tipo_documento === 'RC' && $docInfo !== $documento) {
                $this->bloco3OrigemRc($docInfo);
            }
            $this->bloco4Cliente($cliente);
            $this->bloco5Itens($itens);
            $this->bloco6Totais($documento, $docInfo);
            if (!empty($qrCode)) $this->bloco7QrCode($qrCode);
            if (!empty($documento->hash_fiscal)) $this->bloco8Hash($documento->hash_fiscal);
            $this->bloco9Rodape();

            $this->printer->cut();
            $this->printer->close();
            return true;
        } catch (\Exception $e) {
            Log::error('Erro térmica', ['error' => $e->getMessage(), 'doc' => $documento->id ?? null]);
            $this->fechar();
            throw $e;
        }
    }


    /* ══════════════════════════════════════════════════════════════════
       BLOCOS
    ══════════════════════════════════════════════════════════════════ */

    /**
     * 1. Logo pequeno + dados da empresa — sem linhas em branco extra
     */
    private function bloco1Cabecalho(array $empresa): void
    {
        $this->printer->setJustification(Printer::JUSTIFY_CENTER);

        // Logo — escala para 100×100 px antes de enviar à impressora
        // Isso resulta em ~25mm no papel, adequado para talão
        foreach ([public_path('images/4.png'), public_path('images/logo.png')] as $path) {
            if (file_exists($path)) {
                try {
                    // Redimensionar logo para 100px via GD (se disponível)
                    $imgResized = $this->redimensionarImagem($path, 100);
                    if ($imgResized) {
                        $escImg = EscposImage::load($imgResized, false);
                        $this->printer->graphics($escImg, Printer::IMG_DEFAULT);
                        // Apagar ficheiro temporário se foi criado
                        if ($imgResized !== $path) @unlink($imgResized);
                    } else {
                        // GD não disponível — tentar carregar directamente
                        $escImg = EscposImage::load($path, false);
                        $this->printer->graphics($escImg, Printer::IMG_DEFAULT);
                    }
                    break;
                } catch (\Throwable $e) {
                    Log::warning('Logo térmica falhou', ['path' => $path, 'error' => $e->getMessage()]);
                }
            }
        }

        // Nome empresa — negrito, sem feed extra
        $this->printer->setEmphasis(true);
        $this->printer->text(mb_strtoupper($empresa['nome'] ?? '') . "\n");
        $this->printer->setEmphasis(false);
        $this->printer->text('NIF: ' . ($empresa['nif'] ?? '') . "\n");
        $this->printer->text($this->fit('Rua Fictícia, nº 123 - Luanda, Angola') . "\n");
        $this->printer->text('Tel: 923 000 000' . "\n");
        $this->printer->text($this->fit("Email: [EMAIL_ADDRESS]") . "\n");
        $this->printer->text($this->sep() . "\n");
        $this->printer->setJustification(Printer::JUSTIFY_LEFT);
    }

    /**
     * 2. Tipo e Número / Série e Data — 2 linhas, sem espaço extra
     */
    private function bloco2TipoNumero(DocumentoFiscal $documento): void
    {
        $this->printer->setEmphasis(true);
        $this->printer->text(
            $this->cols($documento->tipo_documento_nome, 'N ' . $documento->numero_documento) . "\n"
        );
        $this->printer->setEmphasis(false);

        $data = \Carbon\Carbon::parse($documento->data_emissao)->format('d/m/Y');
        $hora = $documento->hora_emissao ? substr($documento->hora_emissao, 0, 5) : '';
        $this->printer->text(
            $this->cols('Serie: ' . ($documento->serie ?? ''), $data . ' ' . $hora) . "\n"
        );
        $this->printer->text("Operador: " . $documento->user->name . "\n");
        $this->printer->text($this->sep() . "\n");
    }

    /**
     * 3. Referência de origem (RC)
     */
    private function bloco3OrigemRc(DocumentoFiscal $origem): void
    {
        $this->printer->text('Ref.: ' . $origem->tipo_documento_nome . ' N ' . $origem->numero_documento . "\n");
        $this->printer->text($this->sep() . "\n");
    }

    /**
     * 4. Cliente — compacto, sem linha em branco
     */
    private function bloco4Cliente(array $cliente): void
    {
        $this->printer->setEmphasis(true);
        $this->printer->text('Cliente: ' . $this->fit($cliente['nome'] ?? 'Consumidor Final', $this->L - 9) . "\n");
        $this->printer->setEmphasis(false);
        if (!empty($cliente['nif'])) $this->printer->text('NIF: ' . $cliente['nif'] . "\n");
        $this->printer->text($this->sep() . "\n");
    }

    /**
     * 5. Itens — colunas compactas sem espaços desnecessários
     *    Layout: DESC(20) QTD(4) TOTAL(resto)
     */
    private function bloco5Itens(iterable $itens): void
    {
        $wD = 20;                       // descrição
        $wQ = 4;                        // qtd
        $wT = $this->L - $wD - $wQ - 2; // total (2 separadores)

        // Cabeçalho compacto
        $this->printer->setEmphasis(true);
        $this->printer->text(
            str_pad('Desc', $wD) . ' ' .
                str_pad('Qtd', $wQ, ' ', STR_PAD_LEFT) . ' ' .
                str_pad('Total', $wT, ' ', STR_PAD_LEFT) . "\n"
        );
        $this->printer->setEmphasis(false);
        $this->printer->text($this->sep('-') . "\n");

        foreach ($itens as $item) {
            $desc  = str_pad($this->fit($item->descricao ?? '', $wD), $wD);
            $qtd   = str_pad(number_format((float)($item->quantidade ?? 1), 0), $wQ, ' ', STR_PAD_LEFT);
            $total = str_pad(number_format((float)($item->total_linha ?? 0), 2, ',', '.') . 'Kz', $wT, ' ', STR_PAD_LEFT);

            $this->printer->text($desc . ' ' . $qtd . ' ' . $total . "\n");

            // Taxas numa linha só — compacto
            $iva = (float)($item->taxa_iva ?? 0) > 0 ? 'IVA:' . $item->taxa_iva . '%' : 'IVA:-';
            $ret = (float)($item->valor_retencao ?? 0) > 0
                ? 'Ret:' . number_format((float)($item->taxa_retencao ?? 0), 1) . '%'
                : '';

            $linha = ' ' . $iva . ($ret ? '  ' . $ret : '');
            $this->printer->setFont(Printer::FONT_B);
            $this->printer->text($linha . "\n");
            $this->printer->setFont(Printer::FONT_A);
        }

        $this->printer->text($this->sep('=') . "\n");
    }

    /**
     * 6. Totais — label esq, valor dir, sem espaços extras
     */
    private function bloco6Totais(DocumentoFiscal $documento, DocumentoFiscal $docInfo): void
    {
        $this->printer->text($this->cols('Base Tributavel:', $this->kz($docInfo->base_tributavel ?? 0)) . "\n");
        $this->printer->text($this->cols('Total IVA:', $this->kz($docInfo->total_iva ?? 0)) . "\n");

        if ((float)($docInfo->total_retencao ?? 0) > 0) {
            $this->printer->text($this->cols('Total Retencao:', '-' . $this->kz($docInfo->total_retencao)) . "\n");
        }

        $this->printer->text($this->sep('-') . "\n");

        $this->printer->setEmphasis(true);
        $this->printer->text($this->cols('TOTAL:', $this->kz($documento->total_liquido)) . "\n");
        $this->printer->setEmphasis(false);
        $this->printer->text($this->sep('=') . "\n");
    }

    /**
     * 7. QR Code — gráfico ESC/POS ou texto fallback
     */
    private function bloco7QrCode(string $qrCode): void
    {
        $this->printer->setJustification(Printer::JUSTIFY_CENTER);
        $this->printer->setFont(Printer::FONT_B);
        $this->printer->text("QR AGT DP71/25\n");
        $this->printer->setFont(Printer::FONT_A);

        try {
            // Tamanho 3 = módulos de 3px — mais pequeno, cabe melhor no talão
            $this->printer->qrCode($qrCode, Printer::QR_ECLEVEL_M, 3);
        } catch (\Throwable $e) {
            // Fallback: texto em font B (menor)
            $this->printer->setJustification(Printer::JUSTIFY_LEFT);
            $this->printer->setFont(Printer::FONT_B);
            foreach (str_split($qrCode, 58) as $linha) {
                $this->printer->text($linha . "\n");
            }
            $this->printer->setFont(Printer::FONT_A);
        }

        $this->printer->setJustification(Printer::JUSTIFY_LEFT);
        $this->printer->text($this->sep() . "\n");
    }

    /**
     * 8. Hash Fiscal — font B para caber na linha
     */
    private function bloco8Hash(string $hash): void
    {
        $this->printer->setFont(Printer::FONT_B);
        $this->printer->text('Hash: ');
        foreach (str_split($hash, 58) as $linha) {
            $this->printer->text($linha . "\n");
        }
        $this->printer->setFont(Printer::FONT_A);
        $this->printer->text($this->sep() . "\n");
    }

    /**
     * 9. Rodapé compacto
     */
    private function bloco9Rodape(): void
    {
        $this->printer->setJustification(Printer::JUSTIFY_CENTER);
        $this->printer->setFont(Printer::FONT_B);
        $this->printer->text("Processado por computador\n");
        $this->printer->setFont(Printer::FONT_A);
        $this->printer->text($this->sep('-') . "\n");
        $this->printer->setEmphasis(true);
        $this->printer->text("Obrigado pela preferência!\n");
        $this->printer->text("Volte sempre!\n");
        $this->printer->setEmphasis(false);
        $this->printer->text("*** Fim do Documento ***\n");
        $this->printer->setJustification(Printer::JUSTIFY_LEFT);
        $this->printer->feed(3);
    }

    /* ══════════════════════════════════════════════════════════════════
       HELPERS
    ══════════════════════════════════════════════════════════════════ */

    private function conectar(): void
    {
        $so = strtoupper(substr(PHP_OS, 0, 3));

        if ($so === 'WIN') {
            // WINDOWS — use o nome exato da impressora local USB
            // Abra "Dispositivos e Impressoras" e copie o nome que aparece
            $nomeWindows = 'TM-T88IV'; // substitua pelo nome correto da sua impressora
            $connector = new WindowsPrintConnector("POS-80");
        } elseif ($so === 'LIN') {
            // LINUX (CUPS)
            $connector = new CupsPrintConnector("POS-80");
        } else {
            // FALLBACK (rede TCP/IP)
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

    /** Separador exato da largura do papel */
    private function sep(string $c = '-'): string
    {
        return str_repeat($c, $this->L);
    }

    /**
     * Duas colunas: esq à esquerda, dir à direita, total = $this->L
     */
    private function cols(string $esq, string $dir, ?int $w = null): string
    {
        $w   = $w ?? $this->L;
        $dL  = mb_strlen($dir);
        $max = $w - $dL - 1;
        if (mb_strlen($esq) > $max) $esq = mb_substr($esq, 0, max(0, $max));
        $sp  = $w - mb_strlen($esq) - $dL;
        return $esq . str_repeat(' ', max(1, $sp)) . $dir;
    }

    /**
     * Trunca texto para caber em $max caracteres
     */
    private function fit(string $s, int $max = 0): string
    {
        $max = $max ?: $this->L;
        return mb_strlen($s) <= $max ? $s : mb_substr($s, 0, $max - 1) . '.';
    }

    /** Formata valor em Kz */
    private function kz(float|int|null $v): string
    {
        return number_format((float)($v ?? 0), 2, ',', '.') . ' Kz';
    }

    /**
     * Redimensiona imagem para $maxPx pixels de largura usando GD.
     * Devolve caminho do ficheiro temporário redimensionado,
     * ou null se GD não estiver disponível.
     */
    private function redimensionarImagem(string $path, int $maxPx): ?string
    {
        if (!extension_loaded('gd')) return null;

        $info = @getimagesize($path);
        if (!$info) return null;

        [$w, $h, $type] = [$info[0], $info[1], $info[2]];

        // Só redimensiona se for maior que $maxPx
        if ($w <= $maxPx) return $path;

        $ratio  = $maxPx / $w;
        $newW   = $maxPx;
        $newH   = (int) round($h * $ratio);

        $src = match ($type) {
            IMAGETYPE_PNG  => imagecreatefrompng($path),
            IMAGETYPE_JPEG => imagecreatefromjpeg($path),
            IMAGETYPE_GIF  => imagecreatefromgif($path),
            default        => null,
        };
        if (!$src) return null;

        $dst = imagecreatetruecolor($newW, $newH);

        // Preservar transparência PNG
        if ($type === IMAGETYPE_PNG) {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            $transparent = imagecolorallocatealpha($dst, 255, 255, 255, 127);
            imagefilledrectangle($dst, 0, 0, $newW, $newH, $transparent);
        }

        imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, $w, $h);

        $tmp = sys_get_temp_dir() . '/logo_termica_' . uniqid() . '.png';
        imagepng($dst, $tmp);

        return $tmp;
    }
}
