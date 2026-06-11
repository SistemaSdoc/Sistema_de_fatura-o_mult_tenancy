@php
if (!isset($documento) || !$documento) {
    die('Documento não encontrado');
}

// Dados DINÂMICOS da empresa (vindos do controller via $empresa)
$empresaMorada = 'Endereço não registrado';

// Tenta obter o endereço de diferentes formas
if (is_array($empresa)) {
    if (isset($empresa['endereco']) && !empty($empresa['endereco'])) {
        $empresaMorada = $empresa['endereco'];
    } elseif (isset($empresa['morada']) && !empty($empresa['morada'])) {
        $empresaMorada = $empresa['morada'];
    }
} elseif (is_object($empresa)) {
    if (!empty($empresa->endereco)) {
        $empresaMorada = $empresa->endereco;
    } elseif (!empty($empresa->morada)) {
        $empresaMorada = $empresa->morada;
    }
}

$empresaTelefone = $empresa['telefone'] ?? 'Telefone não registrado';
$empresaEmail = $empresa['email'] ?? 'Email não registrado';
$empresaNome = $empresa['nome'] ?? 'EMPRESA';
$empresaNif = $empresa['nif'] ?? '0000000000';

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
    'FT' => 'Fatura',
    'FR' => 'Fatura-Recibo',
    'FA' => 'Fat. Adiantamento',
    'NC' => 'Nota de Crédito',
    'ND' => 'Nota de Débito',
    'RC' => 'Recibo',
    'FRt' => 'Fat. Retificação'
];

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

