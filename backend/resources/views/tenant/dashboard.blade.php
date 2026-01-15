<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Tenant</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background-color: #f8f9fa;
        }
        .card {
            border-radius: 1rem;
        }
        .btn-primary {
            background-color: #6f42c1;
            border: none;
        }
        .btn-primary:hover {
            background-color: #5a34a1;
        }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary mb-4">
        <div class="container">
            <a class="navbar-brand" href="#">Dashboard Tenant</a>
            <div class="d-flex">
                <form method="POST" action="{{ url('/tenant/logout') }}">
                    @csrf
                    <button type="submit" class="btn btn-outline-light">Sair</button>
                </form>
            </div>
        </div>
    </nav>

    <div class="container">
        <div class="card shadow-sm p-4 mb-4">
            <h2 class="mb-3">Bem-vindo, {{ auth('tenant')->user()->name }}</h2>
            <p><strong>E-mail:</strong> {{ auth('tenant')->user()->email }}</p>
            <p><strong>Função (Role):</strong> {{ auth('tenant')->user()->role }}</p>
            <p><strong>ID:</strong> {{ auth('tenant')->user()->id }}</p>
            <p><strong>Data de Criação:</strong> {{ auth('tenant')->user()->created_at->format('d/m/Y H:i') }}</p>
            <p><strong>Última Atualização:</strong> {{ auth('tenant')->user()->updated_at->format('d/m/Y H:i') }}</p>
        </div>

        <div class="card shadow-sm p-4">
            <h4>Gerenciamento</h4>
            <p>Acesse o painel de usuários do tenant:</p>
            <a href="{{ route('tenant.users.index') }}" class="btn btn-primary">Gerenciar Usuários</a>
        </div>
    </div>
    
<div class="mt-4">
    <h5>Informações do Tenant</h5>
    <table class="table table-bordered">
        <tr>
            <th>Nome</th>
            <td>{{ app('tenant')->name }}</td>
        </tr>
        <tr>
            <th>Subdomínio</th>
            <td>{{ app('tenant')->subdomain }}</td>
        </tr>
        <tr>
            <th>Database</th>
            <td>{{ app('tenant')->database_name }}</td>
        </tr>
        <tr>
            <th>Data de Criação</th>
            <td>{{ app('tenant')->created_at->format('d/m/Y H:i') }}</td>
        </tr>
    </table>
</div>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
