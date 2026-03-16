{{-- resources/views/documentos/print.blade.php --}}
{{-- Talão térmico 80mm — baseado no componente PrintReceipt do frontend --}}
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ $documento->tipo_documento_nome }} - {{ $documento->numero_documento }}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.4;
      background: white;
      color: #000;
      width: 80mm;
    }

    /* Ecrã — centraliza o talão com fundo cinzento */
    @media screen {
      body {
        background: #d1d5db;
        width: 100%;
        display: flex;
        justify-content: center;
        padding: 20px 0 40px;
      }
    }

    @media print {
      body { width: 80mm; background: white; }
      .no-print { display: none !important; }
    }

    .talao {
      width: 80mm;
      padding: 4mm 4mm 6mm;
      background: white;
    }

    /* ── Utilitários ───────────────────────── */
    .center  { text-align: center; }
    .right   { text-align: right; }
    .bold    { font-weight: bold; }
    .small   { font-size: 10px; }
    .tiny    { font-size: 9px; }
    .mono    { font-family: 'Courier New', monospace; }

    .sep-dash {
      border: none;
      border-top: 1px dashed #666;
      margin: 6px 0;
    }

    .sep-solid {
      border: none;
      border-top: 2px solid #000;
      margin: 6px 0;
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .col-half   { width: 50%; }
    .col-third  { width: 33.333%; }
    .col-sixth  { width: 16.666%; }

    /* ── Cabeçalho ─────────────────────────── */
    .header {
      text-align: center;
      padding-bottom: 8px;
      margin-bottom: 8px;
      border-bottom: 1px dashed #666;
    }

    .header .logo {
      width: 55px;
      height: 55px;
      object-fit: contain;
      display: block;
      margin: 0 auto 6px;
    }

    .header .empresa-nome {
      font-size: 15px;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 3px;
    }

    /* ── Tipo e Número ─────────────────────── */
    .doc-info {
      padding-bottom: 6px;
      margin-bottom: 6px;
      border-bottom: 1px dashed #666;
    }

    .doc-info .tipo-numero {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: bold;
    }

    /* ── Referência de origem (RC) ─────────── */
    .origem-box {
      background: #f0f0f0;
      padding: 4px 6px;
      margin-bottom: 6px;
      font-size: 10px;
    }

    /* ── Cliente ───────────────────────────── */
    .cliente-block {
      padding-bottom: 6px;
      margin-bottom: 6px;
      border-bottom: 1px dashed #666;
    }

    /* ── Itens ─────────────────────────────── */
    .itens-block {
      padding-bottom: 6px;
      margin-bottom: 6px;
      border-bottom: 2px dashed #666;
    }

    .itens-header {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      font-weight: bold;
      border-bottom: 1px solid #ccc;
      padding-bottom: 3px;
      margin-bottom: 4px;
    }

    .item {
      margin-bottom: 5px;
    }

    .item-desc {
      font-size: 10px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-valores {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
    }

    .item-taxas {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #555;
      margin-top: 2px;
    }

    .tag-iva { color: #2563eb; }
    .tag-ret { color: #dc2626; }

    /* ── Totais ────────────────────────────── */
    .totais-block {
      padding-bottom: 6px;
      margin-bottom: 6px;
      border-bottom: 1px dashed #666;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      margin-bottom: 2px;
    }

    .total-grand {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      font-weight: bold;
      border-top: 2px solid #000;
      margin-top: 4px;
      padding-top: 4px;
    }

    .ret-valor { color: #dc2626; }

    /* ── Hash Fiscal ───────────────────────── */
    .hash-block {
      text-align: center;
      margin-bottom: 8px;
      padding: 4px 0;
    }

    /* ── Dados Bancários ───────────────────── */
    .bank-block {
      font-size: 10px;
      text-align: center;
      border-top: 1px dashed #666;
      padding-top: 8px;
    }

    .bank-block p { margin-bottom: 2px; }

    /* ── Botão imprimir (só no ecrã) ───────── */
    .print-bar {
      position: fixed;
      top: 12px;
      right: 12px;
      display: flex;
      gap: 6px;
      z-index: 100;
    }

    .btn {
      padding: 7px 14px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      font-family: sans-serif;
      font-size: 13px;
      font-weight: 600;
    }

    .btn-print { background: #1a1a2e; color: white; }
    .btn-close { background: #e5e7eb; color: #374151; }
  </style>
</head>
<body>

<div class="print-bar no-print">
  <button class="btn btn-print" onclick="window.print()">🖨️ Imprimir</button>
  <button class="btn btn-close" onclick="window.close()">✕ Fechar</button>
</div>

<div class="talao">

  {{-- ── Cabeçalho ──────────────────────── --}}
<div class="header">
  <img src="{{ asset('images/4.png') }}" alt="Logo" class="logo" />
  <div class="empresa-nome">{{ $empresa['nome'] }}</div>
  <div class="small">NIF: {{ $empresa['nif'] }}</div>
  @if(!empty($empresa['morada']))
    <div class="small">{{ $empresa['morada'] }}</div>
  @endif
  @if(!empty($empresa['telefone']))
    <div class="small">Tel: {{ $empresa['telefone'] }}</div>
  @endif
</div>

  {{-- ── Tipo e Número ───────────────────── --}}
  <div class="doc-info">
    <div class="tipo-numero">
      <span>{{ $documento->tipo_documento_nome }}</span>
      <span>Nº {{ $documento->numero_documento }}</span>
    </div>
    <div class="row small" style="margin-top:3px;">
      <span>Série: {{ $documento->serie }}</span>
      <span>
        {{ \Carbon\Carbon::parse($documento->data_emissao)->format('d/m/Y') }}
        {{ $documento->hora_emissao ? substr($documento->hora_emissao, 0, 5) : '' }}
      </span>
    </div>
  </div>

  {{-- ── Referência de origem (RC) ────────── --}}
  @if($documento->tipo_documento === 'RC' && $documentoOrigem)
  <div class="origem-box">
    <strong>Referente a:</strong>
    {{ $documentoOrigem->tipo_documento_nome }} Nº {{ $documentoOrigem->numero_documento }}
  </div>
  @endif

  {{-- ── Cliente ─────────────────────────── --}}
  <div class="cliente-block">
    <div class="bold small">Cliente: {{ $cliente['nome'] ?? 'Consumidor Final' }}</div>
    @if($cliente['nif'])
      <div class="small">NIF: {{ $cliente['nif'] }}</div>
    @endif
  </div>

  {{-- ── Itens ───────────────────────────── --}}
  <div class="itens-block">
    <div class="itens-header">
      <span class="col-half">Descrição</span>
      <span class="col-sixth" style="text-align:center;">Qtd</span>
      <span class="col-third" style="text-align:right;">Total</span>
    </div>

    @forelse($itens as $item)
    <div class="item">
      <div class="item-desc">{{ $item->descricao }}</div>
      <div class="item-valores">
        <span class="col-half">{{ number_format($item->preco_unitario ?? 0, 2, ',', '.') }} Kz</span>
        <span class="col-sixth" style="text-align:center;">{{ number_format($item->quantidade ?? 1, 0, ',', '.') }}</span>
        <span class="col-third bold" style="text-align:right;">{{ number_format($item->total_linha ?? 0, 2, ',', '.') }} Kz</span>
      </div>
      <div class="item-taxas">
        @if(isset($item->taxa_iva) && $item->taxa_iva > 0)
          <span class="tag-iva">IVA: {{ $item->taxa_iva }}%</span>
        @else
          <span class="tag-iva">IVA: -</span>
        @endif
        @if(isset($item->valor_retencao) && $item->valor_retencao > 0)
          <span class="tag-ret">Ret: {{ number_format($item->taxa_retencao ?? 6.5, 1) }}%</span>
        @else
          <span class="tag-ret">Ret: -</span>
        @endif
      </div>
    </div>
    @empty
    <div class="center small" style="color:#888; padding:6px 0;">Nenhum item</div>
    @endforelse
  </div>

  {{-- ── Totais ───────────────────────────── --}}
  <div class="totais-block">
    <div class="total-row">
      <span>Base Tributável:</span>
      <span>{{ number_format($docInfo->base_tributavel ?? 0, 2, ',', '.') }} Kz</span>
    </div>
    <div class="total-row">
      <span>Total IVA:</span>
      <span>{{ number_format($docInfo->total_iva ?? 0, 2, ',', '.') }} Kz</span>
    </div>
    @if(isset($docInfo->total_retencao) && $docInfo->total_retencao > 0)
    <div class="total-row">
      <span>Total Retenção:</span>
      <span class="ret-valor">-{{ number_format($docInfo->total_retencao, 2, ',', '.') }} Kz</span>
    </div>
    @endif
    <div class="total-grand">
      <span>TOTAL:</span>
      <span>{{ number_format($documento->total_liquido, 2, ',', '.') }} Kz</span>
    </div>
  </div>

  {{-- ── Hash Fiscal ──────────────────────── --}}
  @if($documento->hash_fiscal)
  <div class="hash-block">
    <div class="bold small">Hash Fiscal:</div>
    <div class="tiny" style="word-break:break-all; line-height:1.3; margin-top:2px;">
      {{ $documento->hash_fiscal }}
    </div>
  </div>
  @endif

  {{-- ── Dados Bancários ─────────────────── --}}
  <div class="bank-block">
    <p class="bold small" style="margin-bottom:4px;">Coordenadas bancárias</p>
    <p class="small">Banco: BAI</p>
    <p class="small">IBAN: AO06 0004 0000 1234 5678 9012 3</p>
    <p class="bold small" style="margin-top:6px;">Obrigado pela preferência!</p>
    <p class="small" style="margin-top:4px;">*** Fim do Documento ***</p>
  </div>

</div>

<script>
  if (new URLSearchParams(window.location.search).get('auto') === '1') {
    // Esconde a página enquanto carrega para não mostrar pré-visualização
    document.documentElement.style.visibility = 'hidden';
    window.addEventListener('load', function () {
      document.documentElement.style.visibility = 'visible';
      window.print();
      // Fecha a janela automaticamente após imprimir ou cancelar
      window.addEventListener('afterprint', function () {
        window.close();
      });
    });
  }
</script>
</body>
</html>