<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8"/>
    <title>{{ $documento->numero_documento }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 12px; /* Aumentado de 11px para 12px */
            color: #1a1a1a;
            background: #fff;
            line-height: 1.5; /* Melhor espaçamento entre linhas */
        }

        .page {
            padding: 28px 32px;
        }

        /* ===== CLEARFIX ===== */
        .clearfix::after {
            content: "";
            display: block;
            clear: both;
        }

        /* ===== CABEÇALHO COM LOGO ===== */
        .header {
            border-bottom: 3px solid #123859;
            padding-bottom: 14px;
            margin-bottom: 18px;
        }
        .header-left {
            float: left;
            width: 55%;
        }
        .header-right {
            float: right;
            width: 42%;
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
            object-fit: contain;
        }
        .empresa-info-area {
            float: left;
            width: 70%;
        }
        .empresa-nome {
            font-size: 24px; /* Aumentado de 20px para 24px */
            font-weight: bold;
            color: #123859;
            margin-bottom: 6px;
        }
        .empresa-info {
            font-size: 11px; /* Aumentado de 9.5px para 11px */
            color: #555;
            line-height: 1.6;
        }
        .doc-tipo {
            font-size: 20px; /* Aumentado de 17px para 20px */
            font-weight: bold;
            color: #F9941F;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .doc-numero {
            font-size: 15px; /* Aumentado de 13px para 15px */
            font-weight: bold;
            color: #123859;
            margin-bottom: 8px;
        }
        .doc-estado {
            display: inline-block;
            padding: 5px 12px; /* Mais padding */
            border-radius: 12px;
            font-size: 11px; /* Aumentado de 9px para 11px */
            font-weight: bold;
            text-transform: uppercase;
        }
        .estado-emitido    { background: #dbeafe; color: #1e40af; }
        .estado-paga       { background: #dcfce7; color: #166534; }
        .estado-parcial    { background: #fef9c3; color: #854d0e; }
        .estado-cancelado  { background: #fee2e2; color: #991b1b; }
        .estado-expirado   { background: #f3f4f6; color: #374151; }

        /* ===== ORIGEM ===== */
        .origem-box {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 5px;
            padding: 10px 14px; /* Mais padding */
            margin-bottom: 16px;
            font-size: 11px; /* Aumentado de 9.5px para 11px */
            color: #1e40af;
        }

        /* ===== BLOCO INFO (DOC + CLIENTE) ===== */
        .info-row {
            margin-bottom: 18px;
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
            padding: 12px 14px; /* Mais padding */
        }
        .info-box-title {
            font-size: 11px; /* Aumentado de 9px para 11px */
            font-weight: bold;
            text-transform: uppercase;
            color: #123859;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 6px;
            margin-bottom: 10px;
            letter-spacing: 0.4px;
        }
        .info-line {
            margin-bottom: 6px; /* Mais espaçamento */
            font-size: 11px; /* Aumentado de 9.5px para 11px */
        }
        .info-label {
            color: #64748b;
        }
        .info-value {
            font-weight: bold;
            color: #1e293b;
        }

        /* ===== TABELA DE ITENS ===== */
        .section-title {
            font-size: 12px; /* Aumentado de 10px para 12px */
            font-weight: bold;
            text-transform: uppercase;
            color: #123859;
            margin-bottom: 8px;
            letter-spacing: 0.4px;
        }

        table.items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
            font-size: 11px; /* Aumentado de 9.5px para 11px */
        }
        table.items thead tr {
            background: #123859;
            color: #fff;
        }
        table.items thead th {
            padding: 9px 10px; /* Mais padding */
            font-size: 11px; /* Aumentado de 9px para 11px */
            font-weight: bold;
            text-transform: uppercase;
            text-align: left;
        }
        table.items thead th.r { text-align: right; }
        table.items thead th.c { text-align: center; }

        table.items tbody tr:nth-child(even) { background: #f8fafc; }
        table.items tbody tr:nth-child(odd)  { background: #fff; }

        table.items tbody td {
            padding: 8px 10px; /* Mais padding */
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
        }
        table.items tbody td.r { text-align: right; }
        table.items tbody td.c { text-align: center; }

        .item-nome   { font-weight: bold; color: #1e293b; font-size: 11px; }
        .item-sub    { font-size: 10px; color: #64748b; margin-top: 2px; } /* Aumentado */
        .item-badge  { font-size: 9px; background: #dbeafe; color: #1e40af;
                       border-radius: 3px; padding: 2px 5px; }
        .ret-badge   { color: #dc2626; font-size: 10px; }

        /* ===== TOTAIS ===== */
        .totals-wrapper {
            margin-bottom: 18px;
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
            font-size: 12px; /* Aumentado de 10px para 12px */
        }
        table.totals td {
            padding: 6px 10px; /* Mais padding */
        }
        table.totals td:last-child {
            text-align: right;
            font-weight: bold;
        }
        table.totals .lbl { color: #64748b; }
        table.totals .ret-row td { color: #dc2626; }
        table.totals .disc-row td { color: #16a34a; }
        table.totals .sep td {
            border-top: 1px solid #cbd5e1;
            padding: 0;
            height: 1px;
        }
        table.totals .total-final {
            background: #123859;
            color: #fff;
        }
        table.totals .total-final td {
            font-size: 14px; /* Aumentado de 12px para 14px */
            font-weight: bold;
            padding: 9px 10px;
        }

        /* ===== PAGAMENTO ===== */
        .payment-box {
            float: left;
            width: 46%;
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 5px;
            padding: 12px 14px; /* Mais padding */
            margin-bottom: 16px;
        }
        .payment-title {
            font-size: 11px; /* Aumentado de 9px para 11px */
            font-weight: bold;
            text-transform: uppercase;
            color: #166534;
            border-bottom: 1px solid #86efac;
            padding-bottom: 6px;
            margin-bottom: 8px;
        }

        /* ===== OBSERVAÇÕES ===== */
        .obs-box {
            background: #fefce8;
            border: 1px solid #fde047;
            border-radius: 5px;
            padding: 12px 14px; /* Mais padding */
            margin-bottom: 16px;
            font-size: 11px; /* Aumentado de 9.5px para 11px */
            color: #713f12;
            line-height: 1.6;
        }
        .obs-title { font-weight: bold; margin-bottom: 5px; color: #854d0e; font-size: 12px; }

        /* ===== HASH ===== */
        .hash-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 5px;
            padding: 12px 14px; /* Mais padding */
            margin-bottom: 16px;
            font-size: 10px; /* Aumentado de 8.5px para 10px */
            word-break: break-all;
        }
        .hash-title {
            font-size: 11px; /* Aumentado de 9px para 11px */
            font-weight: bold;
            color: #475569;
            margin-bottom: 5px;
        }
        .hash-val {
            font-family: 'DejaVu Sans Mono', monospace;
            color: #334155;
            line-height: 1.6;
        }

        /* ===== ASSINATURAS ===== */
        .sig-left {
            float: left;
            width: 40%;
            text-align: center;
            font-size: 11px; /* Aumentado de 9.5px para 11px */
            color: #475569;
            margin-top: 40px;
        }
        .sig-right {
            float: right;
            width: 40%;
            text-align: center;
            font-size: 11px; /* Aumentado de 9.5px para 11px */
            color: #475569;
            margin-top: 40px;
        }
        .sig-line {
            border-top: 1px solid #94a3b8;
            margin-bottom: 6px;
        }

        /* ===== RODAPÉ ===== */
        .footer {
            border-top: 2px solid #123859;
            padding-top: 12px;
            margin-top: 12px;
        }
        .footer-left {
            float: left;
            width: 60%;
            font-size: 10px; /* Aumentado de 8.5px para 10px */
            color: #64748b;
            line-height: 1.6;
        }
        .footer-right {
            float: right;
            width: 36%;
            text-align: right;
            font-size: 10px; /* Aumentado de 8.5px para 10px */
            color: #64748b;
            line-height: 1.6;
        }
        .footer-thanks {
            text-align: center;
            font-size: 13px; /* Aumentado de 11px para 13px */
            font-weight: bold;
            color: #123859;
            margin-bottom: 10px;
        }

        /* Utilitário para alinhamento com logo */
        .header-with-logo {
            display: flex;
            align-items: center;
            gap: 15px;
        }
    </style>
</head>
<body>
<div class="page">

    {{-- CABEÇALHO COM LOGO --}}
    <div class="header clearfix">
        @if(isset($empresa['logo']) && $empresa['logo'])
        <div class="header-with-logo">
            <div class="logo-area">
                <img src="{{ $empresa['logo'] }}" class="logo-img" alt="Logo">
            </div>
            <div class="empresa-info-area">
                <div class="empresa-nome">{{ $empresa['nome'] }}</div>
                <div class="empresa-info">
                    NIF: {{ $empresa['nif'] }}<br>
                    {{ $empresa['morada'] }}<br>
                    Tel: {{ $empresa['telefone'] }}<br>
                    {{ $empresa['email'] }}
                </div>
            </div>
        </div>
        @else
        <div class="header-left">
            <div class="empresa-nome">{{ $empresa['nome'] }}</div>
            <div class="empresa-info">
                NIF: {{ $empresa['nif'] }}<br>
                {{ $empresa['morada'] }}<br>
                Tel: {{ $empresa['telefone'] }}<br>
                {{ $empresa['email'] }}
            </div>
        </div>
        @endif
        <div class="header-right">
            @php
                $tipos = [
                    'FT'  => 'Fatura',
                    'FR'  => 'Fatura-Recibo',
                    'FP'  => 'Fatura Proforma',
                    'FA'  => 'Fat. Adiantamento',
                    'NC'  => 'Nota de Crédito',
                    'ND'  => 'Nota de Débito',
                    'RC'  => 'Recibo',
                    'FRt' => 'Fat. Retificação',
                ];
                $estadoClasse = match($documento->estado) {
                    'emitido'           => 'estado-emitido',
                    'paga'              => 'estado-paga',
                    'parcialmente_paga' => 'estado-parcial',
                    'cancelado'         => 'estado-cancelado',
                    'expirado'          => 'estado-expirado',
                    default             => 'estado-emitido',
                };
                $estadoLabel = match($documento->estado) {
                    'emitido'           => 'Emitido',
                    'paga'              => 'Pago',
                    'parcialmente_paga' => 'Pag. Parcial',
                    'cancelado'         => 'Cancelado',
                    'expirado'          => 'Expirado',
                    default             => $documento->estado,
                };
            @endphp
            <div class="doc-tipo">{{ $tipos[$documento->tipo_documento] ?? $documento->tipo_documento }}</div>
            <div class="doc-numero">{{ $documento->numero_documento }}</div>
            <div class="doc-estado {{ $estadoClasse }}">{{ $estadoLabel }}</div>
        </div>
    </div>

    {{-- DOCUMENTO ORIGEM --}}
    @if($documento->documentoOrigem)
    <div class="origem-box">
        <strong>Referente a:</strong>
        {{ $tipos[$documento->documentoOrigem->tipo_documento] ?? $documento->documentoOrigem->tipo_documento }}
        Nº {{ $documento->documentoOrigem->numero_documento }}
        — emitido em {{ \Carbon\Carbon::parse($documento->documentoOrigem->data_emissao)->format('d/m/Y') }}
    </div>
    @endif

    {{-- INFO DOC + CLIENTE --}}
    <div class="info-row clearfix">
        <div class="info-col-left">
            <div class="info-box">
                <div class="info-box-title">Dados do Documento</div>
                <div class="info-line">
                    <span class="info-label">Série: </span>
                    <span class="info-value">{{ $documento->serie }}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">Data de Emissão: </span>
                    <span class="info-value">
                        {{ \Carbon\Carbon::parse($documento->data_emissao)->format('d/m/Y') }}
                        {{ $documento->hora_emissao ? ' às '.$documento->hora_emissao : '' }}
                    </span>
                </div>
                @if($documento->data_vencimento)
                <div class="info-line">
                    <span class="info-label">Vencimento: </span>
                    <span class="info-value">{{ \Carbon\Carbon::parse($documento->data_vencimento)->format('d/m/Y') }}</span>
                </div>
                @endif
                @if($documento->referencia_externa)
                <div class="info-line">
                    <span class="info-label">Ref. Externa: </span>
                    <span class="info-value">{{ $documento->referencia_externa }}</span>
                </div>
                @endif
                @if($documento->motivo)
                <div class="info-line">
                    <span class="info-label">Motivo: </span>
                    <span class="info-value">{{ $documento->motivo }}</span>
                </div>
                @endif
            </div>
        </div>
        <div class="info-col-right">
            <div class="info-box">
                <div class="info-box-title">Cliente</div>
                <div class="info-line">
                    <span class="info-label">Nome: </span>
                    <span class="info-value">{{ $cliente['nome'] ?? 'Consumidor Final' }}</span>
                </div>
                @if(!empty($cliente['nif']))
                <div class="info-line">
                    <span class="info-label">NIF: </span>
                    <span class="info-value">{{ $cliente['nif'] }}</span>
                </div>
                @endif
                @if($documento->cliente?->telefone)
                <div class="info-line">
                    <span class="info-label">Telefone: </span>
                    <span class="info-value">{{ $documento->cliente->telefone }}</span>
                </div>
                @endif
                @if($documento->cliente?->email)
                <div class="info-line">
                    <span class="info-label">Email: </span>
                    <span class="info-value">{{ $documento->cliente->email }}</span>
                </div>
                @endif
                @if($documento->cliente?->endereco)
                <div class="info-line">
                    <span class="info-label">Morada: </span>
                    <span class="info-value">{{ $documento->cliente->endereco }}</span>
                </div>
                @endif
            </div>
        </div>
    </div>

    {{-- ITENS --}}
    @if($itens && count($itens) > 0)
    <div class="section-title">Itens</div>
    <table class="items">
        <thead>
            <tr>
                <th style="width:38%">Descrição</th>
                <th class="c" style="width:9%">Quantidade</th>
                <th class="r" style="width:14%">Preço Unit.</th>
                <th class="c" style="width:8%">IVA</th>
                <th class="c" style="width:8%">Ret.</th>
                <th class="r" style="width:23%">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($itens as $item)
            <tr>
                <td>
                    <div class="item-nome">{{ $item->descricao }}</div>
                    @if($item->codigo_produto)
                    <div class="item-sub">Ref: {{ $item->codigo_produto }}</div>
                    @endif
                    @if($item->eh_servico)
                    <span class="item-badge">Serviço</span>
                    @endif
                </td>
                <td class="c">
                    {{ number_format((float)$item->quantidade, 2, ',', '.') }}
                    @if($item->unidade)
                    <div class="item-sub">{{ $item->unidade }}</div>
                    @endif
                </td>
                <td class="r">
                    {{ number_format((float)$item->preco_unitario, 2, ',', '.') }} Kz
                    @if($item->desconto && (float)$item->desconto > 0)
                    <div class="item-sub" style="color:#16a34a">-{{ $item->desconto }}%</div>
                    @endif
                </td>
                <td class="c">{{ number_format((float)$item->taxa_iva, 1, ',', '.') }}%</td>
                <td class="c">
                    @if($item->taxa_retencao && (float)$item->taxa_retencao > 0)
                    <span class="ret-badge">{{ number_format((float)$item->taxa_retencao, 1, ',', '.') }}%</span>
                    @else —
                    @endif
                </td>
                <td class="r"><strong>{{ number_format((float)$item->total_linha, 2, ',', '.') }} Kz</strong></td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    {{-- TOTAIS --}}
    <div class="totals-wrapper clearfix">
        <div class="totals-spacer"></div>
        <div class="totals-box">
            <table class="totals">
                <tr>
                    <td class="lbl">Base Tributável:</td>
                    <td>{{ number_format((float)$documento->base_tributavel, 2, ',', '.') }} Kz</td>
                </tr>
                <tr>
                    <td class="lbl">Total IVA:</td>
                    <td>{{ number_format((float)$documento->total_iva, 2, ',', '.') }} Kz</td>
                </tr>
                @if((float)$documento->total_retencao > 0)
                <tr class="ret-row">
                    <td>Retenção na Fonte:</td>
                    <td>- {{ number_format((float)$documento->total_retencao, 2, ',', '.') }} Kz</td>
                </tr>
                @endif
                @if((float)$documento->total_desconto > 0)
                <tr class="disc-row">
                    <td>Desconto:</td>
                    <td>- {{ number_format((float)$documento->total_desconto, 2, ',', '.') }} Kz</td>
                </tr>
                @endif
                <tr class="sep"><td colspan="2"></td></tr>
                <tr class="total-final">
                    <td>TOTAL A PAGAR:</td>
                    <td>{{ number_format((float)$documento->total_liquido, 2, ',', '.') }} Kz</td>
                </tr>
            </table>
        </div>
    </div>

    {{-- PAGAMENTO --}}
    @if($documento->metodo_pagamento)
    <div class="clearfix" style="margin-bottom:16px">
        <div class="payment-box">
            <div class="payment-title">Pagamento</div>
            @php
                $metodos = [
                    'transferencia' => 'Transferência Bancária',
                    'multibanco'    => 'Multibanco',
                    'dinheiro'      => 'Dinheiro',
                    'cheque'        => 'Cheque',
                    'cartao'        => 'Cartão',
                ];
            @endphp
            <div class="info-line">
                <span class="info-label">Método: </span>
                <span class="info-value">{{ $metodos[$documento->metodo_pagamento] ?? $documento->metodo_pagamento }}</span>
            </div>
            @if($documento->referencia_pagamento)
            <div class="info-line">
                <span class="info-label">Referência: </span>
                <span class="info-value">{{ $documento->referencia_pagamento }}</span>
            </div>
            @endif
        </div>
    </div>
    @endif

    {{-- OBSERVAÇÕES --}}
    @if($documento->observacoes)
    <div class="obs-box">
        <div class="obs-title">Observações</div>
        {{ $documento->observacoes }}
    </div>
    @endif

    {{-- HASH FISCAL --}}
    @if($documento->hash_fiscal)
    <div class="hash-box">
        <div class="hash-title">Hash Fiscal (Autenticação AGT)</div>
        <div class="hash-val">{{ $documento->hash_fiscal }}</div>
    </div>
    @endif

    {{-- ASSINATURAS --}}
    <div class="clearfix" style="margin-top:35px; margin-bottom:12px">
        <div class="sig-left">
            <div class="sig-line"></div>
            Assinatura do Responsável
        </div>
        <div class="sig-right">
            <div class="sig-line"></div>
            Carimbo da Empresa
        </div>
    </div>

    {{-- RODAPÉ --}}
    <div class="footer-thanks">Obrigado pela preferência!</div>
    <div class="footer clearfix">
        <div class="footer-left">
            <strong>{{ $empresa['nome'] }}</strong> &nbsp;|&nbsp; NIF: {{ $empresa['nif'] }}<br>
            {{ $empresa['morada'] }} &nbsp;|&nbsp; Tel: {{ $empresa['telefone'] }}
        </div>
        <div class="footer-right">
            Documento gerado em {{ now()->format('d/m/Y') }} às {{ now()->format('H:i') }}<br>
            {{ $empresa['email'] }}
        </div>
    </div>

</div>
</body>
</html>
