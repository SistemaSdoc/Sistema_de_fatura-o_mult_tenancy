<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <title>Criar Usuário - {{ config('app.name') }}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">

<div class="container mt-5">
    <h2>Criar Usuário</h2>

   <form action="{{ route('tenant.users.store') }}" method="POST">
    @csrf

    @if($errors->any())
        <div class="alert alert-danger">
            <ul>
                @foreach($errors->all() as $error)
                    <li>{{ $error }}</li>
                @endforeach
            </ul>
        </div>
    @endif

    <div class="mb-3">
        <label for="name" class="form-label">Nome</label>
        <input type="text" class="form-control" name="name" value="{{ old('name') }}" required>
    </div>

    <div class="mb-3">
        <label for="email" class="form-label">Email</label>
        <input type="email" class="form-control" name="email" value="{{ old('email') }}" required>
    </div>

    <div class="mb-3">
        <label for="password" class="form-label">Senha</label>
        <input type="password" class="form-control" name="password" required>
    </div>

    <div class="mb-3">
        <label for="password_confirmation" class="form-label">Confirme a Senha</label>
        <input type="password" class="form-control" name="password_confirmation" required>
    </div>

    <div class="mb-3">
        <label for="role" class="form-label">Função</label>
        <select name="role" class="form-select" required>
            <option value="admin">Admin</option>
            <option value="cliente" selected>Cliente</option>
        </select>
    </div>

    <button type="submit" class="btn btn-success">Criar Usuário</button>
    <a href="{{ route('tenant.users.index') }}" class="btn btn-secondary">Voltar</a>
</form>

</div>

</body>
</html>
