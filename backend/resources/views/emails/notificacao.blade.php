<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $notificacao->titulo }}</title>
    <style>
        body {
            background-color: #f4f7fc;
            font-family: 'Segoe UI', Arial, sans-serif;
            padding: 20px;
            margin: 0;
        }
        .container {
            max-width: 520px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.08);
            overflow: hidden;
        }
        .header {
            background-color: #1a2b4c;
            padding: 28px 20px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            font-size: 26px;
            font-weight: 700;
            margin: 0;
        }
        .header span { color: #f39c12; }
        .header p {
            color: rgba(255,255,255,0.7);
            font-size: 14px;
            margin: 6px 0 0;
        }
        .content {
            padding: 30px 30px 20px;
        }
        .content p {
            color: #2c3e50;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 16px;
        }
        .content h2 {
            color: #1a2b4c;
            font-size: 20px;
            font-weight: 700;
            margin: 0 0 14px;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 50px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
        }
        .badge-info    { background: #eaf4ff; color: #2980b9; }
        .badge-warning { background: #fef5e7; color: #d68910; }
        .badge-danger  { background: #fdecea; color: #c0392b; }

        .info-box {
            background-color: #f8fafc;
            border: 2px dashed #f39c12;
            border-radius: 12px;
            padding: 16px;
            margin: 20px 0;
        }
        .info-box table { width: 100%; border-collapse: collapse; }
        .info-box td {
            padding: 6px 0;
            font-size: 14px;
            color: #2c3e50;
        }
        .info-box td:first-child {
            color: #7f8c8d;
            width: 40%;
        }
        .info-box td:last-child {
            font-weight: 700;
            color: #1a2b4c;
        }

        .btn-action {
            display: inline-block;
            background-color: #f39c12;
            color: #ffffff !important;
            font-weight: 700;
            font-size: 16px;
            padding: 14px 32px;
            border-radius: 50px;
            text-decoration: none;
            margin: 10px 0 20px;
        }
        .btn-wrapper { text-align: center; }

        .footer {
            background-color: #f8fafc;
            padding: 16px;
            text-align: center;
            font-size: 13px;
            color: #95a5a6;
            border-top: 1px solid #eef2f7;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Fatura<span>Ja</span></h1>
            <p>Plataforma de Gestão</p>
        </div>

        <div class="content">
            <p>Olá, <strong>{{ $nome }}</strong></p>

            @php
                $badgeClass = match($notificacao->tipo) {
                    'danger'  => 'badge-danger',
                    'warning' => 'badge-warning',
                    default   => 'badge-info',
                };
                $badgeLabel = match($notificacao->tipo) {
                    'danger'  => 'Importante',
                    'warning' => 'Atenção',
                    default   => 'Informação',
                };
            @endphp

            <span class="badge {{ $badgeClass }}">{{ $badgeLabel }}</span>

            <h2>{{ $notificacao->titulo }}</h2>

            <p>{!! nl2br(e($notificacao->mensagem)) !!}</p>

            @if(!empty($notificacao->dados))
                <div class="info-box">
                    <table>
                        @foreach($notificacao->dados as $chave => $valor)
                            @if(!is_array($valor) && !is_object($valor))
                                <tr>
                                    <td>{{ ucfirst(str_replace('_', ' ', $chave)) }}</td>
                                    <td>{{ $valor }}</td>
                                </tr>
                            @endif
                        @endforeach
                    </table>
                </div>
            @endif

            @if($notificacao->url)
                <div class="btn-wrapper">
                    <a href="{{ config('app.frontend_url', config('app.url')) . $notificacao->url }}" class="btn-action">
                        Ver detalhes
                    </a>
                </div>
            @endif

            <p style="font-size: 13px; color: #95a5a6; border-top: 1px solid #ecf0f1; padding-top: 16px;">
                Recebeu esta notificação porque tem uma conta no FaturaJá.
                Pode consultar todas as notificações no seu painel.
            </p>
        </div>

        <div class="footer">
            &copy; {{ date('Y') }} FaturaJa – Todos os direitos reservados.
        </div>
    </div>
</body>
</html>