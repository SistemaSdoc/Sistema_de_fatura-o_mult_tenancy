@php
if (!isset($documento) || !$documento) {
    die('Documento não encontrado');
}

// Dados DINÂMICOS da empresa (vindos do controller via $empresa)
$empresaMorada = $empresa['endereco'] ?? $empresa['morada'] ?? 'Endereço não registrado';
$empresaTelefone = $empresa['telefone'] ?? 'Telefone não registrado';
$empresaEmail = $empresa['email'] ?? 'Email não registrado';
$empresaNome = $empresa['nome'] ?? 'EMPRESA';
$empresaNif = $empresa['nif'] ?? '0000000000';

// ✅ DADOS BANCÁRIOS - PRIORIZAR DADOS DO DOCUMENTO SOBRE OS DA EMPRESA
// Primeiro, tenta pegar do documento (campos salvos no banco)
$docNomeBanco = $documento->nome_banco ?? null;
$docIban = $documento->iban ?? null;
$docNumeroConta = $documento->numero_conta ?? null;

// Se não tiver no documento, usa os da empresa
$empresaBanco = $docNomeBanco ?? $empresa['nome_banco'] ?? null;
$empresaConta = $docNumeroConta ?? $empresa['numero_conta'] ?? null;
$empresaIban = $docIban ?? $empresa['iban'] ?? null;

// Verificar se tem dados bancários
$temDadosBancarios = !empty($empresaBanco) || !empty($empresaConta) || !empty($empresaIban);

// ✅ Log para debug (remover em produção)
Log::info('[PDF View] Dados bancários', [
    'doc_nome_banco' => $docNomeBanco,
    'doc_iban' => $docIban,
    'doc_numero_conta' => $docNumeroConta,
    'empresa_banco' => $empresa['nome_banco'] ?? null,
    'empresa_iban' => $empresa['iban'] ?? null,
    'empresa_conta' => $empresa['numero_conta'] ?? null,
    'final_banco' => $empresaBanco,
    'final_iban' => $empresaIban,
    'final_conta' => $empresaConta,
]);

// Logo DINÂMICO
$empresaLogo = asset('images/default-logo.png');
if (!empty($empresa['logo_base64'])) {
    $empresaLogo = $empresa['logo_base64'];
} elseif (!empty($empresa['logo'])) {
    $logoPath = ltrim($empresa['logo'], '/');
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
    'FRt' => 'Fact. Retificação'
];

// Estado e cores
$estadoClasse = match($documento->estado ?? '') {
    'emitido' => 'estado-emitido',
    'paga' => 'estado-paga',
    'parcialmente_paga' => 'estado-parcial',
    'cancelado' => 'estado-cancelado',
    'expirado' => 'estado-expirado',
    default => 'estado-emitido'
};

$estadoLabel = match($documento->estado ?? '') {
    'emitido' => 'Emitido',
    'paga' => 'Pago',
    'parcialmente_paga' => 'Pag. Parcial',
    'cancelado' => 'Cancelado',
    'expirado' => 'Expirado',
    default => ($documento->estado ?? '')
};

$metodosPagamento = [
    'transferencia' => 'Transferência Bancária',
    'multibanco' => 'Multibanco',
    'dinheiro' => 'Dinheiro',
    'cheque' => 'Cheque',
    'cartao' => 'Cartão'
];

// ============================================================
// PARA RECIBOS: Buscar dados da factura de origem
// ============================================================
$documentoOrigemInfo = null;
$itensParaExibir = $itens;
$docParaTotais = $documento;

if ($documento->tipo_documento === 'RC') {
    // Tentar obter o documento de origem (factura)
    if (isset($documentoOrigem) && $documentoOrigem) {
        $documentoOrigemInfo = $documentoOrigem;
    } elseif (isset($documento->documentoOrigem) && $documento->documentoOrigem) {
        $documentoOrigemInfo = $documento->documentoOrigem;
    } elseif ($documento->fatura_id) {
        $documentoOrigemInfo = \App\Models\Tenant\DocumentoFiscal::with(['itens', 'cliente', 'venda'])
            ->find($documento->fatura_id);
    }
    
    // Se encontrou a factura de origem, usar os dados dela
    if ($documentoOrigemInfo) {
        $docParaTotais = $documentoOrigemInfo;
        
        // Usar os itens da factura de origem
        if (isset($documentoOrigemInfo->itens) && count($documentoOrigemInfo->itens) > 0) {
            $itensParaExibir = $documentoOrigemInfo->itens;
        }
        
        // Se o cliente não veio no documento, buscar da factura
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
                ];
            }
        }
    }
}

