<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'FaturaJa')</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .sidebar {
            min-width: 220px;
            max-width: 220px;
            background-color: #C9B6E4;
            color: #fff;
            min-height: 100vh;
        }
        .sidebar a {
            color: #fff;
            text-decoration: none;
        }
        .sidebar a:hover {
            background-color: #B497D9;
            text-decoration: none;
        }
        .content {
            flex: 1;
            padding: 20px;
        }
        .card {
            border-radius: 12px;
        }
    </style>
</head>
<body>
<div class="d-flex">
    

    <!-- Main content -->
    <div class="content w-100">
        @yield('content')
    </div>
</div>

<scrip
