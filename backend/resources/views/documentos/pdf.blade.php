@php
if (!isset($documento) || !$documento) {
    die('Documento não encontrado');
}

$empresaMorada = data_get($empresa, 'endereco') ?? data_get($empresa, 'morada') ?? 'Endereço não registrado';
$empresaTelefone = data_get($empresa, 'telefone') ?? 'Telefone não registrado';
$empresaEmail = data_get($empresa, 'email') ?? 'Email não registrado';
$empresaNome = data_get($empresa, 'nome') ?? 'EMPRESA';
$empresaNif = data_get($empresa, 'nif') ?? '0000000000';
$regimeFiscal = data_get($empresa, 'regime_fiscal') ?? 'geral';

$docNomeBanco = $documento->nome_banco ?? null;
$docIban = $documento->iban ?? null;
$docNumeroConta = $documento->numero_conta ?? null;

$empresaBanco = $docNomeBanco ?? data_get($empresa, 'nome_banco');
$empresaConta = $docNumeroConta ?? data_get($empresa, 'numero_conta');
$empresaIban = $docIban ?? data_get($empresa, 'iban');

$temDadosBancarios = ($documento->metodo_pagamento !== 'dinheiro') 
    && (!empty($empresaBanco) || !empty($empresaConta) || !empty($empresaIban));

$empresaLogo = asset('images/default-logo.png');
if (!empty(data_get($empresa, 'logo_base64'))) {
    $empresaLogo = data_get($empresa, 'logo_base64');
} elseif (!empty(data_get($empresa, 'logo'))) {
    $logoPath = ltrim((string) data_get($empresa, 'logo'), '/');
    $logoPath = str_replace('public/', '', $logoPath);
    if (Storage::disk('public')->exists($logoPath)) {
        $logoConteudo = Storage::disk('public')->get($logoPath);
        $empresaLogo = 'data:image/png;base64,' . base64_encode($logoConteudo);
    } else {
        $empresaLogo = asset('storage/' . $logoPath);
    }
}

$tiposDocumento = [
    'FT' => 'Factura', 'FR' => 'Factura-Recibo', 'FA' => 'Fact. Adiantamento',
    'NC' => 'Nota de Crédito', 'ND' => 'Nota de Débito', 'RC' => 'Recibo',
    'FG' => 'Factura Global', 'FGR' => 'Factura Global-Recibo', 'TV' => 'Talão de Venda'
];

$documentoOrigemInfo = null;
$itensParaExibir = $itens ?? collect();
$docParaTotais = $documento;

if ($documento->tipo_documento === 'RC') {
    if (isset($documentoOrigem) && $documentoOrigem) {
        $documentoOrigemInfo = $documentoOrigem;
    } elseif (isset($documento->documentoOrigem) && $documento->documentoOrigem) {
        $documentoOrigemInfo = $documento->documentoOrigem;
    } elseif ($documento->fatura_id) {
        $documentoOrigemInfo = \App\Models\Tenant\DocumentoFiscal::with(['itens', 'cliente', 'venda'])->find($documento->fatura_id);
    }

    if ($documentoOrigemInfo) {
        $docParaTotais = $documentoOrigemInfo;
        if (isset($documentoOrigemInfo->itens) && count($documentoOrigemInfo->itens) > 0) {
            $itensParaExibir = $documentoOrigemInfo->itens;
        }
        if (empty($cliente) || (isset($cliente['nome']) && $cliente['nome'] === 'Consumidor Final')) {
            if ($documentoOrigemInfo->cliente_id && isset($documentoOrigemInfo->cliente)) {
                $cliente = [
                    'nome' => $documentoOrigemInfo->cliente->nome ?? $documentoOrigemInfo->cliente_nome ?? 'Consumidor Final',
                    'nif' => $documentoOrigemInfo->cliente->nif ?? $documentoOrigemInfo->cliente_nif ?? null,
                    'morada' => $documentoOrigemInfo->cliente->endereco ?? null,
                ];
            } elseif ($documentoOrigemInfo->cliente_nome) {
                $cliente = [
                    'nome' => $documentoOrigemInfo->cliente_nome,
                    'nif' => $documentoOrigemInfo->cliente_nif ?? null,
                    'morada' => null,
                ];
            }
        }
    }
}

$descontoGlobal = 0;
if ($docParaTotais->venda_id && isset($docParaTotais->venda)) {
    $descontoGlobal = (float) ($docParaTotais->venda->desconto_global ?? 0);
} else {
    $descontoGlobal = (float) ($docParaTotais->desconto_global ?? 0);
}

