@php
if (!isset($documento) || !$documento) {
    die('Documento não encontrado');
}

// DADOS DINÂMICOS DA EMPRESA (DO TENANT) - Vem do controller
$empresaMorada = $empresa['endereco'] ?? 'Endereço não registrado';
$empresaTelefone = $empresa['telefone'] ?? 'Telefone não registrado';
$empresaEmail = $empresa['email'] ?? 'Email não registrado';
$empresaNome = $empresa['nome'] ?? 'EMPRESA';
$empresaNif = $empresa['nif'] ?? '0000000000';
$regimeFiscal = $empresa['regime_fiscal'] ?? null;

// DADOS BANCÁRIOS - Priorizar dados do documento sobre os da empresa
$docNomeBanco = $documento->nome_banco ?? null;
$docIban = $documento->iban ?? null;
$docNumeroConta = $documento->numero_conta ?? null;

$empresaBanco = $docNomeBanco ?? $empresa['nome_banco'] ?? null;
$empresaConta = $docNumeroConta ?? $empresa['numero_conta'] ?? null;
$empresaIban = $docIban ?? $empresa['iban'] ?? null;

// ✅ CORREÇÃO: Esconder dados bancários se o pagamento for em dinheiro
$temDadosBancarios = ($documento->metodo_pagamento !== 'dinheiro') 
    && (!empty($empresaBanco) || !empty($empresaConta) || !empty($empresaIban));

$logoPath = $empresa['logo'] ?? null;

if (!empty($empresa['logo_base64'])) {
    $empresaLogo = $empresa['logo_base64'];
} elseif (!empty($empresa['logo'])) {
    $logoPath = ltrim($empresa['logo'], '/');
    $logoPath = str_replace('public/', '', $logoPath);
    $empresaLogo = asset($logoPath);
} else {
    $empresaLogo = asset('images/default-logo.png');
}

