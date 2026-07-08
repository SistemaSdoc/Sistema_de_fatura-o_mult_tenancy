@php
if (!isset($documento) || !$documento) {
    die('Documento não encontrado');
}

$empresaNome = $empresa['nome'] ?? 'EMPRESA';
$empresaNif = $empresa['nif'] ?? '0000000000';
$empresaMorada = $empresa['endereco'] ?? $empresa['morada'] ?? null;
$empresaTelefone = $empresa['telefone'] ?? null;
$empresaEmail = $empresa['email'] ?? null;

// ✅ DADOS BANCÁRIOS - PRIORIZAR DADOS DO DOCUMENTO SOBRE OS DA EMPRESA
$docNomeBanco = $documento->nome_banco ?? null;
$docIban = $documento->iban ?? null;
$docNumeroConta = $documento->numero_conta ?? null;

$empresaBanco = $docNomeBanco ?? $empresa['nome_banco'] ?? null;
$empresaConta = $docNumeroConta ?? $empresa['numero_conta'] ?? null;
$empresaIban = $docIban ?? $empresa['iban'] ?? null;

$temDadosBancarios = !empty($empresaBanco) || !empty($empresaConta) || !empty($empresaIban);

$empresaLogo = asset('images/default-logo.png');
if (!empty($empresa['logo_base64'])) {
    $empresaLogo = $empresa['logo_base64'];
} elseif (!empty($empresa['logo'])) {
    $logoPath = ltrim((string) $empresa['logo'], '/');
    $logoPath = str_replace('public/', '', $logoPath);
    if (Storage::disk('public')->exists($logoPath)) {
        $logoConteudo = Storage::disk('public')->get($logoPath);
        $logoMime = Storage::disk('public')->mimeType($logoPath) ?: 'image/png';
        $empresaLogo = 'data:' . $logoMime . ';base64,' . base64_encode($logoConteudo);
    } else {
        $empresaLogo = asset('storage/' . $logoPath);
    }
}
$clienteNome = $cliente['nome'] ?? 'Consumidor Final';
$clienteNif = $cliente['nif'] ?? null;
$clienteMorada = $cliente['morada'] ?? null;
$tipoDocumento = $documento->tipo_documento_nome ?? 'Documento Fiscal';

$estadoLabel = match($documento->estado ?? '') {
    'emitido' => 'Emitido',
    'paga' => 'Pago',
    'parcialmente_paga' => 'Pago Parcialmente',
    'cancelado' => 'Cancelado',
    'expirado' => 'Expirado',
    default => ucfirst((string) ($documento->estado ?? '')),
};

$estadoClasse = match($documento->estado ?? '') {
    'emitido' => 'state-emitido',
    'paga' => 'state-pago',
    'parcialmente_paga' => 'state-parcial',
    'cancelado' => 'state-cancelado',
    'expirado' => 'state-expirado',
    default => 'state-emitido',
};

$mostrarQr = ($documento->tipo_documento ?? null) !== 'FP';
@endphp

