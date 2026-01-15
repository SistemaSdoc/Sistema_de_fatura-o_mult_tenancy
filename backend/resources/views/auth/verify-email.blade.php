<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <title>Verifique seu Email - {{ config('app.name') }}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
<div class="container mt-5">
    <div class="card p-4">
        <h3>Verifique seu email</h3>
        <p>Um link de verificação foi enviado para o seu endereço de email. Por favor, clique nele para ativar sua conta e receber faturas.</p>

        @if (session('status') == 'verification-link-sent')
            <div class="alert alert-success">
                Um novo link de verificação foi enviado para o seu email.
            </div>
        @endif

        <form method="POST" action="{{ route('verification.send') }}">
            @csrf
            <button type="submit" class="btn btn-primary">Reenviar email de verificação</button>
        </form>

        <form method="POST" action="{{ route('tenant.logout') }}" class="mt-3">
            @csrf
            <button type="submit" class="btn btn-secondary">Sair</button>
        </form>
    </div>
</div>
</body>
</html>
