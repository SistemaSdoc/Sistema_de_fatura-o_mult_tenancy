@php
if (!isset($documento) || !$documento) {
die('Documento não encontrado');
}


$empresaMoradaEstatica = 'Luanda, Urbanização Nova Vida, Rua nº 63, Edifício MF3, 2º';
$empresaTelefoneEstatico = '+244 923678529';
$empresaEmailEstatico = 'sistema.sdoc167@gmail.com';
$empresaLogo = asset('images/3.png');
$empresaNome = $empresa['nome'] ?? $empresa['name'] ?? 'Empresa';
$empresaNif = $empresa['nif'] ?? $empresa['NIF'] ?? '';

$tiposDocumento = [
'FT' => 'Fatura',
'FR' => 'Fatura-Recibo',
'FA' => 'Fat. Adiantamento',
'NC' => 'Nota de Crédito',
'ND' => 'Nota de Débito',
'RC' => 'Recibo',
'FRt' => 'Fat. Retificação'
];

$nomeDocumento = $tiposDocumento[$documento->tipo_documento] ?? $documento->tipo_documento;

$dtEmissao = isset($documento->data_emissao) ? \Carbon\Carbon::parse($documento->data_emissao) : now();
$numero = $documento->numero_documento ?? "{$documento->serie}-" . str_pad($documento->numero ?? 1, 5, '0', STR_PAD_LEFT);
$subtotal = $documento->base_tributavel ?? 0;
$totalIva = $documento->total_iva ?? 0;
$totalRetencao = $documento->total_retencao ?? 0;
$totalLiquido = $documento->total_liquido ?? 0;

// Dados do cliente
$clienteNome = $cliente['nome'] ?? $documento->cliente_nome ?? 'Consumidor Final';
$clienteNif = $cliente['nif'] ?? $documento->cliente_nif ?? '';


// Itens
$itensList = $itens ?? collect();

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
@endphp

