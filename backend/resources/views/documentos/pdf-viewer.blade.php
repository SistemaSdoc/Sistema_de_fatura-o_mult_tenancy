@php
if (!isset($documento) || !$documento) {
die('Documento não encontrado');
}

$empresaMoradaEstatica = 'Avenida 21 de Janeiro, Gamek';
$empresaTelefoneEstatico = '+244 943 489 186 ';
$empresaEmailEstatico = 'geral@sdoca.it.ao';
$empresaLogo = asset('images/pingodagua.png');

$tiposDocumento = [
'FT' => 'Fatura',
'FR' => 'Fatura-Recibo',
'FA' => 'Fat. Adiantamento',
'NC' => 'Nota de Crédito',
'ND' => 'Nota de Débito',
'RC' => 'Recibo',
'FRt' => 'Fat. Retificação'
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

// Determinar qual documento usar para os totais (para recibos, usa o documento de origem)
$docParaTotais = $documento;
if ($documento->tipo_documento === 'RC' && isset($documentoOrigem) && $documentoOrigem) {
$docParaTotais = $documentoOrigem;
}

// Tentar obter o desconto global da venda associada
$descontoGlobal = 0;
$troco = 0;

// Se o documento fiscal tem uma venda associada, buscar os dados da venda
if ($docParaTotais->venda_id && isset($docParaTotais->venda)) {
$venda = $docParaTotais->venda;
$descontoGlobal = (float) ($venda->desconto_global ?? 0);
$troco = (float) ($venda->troco ?? 0);
} else {
// Fallback: usar os campos do próprio documento fiscal
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

// Verificar se tem troco
$temTroco = $troco > 0;
@endphp

<!DOCTYPE html>
<html lang="pt">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $documento->tipo_documento_nome }} {{ $documento->numero_documento }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Courier New', Courier, monospace;
            background: #525659;
            display: flex;
            justify-content: center;
            padding: 20px;
            min-height: 100vh;
            font-size: 11.5px;
            line-height: 1.35;
        }

        /* Container do Talão - 70mm */
        .receipt {
            background: white;
            width: 70mm;
            min-height: 70vh;
            padding: 5px 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            color: #000;
        }

        /* Cabeçalho Empresa */
        .header {
            text-align: center;
            margin-bottom: 7px;
            padding-bottom: 7px;
            border-bottom: 2px dashed #000;
        }

        .company-logo {
            width: 200px;
            height: 200px;
            object-fit: contain;
            margin-bottom: 4px;
            display: inline-block;
        }

        .company-name {
            font-size: 13px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 4px;
            word-wrap: break-word;
        }

        .company-info {
            font-size: 9.5px;
            margin-bottom: 2px;
            word-wrap: break-word;
        }

        /* Tipo de Documento */
        .doc-type-box {
            text-align: center;
            margin: 7px 0;
            padding: 4px;
            border: 2px solid #000;
            font-weight: bold;
            font-size: 13px;
            text-transform: uppercase;
        }

        /* Info Documento */
        .doc-info {
            margin-bottom: 7px;
            font-size: 10.5px;
        }

        .doc-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            flex-wrap: wrap;
            gap: 5px;
        }

        .doc-row.full {
            justify-content: flex-start;
        }

        /* Referência (para RC) */
        .reference {
            margin: 7px 0;
            padding: 4px;
            background: #f5f5f5;
            border: 1px dashed #999;
            font-size: 9.5px;
            text-align: center;
            word-wrap: break-word;
        }

        /* Cliente */
        .client-section {
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 5px 0;
            margin-bottom: 7px;
        }

        .section-title {
            font-weight: bold;
            font-size: 10.5px;
            margin-bottom: 3px;
            text-transform: uppercase;
        }

        .client-name {
            font-weight: bold;
            font-size: 11.5px;
            margin-bottom: 2px;
            word-wrap: break-word;
        }

        .client-details {
            font-size: 9.5px;
            word-wrap: break-word;
        }

        /* Itens */
        .items-section {
            margin-bottom: 7px;
        }

        .item {
            margin-bottom: 5px;
            padding-bottom: 4px;
            border-bottom: 1px dotted #ccc;
        }

        .item:last-child {
            border-bottom: none;
        }

        .item-desc {
            font-weight: bold;
            word-wrap: break-word;
            margin-bottom: 3px;
            font-size: 10.5px;
        }

        .item-line {
            display: flex;
            justify-content: space-between;
            font-size: 10.5px;
            flex-wrap: wrap;
            gap: 5px;
        }

        .item-qty {
            color: #555;
        }

        .item-total {
            font-weight: bold;
        }

        .item-tax {
            font-size: 8.5px;
            color: #666;
            margin-top: 2px;
        }

        /* Separador */
        .separator {
            border-top: 1px dashed #000;
            margin: 7px 0;
        }

        .separator-bold {
            border-top: 2px solid #000;
            margin: 7px 0;
        }

        /* Totais */
        .totals-section {
            margin-top: 7px;
        }

        .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 10.5px;
            flex-wrap: wrap;
            gap: 5px;
        }

        .total-line.grand-total {
            font-size: 13px;
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 4px;
            margin-top: 4px;
        }

        /* Tax Summary */
        .tax-summary {
            font-size: 8.5px;
            margin-top: 7px;
            padding-top: 7px;
            border-top: 1px dashed #000;
        }

        /* QR Section */
        .qr-section {
            text-align: center;
            margin: 10px 0;
            padding: 8px 0;
            border-top: 2px dashed #000;
            border-bottom: 2px dashed #000;
        }

        .qr-title {
            font-size: 9.5px;
            font-weight: bold;
            margin-bottom: 5px;
            text-transform: uppercase;
        }

        .qr-image {
            width: 80px;
            height: 80px;
            margin: 0 auto;
            display: block;
        }

        .hash-section {
            margin-top: 7px;
            font-size: 8.5px;
            word-break: break-all;
            font-family: monospace;
            text-align: left;
        }

        .hash-label {
            font-weight: bold;
            margin-bottom: 3px;
            text-align: center;
        }

        /* Footer */
        .footer {
            text-align: center;
            margin-top: 10px;
            padding-top: 7px;
            font-size: 9.5px;
        }

        .footer-title {
            font-weight: bold;
            font-size: 11px;
            margin-bottom: 4px;
            text-transform: uppercase;
        }

        .footer-msg {
            margin-bottom: 2px;
        }

        .software-info {
            font-size: 8.5px;
            color: #666;
            margin-top: 7px;
        }

        .timestamp {
            font-size: 8.5px;
            margin-top: 5px;
            color: #666;
        }

        /* Botões (só na tela) */
        .actions {
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 8px;
            z-index: 1000;
        }

        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .btn-print {
            background: #4CAF50;
            color: white;
        }

        .btn-close {
            background: #f44336;
            color: white;
        }

        /* Loading */
        .loading {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            color: white;
            font-family: sans-serif;
        }

        .loading.hidden {
            display: none;
        }

        .spinner {
            width: 45px;
            height: 45px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid #4CAF50;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 14px;
        }

        @keyframes spin {
            0% {
                transform: rotate(0deg);
            }

            100% {
                transform: rotate(360deg);
            }
        }

        /* Media Print */
        @media print {
            body {
                background: white;
                padding: 0;
                margin: 0;
            }

            .actions,
            .loading {
                display: none !important;
            }

            .receipt {
                box-shadow: none;
                width: 100%;
                max-width: 70mm;
                padding: 0;
                margin: 0 auto;
            }

            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }

        @page {
            margin: 0;
            size: 70mm auto;
        }
    </style>