// PARA RECIBOS: Buscar dados da fatura de origem
$documentoOrigemInfo = null;
$itensParaExibir = $itens;
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
                ];
            }
        }
    }
}

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
            line-height: 1.3;
        }

        .page {
            padding: 15px 20px;
            height: 100%;
            min-height: 100vh;
        }

        /* CABEÇALHO */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 12px;
        }

        .header-left {
            flex: 1;
        }

        .logo-empresa-wrapper {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .logo-img {
            max-width: 60px;
            max-height: 60px;
            width: auto;
            height: auto;
        }

        .empresa-nome {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 3px;
        }

        .empresa-info {
            font-size: 9px;
            color: #333;
            line-height: 1.3;
        }

        .header-right {
            text-align: right;
        }

        .doc-tipo {
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .doc-numero {
            font-size: 12px;
            font-weight: bold;
        }

        .doc-estado {
            display: inline-block;
            padding: 2px 8px;
            font-size: 9px;
            font-weight: bold;
            border: 1px solid #000;
            margin-top: 4px;
        }

        /* ORIGEM */
        .origem-box {
            background: #f5f5f5;
            padding: 6px 10px;
            margin-bottom: 12px;
            font-size: 10px;
            border: 1px solid #ccc;
        }

        /* INFO ROWS */
        .info-row {
            display: flex;
            gap: 20px;
            margin-bottom: 12px;
        }

        .info-box {
            flex: 1;
            background: #f9f9f9;
            padding: 8px 12px;
            border: 1px solid #ddd;
        }

        .info-box-title {
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            border-bottom: 1px solid #ccc;
            padding-bottom: 4px;
            margin-bottom: 6px;
        }

        .info-line {
            font-size: 10px;
            margin-bottom: 3px;
        }

        .info-label {
            color: #555;
        }

        .info-value {
            font-weight: bold;
        }

        /* TABELA DE ITENS */
        table.items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            font-size: 9px;
        }

        table.items thead th {
            background: #f0f0f0;
            padding: 5px 4px;
            font-size: 9px;
            font-weight: bold;
            text-align: left;
            border-bottom: 2px solid #000;
        }

        table.items thead th.r {
            text-align: right;
        }

        table.items thead th.c {
            text-align: center;
        }

        table.items tbody td {
            padding: 5px 4px;
            border-bottom: 1px solid #ddd;
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
            font-size: 9px;
        }

        .item-sub {
            font-size: 8px;
            color: #666;
        }

        /* TOTAIS */
        .totals-wrapper {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 12px;
        }

        .totals-box {
            width: 45%;
        }

        table.totals {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
        }

        table.totals td {
            padding: 4px 6px;
        }

        table.totals td:last-child {
            text-align: right;
            font-weight: bold;
        }

        table.totals .total-final {
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            font-size: 11px;
        }

        /* QR CODE */
        .fiscal-block {
            display: flex;
            gap: 15px;
            margin-bottom: 12px;
        }

        .fiscal-left {
            flex: 2;
        }

        .fiscal-right {
            flex: 1;
            text-align: center;
        }

        .hash-box {
            background: #f5f5f5;
            padding: 8px 10px;
            border: 1px solid #ddd;
            word-break: break-all;
        }

        .hash-title {
            font-size: 9px;
            font-weight: bold;
            margin-bottom: 3px;
        }

        .hash-val {
            font-family: monospace;
            font-size: 8px;
        }

        .qr-label {
            font-size: 8px;
            text-transform: uppercase;
            margin-bottom: 3px;
        }

        .qr-svg-wrap img,
        .qr-svg-wrap svg {
            width: 60px;
            height: 60px;
        }

        /* RODAPÉ */
        .footer-thanks {
            text-align: center;
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .footer {
            display: flex;
            justify-content: space-between;
            font-size: 8px;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 8px;
            margin-top: 8px;
        }

        .footer-left,
        .footer-right {
            flex: 1;
        }

        .footer-right {
            text-align: right;
        }

        @media print {
            body {
                padding: 0;
                margin: 0;
            }
            
            .page {
                padding: 10px 15px;
            }
        }
    </style>
</head>

<body onload="window.print()">
    <div class="page">

        {{-- CABEÇALHO --}}
        <div class="header">
            <div class="header-left">
                <div class="logo-empresa-wrapper">
                    @if(!empty($empresaLogo) && $empresaLogo !== asset('images/default-logo.png'))
                    <img src="{{ $empresaLogo }}" class="logo-img" alt="Logo">
                    @endif
                    <div>
                        <div class="empresa-nome">{{ $empresaNome }}</div>
                        <div class="empresa-info">
                            NIF: {{ $empresaNif }}<br>
                            @if(!empty($empresaEmail)){{ $empresaEmail }}<br>@endif
                            @if(!empty($empresaTelefone))Tel: {{ $empresaTelefone }}<br>@endif
                            @if(!empty($empresaMorada)){{ $empresaMorada }}@endif
                        </div>
                    </div>
                </div>
            </div>
            <div class="header-right">
                <div class="doc-tipo">{{ $tiposDocumento[$documento->tipo_documento] ?? $documento->tipo_documento }}</div>
                <div class="doc-numero">Nº: {{ $documento->numero_documento }}</div>
                <div class="doc-estado">{{ $estadoLabel }}</div>
            </div>
        </div>

        {{-- ORIGEM (se for recibo) --}}
        @if($documento->tipo_documento === 'RC' && $documentoOrigemInfo)
        <div class="origem-box">
            <strong>Documento de Origem:</strong> {{ $tiposDocumento[$documentoOrigemInfo->tipo_documento] ?? $documentoOrigemInfo->tipo_documento }}
            Nº {{ $documentoOrigemInfo->numero_documento }} — {{ \Carbon\Carbon::parse($documentoOrigemInfo->data_emissao)->format('d/m/Y') }}
        </div>
        @endif

        {{-- INFO DOC + CLIENTE --}}
        <div class="info-row">
            <div class="info-box">
                <div class="info-box-title">Dados do Documento</div>
                <div class="info-line"><span class="info-label">Série:</span> <span class="info-value">{{ $documento->serie ?? 'A' }}</span></div>
                <div class="info-line"><span class="info-label">Data:</span> <span class="info-value">{{ \Carbon\Carbon::parse($documento->data_emissao)->format('d/m/Y') }}</span></div>
                <div class="info-line"><span class="info-label">Operador:</span> <span class="info-value">{{ $documento->user->name ?? 'Sistema' }}</span></div>
            </div>
            <div class="info-box">
                <div class="info-box-title">Cliente</div>
                <div class="info-line"><span class="info-label">Nome:</span> <span class="info-value">{{ $cliente['nome'] ?? 'Consumidor Final' }}</span></div>
                @if(!empty($cliente['nif']))<div class="info-line"><span class="info-label">NIF:</span> <span class="info-value">{{ $cliente['nif'] }}</span></div>@endif
            </div>
        </div>

        {{-- ITENS --}}
        @if(!empty($itensParaExibir) && count($itensParaExibir) > 0)
        <table class="items">
            <thead>
                <tr>
                    <th>Descrição</th>
                    <th class="c" style="width:8%">Qtd</th>
                    <th class="r" style="width:15%">Preço Unit.</th>
                    <th class="c" style="width:8%">IVA</th>
                    <th class="r" style="width:15%">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($itensParaExibir as $item)
                <tr>
                    <td>
                        <div class="item-nome">{{ $item->descricao ?? $item->nome_produto ?? '' }}</div>
                        @if(!empty($item->codigo_produto))<div class="item-sub">Ref: {{ $item->codigo_produto }}</div>@endif
                    </td>
                    <td class="c">{{ number_format((float)($item->quantidade ?? 0), 2, ',', '.') }}</td>
                    <td class="r">{{ number_format((float)($item->preco_unitario ?? 0), 2, ',', '.') }} Kz</td>
                    <td class="c">
                        @if(($item->taxa_iva ?? 0) > 0)
                        {{ number_format((float)$item->taxa_iva, 0, ',', '.') }}%
                        @else
                        —
                        @endif
                    </td>
                    <td class="r"><strong>{{ number_format((float)($item->total_linha ?? 0), 2, ',', '.') }} Kz</strong></td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @endif

        {{-- TOTAIS --}}
        <div class="totals-wrapper">
            <div class="totals-box">
                <table class="totals">
                    @if($temDesconto)
                    <tr>
                        <td>Subtotal Bruto:</td>
                        <td>{{ number_format($docParaTotais->base_tributavel + $descontoGlobal, 2, ',', '.') }} Kz</td>
                    </tr>
                    <tr>
                        <td>Desconto ({{ number_format($percentualDesconto, 2, ',', '.') }}%):</td>
                        <td>- {{ number_format($descontoGlobal, 2, ',', '.') }} Kz</td>
                    </tr>
                    @endif
                    <tr>
                        <td>Base Tributável:</td>
                        <td>{{ number_format($docParaTotais->base_tributavel ?? 0, 2, ',', '.') }} Kz</td>
                    </tr>
                    <tr>
                        <td>Total IVA:</td>
                        <td>{{ number_format($docParaTotais->total_iva ?? 0, 2, ',', '.') }} Kz</td>
                    </tr>
                    @if(($docParaTotais->total_retencao ?? 0) > 0)
                    <tr>
                        <td>Retenção:</td>
                        <td>- {{ number_format((float)$docParaTotais->total_retencao, 2, ',', '.') }} Kz</td>
                    </tr>
                    @endif
                    @if($temTroco)
                    <tr>
                        <td>Troco:</td>
                        <td>{{ number_format($troco, 2, ',', '.') }} Kz</td>
                    </tr>
                    @endif
                    <tr class="total-final">
                        <td><strong>TOTAL:</strong></td>
                        <td><strong>{{ number_format((float)($documento->total_liquido ?? 0), 2, ',', '.') }} Kz</strong></td>
                    </tr>
                </table>
            </div>
        </div>

        {{-- HASH FISCAL + QR CODE --}}
        @if(!empty($documento->hash_fiscal) || !empty($qr_html))
        <div class="fiscal-block">
            @if(!empty($documento->hash_fiscal))
            <div class="fiscal-left">
                <div class="hash-box">
                    <div class="hash-title">Autenticação Fiscal</div>
                    <div class="hash-val">{{ $documento->hash_fiscal }}</div>
                </div>
            </div>
            @endif
            @if(!empty($qr_html))
            <div class="fiscal-right">
                <div class="qr-label">QR Code — DP 71/25</div>
                <div class="qr-svg-wrap">{!! $qr_html !!}</div>
            </div>
            @endif
        </div>
        @endif

        {{-- RODAPÉ --}}
        <div class="footer-thanks">Obrigado pela preferência!</div>
        <div class="footer">
            <div class="footer-left">
                <strong>{{ $empresaNome }}</strong> | NIF: {{ $empresaNif }}<br>
                {{ $empresaMorada }} | Tel: {{ $empresaTelefone }}
            </div>
            <div class="footer-right">
                Documento gerado em {{ now()->format('d/m/Y H:i') }}<br>
                {{ $empresaEmail }}
            </div>
        </div>

    </div>

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 100);
        };
        
        window.onafterprint = function() {
            window.close();
        };
        
        setTimeout(function() {
            window.close();
        }, 60000);
    </script>
</body>

</html>