<!DOCTYPE html>
<html lang="pt-AO">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ strtoupper($nomeDocumento) }} Nº {{ $numero }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'DejaVu Sans', 'Segoe UI', Arial, sans-serif;
            font-size: 12px;
            color: #1a1a1a;
            background: #e9ecef;
            line-height: 1.5;
            padding: 20px;
        }

        @page {
            size: A4;
            margin: 0.5in;
        }

        .page {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            padding: 28px 32px;
        }

        .clearfix::after {
            content: "";
            display: block;
            clear: both;
        }

        /* CABEÇALHO */
        .header {
            border-bottom: 3px solid #123859;
            padding-bottom: 14px;
            margin-bottom: 18px;
            overflow: hidden;
        }

        .header-left {
            float: left;
            width: 55%;
        }

        .header-right {
            float: right;
            margin-bottom: 0%;
            text-align: right;
        }


        .logo-area {
            float: left;
            width: 15%;
            margin-right: 15px;
        }

        .logo-img {
            max-width: 100%;
            max-height: 70px;
        }

        .empresa-info-area {
            float: left;
            width: 70%;
        }

        .empresa-nome {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 6px;
        }

        .empresa-info {
            font-size: 11px;
            color: #555;
            line-height: 1.6;
        }

        .doc-tipo {
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 5px;
        }

        .doc-numero {
            font-weight: bold;
        }

        .doc-estado {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .estado-emitido {
            background: #dbeafe;
            color: #1e40af;
        }

        .estado-paga {
            background: #dcfce7;
            color: #166534;
        }

        .estado-parcial {
            background: #fef9c3;
            color: #854d0e;
        }

        .estado-cancelado {
            background: #fee2e2;
            color: #991b1b;
        }

        .estado-expirado {
            background: #f3f4f6;
            color: #374151;
        }

        /* ORIGEM */
        .origem-box {
            padding: 10px 14px;
            margin-bottom: 16px;
        }

        /* INFO */
        .info-row {
            margin-bottom: 18px;
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
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 5px;
            padding: 12px 14px;
        }

        .info-box-title {
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            color: #123859;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 6px;
            margin-bottom: 10px;
        }

        .info-line {
            margin-bottom: 6px;
            font-size: 11px;
        }

        .info-label {
            color: #64748b;
        }

        .info-value {
            font-weight: bold;
            color: #1e293b;
        }

        table.items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
            font-size: 11px;
        }

        table.items thead tr {
            color: #000;
            border-bottom: 3px solid #000;
        }

        table.items thead th {
            padding: 3px 5px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            text-align: left;
        }

        table.items thead th.r {
            text-align: right;
        }

        table.items thead th.c {
            text-align: center;
        }


        table.items tbody td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
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
            color: #1e293b;
            font-size: 11px;
        }

        .item-sub {
            font-size: 10px;
            color: #64748b;
            margin-top: 2px;
        }

        .ret-badge {
            color: #dc2626;
            font-size: 10px;
        }

        /* TOTAIS */
        .totals-wrapper {
            margin-bottom: 1px;
            overflow: hidden;
        }

        .totals-spacer {
            float: left;
            width: 52%;
        }

        .totals-box {
            float: right;
            width: 44%;
        }

        table.totals {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }

        table.totals td {
            padding: 3px 5px;
        }

        table.totals td:last-child {
            text-align: right;
            font-weight: bold;
        }

        table.totals .sep td {
            border-top: 1px solid #cbd5e1;
            padding: 0;
            height: 1px;
        }

        table.totals .total-final {
            border-bottom:2px solid #000;
            border-top:2px solid #000;
            color: #000;
        }

        table.totals .total-final td {
            font-size: 14px;
            font-weight: bold;
            padding: 3px 5px;
        }

        /* PAGAMENTO */
        .payment-box {
            float: left;
            width: 46%;
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 5px;
            padding: 12px 14px;
            margin-bottom: 16px;
        }

        .payment-title {
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            color: #166534;
            border-bottom: 1px solid #86efac;
            padding-bottom: 6px;
            margin-bottom: 8px;
        }

        /* OBSERVAÇÕES */
        .obs-box {
            background: #fefce8;
            border: 1px solid #fde047;
            border-radius: 5px;
            padding: 12px 14px;
            margin-bottom: 16px;
            font-size: 11px;
            color: #713f12;
            line-height: 1.6;
        }

        .obs-title {
            font-weight: bold;
            margin-bottom: 5px;
            color: #854d0e;
            font-size: 12px;
        }

        /* HASH + QR CODE */
        .fiscal-block {
            margin-bottom: 16px;
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
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 5px;
            padding: 12px 14px;
            font-size: 10px;
            word-break: break-all;
        }

        .hash-title {
            font-size: 11px;
            font-weight: bold;
            color: #475569;
            margin-bottom: 5px;
        }

        .hash-val {
            font-family: monospace;
            color: #334155;
            line-height: 1.6;
        }

        .qr-box {
            text-align: center;
        }

        .qr-label {
            font-size: 9px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            margin-bottom: 4px;
        }

        .qr-svg-wrap img,
        .qr-svg-wrap svg {
            width: 106px;
            height: 106px;
            display: block;
            margin: 0 auto;
        }

        .qr-texto {
            font-size: 6.5px;
            color: #94a3b8;
            word-break: break-all;
            margin-top: 3px;
            line-height: 1.3;
        }

        /* ASSINATURAS */
        .sig-left {
            float: left;
            width: 40%;
            text-align: center;
            font-size: 11px;
            color: #475569;
            margin-top: 40px;
        }

        .sig-right {
            float: right;
            width: 40%;
            text-align: center;
            font-size: 11px;
            color: #475569;
            margin-top: 40px;
        }

        .sig-line {
            border-top: 1px solid #94a3b8;
            margin-bottom: 6px;
        }

        /* RODAPÉ */
        .footer-thanks {
            text-align: center;
            font-size: 13px;
            font-weight: bold;
            color: #123859;
            margin-bottom: 10px;
        }

        .footer {
            border-top: 2px solid #123859;
            padding-top: 12px;
            margin-top: 12px;
            overflow: hidden;
        }

        .footer-left {
            float: left;
            width: 60%;
            font-size: 10px;
            color: #64748b;
            line-height: 1.6;
        }

        .footer-right {
            float: right;
            width: 36%;
            text-align: right;
            font-size: 10px;
            color: #64748b;
            line-height: 1.6;
        }

        /* BOTÕES */
        .print-actions {
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 1000;
        }

        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.2s;
        }

        .btn-back {
            background: #6c757d;
            color: white;
        }

        .btn-print {
            background: #123859;
            color: white;
        }

        .btn:hover {
            opacity: 0.85;
        }

        @media print {
            body {
                background: white;
                padding: 0;
            }

            .print-actions {
                display: none;
            }

            .page {
                box-shadow: none;
                padding: 0;
            }
        }
    </style>
</head>