// Tentar obter o desconto global da venda associada (usando docParaTotais que agora pode ser a factura origem)
$descontoGlobal = 0;
$troco = 0;

if ($docParaTotais->venda_id && isset($docParaTotais->venda)) {
    $venda = $docParaTotais->venda;
    $descontoGlobal = (float) ($venda->desconto_global ?? 0);
    $troco = (float) ($documento->troco ?? 0);
} else {
    $descontoGlobal = (float) ($docParaTotais->desconto_global ?? 0);
    $troco = (float) ($documento->troco ?? 0);
}

// Calcular percentual de desconto
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
            margin: 40mm;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 12px;
            color: #000000;
            background: #fff;
            line-height: 1.4;
        }

        .page {
            max-width: 190mm;
            margin: 0 auto;
            padding: 0;
        }

        /* Dados Bancários */
        .bank-box {
            background: #f8fbff;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px 14px;
            margin-bottom: 30px;
            font-size: 11px;
        }

        .bank-box .bank-title {
            font-weight: bold;
            font-size: 11px;
            color: #123859;
            margin-bottom: 8px;
            text-transform: uppercase;
        }

        .bank-box .bank-row {
            display: table-row;
        }

        .bank-box .bank-label {
            display: table-cell;
            padding: 3px 8px 3px 0;
            font-weight: bold;
            width: 95px;
            color: #374151;
        }

        .bank-box .bank-value {
            display: table-cell;
            padding: 3px 0;
        }

        .bank-box .iban-value {
            font-family: 'DejaVu Sans Mono', monospace;
            letter-spacing: 0.8px;
        }

        .clearfix::after {
            content: "";
            display: block;
            clear: both;
        }

        /* CABEÇALHO - Layout em duas colunas */
        .header {
            border-bottom: 2px solid #000000;
            padding-bottom: 14px;
            margin-bottom: 18px;
            display: table;
            width: 100%;
        }

        /* COLUNA ESQUERDA - Logo + Informações da Empresa lado a lado */
        .header-left {
            display: table-cell;
            vertical-align: top;
            width: 60%;
        }

        /* Logo e Empresa lado a lado */
        .logo-empresa-wrapper {
            white-space: nowrap;
        }

        .logo-area {
            display: inline-block;
            vertical-align: middle;
            margin-right: 15px;
        }

        .logo-img {
            max-width: 100px;
            max-height: 100px;
            width: auto;
            height: auto;
            display: block;
        }

        .empresa-info-area {
            display: inline-block;
            vertical-align: middle;
        }

        .empresa-nome {
            font-size: 25px;
            font-weight: bold;
            color: #000000;
            margin-bottom: 5px;
            line-height: 1.2;
        }

        .empresa-info {
            font-size: 15px;
            color: #333333;
            line-height: 1.4;
        }

        /* COLUNA DIREITA - Tipo documento, número e estado */
        .header-right {
            display: table-cell;
            vertical-align: top;
            text-align: right;
            width: 40%;
        }

        .doc-tipo {
            font-size: 22px;
            font-weight: bold;
            color: #000000;
            text-transform: uppercase;
            margin-bottom: 6px;
        }

        .doc-numero {
            font-size: 18px;
            font-weight: bold;
            color: #000000;
            margin-bottom: 8px;
        }

        .doc-estado {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            border: 1px solid #000000;
        }

        /* ORIGEM (para recibos) */
        .origem-box {
            background: #f5f5f5;
            border: 1px solid #cccccc;
            border-radius: 5px;
            padding: 12px 16px;
            margin-bottom: 18px;
            font-size: 14px;
            color: #000000;
        }

        /* INFO */
        .info-row {
            margin-bottom: 20px;
            overflow: hidden;
        }

        .info-col-left {
            float: left;
            width: 48%;
        }

        .info-col-right {
            float: right;
            width: 48%;
        }

        .info-box {
            background: #f9f9f9;
            border: 1px solid #dddddd;
            border-radius: 5px;
            padding: 14px 16px;
        }

        .info-box-title {
            font-size: 15px;
            font-weight: bold;
            text-transform: uppercase;
            color: #000000;
            border-bottom: 1px solid #cccccc;
            padding-bottom: 8px;
            margin-bottom: 12px;
        }

        .info-line {
            margin-bottom: 8px;
            font-size: 14px;
        }

        .info-label {
            color: #555555;
        }

        .info-value {
            font-weight: bold;
            color: #000000;
        }

        /* ITENS */
        table.items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 13px;
        }

        table.items thead th {
            padding: 10px 8px;
            font-size: 15px;
            font-weight: bold;
            text-transform: uppercase;
            text-align: left;
            background: #f0f0f0;
            border-bottom: 2px solid #000000;
        }

        table.items thead th.r {
            text-align: right;
        }

        table.items thead th.c {
            text-align: center;
        }

        table.items tbody tr:nth-child(even) {
            background: #f5f5f5;
        }

        table.items tbody td {
            padding: 12px 10px;
            border-bottom: 1px solid #dddddd;
            vertical-align: top;
        }

        table.items tbody td.r {
            text-align: right;
        }

        table.items tbody td.c {
            text-align: center;
        }

        .item-nome {
            font-weight: bold;
            color: #000000;
            font-size: 15px;
        }

        .item-sub {
            font-size: 13px;
            color: #666666;
            margin-top: 3px;
        }

        .item-badge {
            font-size: 13px;
            background: #e0e0e0;
            color: #000000;
            border-radius: 3px;
            padding: 2px 5px;
            display: inline-block;
        }

        .ret-badge {
            color: #cc0000;
            font-size: 14px;
            font-weight: bold;
        }

        /* TOTAIS */
        .totals-wrapper {
            margin-bottom: 25px;
            overflow: hidden;
        }

        .totals-spacer {
            float: left;
            width: 54%;
        }

        .totals-box {
            float: right;
            width: 46%;
        }

        table.totals {
            width: 100%;
            border-collapse: collapse;
            font-size: 17px;
        }

        table.totals td {
            padding: 10px 12px;
        }

        table.totals td:last-child {
            text-align: right;
            font-weight: bold;
        }

        table.totals .sep td {
            padding: 0;
            height: 2px;
        }

        table.totals .total-final {
            border-bottom: #000000 4px solid;
            border-top: #000000 4px solid;
        }

        table.totals .total-final td {
            font-size: 19px;
            font-weight: bold;
            padding: 10px 10px;
        }

        /* PAGAMENTO */
        .payment-box {
            float: left;
            width: 46%;
            background: #f0f5f0;
            border: 1px solid #cccccc;
            border-radius: 5px;
            padding: 14px 16px;
            margin-bottom: 18px;
        }

        .payment-title {
            font-size: 15px;
            font-weight: bold;
            text-transform: uppercase;
            color: #000000;
            border-bottom: 1px solid #cccccc;
            padding-bottom: 8px;
            margin-bottom: 10px;
        }

        /* OBSERVAÇÕES */
        .obs-box {
            background: #fef9e6;
            border: 1px solid #e0d5b0;
            border-radius: 5px;
            padding: 14px 16px;
            margin-bottom: 18px;
            font-size: 14px;
            color: #333333;
            line-height: 1.6;
        }

        .obs-title {
            font-weight: bold;
            margin-bottom: 6px;
            color: #000000;
            font-size: 15px;
        }

        /* HASH + QR lado a lado */
        .fiscal-block {
            margin-bottom: 18px;
            overflow: hidden;
        }

        .fiscal-left {
            float: left;
            width: 64%;
            padding-right: 12px;
        }

        .fiscal-right {
            float: right;
            width: 32%;
            text-align: center;
        }

        .hash-box {
            background: #f5f5f5;
            border: 1px solid #dddddd;
            border-radius: 5px;
            padding: 14px 18px;
            font-size: 14px;
            word-break: break-all;
        }

        .hash-title {
            font-size: 15px;
            font-weight: bold;
            color: #000000;
            margin-bottom: 5px;
        }

        .hash-val {
            font-family: 'DejaVu Sans Mono', monospace;
            color: #333333;
            line-height: 1.5;
            font-size: 13px;
        }

        .qr-box {
            text-align: center;
        }

        .qr-label {
            font-size: 13px;
            color: #666666;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            margin-bottom: 5px;
        }

        .qr-svg-wrap img,
        .qr-svg-wrap svg {
            width: 90px;
            height: 90px;
            display: block;
            margin: 0 auto;
        }

        .qr-texto-pdf {
            font-size: 7px;
            color: #888888;
            word-break: break-all;
            margin-top: 3px;
            line-height: 1.2;
        }

        .qr-note {
            margin-top: 4px;
            font-size: 9px;
            color: #666666;
            line-height: 1.25;
        }

        .sig-line {
            border-top: 1px solid #999999;
            margin-bottom: 6px;
            width: 80%;
            margin-left: auto;
            margin-right: auto;
        }

        /* RODAPÉ */
        .footer {
            border-top: 2px solid #000000;
            padding-top: 20px;
            margin-top: 16px;
            overflow: hidden;
        }

        .footer-left {
            float: left;
            width: 60%;
            font-size: 14px;
            color: #666666;
            line-height: 1.5;
        }

        .footer-right {
            float: right;
            width: 36%;
            text-align: right;
            font-size: 14px;
            color: #666666;
            line-height: 1.5;
        }

        .footer-thanks {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            color: #000000;
            margin-bottom: 14px;
        }

        .clear-both {
            clear: both;
        }

        @media print {
            .logo-img {
                max-width: 60px;
                max-height: 60px;
            }
            .empresa-nome {
                font-size: 16px;
            }
            .empresa-info {
                font-size: 9px;
            }
        }
    </style>