<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprovativo Público - {{ $tipoDocumento }} {{ $documento->numero_documento }}</title>
    <style>
        :root {
            --fj-primary: #123859;
            --fj-accent: #F9941F;
            --fj-bg: #F2F2F2;
            --fj-card: #FFFFFF;
            --fj-text: #171717;
            --fj-text-soft: #4B5563;
            --fj-border: #E5E7EB;
            --fj-muted: #F9FAFB;
            --fj-soft-accent: #FFF4E6;
            --fj-soft-primary: #EAF1F7;
            --fj-success: #28a745;
        }

        * {
            box-sizing: border-box;
        }

        body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            background:
                radial-gradient(circle at top left, rgba(18, 56, 89, 0.10), transparent 30%),
                radial-gradient(circle at top right, rgba(249, 148, 31, 0.14), transparent 24%),
                linear-gradient(180deg, #F7F8FA 0%, var(--fj-bg) 100%);
            color: var(--fj-text);
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: var(--fj-card);
            border: 1px solid rgba(18, 56, 89, 0.08);
            border-radius: 20px;
            box-shadow: 0 24px 70px rgba(18, 56, 89, 0.10);
            overflow: hidden;
        }
        .header {
            padding: 28px 28px 24px;
            background:
                linear-gradient(135deg, var(--fj-primary) 0%, #1a4a73 100%);
            color: #fff;
            position: relative;
        }
        .header::after {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 5px;
            background: linear-gradient(90deg, var(--fj-accent) 0%, #ffb14d 100%);
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            letter-spacing: -0.02em;
        }
        .header p {
            margin: 8px 0 0;
            color: rgba(255, 255, 255, 0.86);
            font-size: 14px;
            max-width: 56ch;
        }
        .brand-row {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 10px;
        }
        .brand-logo {
            width: 68px;
            height: 68px;
            border-radius: 16px;
            object-fit: contain;
            background: rgba(255, 255, 255, 0.18);
            padding: 8px;
            border: 1px solid rgba(255, 255, 255, 0.18);
            flex-shrink: 0;
        }
        .header-badges {
            margin-top: 14px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 7px 12px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.02em;
        }
        .pill-primary {
            background: rgba(255, 255, 255, 0.16);
            border: 1px solid rgba(255, 255, 255, 0.22);
        }
        .pill-state {
            background: #fff;
            color: var(--fj-primary);
        }
        .state-emitido { background: #eaf1f7; color: var(--fj-primary); }
        .state-pago { background: #e8f7ee; color: var(--fj-success); }
        .state-parcial { background: #fff4e6; color: #c46a00; }
        .state-cancelado { background: #fdecec; color: #b91c1c; }
        .state-expirado { background: #f1f5f9; color: #475569; }
        .section {
            padding: 24px 28px;
            border-bottom: 1px solid var(--fj-border);
            background: linear-gradient(180deg, #fff 0%, #fff 100%);
        }
        .section:last-of-type {
            border-bottom: 0;
        }
        .section-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 14px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: var(--fj-primary);
            display: inline-flex;
            align-items: center;
            gap: 10px;
        }
        .section-title::before {
            content: "";
            width: 10px;
            height: 10px;
            border-radius: 999px;
            background: var(--fj-accent);
            box-shadow: 0 0 0 4px rgba(249, 148, 31, 0.16);
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
        }
        .box {
            background: linear-gradient(180deg, var(--fj-muted) 0%, #fff 100%);
            border: 1px solid var(--fj-border);
            border-radius: 14px;
            padding: 16px;
        }
        .box p {
            margin: 4px 0;
            font-size: 14px;
            color: var(--fj-text-soft);
            line-height: 1.55;
        }
        .box strong {
            display: inline-block;
            width: 120px;
            color: var(--fj-text);
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
            border: 1px solid var(--fj-border);
            text-align: left;
        }
        .items-table th {
            background: linear-gradient(180deg, var(--fj-soft-primary) 0%, #fff 100%);
            color: var(--fj-primary);
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
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
            border-radius: 10px;
            background: var(--fj-muted);
            border: 1px solid var(--fj-border);
        }
        .total-line strong {
            color: var(--fj-primary);
        }
        .alert {
            margin-top: 20px;
            padding: 16px;
            background: var(--fj-soft-accent);
            border: 1px solid rgba(249, 148, 31, 0.28);
            border-radius: 12px;
            color: #8A4B00;
        }
        .qr-card {
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 20px;
            align-items: center;
            padding: 2px 0 0;
        }
        .qr-info {
            display: grid;
            gap: 10px;
        }
        .qr-info p {
            margin: 0;
            font-size: 14px;
            line-height: 1.5;
            color: var(--fj-text-soft);
        }
        .qr-box {
            border: 1px solid rgba(18, 56, 89, 0.12);
            padding: 16px;
            border-radius: 16px;
            background: linear-gradient(180deg, #fff 0%, var(--fj-muted) 100%);
            text-align: center;
            box-shadow: 0 14px 30px rgba(18, 56, 89, 0.08);
        }
        .qr-box .title {
            font-weight: bold;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            font-size: 12px;
            color: var(--fj-primary);
        }
        .qr-box img,
        .qr-box svg {
            max-width: 100%;
            height: auto;
        }
        .qr-note-muted {
            margin-top: 10px;
            font-size: 12px;
            color: var(--fj-text-soft);
        }
        .footer {
            padding: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
            flex-wrap: wrap;
            font-size: 13px;
            color: var(--fj-text-soft);
            background: linear-gradient(180deg, #fff 0%, var(--fj-muted) 100%);
        }
        .footer strong {
            color: var(--fj-primary);
        }
        .proof-url {
            word-break: break-all;
            color: var(--fj-primary);
            font-size: 13px;
            background: #fff;
            border: 1px dashed rgba(18, 56, 89, 0.22);
            border-radius: 12px;
            padding: 12px 14px;
        }
        .totals {
            max-width: 520px;
            margin-left: auto;
        }

        /* Estilos para dados bancários */
        .bank-box {
            background: linear-gradient(180deg, #f8fbff 0%, #fff 100%);
            border: 1px solid #cbd5e1;
            border-radius: 14px;
            padding: 16px 20px;
            margin-top: 16px;
        }
        .bank-box .bank-title {
            font-weight: bold;
            font-size: 13px;
            color: var(--fj-primary);
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .bank-box .bank-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 6px;
        }
        .bank-box .bank-row {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
        }
        .bank-box .bank-label {
            font-weight: bold;
            color: #374151;
            min-width: 95px;
        }
        .bank-box .bank-value {
            color: #111827;
        }
        .bank-box .iban-value {
            font-family: 'Courier New', monospace;
            letter-spacing: 0.8px;
        }
        .bank-box .bank-note {
            margin-top: 8px;
            font-size: 12px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
            padding-top: 8px;
        }

        @media (max-width: 720px) {
            body {
                padding: 12px;
            }
            .header,
            .section,
            .footer {
                padding-left: 16px;
                padding-right: 16px;
            }
            .grid,
            .qr-card {
                grid-template-columns: 1fr;
            }
            .box strong {
                width: 96px;
            }
            .header h1 {
                font-size: 20px;
            }
            .totals {
                max-width: 100%;
            }
            .bank-box .bank-row {
                flex-wrap: wrap;
            }
            .bank-box .bank-label {
                min-width: 80px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="brand-row">
                <img src="{{ $empresaLogo }}" alt="Logo da empresa" class="brand-logo">
                <div>
                    <h1>{{ $tipoDocumento }} — Prova Pública</h1>
                    <p>Documento fiscal validado e disponível para consulta pública através do QR ou URL abaixo.</p>
                </div>
            </div>
            <div class="header-badges">
                <span class="pill pill-primary">FaturaJá</span>
                <span class="pill pill-state {{ $estadoClasse }}">{{ $estadoLabel }}</span>
                <span class="pill pill-primary">{{ $documento->numero_documento ?? '' }}</span>
            </div>
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
                <div class="total-line"><span>Total IVA</span><strong>{{ number_format(($documento->total_iva ?? 0), 2, ',', '.') }} Kz</strong></div>
                <div class="total-line"><span>Total Líquido</span><strong>{{ number_format($documento->total_liquido ?? 0, 2, ',', '.') }} Kz</strong></div>
            </div>
        </div>

        {{-- ✅ DADOS BANCÁRIOS - PRIORIZA DADOS DO DOCUMENTO --}}
        @if($temDadosBancarios)
        <div class="section">
            <div class="section-title">Dados Bancários para Pagamento</div>
            <div class="bank-box">
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
                        <span class="bank-value iban-value">{{ $empresaIban }}</span>
                    </div>
                    @endif
                </div>
                @if(!empty($empresaBanco) || !empty($empresaConta) || !empty($empresaIban))
                <div class="bank-note">
                    Utilize estes dados para efectuar o pagamento por transferência bancária.
                </div>
                @endif
            </div>
        </div>
        @endif

        <div class="footer">
            <div><strong>Hash Fiscal:</strong> {{ $documento->hash_fiscal ?? 'N/A' }}</div>
            <div><strong>Emitido em:</strong> {{ now()->format('d/m/Y H:i') }}</div>
        </div>
    </div>
</body>
</html>