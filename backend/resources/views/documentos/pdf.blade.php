@php
if (!isset($documento) || !$documento) {
    die('Documento não encontrado');
}

$empresaMorada = data_get($empresa, 'endereco')
    ?? data_get($empresa, 'morada')
    ?? 'Endereço não registrado';
$empresaTelefone = data_get($empresa, 'telefone') ?? 'Telefone não registrado';
$empresaEmail = data_get($empresa, 'email') ?? 'Email não registrado';
$empresaNome = data_get($empresa, 'nome') ?? 'EMPRESA';
$empresaNif = data_get($empresa, 'nif') ?? '0000000000';

$docNomeBanco = $documento->nome_banco ?? null;
$docIban = $documento->iban ?? null;
$docNumeroConta = $documento->numero_conta ?? null;

$empresaBanco = $docNomeBanco ?? data_get($empresa, 'nome_banco');
$empresaConta = $docNumeroConta ?? data_get($empresa, 'numero_conta');
$empresaIban = $docIban ?? data_get($empresa, 'iban');

$temDadosBancarios = !empty($empresaBanco) || !empty($empresaConta) || !empty($empresaIban);

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
    'FT' => 'Factura',
    'FR' => 'Factura-Recibo',
    'FA' => 'Fact. Adiantamento',
    'NC' => 'Nota de Crédito',
    'ND' => 'Nota de Débito',
    'RC' => 'Recibo',
    'FRt' => 'Fact. Retificação',
];

$estadoLabel = match ($documento->estado ?? '') {
    'emitido' => 'Emitido',
    'paga' => 'Pago',
    'parcialmente_paga' => 'Pag. Parcial',
    'cancelado' => 'Cancelado',
    'expirado' => 'Expirado',
    default => (string) ($documento->estado ?? ''),
};