<body>
    <!-- Botões de Ação -->
    <div class="print-actions no-print">
        <button class="btn btn-back" onclick="history.back()">Voltar</button>
        <button class="btn btn-print" onclick="window.print()">Imprimir</button>
    </div>

    <div class="page">
        <div class="header clearfix">
            @if($empresaLogo)
            <div class="logo-area">
                <img src="{{ $empresaLogo }}" class="logo-img" alt="Logo">
            </div>
            @endif
            <!-- INFORMAÇÕES DA EMPRESA À ESQUERDA (Nome e NIF vêm da BD) -->
            <div class="empresa-info-area">
                <div class="empresa-nome">{{ $empresaNome }}</div>
                <div class="empresa-info">
                    NIF: {{ $empresaNif }}<br>
                    {{ $empresaMoradaEstatica }}<br>
                    Tel: {{ $empresaTelefoneEstatico }}<br>
                    {{ $empresaEmailEstatico }}
                </div>
            </div>
            <div class="header-right">
                <!-- HASH FISCAL + QR CODE -->
                @if(!empty($documento->hash_fiscal) || !empty($qr_code_img))
                <div class="fiscal-block clearfix">
                    @if(!empty($documento->hash_fiscal))
                    <div class="fiscal-left">
                        <div class="hash-box">
                            <div class="hash-title">Autenticação Fiscal — AGT</div>
                            <div class="hash-val">{{ $documento->hash_fiscal }}</div>
                        </div>
                    </div>
                    @endif
                    @if(!empty($qr_code_img))
                    <div class="fiscal-right">
                        <div class="qr-box">
                            <div class="qr-label">Código QR — DP 71/25</div>
                            <div class="qr-svg-wrap">{!! $qr_code_img !!}</div>
                            @if(!empty($qr_code))
                            <div class="qr-texto">{{ $qr_code }}</div>
                            @endif
                        </div>
                    </div>
                    @endif
                </div>
                @endif
                <div class="doc-estado {{ $estadoClasse }}">{{ $estadoLabel }}</div>
                <div class="doc-tipo">
                    <h4>{{ strtoupper($nomeDocumento) }}</h4>
                </div>
                <div class="doc-numero">
                    <h4>{{ $numero }}</h4>
                </div>

            </div>
        </div>

        <!-- ORIGEM (para NC/ND/RC) -->
        @if($documento->documentoOrigem ?? null)
        <div class="origem-box">
            <strong>Referente a:</strong>
            {{ $tiposDocumento[$documento->documentoOrigem->tipo_documento] ?? '' }}
            Nº {{ $documento->documentoOrigem->numero_documento }}
            — emitido em {{ \Carbon\Carbon::parse($documento->documentoOrigem->data_emissao)->format('d/m/Y') }}
        </div>
        @endif

        <!-- INFO DOC + CLIENTE -->
        <div class="info-row clearfix">
            <div class="info-col-left">
                <div class="info-box">
                    <div class="info-box-title">Dados do Documento</div>
                    <div class="info-line"><span class="info-label">Série: </span><span class="info-value">{{ $documento->serie ?? '—' }}</span></div>
                    <div class="info-line">
                        <span class="info-label">Data de Emissão: </span>
                        <span class="info-value">{{ $dtEmissao->format('d/m/Y') }}{{ $documento->hora_emissao ? ' às ' . \Carbon\Carbon::parse($documento->hora_emissao)->format('H:i') : '' }}</span>
                    </div>
                    @if($documento->data_vencimento)
                    <div class="info-line"><span class="info-label">Vencimento: </span><span class="info-value">{{ \Carbon\Carbon::parse($documento->data_vencimento)->format('d/m/Y') }}</span></div>
                    @endif
                    @if($documento->referencia_externa)
                    <div class="info-line"><span class="info-label">Ref. Externa: </span><span class="info-value">{{ $documento->referencia_externa }}</span></div>
                    @endif
                    @if($documento->motivo)
                    <div class="info-line"><span class="info-label">Motivo: </span><span class="info-value">{{ $documento->motivo }}</span></div>
                    @endif
                </div>
            </div>
            <div class="info-col-right">
                <div class="info-box">
                    <div class="info-box-title">Cliente</div>
                    <div class="info-line"><span class="info-label">Nome: </span><span class="info-value">{{ $clienteNome }}</span></div>
                    @if($clienteNif)
                    <div class="info-line"><span class="info-label">NIF: </span><span class="info-value">{{ $clienteNif }}</span></div>
                    @endif
                </div>
            </div>
        </div>

        <!-- ITENS -->
        <table class="items">
            <thead>
                <th style="width: 38%">Descrição</th>
                <th class="c" style="width: 9%">Qtd</th>
                <th class="r" style="width: 14%">Preço Unit.</th>
                <th class="c" style="width: 8%">IVA</th>
                <th class="c" style="width: 8%">Ret.</th>
                <th class="r" style="width: 23%">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($itensList as $item)
                @php
                $descricao = is_object($item) ? ($item->descricao ?? ($item->produto->nome ?? 'Item')) : ($item['descricao'] ?? 'Item');
                $quantidade = is_object($item) ? ($item->quantidade ?? 0) : ($item['quantidade'] ?? 0);
                $precoUnitario = is_object($item) ? ($item->preco_unitario ?? 0) : ($item['preco_unitario'] ?? 0);
                $taxaIva = is_object($item) ? ($item->taxa_iva ?? 0) : ($item['taxa_iva'] ?? 0);
                $taxaRetencao = is_object($item) ? ($item->taxa_retencao ?? 0) : ($item['taxa_retencao'] ?? 0);
                $totalLinha = is_object($item) ? ($item->total_linha ?? $item->total ?? 0) : ($item['total_linha'] ?? $item['total'] ?? 0);
                @endphp
                <tr>
                    <td>
                        <div class="item-nome">{{ $descricao }}</div>
                        @if(!empty($item->codigo_produto))
                        <div class="item-sub">Ref: {{ $item->codigo_produto }}</div>
                        @endif
                    </td>
                    <td class="c">{{ number_format($quantidade, 2, ',', '.') }}</td>
                    <td class="r">{{ number_format($precoUnitario, 2, ',', '.') }} Kz</td>
                    <td class="c">{{ number_format($taxaIva, 1, ',', '.') }}%</td>
                    <td class="c">
                        @if($taxaRetencao > 0)
                        <span class="ret-badge">{{ number_format($taxaRetencao, 1, ',', '.') }}%</span>
                        @else
                        —
                        @endif
                    </td>
                    <td class="r"><strong>{{ number_format($totalLinha, 2, ',', '.') }} Kz</strong></td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <!-- TOTAIS -->
        <div class="totals-wrapper clearfix">
            <div class="totals-spacer"></div>
            <div class="totals-box">
                <table class="totals">
                    <tr>
                        <td class="lbl">Base Tributável:</td>
                        <td>{{ number_format($subtotal, 2, ',', '.') }} Kz</td>
                    </tr>
                    @if($totalIva > 0)
                    <tr>
                        <td class="lbl">Total IVA:</td>
                        <td>{{ number_format($totalIva, 2, ',', '.') }} Kz</td>
                    </tr>
                    @endif
                    @if($totalRetencao > 0)
                    <tr class="ret-row">
                        <td class="lbl">Retenção na Fonte:</td>
                        <td>- {{ number_format($totalRetencao, 2, ',', '.') }} Kz</td>
                    </tr>
                    @endif
                    <tr class="sep">
                        <td colspan="2"></td>
                    </tr>
                    <tr class="total-final">
                        <td>TOTAL A PAGAR:</td>
                        <td>{{ number_format($totalLiquido, 2, ',', '.') }} Kz</td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- PAGAMENTO -->
        @if($documento->metodo_pagamento)
        <div class="clearfix" style="margin-bottom: 16px">
            <div class="payment-box">
                <div class="payment-title">Pagamento</div>
                <div class="info-line"><span class="info-label">Método: </span><span class="info-value">{{ $metodosPagamento[$documento->metodo_pagamento] ?? $documento->metodo_pagamento }}</span></div>
                @if($documento->referencia_pagamento)
                <div class="info-line"><span class="info-label">Referência: </span><span class="info-value">{{ $documento->referencia_pagamento }}</span></div>
                @endif
            </div>
        </div>
        @endif

        <!-- OBSERVAÇÕES -->
        @if($documento->observacoes)
        <div class="obs-box">
            <div class="obs-title">Observações</div>
            {{ $documento->observacoes }}
        </div>
        @endif

        <!-- ASSINATURAS -->
        <div class="clearfix" style="margin-top: 35px; margin-bottom: 12px">
            <div class="sig-left">
                <div class="sig-line"></div>Assinatura do Responsável
            </div>
            <div class="sig-right">
                <div class="sig-line"></div>Carimbo da Empresa
            </div>
        </div>

        <!-- RODAPÉ -->
        <div class="footer-thanks">Obrigado pela preferência!</div>
        <div class="footer clearfix">
            <div class="footer-left">
                <strong>{{ $empresaNome }}</strong> &nbsp;|&nbsp; NIF: {{ $empresaNif }}<br>
                {{ $empresaMoradaEstatica }} &nbsp;|&nbsp; Tel: {{ $empresaTelefoneEstatico }}
            </div>
            <div class="footer-right">
                Documento gerado em {{ now()->format('d/m/Y') }} às {{ now()->format('H:i') }}<br>
                {{ $empresaEmailEstatico }}
            </div>
        </div>
    </div>

    <script>
        // Impressão automática (descomentar se desejar)
        // window.addEventListener('load', () => {
        //     setTimeout(() => window.print(), 1000);
        // });
    </script>
</body>

</html>