</head>

<body>

    <!-- Loading -->
    <div id="loading" class="loading">
        <div class="spinner"></div>
        <p>A preparar documento...</p>
    </div>

    <!-- Talão -->
    <div class="receipt">
        <!-- Cabeçalho Empresa -->
        <div class="header">
            <img src="{{ $empresaLogo }}" alt="Logo da Empresa" class="company-logo">
            <div class="company-name">{{ $empresa['nome'] ?? 'EMPRESA' }}</div>
            <div class="company-info">NIF: {{ $empresa['nif'] ?? '0000000000' }}</div>
            @if(!empty($empresaMoradaEstatica))
            <div class="company-info">{{ $empresaMoradaEstatica }}</div>
            @endif
            @if(!empty($empresaTelefoneEstatico))
            <div class="company-info">Tel: {{ $empresaTelefoneEstatico }}</div>
            @endif
            @if(!empty($empresaEmailEstatico))
            <div class="company-info">{{ $empresaEmailEstatico }}</div>
            @endif
        </div>

        <!-- Tipo Documento -->
        <div class="doc-type-box">
            {{ $documento->tipo_documento_nome }}
        </div>

        <!-- Info Documento -->
        <div class="doc-info">
            <div class="doc-row">
                <span><strong>Nº:</strong> {{ $documento->numero_documento }}</span>
                <span><strong>Série:</strong> {{ $documento->serie ?? 'A' }}</span>
            </div>
            <div class="doc-row">
                <span><strong>Data:</strong> {{ \Carbon\Carbon::parse($documento->data_emissao)->format('d/m/Y') }}</span>
                <span><strong>Hora:</strong> {{ substr($documento->hora_emissao ?? now()->format('H:i:s'), 0, 5) }}</span>
            </div>
            <div class="doc-row full">
                <span><strong>{{ 'Operador' }}:</strong> {{ $documento->user->name ?? 'Sistema' }}</span>
            </div>
        </div>

        <!-- Referência (se for RC e tiver fatura de origem) -->
        @if($documento->tipo_documento === 'RC' && $documentoOrigem)
        <div class="reference">
            <strong>Ref. Documento Origem:</strong><br>
            {{ $documentoOrigem->tipo_documento_nome }} Nº {{ $documentoOrigem->numero_documento }}
        </div>
        @endif

        <!-- Cliente -->
        <div class="client-section">
            <div class="section-title">CLIENTE</div>
            <div class="client-name">{{ $cliente['nome'] ?? 'Consumidor Final' }}</div>
            @if(!empty($cliente['nif']))
            <div class="client-details">NIF: {{ $cliente['nif'] }}</div>
            @endif
            @if(!empty($cliente['morada']))
            <div class="client-details">{{ $cliente['morada'] }}</div>
            @endif
        </div>

        <!-- Itens -->
        <div class="items-section">
            <div class="section-title" style="margin-bottom: 5px;">ITENS</div>

            @forelse($itens as $item)
            <div class="item">
                <div class="item-desc">{{ $item->descricao }}</div>
                <div class="item-line">
                    <span class="item-qty">
                        {{ number_format($item->quantidade, 0, ',', '.') }} x {{ number_format($item->preco_unitario, 2, ',', '.') }}
                    </span>
                    <span class="item-total">
                        {{ number_format($item->total_linha ?? ($item->quantidade * $item->preco_unitario), 2, ',', '.') }} Kz
                    </span>
                </div>
                @if(($item->taxa_iva ?? 0) > 0)
                <div class="item-tax">IVA: {{ $item->taxa_iva }}%</div>
                @endif
                @if(($item->valor_retencao ?? 0) > 0)
                <div class="item-tax">
                    Retenção: {{ $item->taxa_retencao ?? 0 }}%
                </div>
                @endif
            </div>
            @empty
            <div class="item">
                <div class="item-desc">Documento sem itens detalhados</div>
            </div>
            @endforelse
        </div>

        <div class="separator-bold"></div>

        <!-- Totais - Usa docParaTotais para recibos mostrarem dados do documento de origem -->
        <div class="totals-section">
            <!-- Subtotal bruto e Desconto (só mostra se tiver desconto) -->
            <div class="total-line">
                <span>Subtotal bruto:</span>
                <span>{{ number_format($docParaTotais->base_tributavel + $descontoGlobal, 2, ',', '.') }} Kz</span>
            </div>
            <div class="total-line ">
                <span>Desconto ({{ number_format($percentualDesconto, 2, ',', '.') }}%):</span>
                <span>- {{ number_format($descontoGlobal, 2, ',', '.') }} Kz</span>
            </div>

            <div class="total-line">
                <span>Base Tributável:</span>
                <span>{{ number_format($docParaTotais->base_tributavel ?? 0, 2, ',', '.') }} Kz</span>
            </div>

            <div class="total-line">
                <span>Total IVA:</span>
                <span>{{ number_format($docParaTotais->total_iva ?? 0, 2, ',', '.') }} Kz</span>
            </div>

            @if(($docParaTotais->total_retencao ?? 0) > 0)
            <div class="total-line">
                <span>Retenção:</span>
                <span>- {{ number_format($docParaTotais->total_retencao ?? 0, 2, ',', '.') }} Kz</span>
            </div>
            @endif

            <!-- Método de Pagamento (apenas para FR e RC) -->
            @if(in_array($documento->tipo_documento, ['FR', 'RC']) && !empty($documento->metodo_pagamento))
            <div class="total-line">
                <span>Forma de Pagamento:</span>
                <span>{{ $metodosPagamento[$documento->metodo_pagamento] ?? ucfirst($documento->metodo_pagamento) }}</span>
            </div>
            @endif

            <!-- Troco (só mostra se tiver troco) -->
            <div class="total-line">
                <span>Troco:</span>
                <span>{{ number_format($troco, 2, ',', '.') }} Kz</span>
            </div>

            <!-- TOTAL A PAGAR (para FT) -->
            @if($documento->tipo_documento === 'FT')
            <div class="total-line grand-total">
                <strong>TOTAL A PAGAR</strong>
                <strong>{{ number_format($documento->total_liquido, 2, ',', '.') }} Kz</strong>
            </div>
            @endif

            <!-- TOTAL PAGO (para FR e RC) -->
            @if(in_array($documento->tipo_documento, ['FR', 'RC']))
            <div class="total-line grand-total">
                <span><strong>TOTAL PAGO:</strong></span>
                <span><strong>{{ number_format($documento->total_liquido, 2, ',', '.') }} Kz</strong></span>
            </div>
            @endif
        </div>

        <!-- QR Code e Hash Fiscal -->
        @if(!empty($qr_code_img))
        <div class="qr-section">
            <div class="qr-title">QR Code AGT (DP 71/25)</div>
            <img src="data:image/png;base64,{{ $qr_code_img }}"
                alt="QR Code"
                class="qr-image">

            @if(!empty($documento->hash_fiscal))
            <div class="hash-section">
                <div class="hash-label">Hash Fiscal:</div>
                {{ $documento->hash_fiscal }}
            </div>
            @endif
        </div>
        @elseif(!empty($qr_html))
        <div class="qr-section">
            <div class="qr-title">QR Code AGT (DP 71/25)</div>
            {!! $qr_html !!}

            @if(!empty($documento->hash_fiscal))
            <div class="hash-section">
                <div class="hash-label">Hash Fiscal:</div>
                {{ $documento->hash_fiscal }}
            </div>
            @endif
        </div>
        @endif

        <!-- Rodapé -->
        <div class="footer">
            <div class="footer-title">OBRIGADO PELA PREFERÊNCIA!</div>
            <div class="footer-msg">Volte sempre</div>
            <div class="footer-msg">Processado por computador</div>
            <div class="timestamp">
                {{ now()->format('d/m/Y H:i:s') }}
            </div>
        </div>
    </div>

    <script>
        // Auto-print ao carregar
        window.addEventListener('load', function() {
            // Esconder loading após renderização
            setTimeout(() => {
                document.getElementById('loading').classList.add('hidden');

                // Disparar impressão automaticamente
                setTimeout(() => {
                    window.print();
                }, 300);
            }, 600);
        });

        window.addEventListener('afterprint', function() {
            window.close();
        });
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                window.print();
            }
            if (e.key === 'Escape') {
                window.close();
            }
        });
    </script>
</body>

</html>