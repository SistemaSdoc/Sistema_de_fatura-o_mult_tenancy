<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nova senha temporária</title>
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
        .content {
            padding: 30px 30px 20px;
        }
        .content p {
            color: #2c3e50;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 16px;
        }
        .password-box {
            background-color: #f8fafc;
            border: 2px dashed #f39c12;
            border-radius: 12px;
            padding: 16px;
            text-align: center;
            margin: 20px 0;
        }
        .password-box span {
            font-size: 28px;
            font-weight: 700;
            letter-spacing: 2px;
            color: #1a2b4c;
        }
        .btn-login {
            display: inline-block;
            background-color: #f39c12;
            color: #ffffff !important;
            font-weight: 700;
            font-size: 18px;
            padding: 14px 32px;
            border-radius: 50px;
            text-decoration: none;
            margin: 10px 0 20px;
        }
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
            <p style="color: rgba(255,255,255,0.7); font-size: 14px;">Plataforma de Gestão</p>
        </div>

        <div class="content">
            <p>Olá,</p>
            <p>Você solicitou a recuperação de acesso à empresa <strong>{{ $empresa }}</strong>.</p>
            <p>A sua <strong>nova senha temporária</strong> é:</p>

            <div class="password-box">
                <span>{{ $password }}</span>
            </div>

            <p style="text-align: center;">
                <a href="{{ $loginUrl }}" class="btn-login">🔑 Fazer login</a>
            </p>

            <p style="font-size: 14px; color: #7f8c8d;">
                ⚠️ <strong>Recomendação:</strong> Após o login, altere esta senha no seu perfil.
                Esta senha é válida até que seja alterada.
            </p>

            <p style="font-size: 13px; color: #95a5a6; border-top: 1px solid #ecf0f1; padding-top: 16px;">
                Se não foi você que solicitou, ignore este email. A sua senha antiga não foi alterada.
            </p>
        </div>

        <div class="footer">
            &copy; {{ date('Y') }} FaturaJa – Todos os direitos reservados.
        </div>
    </div>
</body>
</html>