$metodosPagamento = [
    'transferencia' => 'Transferência Bancária',
    'multibanco' => 'Multibanco',
    'dinheiro' => 'Dinheiro',
    'cheque' => 'Cheque',
    'cartao' => 'Cartão',
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
        $documentoOrigemInfo = \App\Models\Tenant\DocumentoFiscal::with(['itens', 'cliente', 'venda'])
            ->find($documento->fatura_id);
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
$troco = 0;

if ($docParaTotais->venda_id && isset($docParaTotais->venda)) {
    $descontoGlobal = (float) ($docParaTotais->venda->desconto_global ?? 0);
    $troco = (float) ($documento->troco ?? 0);
} else {
    $descontoGlobal = (float) ($docParaTotais->desconto_global ?? 0);
    $troco = (float) ($documento->troco ?? 0);
}

$percentualDesconto = 0;
$temDesconto = false;
if ($descontoGlobal > 0 && ($docParaTotais->base_tributavel ?? 0) > 0) {
    $temDesconto = true;
    $subtotalBruto = $docParaTotais->base_tributavel + $descontoGlobal;
    $percentualDesconto = ($descontoGlobal / $subtotalBruto) * 100;
}

$temTroco = $troco > 0;
@endphp

<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8" />
    <title>{{ $documento->numero_documento }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 10mm 10mm 10mm 10mm;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 13px;
            color: #111827;
            background: #fff;
            line-height: 1.5;
        }

        .sheet {
            width: 100%;
            max-width: 190mm;
            margin: 0 auto;
            background: #fff;
        }

        /* ============================================================
           CABEÇALHO - MAIOR
           ============================================================ */
        .header {
            display: table;
            width: 100%;
            border-bottom: 3px solid #123859;
            padding-bottom: 16px;
            margin-bottom: 18px;
        }

        .header-left,
        .header-right {
            display: table-cell;
            vertical-align: top;
        }

        .header-left {
            width: 60%;
        }

        .header-right {
            width: 40%;
            text-align: right;
        }

        .logo-row {
            display: table;
            width: 100%;
        }

        .logo-cell {
            display: table-cell;
            vertical-align: top;
            width: 1px;
            padding-right: 16px;
        }

        .logo-img {
            max-width: 80px;
            max-height: 80px;
            object-fit: contain;
            display: block;
        }

        .company-info-cell {
            display: table-cell;
            vertical-align: top;
        }

        .company-name {
            font-size: 26px;
            font-weight: 700;
            color: #123859;
            margin-bottom: 6px;
        }

        .company-info {
            font-size: 13px;
            color: #374151;
            line-height: 1.5;
        }

        .doc-type {
            font-size: 24px;
            font-weight: 700;
            text-transform: uppercase;
            color: #123859;
        }

        .doc-number {
            font-size: 16px;
            font-weight: 700;
            margin-top: 4px;
        }

        .doc-state {
            display: inline-block;
            margin-top: 8px;
            padding: 4px 12px;
            border: 1px solid #111827;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }

        /* ============================================================
           CAIXAS - MAIOR PADDING
           ============================================================ */
        .origin-box,
        .info-box,
        .bank-box,
        .totals-box,
        .footer-box,
        .note-box {
            border: 1px solid #d1d5db;
            border-radius: 10px;
            background: #fafafa;
        }

        .origin-box {
            padding: 14px 16px;
            margin-bottom: 18px;
            background: #f8fafc;
            font-size: 13px;
        }

        .grid-2 {
            display: table;
            width: 100%;
            table-layout: fixed;
            margin-bottom: 18px;
        }

        .grid-col {
            display: table-cell;
            vertical-align: top;
            width: 50%;
        }

        .grid-col:first-child {
            padding-right: 10px;
        }

        .grid-col:last-child {
            padding-left: 10px;
        }

        .info-box {
            padding: 18px;
            min-height: 120px;
            background: #fff;
        }

        .section-title {
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #123859;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
        }

        .line {
            margin-bottom: 8px;
            font-size: 13px;
        }

        .label {
            color: #6b7280;
        }

        .value {
            font-weight: 700;
            color: #111827;
        }

        /* ============================================================
           TABELA DE ITENS - MAIOR
           ============================================================ */
        table.items {
            width: 100%;
            border-collapse: collapse;
            margin: 18px 0;
        }

        table.items thead th {
            background: #123859;
            color: #fff;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            padding: 12px 10px;
            text-align: left;
        }

        table.items tbody td {
            border-bottom: 1px solid #e5e7eb;
            padding: 14px 10px;
            vertical-align: top;
            font-size: 13px;
        }

        .r {
            text-align: right;
        }

        .c {
            text-align: center;
        }

        .item-name {
            font-weight: 700;
            font-size: 14px;
        }

        .item-sub {
            font-size: 11px;
            color: #6b7280;
            margin-top: 4px;
        }

        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 999px;
            background: #e5eef8;
            color: #123859;
            font-size: 10px;
            font-weight: 700;
        }

        /* ============================================================
           TOTAIS - MAIOR
           ============================================================ */
        .totals-wrap {
            display: table;
            width: 100%;
            margin-top: 10px;
        }

        .totals-spacer,
        .totals-box {
            display: table-cell;
            vertical-align: top;
        }

        .totals-spacer {
            width: 45%;
        }

        .totals-box {
            width: 55%;
            padding: 18px;
            background: #fff;
        }

        table.totals {
            width: 100%;
            border-collapse: collapse;
        }

        table.totals td {
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
            font-size: 14px;
        }

        table.totals td:last-child {
            text-align: right;
            font-weight: 700;
        }

        table.totals .grand td {
            border-top: 3px solid #111827;
            border-bottom: 3px solid #111827;
            padding-top: 12px;
            padding-bottom: 12px;
            font-size: 16px;
        }

        /* ============================================================
           DADOS BANCÁRIOS - MAIOR
           ============================================================ */
        .bank-box {
            margin-top: 18px;
            padding: 18px;
            background: #f8fbff;
            border-color: #cbd5e1;
        }

        .bank-grid {
            display: table;
            width: 100%;
            margin-top: 10px;
        }

        .bank-row {
            display: table-row;
        }

        .bank-label,
        .bank-value {
            display: table-cell;
            padding: 5px 0;
            font-size: 13px;
        }

        .bank-label {
            width: 110px;
            font-weight: 700;
            color: #374151;
        }

        .bank-value {
            color: #111827;
        }

        .iban {
            font-family: 'DejaVu Sans Mono', monospace;
            letter-spacing: 0.8px;
        }

        .bank-note {
            margin-top: 10px;
            font-size: 11px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
            padding-top: 10px;
        }

        /* ============================================================
           HASH FISCAL - MAIOR
           ============================================================ */
        .hash-box {
            border: 1px solid #e5e7eb;
            background: #f9fafb;
            border-radius: 10px;
            padding: 16px 18px;
            word-break: break-all;
            margin-top: 18px;
        }

        .hash-title {
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 8px;
            color: #123859;
        }

        .hash-value {
            font-family: 'DejaVu Sans Mono', monospace;
            font-size: 12px;
            color: #374151;
            line-height: 1.6;
        }

        /* ============================================================
           RODAPÉ - MAIOR
           ============================================================ */
        .footer-box {
            margin-top: 20px;
            padding: 20px;
            background: #fff;
            text-align: center;
        }

        .footer-title {
            font-size: 18px;
            font-weight: 700;
            text-transform: uppercase;
            color: #123859;
            margin-bottom: 8px;
        }

        .footer-msg {
            font-size: 13px;
            color: #374151;
            margin-bottom: 4px;
        }

        .footer-bank {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px dashed #d1d5db;
            font-size: 12px;
            color: #374151;
        }

        .meta-line {
            margin-top: 10px;
            font-size: 11px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="sheet">
        <div class="header">
            <div class="header-left">
                <div class="logo-row">
                    @if(!empty($empresaLogo) && $empresaLogo !== asset('images/default-logo.png'))
                        <div class="logo-cell">
                            <img src="{{ $empresaLogo }}" class="logo-img" alt="Logo">
                        </div>
                    @endif
                    <div class="company-info-cell">
                        <div class="company-name">{{ $empresaNome }}</div>
                        <div class="company-info">
                            NIF: {{ $empresaNif }}<br>
                            @if(!empty($empresaEmail) && $empresaEmail !== 'Email não registrado'){{ $empresaEmail }}<br>@endif
                            @if(!empty($empresaTelefone) && $empresaTelefone !== 'Telefone não registrado')Tel: {{ $empresaTelefone }}<br>@endif
                            @if(!empty($empresaMorada) && $empresaMorada !== 'Endereço não registrado'){{ $empresaMorada }}@endif
                        </div>
                    </div>
                </div>
            </div>
            <div class="header-right">
                <div class="doc-type">{{ $tiposDocumento[$documento->tipo_documento] ?? $documento->tipo_documento }}</div>
                <div class="doc-number">{{ $documento->numero_documento }}</div>
                <div class="doc-state">{{ $estadoLabel }}</div>
            </div>
        </div>

        @if($documento->tipo_documento === 'RC' && $documentoOrigemInfo)
            <div class="origin-box">
                <strong>Documento de Origem:</strong><br>
                {{ $tiposDocumento[$documentoOrigemInfo->tipo_documento] ?? $documentoOrigemInfo->tipo_documento }}
                Nº {{ $documentoOrigemInfo->numero_documento }}
                — emitido em {{ \Carbon\Carbon::parse($documentoOrigemInfo->data_emissao)->format('d/m/Y') }}
                @if($documentoOrigemInfo->data_vencimento)
                    <br><strong>Vencimento original:</strong> {{ \Carbon\Carbon::parse($documentoOrigemInfo->data_vencimento)->format('d/m/Y') }}
                @endif
            </div>
        @endif

        <div class="grid-2">
            <div class="grid-col">
                <div class="info-box">
                    <div class="section-title">Dados do Documento</div>
                    <div class="line"><span class="label">Série:</span> <span class="value">{{ $documento->serie ?? 'A' }}</span></div>
                    <div class="line">
                        <span class="label">Data de Emissão:</span>
                        <span class="value">
                            {{ \Carbon\Carbon::parse($documento->data_emissao)->format('d/m/Y') }}
                            {{ $documento->hora_emissao ? ' às ' . substr($documento->hora_emissao, 0, 5) : '' }}
                        </span>
                    </div>
                    @if($documento->data_vencimento)
                        <div class="line"><span class="label">Vencimento:</span> <span class="value">{{ \Carbon\Carbon::parse($documento->data_vencimento)->format('d/m/Y') }}</span></div>
                    @endif
                    <div class="line"><span class="label">Operador:</span> <span class="value">{{ $documento->user->name ?? 'Sistema' }}</span></div>
                </div>
            </div>
            <div class="grid-col">
                <div class="info-box">
                    <div class="section-title">Cliente</div>
                    <div class="line"><span class="label">Nome:</span> <span class="value">{{ $cliente['nome'] ?? 'Consumidor Final' }}</span></div>
                    @if(!empty($cliente['nif']))<div class="line"><span class="label">NIF:</span> <span class="value">{{ $cliente['nif'] }}</span></div>@endif
                    @if(!empty($cliente['morada']))<div class="line"><span class="label">Morada:</span> <span class="value">{{ $cliente['morada'] }}</span></div>@endif
                </div>
            </div>
        </div>

        @if(!empty($itensParaExibir) && count($itensParaExibir) > 0)
            <table class="items">
                <thead>
                    <tr>
                        <th style="width:40%;">Descrição</th>
                        <th class="c" style="width:8%;">Qtd</th>
                        <th class="r" style="width:14%;">Preço Unit.</th>
                        <th class="c" style="width:8%;">IVA</th>
                        <th class="c" style="width:8%;">Ret.</th>
                        <th class="r" style="width:22%;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($itensParaExibir as $item)
                        <tr>
                            <td>
                                <div class="item-name">{{ $item->descricao ?? $item->nome_produto ?? '' }}</div>
                                @if(!empty($item->codigo_produto))
                                    <div class="item-sub">Ref: {{ $item->codigo_produto }}</div>
                                @endif
                            </td>
                            <td class="c">{{ number_format((float)($item->quantidade ?? 0), 2, ',', '.') }}</td>
                            <td class="r">{{ number_format((float)($item->preco_unitario ?? 0), 2, ',', '.') }} Kz</td>
                            <td class="c">
                                @if(($item->taxa_iva ?? 0) > 0)
                                    <span class="badge">{{ number_format((float)$item->taxa_iva, 1, ',', '.') }}%</span>
                                @else
                                    —
                                @endif
                            </td>
                            <td class="c">
                                @if(!empty($item->taxa_retencao) && (float)$item->taxa_retencao > 0)
                                    <span class="badge">{{ number_format((float)$item->taxa_retencao, 1, ',', '.') }}%</span>
                                @else
                                    —
                                @endif
                            </td>
                            <td class="r"><strong>{{ number_format((float)($item->total_linha ?? 0), 2, ',', '.') }} Kz</strong></td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @else
            <div class="note-box" style="padding:18px; text-align:center; background:#fff7ed; border-color:#fed7aa; margin-bottom:18px;">
                Documento sem itens detalhados
            </div>
        @endif

        <div class="totals-wrap">
            <div class="totals-spacer"></div>
            <div class="totals-box">
                <table class="totals">
                    @if($temDesconto)
                        <tr>
                            <td>Subtotal Bruto</td>
                            <td>{{ number_format($docParaTotais->base_tributavel + $descontoGlobal, 2, ',', '.') }} Kz</td>
                        </tr>
                        <tr>
                            <td>Desconto ({{ number_format($percentualDesconto, 2, ',', '.') }}%)</td>
                            <td>- {{ number_format($descontoGlobal, 2, ',', '.') }} Kz</td>
                        </tr>
                    @endif
                    <tr>
                        <td>Base Tributável</td>
                        <td>{{ number_format($docParaTotais->base_tributavel ?? 0, 2, ',', '.') }} Kz</td>
                    </tr>
                    <tr>
                        <td>Total IVA</td>
                        <td>{{ number_format($docParaTotais->total_iva ?? 0, 2, ',', '.') }} Kz</td>
                    </tr>
                    @if(($docParaTotais->total_retencao ?? 0) > 0)
                        <tr>
                            <td>Retenção</td>
                            <td>- {{ number_format((float)$docParaTotais->total_retencao, 2, ',', '.') }} Kz</td>
                        </tr>
                    @endif
                    @if(!empty($documento->metodo_pagamento))
                        <tr>
                            <td>Forma de Pagamento</td>
                            <td>{{ $metodosPagamento[$documento->metodo_pagamento] ?? ucfirst($documento->metodo_pagamento) }}</td>
                        </tr>
                    @endif
                    @if($temTroco)
                        <tr>
                            <td>Troco</td>
                            <td>{{ number_format($troco, 2, ',', '.') }} Kz</td>
                        </tr>
                    @endif
                    <tr class="grand">
                        <td><strong>TOTAL PAGO</strong></td>
                        <td><strong>{{ number_format((float)($documento->total_liquido ?? 0), 2, ',', '.') }} Kz</strong></td>
                    </tr>
                    @if($documentoOrigemInfo && ($documentoOrigemInfo->total_liquido ?? 0) > ($documento->total_liquido ?? 0))
                        <tr>
                            <td>Valor Pendente</td>
                            <td>{{ number_format((float)($documentoOrigemInfo->total_liquido - $documento->total_liquido), 2, ',', '.') }} Kz</td>
                        </tr>
                    @endif
                </table>
            </div>
        </div>

        {{--  DADOS BANCÁRIOS --}}
        @if($temDadosBancarios)
            <div class="bank-box">
                <div class="section-title">Dados Bancários para Pagamento</div>
                <div class="bank-grid">
                    @if(!empty($empresaBanco))
                        <div class="bank-row">
                            <span class="bank-label">Banco:</span>
                            <span class="bank-value">{{ $empresaBanco }}</span>
                        </div>
                    @endif
                    @if(!empty($empresaConta))
                        <div class="bank-row">
                            <span class="bank-label">Nº Conta:</span>
                            <span class="bank-value">{{ $empresaConta }}</span>
                        </div>
                    @endif
                    @if(!empty($empresaIban))
                        <div class="bank-row">
                            <span class="bank-label">IBAN:</span>
                            <span class="bank-value iban">{{ $empresaIban }}</span>
                        </div>
                    @endif
                </div>
            </div>
        @endif

        {{-- HASH FISCAL APENAS (sem QR/comprovativo) --}}
        @if(!empty($documento->hash_fiscal))
            <div class="hash-box">
                <div class="hash-title">Autenticação Fiscal</div>
                <div class="hash-value">{{ $documento->hash_fiscal }}</div>
            </div>
        @endif

        {{-- RODAPÉ --}}
        <div class="footer-box">
            <div class="footer-title">Obrigado pela preferência!</div>
            <div class="footer-msg">Volte sempre.</div>
            <div class="footer-msg">Processado pelo sistema de facturação.</div>
            <div class="meta-line">
                Documento gerado em {{ now()->format('d/m/Y') }} às {{ now()->format('H:i:s') }}
            </div>
            <div class="meta-line">
                {{ $empresaNome }} | NIF: {{ $empresaNif }} | {{ $empresaEmail }}
            </div>

        </div>
    </div>
</body>
</html>