</head>

<body>
    <div class="page">

        {{-- CABEÇALHO COM LOGO LADO A LADO DA EMPRESA --}}
        <div class="header">
            <div class="header-left">
                <div class="logo-empresa-wrapper">
                    @if(!empty($empresaLogo) && $empresaLogo !== asset('images/default-logo.png'))
                    <div class="logo-area">
                        <img src="{{ $empresaLogo }}" class="logo-img" alt="Logo">
                    </div>
                    @endif
                    <div class="empresa-info-area">
                        <div class="empresa-nome">{{ $empresaNome }}</div>
                        <div class="empresa-info">
                            NIF: {{ $empresaNif }}<br>
                            @if(!empty($empresaEmail) && $empresaEmail !== 'Email não registrado'){{ $empresaEmail }}<br>@endif
                            @if(!empty($empresaTelefone) && $empresaTelefone !== 'Telefone não registrado')Tel: {{ $empresaTelefone }}<br>@endif
                            @if(!empty($empresaMorada) && $empresaMorada !== 'Endereço não registrado'){{ $empresaMorada }}@endif
                        </div>
                    </div>
                </div>
            </div>
            <div class="header-right">
                <div class="doc-tipo">{{ $tiposDocumento[$documento->tipo_documento] ?? $documento->tipo_documento }}</div>
                <div class="doc-numero">{{ $documento->numero_documento }}</div>
                <div class="doc-estado {{ $estadoClasse }}">{{ $estadoLabel }}</div>
            </div>
        </div>

        {{-- ORIGEM (se for recibo, mostra a factura de origem) --}}
        @if($documento->tipo_documento === 'RC' && $documentoOrigemInfo)
        <div class="origem-box">
            <strong>Documento de Origem:</strong><br>
            {{ $tiposDocumento[$documentoOrigemInfo->tipo_documento] ?? $documentoOrigemInfo->tipo_documento }}
            Nº {{ $documentoOrigemInfo->numero_documento }}
            — emitido em {{ \Carbon\Carbon::parse($documentoOrigemInfo->data_emissao)->format('d/m/Y') }}
            @if($documentoOrigemInfo->data_vencimento)
            <br><strong>Vencimento original:</strong> {{ \Carbon\Carbon::parse($documentoOrigemInfo->data_vencimento)->format('d/m/Y') }}
            @endif
        </div>
        @endif

        {{-- INFO DOC + CLIENTE --}}
        <div class="info-row clearfix">
            <div class="info-col-left">
                <div class="info-box">
                    <div class="info-box-title">Dados do Documento</div>
                    <div class="info-line"><span class="info-label">Série: </span><span class="info-value">{{ $documento->serie ?? 'A' }}</span></div>
                    <div class="info-line">
                        <span class="info-label">Data de Emissão: </span>
                        <span class="info-value">{{ \Carbon\Carbon::parse($documento->data_emissao)->format('d/m/Y') }}{{ $documento->hora_emissao ? ' às '.substr($documento->hora_emissao, 0, 5) : '' }}</span>
                    </div>
                    @if($documento->data_vencimento)
                    <div class="info-line"><span class="info-label">Vencimento: </span><span class="info-value">{{ \Carbon\Carbon::parse($documento->data_vencimento)->format('d/m/Y') }}</span></div>
                    @endif
                    <div class="info-line"><span class="info-label">Operador: </span><span class="info-value">{{ $documento->user->name ?? 'Sistema' }}</span></div>
                </div>
            </div>
            <div class="info-col-right">
                <div class="info-box">
                    <div class="info-box-title">Cliente</div>
                    <div class="info-line"><span class="info-label">Nome: </span><span class="info-value">{{ $cliente['nome'] ?? 'Consumidor Final' }}</span></div>
                    @if(!empty($cliente['nif']))<div class="info-line"><span class="info-label">NIF: </span><span class="info-value">{{ $cliente['nif'] }}</span></div>@endif
                    @if(!empty($cliente['morada']))<div class="info-line"><span class="info-label">Morada: </span><span class="info-value">{{ $cliente['morada'] }}</span></div>@endif
                </div>
            </div>
        </div>

        {{-- ITENS (para recibos, mostra os itens da factura de origem) --}}
        @if(!empty($itensParaExibir) && count($itensParaExibir) > 0)
        <table class="items">
            <thead>
                <tr>
                    <th style="width:38%">Descrição</th>
                    <th class="c" style="width:9%">Qtd</th>
                    <th class="r" style="width:14%">Preço Unit.</th>
                    <th class="c" style="width:8%">IVA</th>
                    <th class="c" style="width:8%">Ret.</th>
                    <th class="r" style="width:23%">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($itensParaExibir as $item)
                <tr>
                    <td class="item-nome">
                        <div class="item-nome">{{ $item->descricao ?? $item->nome_produto ?? '' }}</div>
                        @if(!empty($item->codigo_produto))<div class="item-sub">Ref: {{ $item->codigo_produto }}</div>@endif
                    </td>
                    <td class="c">{{ number_format((float)($item->quantidade ?? 0), 2, ',', '.') }}</td>
                    <td class="r">{{ number_format((float)($item->preco_unitario ?? 0), 2, ',', '.') }} Kz</td>
                    <td class="c">
                        @if(($item->taxa_iva ?? 0) > 0)
                        <span class="item-badge">{{ number_format((float)$item->taxa_iva, 1, ',', '.') }}%</span>
                        @else
                        —
                        @endif
                    </td>
                    <td class="c">
                        @if(!empty($item->taxa_retencao) && (float)$item->taxa_retencao > 0)
                        <span class="ret-badge">{{ number_format((float)$item->taxa_retencao, 1, ',', '.') }}%</span>
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
        <div class="obs-box" style="background: #fff5e6; text-align: center;">
            Documento sem itens detalhados
        </div>
        @endif

        {{-- TOTAIS (usa docParaTotais que para recibos é a factura origem) --}} 
        <div class="totals-wrapper clearfix">
            <div class="totals-spacer"></div>
            <div class="totals-box">
                <table class="totals">
                    @if($temDesconto)
                    <tr class="disc-row">
                        <td class="lbl">Subtotal Bruto:</td>
                        <td>{{ number_format($docParaTotais->base_tributavel + $descontoGlobal, 2, ',', '.') }} Kz</td>
                    </tr>
                    <tr class="disc-row">
                        <td class="lbl">Desconto ({{ number_format($percentualDesconto, 2, ',', '.') }}%):</td>
                        <td>{{ number_format($descontoGlobal, 2, ',', '.') }} Kz</td>
                    </tr>
                    @endif
                    <tr>
                        <td class="lbl">Base Tributável:</td>
                        <td>{{ number_format($docParaTotais->base_tributavel ?? 0, 2, ',', '.') }} Kz</td>
                    </tr>
                    <tr>
                        <td class="lbl">Total IVA:</td>
                        <td>{{ number_format($docParaTotais->total_iva ?? 0, 2, ',', '.') }} Kz</td>
                    </tr>
                    @if(($docParaTotais->total_retencao ?? 0) > 0)
                    <tr class="ret-row">
                        <td class="lbl">Retenção na Fonte:</td>
                        <td>- {{ number_format((float)$docParaTotais->total_retencao, 2, ',', '.') }} Kz</td>
                    </tr>
                    @endif
                    @if(!empty($documento->metodo_pagamento))
                    <tr>
                        <td class="lbl">Forma de Pagamento:</td>
                        <td>{{ $metodosPagamento[$documento->metodo_pagamento] ?? ucfirst($documento->metodo_pagamento) }}</td>
                    </tr>
                    @endif
                    @if($temTroco)
                    <tr>
                        <td class="lbl">Troco:</td>
                        <td>{{ number_format($troco, 2, ',', '.') }} Kz</td>
                    </tr>
                    @endif
                    <tr class="sep"><td colspan="2"></td></tr>
                    <tr class="total-final">
                        <td><strong>TOTAL PAGO:</strong></td>
                        <td><strong>{{ number_format((float)($documento->total_liquido ?? 0), 2, ',', '.') }} Kz</strong></td>
                    </tr>
                    @if($documentoOrigemInfo && ($documentoOrigemInfo->total_liquido ?? 0) > ($documento->total_liquido ?? 0))
                    <tr class="sep"><td colspan="2"></td></tr>
                    <tr>
                        <td class="lbl">Valor Pendente:</td>
                        <td>{{ number_format((float)($documentoOrigemInfo->total_liquido - $documento->total_liquido), 2, ',', '.') }} Kz</td>
                    </tr>
                    @endif
                </table>
            </div>
        </div>

        {{-- HASH FISCAL + QR CODE --}}
        @if(!empty($documento->hash_fiscal) || !empty($proof_qr_html) || !empty($qr_html))
        <div class="fiscal-block clearfix">
            @if(!empty($documento->hash_fiscal))
            <div class="fiscal-left">
                <div class="hash-box">
                    <div class="hash-title">Autenticação Fiscal</div>
                    <div class="hash-val">{{ $documento->hash_fiscal }}</div>
                </div>
            </div>
            @endif
            <div class="fiscal-right">
                @if(!empty($proof_qr_html))
                    <div class="qr-box proof-box">
                        <div class="qr-label">Comprovativo Público</div>
                        <div class="qr-svg-wrap">{!! $proof_qr_html !!}</div>
                        <div class="qr-note">Leia este código para abrir o comprovativo público.</div>
                    </div>
                @elseif(!empty($qr_html))
                    <div class="qr-box">
                        <div class="qr-label">QR Code — DP 71/25</div>
                        <div class="qr-svg-wrap">{!! $qr_html !!}</div>
                    </div>
                @endif
            </div>
        </div>
        @endif

        {{-- ✅ DADOS BANCÁRIOS - PRIORIZA DADOS DO DOCUMENTO --}}
        @if($temDadosBancarios)
        <div class="bank-box">
            <div class="bank-title">📋 DADOS BANCÁRIOS PARA PAGAMENTO</div>
            <div style="display: table; width: 100%;">
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
                    <span class="bank-value iban-value">{{ $empresaIban }}</span>
                </div>
                @endif
                @if(!empty($empresaBanco) || !empty($empresaConta) || !empty($empresaIban))
                <div style="margin-top: 6px; font-size: 9px; color: #666666; border-top: 1px solid #e5e7eb; padding-top: 6px;">
                    Utilize estes dados para efectuar o pagamento por transferência bancária.
                </div>
                @endif
            </div>
        </div>
        @endif

        {{-- RODAPÉ --}}
        <div class="footer-thanks">Obrigado pela preferência!</div>
        <div class="footer clearfix">
            <div class="footer-left">
                <strong>{{ $empresaNome }}</strong> &nbsp;|&nbsp; NIF: {{ $empresaNif }}<br>
                {{ $empresaMorada }} &nbsp;|&nbsp; Tel: {{ $empresaTelefone }}
            </div>
            <div class="footer-right">
                Documento gerado em {{ now()->format('d/m/Y') }} às {{ now()->format('H:i') }}<br>
                {{ $empresaEmail }}
            </div>
        </div>

    </div>
</body>

</html>