$tiposDocumento = [
    'FT' => 'Factura',
    'FR' => 'Factura-Recibo',
    'FA' => 'Fact. Adiantamento',
    'NC' => 'Nota de Crédito',
    'ND' => 'Nota de Débito',
    'RC' => 'Recibo',
    'FG' => 'Factura Global',
    'FGR' => 'Factura Global-Recibo',
    'TV' => 'Talão de Venda'
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

if ($docParaTotais->venda_id && isset($docParaTotais->venda)) {
    $venda = $docParaTotais->venda;
    $descontoGlobal = (float) ($venda->desconto_global ?? 0);
    $troco = (float) ($venda->troco ?? 0);
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
$isAutoFaturacao = (bool) ($documento->auto_faturacao ?? false);
$taxaRetencao = (float) ($docParaTotais->base_tributavel ?? 0) > 0
    ? (float) ($docParaTotais->total_retencao ?? 0) / (float) $docParaTotais->base_tributavel * 100
    : 0;
$localOperacao = $empresa['local_operacao'] ?? $empresa['endereco'] ?? $empresa['morada'] ?? null;
$softwareCertificacao = $documento->software_certificacao_numero
    ?: ($empresa['software_validation_number'] ?? config('agt.numero_certificado'));
$numeroVia = $numeroVia ?? ((int) ($documento->print_count ?? 0) > 0
    ? ((int) $documento->print_count === 1
        ? 'Original'
        : (int) $documento->print_count . '.ª via, em conformidade com a original')
    : 'Original');
$valorPorExtenso = $isAutoFaturacao
    ? \App\Support\ValorPorExtensoKwanzas::format((float) ($documento->total_liquido ?? 0))
    : '';
@endphp

<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $documento->tipo_documento_nome }} {{ $documento->numero_documento }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', Courier, monospace; background: #525659; display: flex; justify-content: center; padding: 20px; min-height: 100vh; font-size: 11.5px; line-height: 1.35; }
        
        /* Container do Talão - 70mm (com margem para 80mm de papel) */
        .receipt { background: white; width: 70mm; max-width: 70mm; min-height: 70vh; margin: 0 auto; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); color: #000; }
        
        .header { text-align: center; margin-bottom: 7px; padding-bottom: 7px; border-bottom: 2px dashed #000; }
        .company-logo { width: 200px; height: 200px; object-fit: contain; margin-bottom: 4px; display: inline-block; }
        .company-name { font-size: 13px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; word-wrap: break-word; }
        .company-info { font-size: 9.5px; margin-bottom: 2px; word-wrap: break-word; }
        
        .doc-type-box { text-align: center; margin: 7px 0; padding: 4px; border: 2px solid #000; font-weight: bold; font-size: 13px; text-transform: uppercase; }
        .auto-faturacao-banner { margin: 7px 0; padding: 6px; border: 2px solid #000; font-size: 12px; font-weight: bold; text-align: center; }
        .auto-details { margin: 7px 0; padding: 5px; border: 1px dashed #000; font-size: 9.5px; }
        .amount-words { margin-top: 5px; font-size: 9px; font-style: italic; }
        
        .doc-info { margin-bottom: 7px; font-size: 10.5px; }
        .doc-row { display: flex; justify-content: space-between; margin-bottom: 3px; flex-wrap: wrap; gap: 5px; }
        .doc-row.full { justify-content: flex-start; }
        
        .reference { margin: 7px 0; padding: 4px; background: #f5f5f5; border: 1px dashed #999; font-size: 9.5px; text-align: center; word-wrap: break-word; }
        
        .client-section { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0; margin-bottom: 7px; }
        .section-title { font-weight: bold; font-size: 10.5px; margin-bottom: 3px; text-transform: uppercase; }
        .client-name { font-weight: bold; font-size: 11.5px; margin-bottom: 2px; word-wrap: break-word; }
        .client-details { font-size: 9.5px; word-wrap: break-word; }
        
        .items-section { margin-bottom: 7px; }
        .item { margin-bottom: 5px; padding-bottom: 4px; border-bottom: 1px dotted #ccc; }
        .item:last-child { border-bottom: none; }
        .item-desc { font-weight: bold; word-wrap: break-word; margin-bottom: 3px; font-size: 10.5px; }
        .item-line { display: flex; justify-content: space-between; font-size: 10.5px; flex-wrap: wrap; gap: 5px; }
        .item-qty { color: #555; }
        .item-total { font-weight: bold; }
        .item-tax { font-size: 8.5px; color: #666; margin-top: 2px; }
        
        .separator { border-top: 1px dashed #000; margin: 7px 0; }
        .separator-bold { border-top: 2px solid #000; margin: 7px 0; }
        
        .totals-section { margin-top: 7px; }
        .total-line { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10.5px; flex-wrap: wrap; gap: 5px; }
        .total-line.grand-total { font-size: 13px; font-weight: bold; border-top: 2px solid #000; padding-top: 4px; margin-top: 4px; }
        
        .tax-summary { font-size: 8.5px; margin-top: 7px; padding-top: 7px; border-top: 1px dashed #000; }
        
        /* QR Section */
        .qr-section-wrap { display: grid; grid-template-columns: 1fr; gap: 15px; margin: 15px 0; padding: 12px 0; border-top: 2px dashed #000; border-bottom: 2px dashed #000; }
        .qr-section { text-align: center; padding: 12px 0; border: 1px solid #ddd; border-radius: 5px; background: #fafafa; }
        .qr-title { font-size: 12px; font-weight: bold; margin-bottom: 8px; text-transform: uppercase; }
        
        .qr-image { width: 140px !important; height: 140px !important; max-width: 140px !important; max-height: 140px !important; margin: 0 auto; display: block; }
        .qr-section svg { width: 140px !important; height: 140px !important; max-width: 140px !important; max-height: 140px !important; }
        .qr-section img { width: 140px !important; height: 140px !important; max-width: 140px !important; max-height: 140px !important; }
        
        .hash-section { margin-top: 1px; font-size: 9px; text-align: center; align-items: center; word-break: break-all; font-family: monospace; text-align: center; }
        .hash-label { font-weight: bold; text-align: center; font-size: 9px; }
        
        .footer { text-align: center; font-size: 9.5px; }
        .footer-title { font-weight: bold; font-size: 11px; margin-bottom: 1px; text-transform: uppercase; }
        .footer-msg { margin-bottom: 1px; }
        .software-info { font-size: 8.5px; color: #666; margin-top: 7px; }
        .timestamp { font-size: 8.5px; margin-top: 5px; color: #666; }
        
        .bank-footer { border-top: 1px dashed #ccc; padding-top: 8px; margin-top: 8px; font-size: 9.5px; text-align: left; }
        .bank-footer .bank-title-footer { font-weight: bold; font-size: 10px; margin-bottom: 4px; text-align: center; }
        .bank-footer .bank-line { padding: 2px 0; }
        .bank-footer .bank-label { font-weight: bold; }
        
        /* Botões (só na tela) */
        .actions { position: fixed; top: 20px; right: 20px; display: flex; gap: 8px; z-index: 1000; }
        .btn { padding: 8px 16px; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: bold; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4); }
        .btn-print { background: #4CAF50; color: white; }
        .btn-close { background: #f44336; color: white; }
        
        /* Loading */
        .loading { position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 9999; color: white; font-family: sans-serif; }
        .loading.hidden { display: none; }
        .spinner { width: 45px; height: 45px; border: 3px solid rgba(255, 255, 255, 0.3); border-top: 3px solid #4CAF50; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 14px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        /* Media Print */
        @media print {
            body { background: white; padding: 0; margin: 0; }
            .actions, .loading { display: none !important; }
            .receipt { box-shadow: none; width: 100%; max-width: 80mm; padding: 0; margin: 0 auto; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .qr-image { width: 140px !important; height: 140px !important; max-width: 140px !important; max-height: 140px !important; }
            .qr-section svg { width: 140px !important; height: 140px !important; max-width: 140px !important; max-height: 140px !important; }
            .qr-section img { width: 140px !important; height: 140px !important; max-width: 140px !important; max-height: 140px !important; }
        }
        @page { margin: 0; size: 80mm auto; }
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
            @if($isAutoFaturacao)
            <div class="company-info"><strong>EMITENTE / ADQUIRENTE</strong></div>
            @endif
            <div class="company-name">{{ $empresaNome }}</div>
            <div class="company-info">NIF: {{ $empresaNif }}</div>
            @if($regimeFiscal === 'exclusao')
            <div class="company-info"><strong>Documento emitido ao abrigo do Regime de Exclusão do IVA</strong></div>
            @endif
            @if(!empty($empresaMorada))
            <div class="company-info">{{ $empresaMorada }}</div>
            @endif
            @if(!empty($empresaTelefone))
            <div class="company-info">Tel: {{ $empresaTelefone }}</div>
            @endif
            @if(!empty($empresaEmail))
            <div class="company-info">{{ $empresaEmail }}</div>
            @endif
        </div>

        <!-- Tipo Documento -->
        <div class="doc-type-box">
            {{ $documento->tipo_documento_nome }}
        </div>

        @if($isAutoFaturacao)
        <div class="auto-faturacao-banner">AUTO-FACTURAÇÃO</div>
        @endif

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
                <span><strong>Operador:</strong> {{ $documento->user->name ?? 'Sistema' }}</span>
            </div>
            
            <!-- ✅ CORREÇÃO: Via e Certificação sempre visíveis -->
            <div class="doc-row full">
                <span><strong>Via:</strong> {{ $numeroVia }}</span>
            </div>
            @if($isAutoFaturacao)
                @if(!empty($softwareCertificacao))
                <div class="doc-row full">
                    <span><strong>N.º de certificação do software:</strong> {{ $softwareCertificacao }}</span>
                </div>
                @endif
            @endif
        </div>

        <!-- Referência (se for RC e tiver factura de origem) -->
        @if($documento->tipo_documento === 'RC' && $documentoOrigem)
        <div class="reference">
            <strong>Ref. Documento Origem:</strong><br>
            {{ $documentoOrigem->tipo_documento_nome }} Nº {{ $documentoOrigem->numero_documento }}
        </div>
        @endif

        <!-- Cliente -->
        <div class="client-section">
            <div class="section-title">{{ $isAutoFaturacao ? 'FORNECEDOR / PRODUTOR' : 'CLIENTE' }}</div>
            <div class="client-name">{{ $cliente['nome'] ?? 'Consumidor Final' }}</div>
            @if(!empty($cliente['nif']))
            <div class="client-details">NIF: {{ $cliente['nif'] }}</div>
            @endif
            @if(!empty($cliente['morada']))
            <div class="client-details">{{ $cliente['morada'] }}</div>
            @endif
        </div>

        @if($isAutoFaturacao)
        <div class="auto-details">
            <div><strong>Motivo da auto-facturação:</strong> {{ $documento->motivo_auto_faturacao ?? 'Não indicado' }}</div>
            @if(!empty($localOperacao))
            <div><strong>Local da operação:</strong> {{ $localOperacao }}</div>
            @endif
        </div>
        @endif

        <!-- Itens -->
        <div class="items-section">
            <div class="section-title" style="margin-bottom: 5px;">ITENS</div>
            @forelse($itens as $item)
            <div class="item">
                <div class="item-desc">{{ $item->descricao }}</div>
                <div class="item-line">
                    <span class="item-qty">{{ number_format($item->quantidade, 0, ',', '.') }} x {{ number_format($item->preco_unitario, 2, ',', '.') }}</span>
                    <span class="item-total">{{ number_format($item->total_linha ?? ($item->quantidade * $item->preco_unitario), 2, ',', '.') }} Kz</span>
                </div>
                @if(($item->taxa_iva ?? 0) > 0)
                <div class="item-tax">IVA: {{ $item->taxa_iva }}%</div>
                @elseif(!empty($item->motivo_isencao) || !empty($item->codigo_isencao))
                <div class="item-tax">
                    Motivo da não liquidação do IVA @if(!empty($item->codigo_isencao))({{ $item->codigo_isencao }})@endif:
                    {{ $item->motivo_isencao ?? \App\Services\DocumentoFiscalService::MOTIVOS_ISENCAO[$item->codigo_isencao ?? ''] ?? 'IVA não liquidado' }}
                </div>
                @endif
                @if(($item->valor_retencao ?? 0) > 0)
                <div class="item-tax">Retenção: {{ $item->taxa_retencao ?? 0 }}%</div>
                @endif
            </div>
            @empty
            <div class="item"><div class="item-desc">Documento sem itens detalhados</div></div>
            @endforelse
        </div>

        <div class="separator-bold"></div>

        <!-- Totais -->
        <div class="totals-section">
            @if($temDesconto)
            <div class="total-line">
                <span>Subtotal bruto:</span>
                <span>{{ number_format($docParaTotais->base_tributavel + $descontoGlobal, 2, ',', '.') }} Kz</span>
            </div>
            <div class="total-line">
                <span>Desconto ({{ number_format($percentualDesconto, 2, ',', '.') }}%):</span>
                <span>- {{ number_format($descontoGlobal, 2, ',', '.') }} Kz</span>
            </div>
            @endif
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
                <span>{{ $isAutoFaturacao ? 'Retenção na fonte (' . number_format($taxaRetencao, 1, ',', '.') . '%) — a entregar ao Estado:' : 'Retenção:' }}</span>
                <span>- {{ number_format($docParaTotais->total_retencao ?? 0, 2, ',', '.') }} Kz</span>
            </div>
            @endif
            @if($isAutoFaturacao)
            <div class="total-line">
                <span>Valor líquido ao fornecedor:</span>
                <span>{{ number_format($documento->total_liquido, 2, ',', '.') }} Kz</span>
            </div>
            @endif
            @if(in_array($documento->tipo_documento, ['FR', 'RC', 'TV', 'FG', 'FGR']) && !empty($documento->metodo_pagamento))
            <div class="total-line">
                <span>Forma de Pagamento:</span>
                <span>{{ $metodosPagamento[$documento->metodo_pagamento] ?? ucfirst($documento->metodo_pagamento) }}</span>
            </div>
            @endif
            @if($temTroco)
            <div class="total-line">
                <span>Troco:</span>
                <span>{{ number_format($troco, 2, ',', '.') }} Kz</span>
            </div>
            @endif

            <!-- ✅ CORREÇÃO: TOTAL GERAL para todos os tipos -->
            @if(in_array($documento->tipo_documento, ['FT', 'FR', 'RC', 'TV', 'FG', 'FGR']))
            <div class="total-line grand-total">
                <strong>
                    @if($documento->tipo_documento === 'FT') TOTAL A PAGAR
                    @elseif($isAutoFaturacao) TOTAL PAGO AO FORNECEDOR
                    @else TOTAL PAGO
                    @endif
                </strong>
                <strong>{{ number_format($documento->total_liquido, 2, ',', '.') }} Kz</strong>
            </div>
            @endif
            @if($isAutoFaturacao)
            <div class="amount-words"><strong>Valor por extenso:</strong> {{ $valorPorExtenso }}</div>
            @endif
        </div>

        <!-- ✅ CORREÇÃO: QR Code desbloqueado -->
        @if(!empty($proof_qr_html) || !empty($qr_code_img) || !empty($qr_html) || !empty($documento->hash_fiscal))
        <div class="qr-section-wrap">
            @if(!empty($proof_qr_html) || !empty($qr_code_img) || !empty($qr_html))
            <div class="qr-section">
                <div class="qr-title">QR Code AGT</div>
                @if(!empty($qr_code_img))
                    <img src="{{ $qr_code_img }}" alt="QR Code" class="qr-image">
                @elseif(!empty($qr_html))
                    {!! $qr_html !!}
                @else
                    {!! $proof_qr_html !!}
                @endif
            </div>
            @endif

            @if(!empty($documento->hash_fiscal))
            <div class="hash-section">
                <div class="hash-label">Hash Fiscal:</div>
                {{ $documento->hash_fiscal }}
            </div>
            @endif
        </div>
        @endif

        <!-- ✅ CORREÇÃO: Dados bancários escondidos no pagamento em dinheiro -->
        @if($temDadosBancarios)
        <div class="bank-footer">
            <div class="bank-title-footer">DADOS BANCÁRIOS</div>
            @if(!empty($empresaBanco))
            <div class="bank-line"><span class="bank-label">Banco:</span> {{ $empresaBanco }}</div>
            @endif
            @if(!empty($empresaConta))
            <div class="bank-line"><span class="bank-label">Nº Conta:</span> {{ $empresaConta }}</div>
            @endif
            @if(!empty($empresaIban))
            <div class="bank-line"><span class="bank-label">IBAN:</span> {{ $empresaIban }}</div>
            @endif
        </div>
        @endif

        <!-- Rodapé -->
        <div class="footer">
            <div class="footer-title">OBRIGADO PELA PREFERÊNCIA!</div>
            <div class="footer-msg">Volte sempre</div>
            <div class="footer-msg">Processado pelo sistema de facturação faturaja</div>
            <!-- ✅ CORREÇÃO: Fuso horário de Angola -->
            <div class="timestamp">{{ now('Africa/Luanda')->format('d/m/Y H:i:s') }}</div>
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