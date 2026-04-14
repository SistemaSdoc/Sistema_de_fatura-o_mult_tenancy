@php
    $logoPath = public_path('images/1000041800.jpg');
    $logoBase64 = base64_encode(file_get_contents($logoPath));
@endphp
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8"/>
    <title>{{ $documento->numero_documento }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 14px; color: #000000; background: #fff; line-height: 1.5; }
        .page { padding: 28px 32px; }
        .clearfix::after { content: ""; display: block; clear: both; }

        /* CABEÇALHO */
        .header { border-bottom: 2px solid #000000; padding-bottom: 14px; margin-bottom: 18px; overflow: hidden; }
        .header-left { float: left; width: 58%; }
        .header-right { float: right; width: 40%; text-align: right; }
        
        /* Logo e Empresa lado a lado */
        .logo-empresa-wrapper { overflow: hidden; margin-bottom: 5px; }
        .logo-area { float: left; width: auto; margin-right: 15px; }
        .logo-img { max-width: 100px; max-height: 100px; width: auto; height: auto; display: block; }
        .empresa-info-area { overflow: hidden; }
        .empresa-nome { font-size: 22px; font-weight: bold; color: #000000; margin-bottom: 6px; line-height: 1.2; }
        .empresa-info { font-size: 12px; color: #333333; line-height: 1.5; }
        
        .doc-tipo { font-size: 20px; font-weight: bold; color: #000000; text-transform: uppercase; margin-bottom: 5px; }
        .doc-numero { font-size: 16px; font-weight: bold; color: #000000; margin-bottom: 8px; }
        .doc-estado { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase; border: 1px solid #000000; }
        .estado-emitido   { background: #ffffff; color: #000000; }
        .estado-paga      { background: #ffffff; color: #000000; }
        .estado-parcial   { background: #ffffff; color: #000000; }
        .estado-cancelado { background: #ffffff; color: #000000; }
        .estado-expirado  { background: #ffffff; color: #000000; }

        /* ORIGEM */
        .origem-box { background: #f5f5f5; border: 1px solid #cccccc; border-radius: 5px; padding: 10px 14px; margin-bottom: 16px; font-size: 12px; color: #000000; }

        /* INFO */
        .info-row { margin-bottom: 18px; overflow: hidden; }
        .info-col-left  { float: left;  width: 48%; }
        .info-col-right { float: right; width: 48%; }
        .info-box { background: #f9f9f9; border: 1px solid #dddddd; border-radius: 5px; padding: 12px 14px; }
        .info-box-title { font-size: 13px; font-weight: bold; text-transform: uppercase; color: #000000; border-bottom: 1px solid #cccccc; padding-bottom: 6px; margin-bottom: 10px; }
        .info-line  { margin-bottom: 6px; font-size: 12px; }
        .info-label { color: #555555; display: inline-block; min-width: 95px; }
        .info-value { font-weight: bold; color: #000000; }

        /* ITENS */
        .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; color: #000000; margin-bottom: 8px; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 12px; }
        table.items thead tr { background: #333333; color: #fff; }
        table.items thead th { padding: 10px 10px; font-size: 12px; font-weight: bold; text-transform: uppercase; text-align: left; }
        table.items thead th.r { text-align: right; }
        table.items thead th.c { text-align: center; }
        table.items tbody tr:nth-child(even) { background: #f5f5f5; }
        table.items tbody tr:nth-child(odd)  { background: #ffffff; }
        table.items tbody td { padding: 10px 10px; border-bottom: 1px solid #dddddd; vertical-align: top; }
        table.items tbody td.r { text-align: right; }
        table.items tbody td.c { text-align: center; }
        .item-nome  { font-weight: bold; color: #000000; font-size: 12px; }
        .item-sub   { font-size: 10px; color: #666666; margin-top: 2px; }
        .item-badge { font-size: 10px; background: #e0e0e0; color: #000000; border-radius: 3px; padding: 2px 5px; display: inline-block; }
        .ret-badge  { color: #cc0000; font-size: 11px; font-weight: bold; }

        /* TOTAIS */
        .totals-wrapper { margin-bottom: 18px; overflow: hidden; }
        .totals-spacer  { float: left;  width: 52%; }
        .totals-box     { float: right; width: 44%; }
        table.totals { width: 100%; border-collapse: collapse; font-size: 13px; }
        table.totals td { padding: 8px 10px; }
        table.totals td:last-child { text-align: right; font-weight: bold; }
        table.totals .lbl { color: #555555; }
        table.totals .ret-row td  { color: #cc0000; }
        table.totals .disc-row td { color: #008800; }
        table.totals .sep td { border-top: 1px solid #cccccc; padding: 0; height: 1px; }
        table.totals .total-final { background: #333333; color: #fff; }
        table.totals .total-final td { font-size: 16px; font-weight: bold; padding: 10px 10px; }

        /* PAGAMENTO */
        .payment-box { float: left; width: 46%; background: #f0f5f0; border: 1px solid #cccccc; border-radius: 5px; padding: 12px 14px; margin-bottom: 16px; }
        .payment-title { font-size: 13px; font-weight: bold; text-transform: uppercase; color: #000000; border-bottom: 1px solid #cccccc; padding-bottom: 6px; margin-bottom: 8px; }

        /* OBSERVAÇÕES */
        .obs-box   { background: #fef9e6; border: 1px solid #e0d5b0; border-radius: 5px; padding: 12px 14px; margin-bottom: 16px; font-size: 12px; color: #333333; line-height: 1.6; }
        .obs-title { font-weight: bold; margin-bottom: 5px; color: #000000; font-size: 13px; }

        /* HASH + QR lado a lado */
        .fiscal-block { margin-bottom: 16px; overflow: hidden; }
        .fiscal-left  { float: left; width: 64%; padding-right: 12px; }
        .fiscal-right { float: right; width: 32%; text-align: center; }
        .hash-box { background: #f5f5f5; border: 1px solid #dddddd; border-radius: 5px; padding: 12px 14px; font-size: 11px; word-break: break-all; }
        .hash-title { font-size: 12px; font-weight: bold; color: #000000; margin-bottom: 5px; }
        .hash-val   { font-family: 'DejaVu Sans Mono', monospace; color: #333333; line-height: 1.6; font-size: 10px; }
        .qr-box     { text-align: center; }
        .qr-label   { font-size: 10px; color: #666666; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
        .qr-svg-wrap { display: block; }
        .qr-svg-wrap img, .qr-svg-wrap svg { width: 100px; height: 100px; display: block; margin: 0 auto; }
        .qr-texto-pdf { font-size: 7px; color: #888888; word-break: break-all; margin-top: 3px; line-height: 1.2; }

        /* ASSINATURAS */
        .sig-left  { float: left;  width: 40%; text-align: center; font-size: 12px; color: #555555; margin-top: 50px; }
        .sig-right { float: right; width: 40%; text-align: center; font-size: 12px; color: #555555; margin-top: 50px; }
        .sig-line  { border-top: 1px solid #999999; margin-bottom: 6px; width: 80%; margin-left: auto; margin-right: auto; }

        /* RODAPÉ */
        .footer        { border-top: 2px solid #000000; padding-top: 12px; margin-top: 12px; overflow: hidden; }
        .footer-left   { float: left;  width: 60%; font-size: 10px; color: #666666; line-height: 1.5; }
        .footer-right  { float: right; width: 36%; text-align: right; font-size: 10px; color: #666666; line-height: 1.5; }
        .footer-thanks { text-align: center; font-size: 14px; font-weight: bold; color: #000000; margin-bottom: 10px; }
        
        /* Helper */
        .clear-both { clear: both; }
    </style>
</head>
<body>
<div class="page">

    {{-- CABEÇALHO COM LOGO LADO A LADO --}}
    <div class="header clearfix">
        <div class="header-left">
            <div class="logo-empresa-wrapper">
                
                <div class="logo-area">
                    <img src="data:image/jpeg;base64,{{ $logoBase64 }}" class="logo-img" alt="Logo">
                </div>
                
                <div class="empresa-info-area">
                    <div class="empresa-nome">{{ $empresa['nome'] ?? 'EMPRESA' }}</div>
                    <div class="empresa-info">
                        NIF: {{ $empresa['nif'] ?? '0000000000' }}<br>
                        {{ $empresa['morada'] ?? '' }}<br>
                        Tel: {{ $empresa['telefone'] ?? '' }}<br>
                        {{ $empresa['email'] ?? '' }}
                    </div>
                </div>
            </div>
        </div>
        <div class="header-right">
            @php
                $tipos = ['FT'=>'Fatura','FR'=>'Fatura-Recibo','FP'=>'Fatura Proforma','FA'=>'Fat. Adiantamento','NC'=>'Nota de Crédito','ND'=>'Nota de Débito','RC'=>'Recibo','FRt'=>'Fat. Retificação'];
                $estadoClasse = match($documento->estado ?? '') { 
                    'emitido'=>'estado-emitido',
                    'paga'=>'estado-paga',
                    'parcialmente_paga'=>'estado-parcial',
                    'cancelado'=>'estado-cancelado',
                    'expirado'=>'estado-expirado',
                    default=>'estado-emitido' 
                };
                $estadoLabel  = match($documento->estado ?? '') { 
                    'emitido'=>'Emitido',
                    'paga'=>'Pago',
                    'parcialmente_paga'=>'Pag. Parcial',
                    'cancelado'=>'Cancelado',
                    'expirado'=>'Expirado',
                    default=>($documento->estado ?? '') 
                };
            @endphp
            <div class="doc-tipo">{{ $tipos[$documento->tipo_documento] ?? $documento->tipo_documento }}</div>
            <div class="doc-numero">{{ $documento->numero_documento }}</div>
            <div class="doc-estado {{ $estadoClasse }}">{{ $estadoLabel }}</div>
        </div>
    </div>

    {{-- ORIGEM (se for recibo) --}}
    @if(isset($documento->documentoOrigem) && $documento->documentoOrigem)
    <div class="origem-box">
        <strong>Referente a:</strong>
        {{ $tipos[$documento->documentoOrigem->tipo_documento] ?? '' }}
        Nº {{ $documento->documentoOrigem->numero_documento }}
        — emitido em {{ \Carbon\Carbon::parse($documento->documentoOrigem->data_emissao)->format('d/m/Y') }}
    </div>
    @endif

    {{-- INFO DOC + CLIENTE --}}
    <div class="info-row clearfix">
        <div class="info-col-left">
            <div class="info-box">
                <div class="info-box-title">Dados do Documento</div>
                <div class="info-line"><span class="info-label">Série:</span><span class="info-value">{{ $documento->serie ?? 'A' }}</span></div>
                <div class="info-line">
                    <span class="info-label">Data de Emissão:</span>
                    <span class="info-value">{{ \Carbon\Carbon::parse($documento->data_emissao)->format('d/m/Y') }}{{ $documento->hora_emissao ? ' às '.substr($documento->hora_emissao, 0, 5) : '' }}</span>
                </div>
                @if($documento->data_vencimento)
                <div class="info-line"><span class="info-label">Vencimento:</span><span class="info-value">{{ \Carbon\Carbon::parse($documento->data_vencimento)->format('d/m/Y') }}</span></div>
                @endif
                @if($documento->referencia_externa)
                <div class="info-line"><span class="info-label">Ref. Externa:</span><span class="info-value">{{ $documento->referencia_externa }}</span></div>
                @endif
                @if($documento->motivo)
                <div class="info-line"><span class="info-label">Motivo:</span><span class="info-value">{{ $documento->motivo }}</span></div>
                @endif
                <div class="info-line"><span class="info-label">Operador:</span><span class="info-value">{{ $documento->user->name ?? 'Sistema' }}</span></div>
            </div>
        </div>
        <div class="info-col-right">
            <div class="info-box">
                <div class="info-box-title">Cliente</div>
                <div class="info-line"><span class="info-label">Nome:</span><span class="info-value">{{ $cliente['nome'] ?? 'Consumidor Final' }}</span></div>
                @if(!empty($cliente['nif']))<div class="info-line"><span class="info-label">NIF:</span><span class="info-value">{{ $cliente['nif'] }}</span></div>@endif
                @if(isset($documento->cliente) && !empty($documento->cliente->telefone))<div class="info-line"><span class="info-label">Telefone:</span><span class="info-value">{{ $documento->cliente->telefone }}</span></div>@endif
                @if(isset($documento->cliente) && !empty($documento->cliente->email))<div class="info-line"><span class="info-label">Email:</span><span class="info-value">{{ $documento->cliente->email }}</span></div>@endif
                @if(isset($documento->cliente) && !empty($documento->cliente->endereco))<div class="info-line"><span class="info-label">Morada:</span><span class="info-value">{{ $documento->cliente->endereco }}</span></div>@endif
            </div>
        </div>
    </div>

    {{-- ITENS --}}
    @if(!empty($itens) && count($itens) > 0)
    <div class="section-title">Itens</div>
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
        @foreach($itens as $item)
            <tr>
                <td>
                    <div class="item-nome">{{ $item->descricao ?? '' }}</div>
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
    @endif

    {{-- TOTAIS --}}
    <div class="totals-wrapper clearfix">
        <div class="totals-spacer"></div>
        <div class="totals-box">
            <table class="totals">
                <tr><td class="lbl">Base Tributável:</td><td>{{ number_format((float)($documento->base_tributavel ?? 0), 2, ',', '.') }} Kz</td></tr>
                <tr><td class="lbl">Total IVA:</td><td>{{ number_format((float)($documento->total_iva ?? 0), 2, ',', '.') }} Kz</td></tr>
                @if((float)($documento->total_retencao ?? 0) > 0)
                <tr class="ret-row"><td class="lbl">Retenção na Fonte:</td><td>- {{ number_format((float)$documento->total_retencao, 2, ',', '.') }} Kz</td></tr>
                @endif
                <tr class="sep"><td colspan="2"></td></tr>
                <tr class="total-final"><td><strong>TOTAL A PAGAR:</strong></td><td><strong>{{ number_format((float)($documento->total_liquido ?? 0), 2, ',', '.') }} Kz</strong></td></tr>
            </table>
        </div>
    </div>

    {{-- PAGAMENTO --}}
    @if(!empty($documento->metodo_pagamento))
    <div class="clearfix" style="margin-bottom:16px">
        <div class="payment-box">
            <div class="payment-title">Pagamento</div>
            @php $metodos = ['transferencia'=>'Transferência Bancária','multibanco'=>'Multibanco','dinheiro'=>'Dinheiro','cheque'=>'Cheque','cartao'=>'Cartão']; @endphp
            <div class="info-line"><span class="info-label">Método:</span><span class="info-value">{{ $metodos[$documento->metodo_pagamento] ?? $documento->metodo_pagamento }}</span></div>
            @if(!empty($documento->referencia_pagamento))<div class="info-line"><span class="info-label">Referência:</span><span class="info-value">{{ $documento->referencia_pagamento }}</span></div>@endif
            @if(isset($documento->troco) && $documento->troco > 0)<div class="info-line"><span class="info-label">Troco:</span><span class="info-value">{{ number_format($documento->troco, 2, ',', '.') }} Kz</span></div>@endif
        </div>
    </div>
    @endif

    {{-- OBSERVAÇÕES --}}
    @if(!empty($documento->observacoes))
    <div class="obs-box"><div class="obs-title">Observações</div>{{ $documento->observacoes }}</div>
    @endif

    {{-- HASH FISCAL + QR CODE --}}
    @if(!empty($documento->hash_fiscal) || !empty($qr_html))
    <div class="fiscal-block clearfix">

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
            <div class="qr-box">
                <div class="qr-label">Código QR — DP 71/25</div>
                <div class="qr-svg-wrap">{!! $qr_html !!}</div>
                @if(!empty($qr_code))
                <div class="qr-texto-pdf">{{ $qr_code }}</div>
                @endif
            </div>
        </div>
        @endif

    </div>
    @endif

    {{-- ASSINATURAS --}}
    <div class="clearfix" style="margin-top:35px; margin-bottom:12px">
        <div class="sig-left"><div class="sig-line"></div>Assinatura do Responsável</div>
        <div class="sig-right"><div class="sig-line"></div>Carimbo da Empresa</div>
    </div>

    {{-- RODAPÉ --}}
    <div class="footer-thanks">Obrigado pela preferência!</div>
    <div class="footer clearfix">
        <div class="footer-left"><strong>{{ $empresa['nome'] ?? 'EMPRESA' }}</strong> &nbsp;|&nbsp; NIF: {{ $empresa['nif'] ?? '0000000000' }}<br>{{ $empresa['morada'] ?? '' }} &nbsp;|&nbsp; Tel: {{ $empresa['telefone'] ?? '' }}</div>
        <div class="footer-right">Documento gerado em {{ now()->format('d/m/Y') }} às {{ now()->format('H:i') }}<br>{{ $empresa['email'] ?? '' }}</div>
    </div>

</div>
</body>
</html>