$temTroco = (float)($documento->troco ?? 0) > 0;
$softwareCertificacao = $documento->software_certificacao_numero
    ?: data_get($empresa, 'software_validation_number')
    ?: config('agt.numero_certificado') ?: 'EM_HOMOLOGACAO';

$numeroVia = $numeroVia ?? ((int) ($documento->print_count ?? 0) > 0
    ? ((int) $documento->print_count === 1 ? 'Original' : (int) $documento->print_count . '.ª via')
    : 'Duplicado');

// Mapeamento do Regime de IVA para exibição
$regimeExibicao = match ($regimeFiscal) {
    'simplificado' => 'Regime simplificado',
    'exclusao' => 'Regime de exclusão',
    default => 'Regime geral'
};
@endphp

<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8" />
    <title>{{ $documento->numero_documento }}</title>
    <style>
        @page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10px; color: #000; background: #fff; line-height: 1.4; }
        .sheet { width: 100%; max-width: 180mm; margin: 0 auto; }
        
        /* Layout do Cabeçalho */
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .header-table td { vertical-align: top; }
        .logo-img { max-width: 120px; max-height: 60px; object-fit: contain; margin-bottom: 10px; }
        .company-name { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
        .company-info { font-size: 9px; color: #333; line-height: 1.4; }
        
        /* QR Code e Cliente (Direita) */
        .qr-container { text-align: right; margin-bottom: 10px; }
        .qr-container svg { width: 80px; height: 80px; }
        .client-box { text-align: right; font-size: 10px; line-height: 1.4; }
        .client-box strong { font-size: 11px; }
        
        /* Título do Documento */
        .doc-title-box { width: 100%; border-collapse: collapse; margin-bottom: 15px; margin-top: 10px; }
        .doc-title { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
        .doc-meta { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 5px; }
        .doc-meta th, .doc-meta td { text-align: left; padding: 2px 0; vertical-align: bottom; }
        .doc-meta th { font-weight: normal; color: #555; border-bottom: 1px solid #000; }
        .doc-meta td { font-weight: bold; border-bottom: 1px solid #000; padding-top: 4px; }

        /* Tabela de Itens */
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9px; }
        table.items thead th { border-bottom: 2px solid #000; border-top: 2px solid #000; padding: 6px 4px; text-align: left; font-weight: bold; }
        table.items tbody td { border-bottom: 1px solid #ddd; padding: 8px 4px; vertical-align: top; }
        .r { text-align: right !important; }
        .c { text-align: center !important; }
        
        /* Bloco Inferior */
        .bottom-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .bottom-table td { vertical-align: top; width: 50%; }
        
        /* Tabela de Impostos e Regime (Esquerda) */
        table.taxes { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 15px; }
        table.taxes th { text-align: left; border-bottom: 1px solid #000; padding-bottom: 4px; font-weight: bold; }
        table.taxes td { padding: 4px 0; border-bottom: 1px solid #eee; }
        
        .regime-box { margin-bottom: 15px; }
        .regime-title { font-size: 10px; font-weight: bold; text-decoration: underline; margin-bottom: 4px; }
        .legal-text { font-size: 9px; color: #333; margin-top: 10px; }
        
        /* Tabela de Totais (Direita) */
        table.totals { width: 100%; border-collapse: collapse; font-size: 10px; }
        table.totals td { padding: 4px 0; border-bottom: 1px solid #eee; }
        table.totals td:last-child { text-align: right; }
        table.totals .grand td { border-top: 1px solid #000; border-bottom: 2px solid #000; font-weight: bold; font-size: 11px; padding: 6px 0; }
        
        /* Rodapé */
        .footer { margin-top: 30px; font-size: 8px; color: #555; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="sheet">
        
        <!-- CABEÇALHO: EMPRESA E QR CODE -->
        <table class="header-table">
            <tr>
                <td style="width: 60%;">
                    @if(!empty($empresaLogo) && $empresaLogo !== asset('images/default-logo.png'))
                        <img src="{{ $empresaLogo }}" class="logo-img" alt="Logo">
                    @endif
                    <div class="company-name">{{ $empresaNome }}</div>
                    <div class="company-info">
                        @if(!empty($empresaMorada) && $empresaMorada !== 'Endereço não registrado'){{ $empresaMorada }}<br>@endif
                        @if(!empty($empresaTelefone) && $empresaTelefone !== 'Telefone não registrado')Tel: {{ $empresaTelefone }}<br>@endif
                        @if(!empty($empresaEmail) && $empresaEmail !== 'Email não registrado')E-mail: {{ $empresaEmail }}<br>@endif
                        Contribuinte: {{ $empresaNif }}
                    </div>
                </td>
                <td style="width: 40%;">
                    <div class="qr-container">
                        @if(!empty($qr_html))
                            {!! $qr_html !!}
                        @else
                            <!-- Placeholder se o QR não estiver gerado -->
                            <div style="width: 80px; height: 80px; border: 1px dashed #ccc; display: inline-block;"></div>
                        @endif
                    </div>
                    <div class="client-box">
                        Exmo.(s) Sr(s)<br>
                        <strong>{{ strtoupper($cliente['nome'] ?? 'CONSUMIDOR FINAL') }}</strong><br>
                        @if(!empty($cliente['morada'])) {{ $cliente['morada'] }}<br> @endif
                        Luanda - Angola<br>
                        @if(!empty($cliente['nif'])) Contribuinte: {{ $cliente['nif'] }} @endif
                    </div>
                </td>
            </tr>
        </table>

        <!-- IDENTIFICAÇÃO DO DOCUMENTO -->
        <div class="doc-title-box">
            <div class="doc-title">
                {{ $tiposDocumento[$documento->tipo_documento] ?? 'Documento' }}- n.º {{ $documento->numero_documento }}
            </div>
            
            @if($documento->tipo_documento === 'RC' && $documentoOrigemInfo)
                <div style="font-size: 9px; margin-top: 4px; margin-bottom: 8px;">
                    <strong>Doc. Origem:</strong> {{ $documentoOrigemInfo->numero_documento }} 
                    (emitido em {{ \Carbon\Carbon::parse($documentoOrigemInfo->data_emissao)->format('d/m/Y') }})
                </div>
            @endif

            <table class="doc-meta">
                <tr>
                    <th style="width: 15%;">Data de emissão</th>
                    <th style="width: 20%;">Contribuinte</th>
                    <th style="width: 15%;">Vencimento</th>
                    <th style="width: 15%;">V/ Ref.</th>
                    <th style="width: 35%;">Observações</th>
                </tr>
                <tr>
                    <td>{{ \Carbon\Carbon::parse($documento->data_emissao)->format('Y-m-d') }}</td>
                    <td>{{ $cliente['nif'] ?? '999999990' }}</td>
                    <td>{{ $documento->data_vencimento ? \Carbon\Carbon::parse($documento->data_vencimento)->format('Y-m-d') : '-' }}</td>
                    <td>{{ $documento->referencia_externa ?? '-' }}</td>
                    <td>{{ $documento->observacoes ?? '' }}</td>
                </tr>
            </table>
        </div>

        <!-- TABELA DE ITENS -->
        <table class="items">
            <thead>
                <tr>
                    <th style="width: 10%;">Código</th>
                    <th style="width: 45%;">Descrição</th>
                    <th class="r" style="width: 15%;">Preço Uni.</th>
                    <th class="c" style="width: 8%;">Qtd.</th>
                    <th class="c" style="width: 10%;">Taxa/IVA %</th>
                    <th class="c" style="width: 7%;">Desc. %</th>
                    <th class="r" style="width: 15%;">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($itensParaExibir as $item)
                    <tr>
                        <td>{{ $item->codigo_produto ?? $item->produto->codigo ?? 'N/A' }}</td>
                        <td>
                            {{ $item->descricao ?? $item->nome_produto ?? '' }}
                            @if(($item->taxa_iva ?? 0) <= 0 && !empty($item->codigo_isencao))
                                <br><small style="color: #555;">({{ $item->codigo_isencao }} - {{ $item->motivo_isencao }})</small>
                            @endif
                        </td>
                        <td class="r">{{ number_format((float)($item->preco_unitario ?? 0), 2, ',', '.') }} Kz</td>
                        <td class="c">{{ number_format((float)($item->quantidade ?? 0), 2, ',', '.') }}</td>
                        <td class="c">{{ number_format((float)($item->taxa_iva ?? 0), 2, ',', '.') }}%</td>
                        <td class="c">{{ number_format((float)($item->taxa_desconto ?? 0), 2, ',', '.') }}%</td>
                        <td class="r"><strong>{{ number_format((float)($item->total_linha ?? 0), 2, ',', '.') }} Kz</strong></td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <!-- BLOCO INFERIOR: IMPOSTOS E TOTAIS -->
        <table class="bottom-table">
            <tr>
                <!-- ESQUERDA: Impostos, Regime e Texto Legal -->
                <td style="padding-right: 20px;">
                    <table class="taxes">
                        <thead>
                            <tr>
                                <th>Imposto/IVA</th>
                                <th class="r">Incidência</th>
                                <th class="r">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            @if(($docParaTotais->total_iva ?? 0) > 0)
                                <tr>
                                    <td>IVA ({{ number_format((float)($docParaTotais->total_iva / max($docParaTotais->base_tributavel, 1) * 100), 0) }}%)</td>
                                    <td class="r">{{ number_format((float)$docParaTotais->base_tributavel, 2, ',', '.') }} Kz</td>
                                    <td class="r">{{ number_format((float)$docParaTotais->total_iva, 2, ',', '.') }} Kz</td>
                                </tr>
                            @else
                                <tr>
                                    <td>Isento (0%)</td>
                                    <td class="r">{{ number_format((float)$docParaTotais->base_tributavel, 2, ',', '.') }} Kz</td>
                                    <td class="r">0,00 Kz</td>
                                </tr>
                            @endif
                        </tbody>
                    </table>

                    <div class="regime-box">
                        <div class="regime-title">Regime de IVA</div>
                        <div>{{ $regimeExibicao }}</div>
                    </div>

                    <div class="regime-box">
                        <div class="regime-title">Bens e Serviços</div>
                        <div class="legal-text">
                            Os bens/serviços foram colocados à disposição do adquirente na data e local do documento
                        </div>
                    </div>
                </td>

                <!-- DIREITA: Sumário de Totais -->
                <td>
                    <table class="totals">
                        <tr>
                            <td>Total ilíquido:</td>
                            <td>{{ number_format((float)($docParaTotais->base_tributavel ?? 0), 2, ',', '.') }} Kz</td>
                        </tr>
                        <tr>
                            <td>Desconto:</td>
                            <td>{{ number_format($descontoGlobal, 2, ',', '.') }} Kz</td>
                        </tr>
                        <tr>
                            <td>Sem Imposto/IVA/c Desc.:</td>
                            <td>{{ number_format((float)($docParaTotais->base_tributavel ?? 0), 2, ',', '.') }} Kz</td>
                        </tr>
                        <tr>
                            <td>Imposto/IVA:</td>
                            <td>{{ number_format((float)($docParaTotais->total_iva ?? 0), 2, ',', '.') }} Kz</td>
                        </tr>
                        <tr>
                            <td>Retenção: ({{ number_format((float)($docParaTotais->total_retencao ?? 0) > 0 ? (($docParaTotais->total_retencao / max($docParaTotais->base_tributavel, 1)) * 100) : 0, 2, ',', '.') }}%)</td>
                            <td>{{ number_format((float)($docParaTotais->total_retencao ?? 0), 2, ',', '.') }} Kz</td>
                        </tr>
                        @if($temTroco)
                            <tr>
                                <td>Troco:</td>
                                <td>{{ number_format((float)($documento->troco ?? 0), 2, ',', '.') }} Kz</td>
                            </tr>
                        @endif
                        <tr class="grand">
                            <td>Total:</td>
                            <td>{{ number_format((float)($documento->total_liquido ?? 0), 2, ',', '.') }} Kz</td>
                        </tr>
                        @if($documentoOrigemInfo && ($documentoOrigemInfo->total_liquido ?? 0) > ($documento->total_liquido ?? 0))
                            <tr>
                                <td style="color: #555;">Valor Pendente:</td>
                                <td style="color: #555;">{{ number_format((float)($documentoOrigemInfo->total_liquido - $documento->total_liquido), 2, ',', '.') }} Kz</td>
                            </tr>
                        @endif
                    </table>
                </td>
            </tr>
        </table>

        <!-- DADOS BANCÁRIOS (Se aplicável) -->
        @if($temDadosBancarios)
            <div style="margin-top: 20px; font-size: 9px; border-top: 1px solid #ddd; padding-top: 10px;">
                <strong>Dados Bancários para Pagamento:</strong> 
                @if($empresaBanco) Banco: {{ $empresaBanco }} | @endif
                @if($empresaConta) Conta: {{ $empresaConta }} | @endif
                @if($empresaIban) IBAN: {{ $empresaIban }} @endif
            </div>
        @endif

        <!-- RODAPÉ -->
        <div class="footer">
            <div style="margin-bottom: 4px;">
                <strong>Processado por programa validado n.º {{ $softwareCertificacao }} | FaturaJa</strong>
            </div>
            <div style="margin-bottom: 4px;">
                Documento gerado em {{ now('Africa/Luanda')->format('d/m/Y H:i:s') }} | {{ $numeroVia }}
            </div>
            <div>{{ $empresaNome }} | NIF: {{ $empresaNif }}</div>
        </div>

    </div>
</body>
</html>