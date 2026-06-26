@php
if (!isset($documento) || !$documento) {
    die('Documento não encontrado');
}

$empresaNome = $empresa['nome'] ?? 'EMPRESA';
$empresaNif = $empresa['nif'] ?? '0000000000';
$empresaMorada = $empresa['endereco'] ?? $empresa['morada'] ?? null;
$empresaTelefone = $empresa['telefone'] ?? null;
$empresaEmail = $empresa['email'] ?? null;
$clienteNome = $cliente['nome'] ?? 'Consumidor Final';
$clienteNif = $cliente['nif'] ?? null;
$clienteMorada = $cliente['morada'] ?? null;
$tipoDocumento = $documento->tipo_documento_nome ?? 'Documento Fiscal';
@endphp

<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprovativo Público - {{ $tipoDocumento }} {{ $documento->numero_documento }}</title>
    <style>
        body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f3f5f8;
            color: #222;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 18px 40px rgba(0,0,0,0.08);
            overflow: hidden;
        }
        .header {
            padding: 24px;
            background: #1f2937;
            color: #fff;
        }
        .header h1 {
            margin: 0;
            font-size: 22px;
        }
        .header p {
            margin: 6px 0 0;
            color: #d1d5db;
            font-size: 14px;
        }
        .section {
            padding: 24px;
            border-bottom: 1px solid #e5e7eb;
        }
        .section-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 14px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #111827;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
        }
        .box {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 16px;
        }
        .box p {
            margin: 4px 0;
            font-size: 14px;
        }
        .box strong {
            display: inline-block;
            width: 120px;
            color: #111827;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
            font-size: 14px;
        }
        .items-table th,
        .items-table td {
            padding: 12px 10px;
            border: 1px solid #e5e7eb;
            text-align: left;
        }
        .items-table th {
            background: #f3f4f6;
            color: #111827;
        }
        .totals {
            margin-top: 16px;
            width: 100%;
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 8px;
            justify-content: flex-end;
        }
        .total-line {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            font-size: 14px;
            padding: 8px 12px;
            border-radius: 8px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
        }
        .total-line strong {
            color: #111827;
        }
        .alert {
            margin-top: 20px;
            padding: 16px;
            background: #fef3c7;
            border: 1px solid #fde68a;
            border-radius: 10px;
            color: #92400e;
        }
        .qr-card {
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 20px;
            align-items: center;
        }
        .qr-info {
            display: grid;
            gap: 10px;
        }
        .qr-info p {
            margin: 0;
            font-size: 14px;
            line-height: 1.5;
        }
        .qr-box {
            border: 1px solid #e5e7eb;
            padding: 16px;
            border-radius: 12px;
            background: #fafafa;
            text-align: center;
        }
        .qr-box .title {
            font-weight: bold;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            font-size: 12px;
            color: #111827;
        }
        .qr-box img,
        .qr-box svg {
            max-width: 100%;
            height: auto;
        }
        .footer {
            padding: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
            flex-wrap: wrap;
            font-size: 13px;
            color: #6b7280;
        }
        .footer strong {
            color: #111827;
        }
        .proof-url {
            word-break: break-all;
            color: #111827;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{ $tipoDocumento }} — Prova Pública</h1>
            <p>Documento fiscal validado e disponível para consulta pública através do QR ou URL abaixo.</p>
        </div>

        <div class="section">
            <div class="section-title">Dados da Empresa</div>
            <div class="grid">
                <div class="box">
                    <p><strong>Nome:</strong> {{ $empresaNome }}</p>
                    @if($empresaNif)
                    <p><strong>NIF:</strong> {{ $empresaNif }}</p>
                    @endif
                    @if($empresaMorada)
                    <p><strong>Morada:</strong> {{ $empresaMorada }}</p>
                    @endif
                </div>
                <div class="box">
                    @if($empresaTelefone)
                    <p><strong>Telefone:</strong> {{ $empresaTelefone }}</p>
                    @endif
                    @if($empresaEmail)
                    <p><strong>Email:</strong> {{ $empresaEmail }}</p>
                    @endif
                    <p><strong>Documento:</strong> {{ $documento->numero_documento ?? 'N/A' }}</p>
                    <p><strong>Data Emissão:</strong> {{ \Carbon\Carbon::parse($documento->data_emissao)->format('d/m/Y') }}</p>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Dados do Cliente</div>
            <div class="box">
                <p><strong>Nome:</strong> {{ $clienteNome }}</p>
                @if($clienteNif)
                <p><strong>NIF:</strong> {{ $clienteNif }}</p>
                @endif
                @if($clienteMorada)
                <p><strong>Morada:</strong> {{ $clienteMorada }}</p>
                @endif
            </div>
        </div>

        <div class="section">
            <div class="section-title">Itens</div>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Descrição</th>
                        <th>Qtd.</th>
                        <th>Preço Unit.</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($itens as $item)
                        <tr>
                            <td>{{ $item->descricao }}</td>
                            <td>{{ number_format($item->quantidade ?? 0, 0, ',', '.') }}</td>
                            <td>{{ number_format($item->preco_unitario ?? 0, 2, ',', '.') }} Kz</td>
                            <td>{{ number_format($item->total_linha ?? ($item->quantidade * $item->preco_unitario), 2, ',', '.') }} Kz</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="4" style="text-align:center;">Nenhum item encontrado.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>

            <div class="totals">
                <div class="total-line"><span>Sub-total</span><strong>{{ number_format($documento->base_tributavel ?? 0, 2, ',', '.') }} Kz</strong></div>
                <div class="total-line"><span>Total IVA</span><strong>{{ number_format(($documento->iva_montante ?? 0), 2, ',', '.') }} Kz</strong></div>
                <div class="total-line"><span>Total Líquido</span><strong>{{ number_format($documento->total_liquido ?? 0, 2, ',', '.') }} Kz</strong></div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Comprovativo Público</div>
            <div class="qr-card">
                <div class="qr-info">
                    <p><strong>URL público de consulta:</strong></p>
                    <p class="proof-url">{{ $proof_url }}</p>
                    <p>Use o código QR ao lado para abrir esta página de prova em qualquer dispositivo.</p>
                </div>
                <div class="qr-box">
                    <div class="title">QR de Prova</div>
                    {!! $proof_qr_html !!}
                </div>
            </div>
        </div>

        <div class="footer">
            <div><strong>Hash Fiscal:</strong> {{ $documento->hash_fiscal ?? 'N/A' }}</div>
            <div><strong>Emitido em:</strong> {{ now()->format('d/m/Y H:i') }}</div>
        </div>
    </div>
</body>
</html>
