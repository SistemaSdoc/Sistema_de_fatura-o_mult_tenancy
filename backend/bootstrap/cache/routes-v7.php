<?php

app('router')->setCompiledRoutes(
    array (
  'compiled' => 
  array (
    0 => false,
    1 => 
    array (
      '/sanctum/csrf-cookie' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::B1bhlKRfSN4gZT9t',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/password/email' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::wO8KAUSPVyXL3s0j',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/upload-temp-logo' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'upload.temp.logo',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/empresas' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'empresas.store',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/planos-ativos' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::lcuhHfvW6oe8KAYe',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/features' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::hPNO4e1qCEnUFrXv',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'features.store',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/features-ativas' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::y23bOocnUEQgrVUL',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/login' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'landlord.login',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/register' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'landlord.register',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/auth/google' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'landlord.google.redirect',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/auth/google/callback' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'landlord.google.callback',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/logout' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::0lboR7yAxNIoLDF8',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/landlordme' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::R57NTJM3y5wSZ4f5',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/perfil' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::4uqoeBjYlfYzdIgN',
          ),
          1 => NULL,
          2 => 
          array (
            'PUT' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/perfil/senha' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::M32MAgXxVHq0Ialw',
          ),
          1 => NULL,
          2 => 
          array (
            'PUT' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/notificacoes' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::lqUTJfl0zPal4JtK',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/notificacoes/nao-lidas' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::c9STXNXCjQ60IhLF',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/notificacoes/marcar-todas-lidas' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::jDA99rksTkYQRJnD',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/freelancer/empresa' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::EwlkqCD80BVO1smJ',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'generated::75Wstr3De2R2OASv',
          ),
          1 => NULL,
          2 => 
          array (
            'PUT' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/freelancer/onboarding' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::XdmM6iVXzPzMFaz2',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/pagamentos-plano' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::xOkpgrzySEeQJbiI',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/analytics/resumo' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::HT1Nxw3yxPP1Ljdc',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/auditoria/logs' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'landlord.auditoria.logs',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/usuarios' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::siSpkCs9FD9aFAw5',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'generated::L7FiHYdidKLoLHev',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/usuarios/tenant-users' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::fvTkcaZC1HASd0ZB',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/usuarios/shared-users' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::w6KezvlB0cngJwLT',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/planos' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::AUtsNWoLEDKEktLY',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'generated::ZktG519VUPndtn50',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/features' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::QPmpSYqlysXUnwHp',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'generated::d1nckzrxmzpw1R0Z',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/empresas' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::47txFs04LhDp6MNc',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'generated::WfgxMkmcQZm4wSXs',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/minha-empresa' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::g3FSJ6jJft5FevAl',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/landlord/pagamentos-plano/pendentes' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::pUPejD4xyuaHv7OO',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/subscricoes/me' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::XYy5sho5bXQaOnhj',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/subscricoes/verificar-feature' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::iA3fIkQYsss6Hwkc',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/subscricoes' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::B1SZ7oEQvBt0tZFU',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'generated::eafy1LE6YDOEN8M4',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/pagamentos-plano' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::0YiDnxnQHf5dPG6g',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'generated::EQAMxXn5R6iW4Dyg',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/empresa' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::FOLO9ZlBhjfqzbVg',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'generated::Ufie7hF9yComd5yN',
          ),
          1 => NULL,
          2 => 
          array (
            'PUT' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/empresa/logo' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::OkIP1ZWrPLJZ81Sz',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/empresa/configuracoes-fiscais' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::1RTwmnnMjd941r1W',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'generated::urSP7uQ32OPiTS2C',
          ),
          1 => NULL,
          2 => 
          array (
            'PUT' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/empresa/mensagens' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::XTPGWnH7yx7lNJu2',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/me' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::fhBFw6zsr7zCGLwh',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/dashboard' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'dashboard.index',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/dashboard/resumo-documentos-fiscais' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'dashboard.resumo-documentos',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/dashboard/estatisticas-pagamentos' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'dashboard.estatisticas-pagamentos',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/dashboard/alertas' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'dashboard.alertas',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/dashboard/evolucao-mensal' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'dashboard.evolucao',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/users' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::PDes8xIU4d1YxVtC',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'generated::5Fz7x0d0cqmpLc3r',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/users/create' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::fruQVNsCaVQ3vZ8w',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/empresa/toggle-status' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::XXERcZT0rxJ23Yn7',
          ),
          1 => NULL,
          2 => 
          array (
            'PATCH' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/relatorios/exportar-saft' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'relatorios.exportar-saft',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/saft/alertas' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::9mUhSa46OtIZn6g7',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/clientes/todos' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'clientes.todos',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/auditoria/logs' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'auditoria.logs',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/auditoria/datas' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'auditoria.datas',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/auditoria/eventos' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'auditoria.eventos',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/produtos/importar' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::2ca9erG0HFKz7j16',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/produtos' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'produtos.index',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'produtos.store',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/produtos/todos' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'produtos.todos',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/produtos/trashed' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'produtos.trashed',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/categorias' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'categorias.index',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'categorias.store',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/categorias/todas' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'categorias.todas',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/categorias/deletadas' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'categorias.deletadas',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/categorias/select' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'categorias.select',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/fornecedores/todos' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'fornecedores.todos',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/fornecedores/trashed' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'fornecedores.trashed',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/fornecedores/deletados' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'fornecedores.deletados',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/fornecedores' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'fornecedores.index',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'fornecedores.store',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/clientes/importar' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::UoALeYBN1KlurLpP',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/clientes' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'clientes.index',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'clientes.store',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/compras' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'compras.index',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'compras.store',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/movimentos-stock' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'movimentos-stock.index',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'movimentos-stock.store',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/movimentos-stock/ajuste' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'movimentos-stock.ajuste',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/movimentos-stock/resumo' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'estoque.resumo',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/vendas' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'vendas.index',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'vendas.store',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/documentos-fiscais/adiantamentos-pendentes' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.adiantamentos-pendentes',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/documentos-fiscais/proformas-pendentes' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.proformas-pendentes',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/documentos-fiscais/alertas' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.alertas',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/documentos-fiscais/dashboard' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.dashboard',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/documentos-fiscais/processar-expirados' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.processar-expirados',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/documentos-fiscais/emitir' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.emitir',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/documentos-fiscais/factura-global' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::7gESYmlWcmscfGqR',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/documentos-fiscais/talao-venda' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::UX9rTMWJ4jXWNbg7',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/documentos-fiscais/auto-facturacao' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::77cZg8X2Y7p1WZrr',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/documentos-fiscais/aviso-cobranca' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.aviso-cobranca',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/documentos-fiscais/nota-debito' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.nota-debito-autonoma',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/documentos-fiscais/exportar-excel' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.exportar-excel',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/documentos-fiscais' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.index',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/impressoras' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::lZsYPRdsc8ykHrsk',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'generated::ERGyUOAz1jHjUAP4',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/impressoras/cups' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::0ujeWFk7X8VFWmvA',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/pagamentos' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'pagamentos.index',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'pagamentos.store',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/relatorios/exportar-completo' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::WH9L5Le4P37DWMbw',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/relatorios/debug' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'relatorios.debug',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/relatorios/dashboard' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'relatorios.dashboard',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/relatorios/vendas' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'relatorios.vendas',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/relatorios/compras' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'relatorios.compras',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/relatorios/faturacao' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'relatorios.faturacao',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/relatorios/stock' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'relatorios.stock',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/relatorios/movimentos-stock' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'relatorios.movimentos-stock',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/relatorios/servicos' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'relatorios.servicos',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/relatorios/retencoes' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'relatorios.retencoes',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/relatorios/documentos-fiscais' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'relatorios.documentos-fiscais',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/relatorios/proformas' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'relatorios.proformas',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/relatorios/notas-correcao' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'relatorios.notas-correcao',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/relatorios/pagamentos-pendentes' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'relatorios.pagamentos-pendentes',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/api/relatorios/saft-alertas' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'relatorios.saft-alertas',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/up' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::gnR9IQBM5qqoa2e0',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/login' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::ajLK3k5DbDifCdLJ',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/logout' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::LxVz7ANNfWp3A6tw',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/me' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::RxmhENOr09eediIu',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/teste-auth' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::yp3IXVY9jbC5Kglr',
          ),
          1 => NULL,
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      '/login/email-only' => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::SyCpMLLBp9L3dVMe',
          ),
          1 => NULL,
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
    ),
    2 => 
    array (
      0 => '{^(?|/tenancy/assets(?:/((?:.*)))?(*:36)|/api/(?|p(?|lanos/([^/]++)(?|(*:72)|/(?|attach\\-feature(*:98)|detach\\-feature/([^/]++)(*:129)))|agamentos(?|\\-plano/([0-9a-fA-F-]{36})(?|(*:180)|/upload\\-comprovativo(*:209))|/([0-9a-fA-F-]{36})(?|(*:240)))|rodutos/([0-9a-fA-F-]{36})(?|/(?|restore(*:290)|force(*:303)|status(*:317))|(*:326)))|landlord/(?|notificacoes/([0-9a-fA-F-]{36})(?|/marcar\\-lida(*:395)|(*:403))|p(?|agamentos\\-plano/([0-9a-fA-F-]{36})(?|(*:454)|/(?|upload\\-comprovativo(*:486)|confirmar(*:503)|rejeitar(*:519))|(*:528))|lanos/([^/]++)(?|(*:554)|/features(?|(*:574)|/([^/]++)(*:591))))|usuarios/([^/]++)(?|(*:622)|/(?|toggle\\-status(*:648)|reset\\-password(*:671)|vincular\\-empresa(*:696)|desvincular\\-empresa(*:724)))|features/([^/]++)(?|(*:754))|empresas/([^/]++)(?|(*:783)|/(?|mensagens(?|(*:807))|toggle\\-status(*:830))|(*:839)))|documentos\\-fiscais/([0-9a-fA-F-]{36})(?|/(?|p(?|r(?|ova(*:905)|int\\-(?|view(*:925)|a4(*:935)))|df(?|/download(*:959)|\\-viewer(*:975)))|aviso\\-cobranca\\-recibo(*:1008)|imprimir\\-termica(*:1034)|nota\\-(?|credito(*:1059)|debito(*:1074))|Ver_NC_ND(*:1093)|c(?|onverter\\-proforma(*:1124)|ancelar(*:1140))|recibo(?|s(*:1160)|(*:1169))|estorno(*:1186)|vincular\\-adiantamento(*:1217))|(*:1227))|f(?|eatures/([^/]++)(?|(*:1260))|ornecedores/([0-9a-fA-F-]{36})(?|/(?|restore(*:1314)|force(*:1328))|(*:1338)))|subscricoes/([^/]++)(?|(*:1372)|/(?|cancel(*:1391)|renovar(*:1407)))|empresa/mensagens/([^/]++)(?|/marcar\\-lida(*:1460)|(*:1469))|users/([^/]++)(?|(*:1496))|c(?|lientes/(?|([0-9a-fA-F-]{36})(?|/(?|restore(*:1553)|force(*:1567)|ativar(*:1582)|inativar(*:1599))|(*:1609))|([^/]++)(?|(*:1630)))|ategorias/([0-9a-fA-F-]{36})(?|(*:1672)|/(?|restore(*:1692)|force(*:1706)))|ompras/([0-9a-fA-F-]{36})(*:1742))|movimentos\\-stock/([0-9a-fA-F-]{36})(*:1788)|vendas/([0-9a-fA-F-]{36})(?|(*:1825)|/(?|cancelar(*:1846)|recibo(*:1861)))|impressoras/(?|([^/]++)(?|(*:1898)|/default(*:1915))|selecionar(*:1935)|testar(*:1950)))|/storage/(.*)(?|(*:1977))|/(.*)(*:1992))/?$}sDu',
    ),
    3 => 
    array (
      36 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'stancl.tenancy.asset',
            'path' => NULL,
          ),
          1 => 
          array (
            0 => 'path',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      72 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::H9yS3IQdq48eVaiT',
          ),
          1 => 
          array (
            0 => 'plano',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      98 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::FkfquIHuO36MIBSF',
          ),
          1 => 
          array (
            0 => 'plano',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      129 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::csf4bt7XmhwHoV6x',
          ),
          1 => 
          array (
            0 => 'plano',
            1 => 'feature',
          ),
          2 => 
          array (
            'DELETE' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      180 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::Z8YJVw3poI4lAUom',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      209 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::BMzHAx3RIYTWEL62',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      240 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'pagamentos.show',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'pagamentos.update',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'PUT' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        2 => 
        array (
          0 => 
          array (
            '_route' => 'pagamentos.destroy',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'DELETE' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      290 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'produtos.restore',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      303 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'produtos.force-delete',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'DELETE' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      317 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'produtos.status',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      326 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'produtos.show',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'produtos.update',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'PUT' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        2 => 
        array (
          0 => 
          array (
            '_route' => 'produtos.destroy',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'DELETE' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      395 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::zOQzF3TMcdcg9Yjr',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      403 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::xCLrMyKYnG89shEK',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'DELETE' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      454 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::QdaVQRJl5TlX7sUI',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      486 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::Vk7IUzAMviVZ6LEE',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      503 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::DpMuPeNi81C22rsb',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      519 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::hQS12t5ghYRh1FoJ',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      528 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::0JujoOZpExJ0MpXk',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'DELETE' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      554 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::e8hhfHV5FRaxr9tN',
          ),
          1 => 
          array (
            0 => 'plano',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'generated::r9oCSW13fkbI4M9B',
          ),
          1 => 
          array (
            0 => 'plano',
          ),
          2 => 
          array (
            'PUT' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        2 => 
        array (
          0 => 
          array (
            '_route' => 'generated::zlFamyQNEqJY6Tmv',
          ),
          1 => 
          array (
            0 => 'plano',
          ),
          2 => 
          array (
            'DELETE' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      574 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::E73HoeiDu1JvmRBK',
          ),
          1 => 
          array (
            0 => 'plano',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      591 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::fXev3Mj0j3lM6u3Z',
          ),
          1 => 
          array (
            0 => 'plano',
            1 => 'feature',
          ),
          2 => 
          array (
            'DELETE' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      622 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::lkAlYPFx94s7lXHa',
          ),
          1 => 
          array (
            0 => 'landlordUser',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'generated::V3TmyXUXKRb1UbVh',
          ),
          1 => 
          array (
            0 => 'landlordUser',
          ),
          2 => 
          array (
            'PUT' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        2 => 
        array (
          0 => 
          array (
            '_route' => 'generated::BEd26iH1ArfnFREA',
          ),
          1 => 
          array (
            0 => 'landlordUser',
          ),
          2 => 
          array (
            'DELETE' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      648 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::Io39HEWDXpJHwiMg',
          ),
          1 => 
          array (
            0 => 'landlordUser',
          ),
          2 => 
          array (
            'PATCH' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      671 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::DIUmzKb4HWsBcCAy',
          ),
          1 => 
          array (
            0 => 'landlordUser',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      696 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::BIQJb7oTP44DtrFS',
          ),
          1 => 
          array (
            0 => 'landlordUser',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      724 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::QUz4bd1YNqHPJM09',
          ),
          1 => 
          array (
            0 => 'landlordUser',
          ),
          2 => 
          array (
            'DELETE' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      754 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::0Mtv4pXx9ouOl6NX',
          ),
          1 => 
          array (
            0 => 'feature',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'generated::5ZO7Z2VctU2dvcYg',
          ),
          1 => 
          array (
            0 => 'feature',
          ),
          2 => 
          array (
            'PUT' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        2 => 
        array (
          0 => 
          array (
            '_route' => 'generated::lWot4GfLzbRPLxiQ',
          ),
          1 => 
          array (
            0 => 'feature',
          ),
          2 => 
          array (
            'DELETE' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      783 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::ypOmFeeiEBU16g8E',
          ),
          1 => 
          array (
            0 => 'empresa',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      807 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::FGhZdIJAim0sQgsQ',
          ),
          1 => 
          array (
            0 => 'empresa',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'generated::JC2IChkalIe19Kj8',
          ),
          1 => 
          array (
            0 => 'empresa',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      830 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::xDcKOL7U0U4HYt8I',
          ),
          1 => 
          array (
            0 => 'empresa',
          ),
          2 => 
          array (
            'PATCH' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      839 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::b4fYIZAbW19u780o',
          ),
          1 => 
          array (
            0 => 'empresa',
          ),
          2 => 
          array (
            'PUT' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      905 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.public-proof',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      925 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.print',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      935 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.print-a4',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      959 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.pdf-download',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      975 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.pdf-viewer',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1008 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.aviso-cobranca-recibo',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1034 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.imprimir-termica',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1059 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.nota-credito',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1074 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.nota-debito',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1093 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.ver-nc-nd',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1124 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.converter-proforma',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1140 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.cancelar',
          ),
          1 => 
          array (
            0 => 'documento',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1160 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.recibos',
          ),
          1 => 
          array (
            0 => 'documento',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1169 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.gerar-recibo',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1186 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.estornar-recibo',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1217 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.vincular',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1227 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'documentos.show',
          ),
          1 => 
          array (
            0 => 'documento',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      1260 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'features.show',
          ),
          1 => 
          array (
            0 => 'feature',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'features.update',
          ),
          1 => 
          array (
            0 => 'feature',
          ),
          2 => 
          array (
            'PUT' => 0,
            'PATCH' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        2 => 
        array (
          0 => 
          array (
            '_route' => 'features.destroy',
          ),
          1 => 
          array (
            0 => 'feature',
          ),
          2 => 
          array (
            'DELETE' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      1314 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'fornecedores.restore',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1328 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'fornecedores.force-delete',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'DELETE' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1338 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'fornecedores.show',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'fornecedores.update',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'PUT' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        2 => 
        array (
          0 => 
          array (
            '_route' => 'fornecedores.destroy',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'DELETE' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      1372 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::5sfj8s3Q4NNBmjcR',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'generated::J4GYLtPsFahTFH3g',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'PUT' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      1391 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::BqlMROH2q0Oz4bBC',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'PATCH' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1407 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::lCEFYgjUvqQn6kTk',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1460 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::IbFGlSbGraFhS8XU',
          ),
          1 => 
          array (
            0 => 'mensagem',
          ),
          2 => 
          array (
            'PATCH' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1469 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::ENWzqhowmF4NPBR2',
          ),
          1 => 
          array (
            0 => 'mensagem',
          ),
          2 => 
          array (
            'DELETE' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      1496 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::uce5KqkCVwGbqJjN',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'generated::lpwN9VTREYU5eDog',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'PUT' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        2 => 
        array (
          0 => 
          array (
            '_route' => 'generated::4ROOG8ZUy45BtwUh',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'DELETE' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      1553 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'clientes.restore',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1567 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'clientes.force-delete',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'DELETE' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1582 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'clientes.ativar',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1599 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'clientes.inativar',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1609 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'clientes.destroy',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'DELETE' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      1630 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'clientes.show',
          ),
          1 => 
          array (
            0 => 'cliente',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'clientes.update',
          ),
          1 => 
          array (
            0 => 'cliente',
          ),
          2 => 
          array (
            'PUT' => 0,
            'PATCH' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      1672 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'categorias.show',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'categorias.update',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'PUT' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        2 => 
        array (
          0 => 
          array (
            '_route' => 'categorias.destroy',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'DELETE' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      1692 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'categorias.restore',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1706 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'categorias.force-delete',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'DELETE' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1742 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'compras.show',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      1788 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'movimentos-stock.show',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      1825 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'vendas.show',
          ),
          1 => 
          array (
            0 => 'venda',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      1846 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'vendas.cancelar',
          ),
          1 => 
          array (
            0 => 'venda',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1861 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'vendas.recibo',
          ),
          1 => 
          array (
            0 => 'venda',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1898 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::x610vroLBjaz3NCs',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'PATCH' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'generated::W8FUbWaORyN8pEcu',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'DELETE' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      1915 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::uwMRS0EQLqoJeXyp',
          ),
          1 => 
          array (
            0 => 'id',
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1935 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::xeRjGLYFPk5otwGt',
          ),
          1 => 
          array (
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1950 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::pVTyEQ3U3MyVxoVB',
          ),
          1 => 
          array (
          ),
          2 => 
          array (
            'POST' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => false,
          6 => NULL,
        ),
      ),
      1977 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'storage.local',
          ),
          1 => 
          array (
            0 => 'path',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        1 => 
        array (
          0 => 
          array (
            '_route' => 'storage.local.upload',
          ),
          1 => 
          array (
            0 => 'path',
          ),
          2 => 
          array (
            'PUT' => 0,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
      ),
      1992 => 
      array (
        0 => 
        array (
          0 => 
          array (
            '_route' => 'generated::946mBAZ2XZVVKF3b',
          ),
          1 => 
          array (
            0 => 'fallbackPlaceholder',
          ),
          2 => 
          array (
            'GET' => 0,
            'HEAD' => 1,
          ),
          3 => NULL,
          4 => false,
          5 => true,
          6 => NULL,
        ),
        1 => 
        array (
          0 => NULL,
          1 => NULL,
          2 => NULL,
          3 => NULL,
          4 => false,
          5 => false,
          6 => 0,
        ),
      ),
    ),
    4 => NULL,
  ),
  'attributes' => 
  array (
    'generated::B1bhlKRfSN4gZT9t' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'sanctum/csrf-cookie',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'web',
          1 => 'web',
        ),
        'uses' => 'O:55:"Laravel\\SerializableClosure\\UnsignedSerializableClosure":1:{s:12:"serializable";O:46:"Laravel\\SerializableClosure\\Serializers\\Native":5:{s:3:"use";a:0:{}s:8:"function";s:79:"function () {
    return \\response()->json([\'message\' => \'CSRF cookie set\']);
}";s:5:"scope";s:37:"Illuminate\\Routing\\RouteFileRegistrar";s:4:"this";N;s:4:"self";s:32:"00000000000008b40000000000000000";}}',
        'namespace' => NULL,
        'prefix' => '',
        'where' => 
        array (
        ),
        'as' => 'generated::B1bhlKRfSN4gZT9t',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'stancl.tenancy.asset' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'tenancy/assets/{path?}',
      'action' => 
      array (
        'uses' => 'Stancl\\Tenancy\\Controllers\\TenantAssetsController@asset',
        'controller' => 'Stancl\\Tenancy\\Controllers\\TenantAssetsController@asset',
        'as' => 'stancl.tenancy.asset',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'path' => '(.*)',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::wO8KAUSPVyXL3s0j' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/password/email',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'throttle:5,10',
        ),
        'uses' => 'App\\Http\\Controllers\\PasswordResetController@sendResetLink',
        'controller' => 'App\\Http\\Controllers\\PasswordResetController@sendResetLink',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::wO8KAUSPVyXL3s0j',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'upload.temp.logo' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/upload-temp-logo',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
        ),
        'uses' => 'App\\Http\\Controllers\\EmpresaController@uploadTempLogo',
        'controller' => 'App\\Http\\Controllers\\EmpresaController@uploadTempLogo',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'upload.temp.logo',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'empresas.store' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/empresas',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'throttle:10,60',
        ),
        'uses' => 'App\\Http\\Controllers\\EmpresaController@store',
        'controller' => 'App\\Http\\Controllers\\EmpresaController@store',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'empresas.store',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::lcuhHfvW6oe8KAYe' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/planos-ativos',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
        ),
        'uses' => 'App\\Http\\Controllers\\PlanoController@ativos',
        'controller' => 'App\\Http\\Controllers\\PlanoController@ativos',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::lcuhHfvW6oe8KAYe',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::hPNO4e1qCEnUFrXv' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/features',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
        ),
        'uses' => 'App\\Http\\Controllers\\FeatureController@index',
        'controller' => 'App\\Http\\Controllers\\FeatureController@index',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::hPNO4e1qCEnUFrXv',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::y23bOocnUEQgrVUL' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/features-ativas',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
        ),
        'uses' => 'App\\Http\\Controllers\\FeatureController@ativas',
        'controller' => 'App\\Http\\Controllers\\FeatureController@ativas',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::y23bOocnUEQgrVUL',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::H9yS3IQdq48eVaiT' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/planos/{plano}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
        ),
        'uses' => 'App\\Http\\Controllers\\PlanoController@show',
        'controller' => 'App\\Http\\Controllers\\PlanoController@show',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::H9yS3IQdq48eVaiT',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'landlord.login' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/landlord/login',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordAuthController@login',
        'controller' => 'App\\Http\\Controllers\\LandlordAuthController@login',
        'namespace' => NULL,
        'prefix' => 'api/landlord',
        'where' => 
        array (
        ),
        'as' => 'landlord.login',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'landlord.register' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/landlord/register',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordAuthController@register',
        'controller' => 'App\\Http\\Controllers\\LandlordAuthController@register',
        'namespace' => NULL,
        'prefix' => 'api/landlord',
        'where' => 
        array (
        ),
        'as' => 'landlord.register',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'landlord.google.redirect' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/auth/google',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'Illuminate\\Session\\Middleware\\StartSession',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordAuthController@redirectToGoogle',
        'controller' => 'App\\Http\\Controllers\\LandlordAuthController@redirectToGoogle',
        'namespace' => NULL,
        'prefix' => 'api/landlord',
        'where' => 
        array (
        ),
        'as' => 'landlord.google.redirect',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'landlord.google.callback' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/auth/google/callback',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'Illuminate\\Session\\Middleware\\StartSession',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordAuthController@handleGoogleCallback',
        'controller' => 'App\\Http\\Controllers\\LandlordAuthController@handleGoogleCallback',
        'namespace' => NULL,
        'prefix' => 'api/landlord',
        'where' => 
        array (
        ),
        'as' => 'landlord.google.callback',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::0lboR7yAxNIoLDF8' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/landlord/logout',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordAuthController@logout',
        'controller' => 'App\\Http\\Controllers\\LandlordAuthController@logout',
        'namespace' => NULL,
        'prefix' => 'api/landlord',
        'where' => 
        array (
        ),
        'as' => 'generated::0lboR7yAxNIoLDF8',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::R57NTJM3y5wSZ4f5' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/landlordme',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordAuthController@landlordme',
        'controller' => 'App\\Http\\Controllers\\LandlordAuthController@landlordme',
        'namespace' => NULL,
        'prefix' => 'api/landlord',
        'where' => 
        array (
        ),
        'as' => 'generated::R57NTJM3y5wSZ4f5',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::4uqoeBjYlfYzdIgN' => 
    array (
      'methods' => 
      array (
        0 => 'PUT',
      ),
      'uri' => 'api/landlord/perfil',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordUserController@atualizarPerfil',
        'controller' => 'App\\Http\\Controllers\\LandlordUserController@atualizarPerfil',
        'namespace' => NULL,
        'prefix' => 'api/landlord',
        'where' => 
        array (
        ),
        'as' => 'generated::4uqoeBjYlfYzdIgN',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::M32MAgXxVHq0Ialw' => 
    array (
      'methods' => 
      array (
        0 => 'PUT',
      ),
      'uri' => 'api/landlord/perfil/senha',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordUserController@alterarSenhaPropria',
        'controller' => 'App\\Http\\Controllers\\LandlordUserController@alterarSenhaPropria',
        'namespace' => NULL,
        'prefix' => 'api/landlord',
        'where' => 
        array (
        ),
        'as' => 'generated::M32MAgXxVHq0Ialw',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::lqUTJfl0zPal4JtK' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/notificacoes',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordNotificacaoController@index',
        'controller' => 'App\\Http\\Controllers\\LandlordNotificacaoController@index',
        'namespace' => NULL,
        'prefix' => 'api/landlord/notificacoes',
        'where' => 
        array (
        ),
        'as' => 'generated::lqUTJfl0zPal4JtK',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::c9STXNXCjQ60IhLF' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/notificacoes/nao-lidas',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordNotificacaoController@naoLidas',
        'controller' => 'App\\Http\\Controllers\\LandlordNotificacaoController@naoLidas',
        'namespace' => NULL,
        'prefix' => 'api/landlord/notificacoes',
        'where' => 
        array (
        ),
        'as' => 'generated::c9STXNXCjQ60IhLF',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::jDA99rksTkYQRJnD' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/landlord/notificacoes/marcar-todas-lidas',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordNotificacaoController@marcarTodasLidas',
        'controller' => 'App\\Http\\Controllers\\LandlordNotificacaoController@marcarTodasLidas',
        'namespace' => NULL,
        'prefix' => 'api/landlord/notificacoes',
        'where' => 
        array (
        ),
        'as' => 'generated::jDA99rksTkYQRJnD',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::zOQzF3TMcdcg9Yjr' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/landlord/notificacoes/{id}/marcar-lida',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordNotificacaoController@marcarLida',
        'controller' => 'App\\Http\\Controllers\\LandlordNotificacaoController@marcarLida',
        'namespace' => NULL,
        'prefix' => 'api/landlord/notificacoes',
        'where' => 
        array (
        ),
        'as' => 'generated::zOQzF3TMcdcg9Yjr',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::xCLrMyKYnG89shEK' => 
    array (
      'methods' => 
      array (
        0 => 'DELETE',
      ),
      'uri' => 'api/landlord/notificacoes/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordNotificacaoController@eliminar',
        'controller' => 'App\\Http\\Controllers\\LandlordNotificacaoController@eliminar',
        'namespace' => NULL,
        'prefix' => 'api/landlord/notificacoes',
        'where' => 
        array (
        ),
        'as' => 'generated::xCLrMyKYnG89shEK',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::EwlkqCD80BVO1smJ' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/landlord/freelancer/empresa',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
        ),
        'uses' => 'App\\Http\\Controllers\\FreelancerController@criarEmpresaSingular',
        'controller' => 'App\\Http\\Controllers\\FreelancerController@criarEmpresaSingular',
        'namespace' => NULL,
        'prefix' => 'api/landlord/freelancer',
        'where' => 
        array (
        ),
        'as' => 'generated::EwlkqCD80BVO1smJ',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::XdmM6iVXzPzMFaz2' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/freelancer/onboarding',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
        ),
        'uses' => 'App\\Http\\Controllers\\FreelancerController@obterStatusOnboarding',
        'controller' => 'App\\Http\\Controllers\\FreelancerController@obterStatusOnboarding',
        'namespace' => NULL,
        'prefix' => 'api/landlord/freelancer',
        'where' => 
        array (
        ),
        'as' => 'generated::XdmM6iVXzPzMFaz2',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::75Wstr3De2R2OASv' => 
    array (
      'methods' => 
      array (
        0 => 'PUT',
      ),
      'uri' => 'api/landlord/freelancer/empresa',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
        ),
        'uses' => 'App\\Http\\Controllers\\FreelancerController@atualizarDadosEmpresa',
        'controller' => 'App\\Http\\Controllers\\FreelancerController@atualizarDadosEmpresa',
        'namespace' => NULL,
        'prefix' => 'api/landlord/freelancer',
        'where' => 
        array (
        ),
        'as' => 'generated::75Wstr3De2R2OASv',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::xOkpgrzySEeQJbiI' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/pagamentos-plano',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
        ),
        'uses' => 'App\\Http\\Controllers\\PagamentoLandlordController@index',
        'controller' => 'App\\Http\\Controllers\\PagamentoLandlordController@index',
        'namespace' => NULL,
        'prefix' => 'api/landlord/pagamentos-plano',
        'where' => 
        array (
        ),
        'as' => 'generated::xOkpgrzySEeQJbiI',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::QdaVQRJl5TlX7sUI' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/pagamentos-plano/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
        ),
        'uses' => 'App\\Http\\Controllers\\PagamentoLandlordController@show',
        'controller' => 'App\\Http\\Controllers\\PagamentoLandlordController@show',
        'namespace' => NULL,
        'prefix' => 'api/landlord/pagamentos-plano',
        'where' => 
        array (
        ),
        'as' => 'generated::QdaVQRJl5TlX7sUI',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::Vk7IUzAMviVZ6LEE' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/landlord/pagamentos-plano/{id}/upload-comprovativo',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
        ),
        'uses' => 'App\\Http\\Controllers\\PagamentoLandlordController@uploadComprovativo',
        'controller' => 'App\\Http\\Controllers\\PagamentoLandlordController@uploadComprovativo',
        'namespace' => NULL,
        'prefix' => 'api/landlord/pagamentos-plano',
        'where' => 
        array (
        ),
        'as' => 'generated::Vk7IUzAMviVZ6LEE',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::HT1Nxw3yxPP1Ljdc' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/analytics/resumo',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\AnalyticsController@resumo',
        'controller' => 'App\\Http\\Controllers\\AnalyticsController@resumo',
        'namespace' => NULL,
        'prefix' => 'api/landlord',
        'where' => 
        array (
        ),
        'as' => 'generated::HT1Nxw3yxPP1Ljdc',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'landlord.auditoria.logs' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/auditoria/logs',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\AuditoriaController@indexLandlord',
        'controller' => 'App\\Http\\Controllers\\AuditoriaController@indexLandlord',
        'namespace' => NULL,
        'prefix' => 'api/landlord/auditoria',
        'where' => 
        array (
        ),
        'as' => 'landlord.auditoria.logs',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::siSpkCs9FD9aFAw5' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/usuarios',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordUserController@index',
        'controller' => 'App\\Http\\Controllers\\LandlordUserController@index',
        'namespace' => NULL,
        'prefix' => 'api/landlord/usuarios',
        'where' => 
        array (
        ),
        'as' => 'generated::siSpkCs9FD9aFAw5',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::L7FiHYdidKLoLHev' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/landlord/usuarios',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordUserController@store',
        'controller' => 'App\\Http\\Controllers\\LandlordUserController@store',
        'namespace' => NULL,
        'prefix' => 'api/landlord/usuarios',
        'where' => 
        array (
        ),
        'as' => 'generated::L7FiHYdidKLoLHev',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::fvTkcaZC1HASd0ZB' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/usuarios/tenant-users',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordUserController@listarTenantUsers',
        'controller' => 'App\\Http\\Controllers\\LandlordUserController@listarTenantUsers',
        'namespace' => NULL,
        'prefix' => 'api/landlord/usuarios',
        'where' => 
        array (
        ),
        'as' => 'generated::fvTkcaZC1HASd0ZB',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::w6KezvlB0cngJwLT' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/usuarios/shared-users',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordUserController@listarSharedUsers',
        'controller' => 'App\\Http\\Controllers\\LandlordUserController@listarSharedUsers',
        'namespace' => NULL,
        'prefix' => 'api/landlord/usuarios',
        'where' => 
        array (
        ),
        'as' => 'generated::w6KezvlB0cngJwLT',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::lkAlYPFx94s7lXHa' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/usuarios/{landlordUser}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordUserController@show',
        'controller' => 'App\\Http\\Controllers\\LandlordUserController@show',
        'namespace' => NULL,
        'prefix' => 'api/landlord/usuarios',
        'where' => 
        array (
        ),
        'as' => 'generated::lkAlYPFx94s7lXHa',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::V3TmyXUXKRb1UbVh' => 
    array (
      'methods' => 
      array (
        0 => 'PUT',
      ),
      'uri' => 'api/landlord/usuarios/{landlordUser}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordUserController@update',
        'controller' => 'App\\Http\\Controllers\\LandlordUserController@update',
        'namespace' => NULL,
        'prefix' => 'api/landlord/usuarios',
        'where' => 
        array (
        ),
        'as' => 'generated::V3TmyXUXKRb1UbVh',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::BEd26iH1ArfnFREA' => 
    array (
      'methods' => 
      array (
        0 => 'DELETE',
      ),
      'uri' => 'api/landlord/usuarios/{landlordUser}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordUserController@destroy',
        'controller' => 'App\\Http\\Controllers\\LandlordUserController@destroy',
        'namespace' => NULL,
        'prefix' => 'api/landlord/usuarios',
        'where' => 
        array (
        ),
        'as' => 'generated::BEd26iH1ArfnFREA',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::Io39HEWDXpJHwiMg' => 
    array (
      'methods' => 
      array (
        0 => 'PATCH',
      ),
      'uri' => 'api/landlord/usuarios/{landlordUser}/toggle-status',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordUserController@toggleStatus',
        'controller' => 'App\\Http\\Controllers\\LandlordUserController@toggleStatus',
        'namespace' => NULL,
        'prefix' => 'api/landlord/usuarios',
        'where' => 
        array (
        ),
        'as' => 'generated::Io39HEWDXpJHwiMg',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::DIUmzKb4HWsBcCAy' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/landlord/usuarios/{landlordUser}/reset-password',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordUserController@resetPassword',
        'controller' => 'App\\Http\\Controllers\\LandlordUserController@resetPassword',
        'namespace' => NULL,
        'prefix' => 'api/landlord/usuarios',
        'where' => 
        array (
        ),
        'as' => 'generated::DIUmzKb4HWsBcCAy',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::BIQJb7oTP44DtrFS' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/landlord/usuarios/{landlordUser}/vincular-empresa',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordUserController@vincularEmpresa',
        'controller' => 'App\\Http\\Controllers\\LandlordUserController@vincularEmpresa',
        'namespace' => NULL,
        'prefix' => 'api/landlord/usuarios',
        'where' => 
        array (
        ),
        'as' => 'generated::BIQJb7oTP44DtrFS',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::QUz4bd1YNqHPJM09' => 
    array (
      'methods' => 
      array (
        0 => 'DELETE',
      ),
      'uri' => 'api/landlord/usuarios/{landlordUser}/desvincular-empresa',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\LandlordUserController@desvincularEmpresa',
        'controller' => 'App\\Http\\Controllers\\LandlordUserController@desvincularEmpresa',
        'namespace' => NULL,
        'prefix' => 'api/landlord/usuarios',
        'where' => 
        array (
        ),
        'as' => 'generated::QUz4bd1YNqHPJM09',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::AUtsNWoLEDKEktLY' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/planos',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\PlanoController@index',
        'controller' => 'App\\Http\\Controllers\\PlanoController@index',
        'namespace' => NULL,
        'prefix' => 'api/landlord/planos',
        'where' => 
        array (
        ),
        'as' => 'generated::AUtsNWoLEDKEktLY',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::ZktG519VUPndtn50' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/landlord/planos',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\PlanoController@store',
        'controller' => 'App\\Http\\Controllers\\PlanoController@store',
        'namespace' => NULL,
        'prefix' => 'api/landlord/planos',
        'where' => 
        array (
        ),
        'as' => 'generated::ZktG519VUPndtn50',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::e8hhfHV5FRaxr9tN' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/planos/{plano}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\PlanoController@show',
        'controller' => 'App\\Http\\Controllers\\PlanoController@show',
        'namespace' => NULL,
        'prefix' => 'api/landlord/planos',
        'where' => 
        array (
        ),
        'as' => 'generated::e8hhfHV5FRaxr9tN',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::r9oCSW13fkbI4M9B' => 
    array (
      'methods' => 
      array (
        0 => 'PUT',
      ),
      'uri' => 'api/landlord/planos/{plano}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\PlanoController@update',
        'controller' => 'App\\Http\\Controllers\\PlanoController@update',
        'namespace' => NULL,
        'prefix' => 'api/landlord/planos',
        'where' => 
        array (
        ),
        'as' => 'generated::r9oCSW13fkbI4M9B',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::zlFamyQNEqJY6Tmv' => 
    array (
      'methods' => 
      array (
        0 => 'DELETE',
      ),
      'uri' => 'api/landlord/planos/{plano}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\PlanoController@destroy',
        'controller' => 'App\\Http\\Controllers\\PlanoController@destroy',
        'namespace' => NULL,
        'prefix' => 'api/landlord/planos',
        'where' => 
        array (
        ),
        'as' => 'generated::zlFamyQNEqJY6Tmv',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::E73HoeiDu1JvmRBK' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/landlord/planos/{plano}/features',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\PlanoController@attachFeature',
        'controller' => 'App\\Http\\Controllers\\PlanoController@attachFeature',
        'namespace' => NULL,
        'prefix' => 'api/landlord/planos',
        'where' => 
        array (
        ),
        'as' => 'generated::E73HoeiDu1JvmRBK',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::fXev3Mj0j3lM6u3Z' => 
    array (
      'methods' => 
      array (
        0 => 'DELETE',
      ),
      'uri' => 'api/landlord/planos/{plano}/features/{feature}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\PlanoController@detachFeature',
        'controller' => 'App\\Http\\Controllers\\PlanoController@detachFeature',
        'namespace' => NULL,
        'prefix' => 'api/landlord/planos',
        'where' => 
        array (
        ),
        'as' => 'generated::fXev3Mj0j3lM6u3Z',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::QPmpSYqlysXUnwHp' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/features',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\FeatureController@index',
        'controller' => 'App\\Http\\Controllers\\FeatureController@index',
        'namespace' => NULL,
        'prefix' => 'api/landlord/features',
        'where' => 
        array (
        ),
        'as' => 'generated::QPmpSYqlysXUnwHp',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::d1nckzrxmzpw1R0Z' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/landlord/features',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\FeatureController@store',
        'controller' => 'App\\Http\\Controllers\\FeatureController@store',
        'namespace' => NULL,
        'prefix' => 'api/landlord/features',
        'where' => 
        array (
        ),
        'as' => 'generated::d1nckzrxmzpw1R0Z',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::0Mtv4pXx9ouOl6NX' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/features/{feature}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\FeatureController@show',
        'controller' => 'App\\Http\\Controllers\\FeatureController@show',
        'namespace' => NULL,
        'prefix' => 'api/landlord/features',
        'where' => 
        array (
        ),
        'as' => 'generated::0Mtv4pXx9ouOl6NX',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::5ZO7Z2VctU2dvcYg' => 
    array (
      'methods' => 
      array (
        0 => 'PUT',
      ),
      'uri' => 'api/landlord/features/{feature}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\FeatureController@update',
        'controller' => 'App\\Http\\Controllers\\FeatureController@update',
        'namespace' => NULL,
        'prefix' => 'api/landlord/features',
        'where' => 
        array (
        ),
        'as' => 'generated::5ZO7Z2VctU2dvcYg',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::lWot4GfLzbRPLxiQ' => 
    array (
      'methods' => 
      array (
        0 => 'DELETE',
      ),
      'uri' => 'api/landlord/features/{feature}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\FeatureController@destroy',
        'controller' => 'App\\Http\\Controllers\\FeatureController@destroy',
        'namespace' => NULL,
        'prefix' => 'api/landlord/features',
        'where' => 
        array (
        ),
        'as' => 'generated::lWot4GfLzbRPLxiQ',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::47txFs04LhDp6MNc' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/empresas',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\EmpresaController@index',
        'controller' => 'App\\Http\\Controllers\\EmpresaController@index',
        'namespace' => NULL,
        'prefix' => 'api/landlord/empresas',
        'where' => 
        array (
        ),
        'as' => 'generated::47txFs04LhDp6MNc',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::WfgxMkmcQZm4wSXs' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/landlord/empresas',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\EmpresaController@store',
        'controller' => 'App\\Http\\Controllers\\EmpresaController@store',
        'namespace' => NULL,
        'prefix' => 'api/landlord/empresas',
        'where' => 
        array (
        ),
        'as' => 'generated::WfgxMkmcQZm4wSXs',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::ypOmFeeiEBU16g8E' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/empresas/{empresa}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\EmpresaController@show',
        'controller' => 'App\\Http\\Controllers\\EmpresaController@show',
        'namespace' => NULL,
        'prefix' => 'api/landlord/empresas',
        'where' => 
        array (
        ),
        'as' => 'generated::ypOmFeeiEBU16g8E',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::FGhZdIJAim0sQgsQ' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/empresas/{empresa}/mensagens',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\EmpresaController@mensagensEmpresa',
        'controller' => 'App\\Http\\Controllers\\EmpresaController@mensagensEmpresa',
        'namespace' => NULL,
        'prefix' => 'api/landlord/empresas',
        'where' => 
        array (
        ),
        'as' => 'generated::FGhZdIJAim0sQgsQ',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::JC2IChkalIe19Kj8' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/landlord/empresas/{empresa}/mensagens',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\EmpresaController@enviarMensagem',
        'controller' => 'App\\Http\\Controllers\\EmpresaController@enviarMensagem',
        'namespace' => NULL,
        'prefix' => 'api/landlord/empresas',
        'where' => 
        array (
        ),
        'as' => 'generated::JC2IChkalIe19Kj8',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::b4fYIZAbW19u780o' => 
    array (
      'methods' => 
      array (
        0 => 'PUT',
      ),
      'uri' => 'api/landlord/empresas/{empresa}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\EmpresaController@update',
        'controller' => 'App\\Http\\Controllers\\EmpresaController@update',
        'namespace' => NULL,
        'prefix' => 'api/landlord/empresas',
        'where' => 
        array (
        ),
        'as' => 'generated::b4fYIZAbW19u780o',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::xDcKOL7U0U4HYt8I' => 
    array (
      'methods' => 
      array (
        0 => 'PATCH',
      ),
      'uri' => 'api/landlord/empresas/{empresa}/toggle-status',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\EmpresaController@toggleStatusLandlord',
        'controller' => 'App\\Http\\Controllers\\EmpresaController@toggleStatusLandlord',
        'namespace' => NULL,
        'prefix' => 'api/landlord/empresas',
        'where' => 
        array (
        ),
        'as' => 'generated::xDcKOL7U0U4HYt8I',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::g3FSJ6jJft5FevAl' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/landlord/minha-empresa',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\EmpresaController@storeParaLandlordAutenticado',
        'controller' => 'App\\Http\\Controllers\\EmpresaController@storeParaLandlordAutenticado',
        'namespace' => NULL,
        'prefix' => 'api/landlord',
        'where' => 
        array (
        ),
        'as' => 'generated::g3FSJ6jJft5FevAl',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::pUPejD4xyuaHv7OO' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/landlord/pagamentos-plano/pendentes',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\PagamentoLandlordController@pendentes',
        'controller' => 'App\\Http\\Controllers\\PagamentoLandlordController@pendentes',
        'namespace' => NULL,
        'prefix' => 'api/landlord/pagamentos-plano',
        'where' => 
        array (
        ),
        'as' => 'generated::pUPejD4xyuaHv7OO',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::DpMuPeNi81C22rsb' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/landlord/pagamentos-plano/{id}/confirmar',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\PagamentoLandlordController@confirmarPagamento',
        'controller' => 'App\\Http\\Controllers\\PagamentoLandlordController@confirmarPagamento',
        'namespace' => NULL,
        'prefix' => 'api/landlord/pagamentos-plano',
        'where' => 
        array (
        ),
        'as' => 'generated::DpMuPeNi81C22rsb',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::hQS12t5ghYRh1FoJ' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/landlord/pagamentos-plano/{id}/rejeitar',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\PagamentoLandlordController@rejeitarPagamento',
        'controller' => 'App\\Http\\Controllers\\PagamentoLandlordController@rejeitarPagamento',
        'namespace' => NULL,
        'prefix' => 'api/landlord/pagamentos-plano',
        'where' => 
        array (
        ),
        'as' => 'generated::hQS12t5ghYRh1FoJ',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::0JujoOZpExJ0MpXk' => 
    array (
      'methods' => 
      array (
        0 => 'DELETE',
      ),
      'uri' => 'api/landlord/pagamentos-plano/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'auth:landlord_api',
          2 => 'super_admin',
        ),
        'uses' => 'App\\Http\\Controllers\\PagamentoLandlordController@destroy',
        'controller' => 'App\\Http\\Controllers\\PagamentoLandlordController@destroy',
        'namespace' => NULL,
        'prefix' => 'api/landlord/pagamentos-plano',
        'where' => 
        array (
        ),
        'as' => 'generated::0JujoOZpExJ0MpXk',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.public-proof' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/documentos-fiscais/{id}/prova',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@publicProof',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@publicProof',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'documentos.public-proof',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::FkfquIHuO36MIBSF' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/planos/{plano}/attach-feature',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\PlanoController@attachFeature',
        'controller' => 'App\\Http\\Controllers\\PlanoController@attachFeature',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::FkfquIHuO36MIBSF',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::csf4bt7XmhwHoV6x' => 
    array (
      'methods' => 
      array (
        0 => 'DELETE',
      ),
      'uri' => 'api/planos/{plano}/detach-feature/{feature}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\PlanoController@detachFeature',
        'controller' => 'App\\Http\\Controllers\\PlanoController@detachFeature',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::csf4bt7XmhwHoV6x',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'features.store' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/features',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'as' => 'features.store',
        'uses' => 'App\\Http\\Controllers\\FeatureController@store',
        'controller' => 'App\\Http\\Controllers\\FeatureController@store',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'features.show' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/features/{feature}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'as' => 'features.show',
        'uses' => 'App\\Http\\Controllers\\FeatureController@show',
        'controller' => 'App\\Http\\Controllers\\FeatureController@show',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'features.update' => 
    array (
      'methods' => 
      array (
        0 => 'PUT',
        1 => 'PATCH',
      ),
      'uri' => 'api/features/{feature}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'as' => 'features.update',
        'uses' => 'App\\Http\\Controllers\\FeatureController@update',
        'controller' => 'App\\Http\\Controllers\\FeatureController@update',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'features.destroy' => 
    array (
      'methods' => 
      array (
        0 => 'DELETE',
      ),
      'uri' => 'api/features/{feature}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'as' => 'features.destroy',
        'uses' => 'App\\Http\\Controllers\\FeatureController@destroy',
        'controller' => 'App\\Http\\Controllers\\FeatureController@destroy',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::XYy5sho5bXQaOnhj' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/subscricoes/me',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\SubscricaoController@me',
        'controller' => 'App\\Http\\Controllers\\SubscricaoController@me',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::XYy5sho5bXQaOnhj',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::iA3fIkQYsss6Hwkc' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/subscricoes/verificar-feature',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\SubscricaoController@verificarFeature',
        'controller' => 'App\\Http\\Controllers\\SubscricaoController@verificarFeature',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::iA3fIkQYsss6Hwkc',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::B1SZ7oEQvBt0tZFU' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/subscricoes',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\SubscricaoController@index',
        'controller' => 'App\\Http\\Controllers\\SubscricaoController@index',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::B1SZ7oEQvBt0tZFU',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::eafy1LE6YDOEN8M4' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/subscricoes',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\SubscricaoController@store',
        'controller' => 'App\\Http\\Controllers\\SubscricaoController@store',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::eafy1LE6YDOEN8M4',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::5sfj8s3Q4NNBmjcR' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/subscricoes/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\SubscricaoController@show',
        'controller' => 'App\\Http\\Controllers\\SubscricaoController@show',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::5sfj8s3Q4NNBmjcR',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::J4GYLtPsFahTFH3g' => 
    array (
      'methods' => 
      array (
        0 => 'PUT',
      ),
      'uri' => 'api/subscricoes/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\SubscricaoController@update',
        'controller' => 'App\\Http\\Controllers\\SubscricaoController@update',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::J4GYLtPsFahTFH3g',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::BqlMROH2q0Oz4bBC' => 
    array (
      'methods' => 
      array (
        0 => 'PATCH',
      ),
      'uri' => 'api/subscricoes/{id}/cancel',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\SubscricaoController@cancel',
        'controller' => 'App\\Http\\Controllers\\SubscricaoController@cancel',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::BqlMROH2q0Oz4bBC',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::lCEFYgjUvqQn6kTk' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/subscricoes/{id}/renovar',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\SubscricaoController@renovar',
        'controller' => 'App\\Http\\Controllers\\SubscricaoController@renovar',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::lCEFYgjUvqQn6kTk',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::0YiDnxnQHf5dPG6g' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/pagamentos-plano',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\PagamentoLandlordController@index',
        'controller' => 'App\\Http\\Controllers\\PagamentoLandlordController@index',
        'namespace' => NULL,
        'prefix' => 'api/pagamentos-plano',
        'where' => 
        array (
        ),
        'as' => 'generated::0YiDnxnQHf5dPG6g',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::EQAMxXn5R6iW4Dyg' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/pagamentos-plano',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\PagamentoLandlordController@store',
        'controller' => 'App\\Http\\Controllers\\PagamentoLandlordController@store',
        'namespace' => NULL,
        'prefix' => 'api/pagamentos-plano',
        'where' => 
        array (
        ),
        'as' => 'generated::EQAMxXn5R6iW4Dyg',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::Z8YJVw3poI4lAUom' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/pagamentos-plano/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\PagamentoLandlordController@show',
        'controller' => 'App\\Http\\Controllers\\PagamentoLandlordController@show',
        'namespace' => NULL,
        'prefix' => 'api/pagamentos-plano',
        'where' => 
        array (
        ),
        'as' => 'generated::Z8YJVw3poI4lAUom',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::BMzHAx3RIYTWEL62' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/pagamentos-plano/{id}/upload-comprovativo',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\PagamentoLandlordController@uploadComprovativo',
        'controller' => 'App\\Http\\Controllers\\PagamentoLandlordController@uploadComprovativo',
        'namespace' => NULL,
        'prefix' => 'api/pagamentos-plano',
        'where' => 
        array (
        ),
        'as' => 'generated::BMzHAx3RIYTWEL62',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::FOLO9ZlBhjfqzbVg' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/empresa',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\EmpresaController@showSelf',
        'controller' => 'App\\Http\\Controllers\\EmpresaController@showSelf',
        'namespace' => NULL,
        'prefix' => 'api/empresa',
        'where' => 
        array (
        ),
        'as' => 'generated::FOLO9ZlBhjfqzbVg',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::Ufie7hF9yComd5yN' => 
    array (
      'methods' => 
      array (
        0 => 'PUT',
      ),
      'uri' => 'api/empresa',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\EmpresaController@updateTenant',
        'controller' => 'App\\Http\\Controllers\\EmpresaController@updateTenant',
        'namespace' => NULL,
        'prefix' => 'api/empresa',
        'where' => 
        array (
        ),
        'as' => 'generated::Ufie7hF9yComd5yN',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::OkIP1ZWrPLJZ81Sz' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/empresa/logo',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\EmpresaController@uploadLogo',
        'controller' => 'App\\Http\\Controllers\\EmpresaController@uploadLogo',
        'namespace' => NULL,
        'prefix' => 'api/empresa',
        'where' => 
        array (
        ),
        'as' => 'generated::OkIP1ZWrPLJZ81Sz',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::1RTwmnnMjd941r1W' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/empresa/configuracoes-fiscais',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\EmpresaController@configuracoesFiscais',
        'controller' => 'App\\Http\\Controllers\\EmpresaController@configuracoesFiscais',
        'namespace' => NULL,
        'prefix' => 'api/empresa',
        'where' => 
        array (
        ),
        'as' => 'generated::1RTwmnnMjd941r1W',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::urSP7uQ32OPiTS2C' => 
    array (
      'methods' => 
      array (
        0 => 'PUT',
      ),
      'uri' => 'api/empresa/configuracoes-fiscais',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\EmpresaController@atualizarConfiguracoesFiscais',
        'controller' => 'App\\Http\\Controllers\\EmpresaController@atualizarConfiguracoesFiscais',
        'namespace' => NULL,
        'prefix' => 'api/empresa',
        'where' => 
        array (
        ),
        'as' => 'generated::urSP7uQ32OPiTS2C',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::XTPGWnH7yx7lNJu2' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/empresa/mensagens',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\EmpresaController@mensagensEmpresa',
        'controller' => 'App\\Http\\Controllers\\EmpresaController@mensagensEmpresa',
        'namespace' => NULL,
        'prefix' => 'api/empresa',
        'where' => 
        array (
        ),
        'as' => 'generated::XTPGWnH7yx7lNJu2',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::IbFGlSbGraFhS8XU' => 
    array (
      'methods' => 
      array (
        0 => 'PATCH',
      ),
      'uri' => 'api/empresa/mensagens/{mensagem}/marcar-lida',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\EmpresaController@marcarMensagemComoLida',
        'controller' => 'App\\Http\\Controllers\\EmpresaController@marcarMensagemComoLida',
        'namespace' => NULL,
        'prefix' => 'api/empresa',
        'where' => 
        array (
        ),
        'as' => 'generated::IbFGlSbGraFhS8XU',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::ENWzqhowmF4NPBR2' => 
    array (
      'methods' => 
      array (
        0 => 'DELETE',
      ),
      'uri' => 'api/empresa/mensagens/{mensagem}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\EmpresaController@eliminarMensagem',
        'controller' => 'App\\Http\\Controllers\\EmpresaController@eliminarMensagem',
        'namespace' => NULL,
        'prefix' => 'api/empresa',
        'where' => 
        array (
        ),
        'as' => 'generated::ENWzqhowmF4NPBR2',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::fhBFw6zsr7zCGLwh' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/me',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\UserController@me',
        'controller' => 'App\\Http\\Controllers\\UserController@me',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::fhBFw6zsr7zCGLwh',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'dashboard.index' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/dashboard',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'log.panel',
        ),
        'uses' => 'App\\Http\\Controllers\\DashboardController@index',
        'controller' => 'App\\Http\\Controllers\\DashboardController@index',
        'namespace' => NULL,
        'prefix' => 'api/dashboard',
        'where' => 
        array (
        ),
        'as' => 'dashboard.index',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'dashboard.resumo-documentos' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/dashboard/resumo-documentos-fiscais',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\DashboardController@resumoDocumentosFiscais',
        'controller' => 'App\\Http\\Controllers\\DashboardController@resumoDocumentosFiscais',
        'namespace' => NULL,
        'prefix' => 'api/dashboard',
        'where' => 
        array (
        ),
        'as' => 'dashboard.resumo-documentos',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'dashboard.estatisticas-pagamentos' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/dashboard/estatisticas-pagamentos',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\DashboardController@estatisticasPagamentos',
        'controller' => 'App\\Http\\Controllers\\DashboardController@estatisticasPagamentos',
        'namespace' => NULL,
        'prefix' => 'api/dashboard',
        'where' => 
        array (
        ),
        'as' => 'dashboard.estatisticas-pagamentos',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'dashboard.alertas' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/dashboard/alertas',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\DashboardController@alertasPendentes',
        'controller' => 'App\\Http\\Controllers\\DashboardController@alertasPendentes',
        'namespace' => NULL,
        'prefix' => 'api/dashboard',
        'where' => 
        array (
        ),
        'as' => 'dashboard.alertas',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'dashboard.evolucao' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/dashboard/evolucao-mensal',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\DashboardController@evolucaoMensal',
        'controller' => 'App\\Http\\Controllers\\DashboardController@evolucaoMensal',
        'namespace' => NULL,
        'prefix' => 'api/dashboard',
        'where' => 
        array (
        ),
        'as' => 'dashboard.evolucao',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::PDes8xIU4d1YxVtC' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/users',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor',
        ),
        'uses' => 'App\\Http\\Controllers\\UserController@index',
        'controller' => 'App\\Http\\Controllers\\UserController@index',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::PDes8xIU4d1YxVtC',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::5Fz7x0d0cqmpLc3r' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/users',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor',
        ),
        'uses' => 'App\\Http\\Controllers\\UserController@store',
        'controller' => 'App\\Http\\Controllers\\UserController@store',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::5Fz7x0d0cqmpLc3r',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::fruQVNsCaVQ3vZ8w' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/users/create',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor',
        ),
        'uses' => 'App\\Http\\Controllers\\UserController@create',
        'controller' => 'App\\Http\\Controllers\\UserController@create',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::fruQVNsCaVQ3vZ8w',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::uce5KqkCVwGbqJjN' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/users/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor',
        ),
        'uses' => 'App\\Http\\Controllers\\UserController@show',
        'controller' => 'App\\Http\\Controllers\\UserController@show',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::uce5KqkCVwGbqJjN',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::lpwN9VTREYU5eDog' => 
    array (
      'methods' => 
      array (
        0 => 'PUT',
      ),
      'uri' => 'api/users/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor',
        ),
        'uses' => 'App\\Http\\Controllers\\UserController@update',
        'controller' => 'App\\Http\\Controllers\\UserController@update',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::lpwN9VTREYU5eDog',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::4ROOG8ZUy45BtwUh' => 
    array (
      'methods' => 
      array (
        0 => 'DELETE',
      ),
      'uri' => 'api/users/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor',
        ),
        'uses' => 'App\\Http\\Controllers\\UserController@destroy',
        'controller' => 'App\\Http\\Controllers\\UserController@destroy',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::4ROOG8ZUy45BtwUh',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::XXERcZT0rxJ23Yn7' => 
    array (
      'methods' => 
      array (
        0 => 'PATCH',
      ),
      'uri' => 'api/empresa/toggle-status',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor',
        ),
        'uses' => 'App\\Http\\Controllers\\EmpresaController@toggleSelfStatus',
        'controller' => 'App\\Http\\Controllers\\EmpresaController@toggleSelfStatus',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::XXERcZT0rxJ23Yn7',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'relatorios.exportar-saft' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/relatorios/exportar-saft',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
          4 => 'role:admin,gestor',
        ),
        'uses' => 'App\\Http\\Controllers\\RelatoriosController@exportarSaft',
        'controller' => 'App\\Http\\Controllers\\RelatoriosController@exportarSaft',
        'namespace' => NULL,
        'prefix' => 'api/relatorios',
        'where' => 
        array (
        ),
        'as' => 'relatorios.exportar-saft',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::9mUhSa46OtIZn6g7' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/saft/alertas',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor',
        ),
        'uses' => 'App\\Http\\Controllers\\RelatoriosController@alertas',
        'controller' => 'App\\Http\\Controllers\\RelatoriosController@alertas',
        'namespace' => NULL,
        'prefix' => 'api',
        'where' => 
        array (
        ),
        'as' => 'generated::9mUhSa46OtIZn6g7',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'clientes.todos' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/clientes/todos',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor',
        ),
        'uses' => 'App\\Http\\Controllers\\ClienteController@indexWithTrashed',
        'controller' => 'App\\Http\\Controllers\\ClienteController@indexWithTrashed',
        'namespace' => NULL,
        'prefix' => 'api/clientes',
        'where' => 
        array (
        ),
        'as' => 'clientes.todos',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'clientes.restore' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/clientes/{id}/restore',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor',
        ),
        'uses' => 'App\\Http\\Controllers\\ClienteController@restore',
        'controller' => 'App\\Http\\Controllers\\ClienteController@restore',
        'namespace' => NULL,
        'prefix' => 'api/clientes',
        'where' => 
        array (
        ),
        'as' => 'clientes.restore',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'clientes.force-delete' => 
    array (
      'methods' => 
      array (
        0 => 'DELETE',
      ),
      'uri' => 'api/clientes/{id}/force',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor',
        ),
        'uses' => 'App\\Http\\Controllers\\ClienteController@forceDelete',
        'controller' => 'App\\Http\\Controllers\\ClienteController@forceDelete',
        'namespace' => NULL,
        'prefix' => 'api/clientes',
        'where' => 
        array (
        ),
        'as' => 'clientes.force-delete',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'clientes.ativar' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/clientes/{id}/ativar',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ClienteController@ativar',
        'controller' => 'App\\Http\\Controllers\\ClienteController@ativar',
        'namespace' => NULL,
        'prefix' => 'api/clientes',
        'where' => 
        array (
        ),
        'as' => 'clientes.ativar',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'clientes.inativar' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/clientes/{id}/inativar',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ClienteController@inativar',
        'controller' => 'App\\Http\\Controllers\\ClienteController@inativar',
        'namespace' => NULL,
        'prefix' => 'api/clientes',
        'where' => 
        array (
        ),
        'as' => 'clientes.inativar',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'auditoria.logs' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/auditoria/logs',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor',
        ),
        'uses' => 'App\\Http\\Controllers\\AuditoriaController@index',
        'controller' => 'App\\Http\\Controllers\\AuditoriaController@index',
        'namespace' => NULL,
        'prefix' => 'api/auditoria',
        'where' => 
        array (
        ),
        'as' => 'auditoria.logs',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'auditoria.datas' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/auditoria/datas',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor',
        ),
        'uses' => 'App\\Http\\Controllers\\AuditoriaController@datasDisponiveis',
        'controller' => 'App\\Http\\Controllers\\AuditoriaController@datasDisponiveis',
        'namespace' => NULL,
        'prefix' => 'api/auditoria',
        'where' => 
        array (
        ),
        'as' => 'auditoria.datas',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'auditoria.eventos' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/auditoria/eventos',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\AuditoriaController@storeEvento',
        'controller' => 'App\\Http\\Controllers\\AuditoriaController@storeEvento',
        'namespace' => NULL,
        'prefix' => 'api/auditoria',
        'where' => 
        array (
        ),
        'as' => 'auditoria.eventos',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::2ca9erG0HFKz7j16' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/produtos/importar',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ProdutoController@importar',
        'controller' => 'App\\Http\\Controllers\\ProdutoController@importar',
        'namespace' => NULL,
        'prefix' => 'api/produtos',
        'where' => 
        array (
        ),
        'as' => 'generated::2ca9erG0HFKz7j16',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'produtos.index' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/produtos',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
          4 => 'log.panel',
        ),
        'uses' => 'App\\Http\\Controllers\\ProdutoController@index',
        'controller' => 'App\\Http\\Controllers\\ProdutoController@index',
        'namespace' => NULL,
        'prefix' => 'api/produtos',
        'where' => 
        array (
        ),
        'as' => 'produtos.index',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'produtos.todos' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/produtos/todos',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ProdutoController@todos',
        'controller' => 'App\\Http\\Controllers\\ProdutoController@todos',
        'namespace' => NULL,
        'prefix' => 'api/produtos',
        'where' => 
        array (
        ),
        'as' => 'produtos.todos',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'produtos.trashed' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/produtos/trashed',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ProdutoController@trashed',
        'controller' => 'App\\Http\\Controllers\\ProdutoController@trashed',
        'namespace' => NULL,
        'prefix' => 'api/produtos',
        'where' => 
        array (
        ),
        'as' => 'produtos.trashed',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'produtos.restore' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/produtos/{id}/restore',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ProdutoController@restore',
        'controller' => 'App\\Http\\Controllers\\ProdutoController@restore',
        'namespace' => NULL,
        'prefix' => 'api/produtos',
        'where' => 
        array (
        ),
        'as' => 'produtos.restore',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'produtos.force-delete' => 
    array (
      'methods' => 
      array (
        0 => 'DELETE',
      ),
      'uri' => 'api/produtos/{id}/force',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ProdutoController@forceDelete',
        'controller' => 'App\\Http\\Controllers\\ProdutoController@forceDelete',
        'namespace' => NULL,
        'prefix' => 'api/produtos',
        'where' => 
        array (
        ),
        'as' => 'produtos.force-delete',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'produtos.status' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/produtos/{id}/status',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ProdutoController@alterarStatus',
        'controller' => 'App\\Http\\Controllers\\ProdutoController@alterarStatus',
        'namespace' => NULL,
        'prefix' => 'api/produtos',
        'where' => 
        array (
        ),
        'as' => 'produtos.status',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'produtos.show' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/produtos/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ProdutoController@show',
        'controller' => 'App\\Http\\Controllers\\ProdutoController@show',
        'namespace' => NULL,
        'prefix' => 'api/produtos',
        'where' => 
        array (
        ),
        'as' => 'produtos.show',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'produtos.store' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/produtos',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ProdutoController@store',
        'controller' => 'App\\Http\\Controllers\\ProdutoController@store',
        'namespace' => NULL,
        'prefix' => 'api/produtos',
        'where' => 
        array (
        ),
        'as' => 'produtos.store',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'produtos.update' => 
    array (
      'methods' => 
      array (
        0 => 'PUT',
      ),
      'uri' => 'api/produtos/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ProdutoController@update',
        'controller' => 'App\\Http\\Controllers\\ProdutoController@update',
        'namespace' => NULL,
        'prefix' => 'api/produtos',
        'where' => 
        array (
        ),
        'as' => 'produtos.update',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'produtos.destroy' => 
    array (
      'methods' => 
      array (
        0 => 'DELETE',
      ),
      'uri' => 'api/produtos/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ProdutoController@destroy',
        'controller' => 'App\\Http\\Controllers\\ProdutoController@destroy',
        'namespace' => NULL,
        'prefix' => 'api/produtos',
        'where' => 
        array (
        ),
        'as' => 'produtos.destroy',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'categorias.index' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/categorias',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
          4 => 'log.panel',
        ),
        'uses' => 'App\\Http\\Controllers\\CategoriaController@index',
        'controller' => 'App\\Http\\Controllers\\CategoriaController@index',
        'namespace' => NULL,
        'prefix' => 'api/categorias',
        'where' => 
        array (
        ),
        'as' => 'categorias.index',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'categorias.todas' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/categorias/todas',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\CategoriaController@indexTodas',
        'controller' => 'App\\Http\\Controllers\\CategoriaController@indexTodas',
        'namespace' => NULL,
        'prefix' => 'api/categorias',
        'where' => 
        array (
        ),
        'as' => 'categorias.todas',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'categorias.deletadas' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/categorias/deletadas',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\CategoriaController@indexDeletadas',
        'controller' => 'App\\Http\\Controllers\\CategoriaController@indexDeletadas',
        'namespace' => NULL,
        'prefix' => 'api/categorias',
        'where' => 
        array (
        ),
        'as' => 'categorias.deletadas',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'categorias.select' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/categorias/select',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\CategoriaController@paraSelectProdutos',
        'controller' => 'App\\Http\\Controllers\\CategoriaController@paraSelectProdutos',
        'namespace' => NULL,
        'prefix' => 'api/categorias',
        'where' => 
        array (
        ),
        'as' => 'categorias.select',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'categorias.store' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/categorias',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\CategoriaController@store',
        'controller' => 'App\\Http\\Controllers\\CategoriaController@store',
        'namespace' => NULL,
        'prefix' => 'api/categorias',
        'where' => 
        array (
        ),
        'as' => 'categorias.store',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'categorias.show' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/categorias/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\CategoriaController@show',
        'controller' => 'App\\Http\\Controllers\\CategoriaController@show',
        'namespace' => NULL,
        'prefix' => 'api/categorias',
        'where' => 
        array (
        ),
        'as' => 'categorias.show',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'categorias.update' => 
    array (
      'methods' => 
      array (
        0 => 'PUT',
      ),
      'uri' => 'api/categorias/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\CategoriaController@update',
        'controller' => 'App\\Http\\Controllers\\CategoriaController@update',
        'namespace' => NULL,
        'prefix' => 'api/categorias',
        'where' => 
        array (
        ),
        'as' => 'categorias.update',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'categorias.destroy' => 
    array (
      'methods' => 
      array (
        0 => 'DELETE',
      ),
      'uri' => 'api/categorias/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\CategoriaController@destroy',
        'controller' => 'App\\Http\\Controllers\\CategoriaController@destroy',
        'namespace' => NULL,
        'prefix' => 'api/categorias',
        'where' => 
        array (
        ),
        'as' => 'categorias.destroy',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'categorias.restore' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/categorias/{id}/restore',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\CategoriaController@restore',
        'controller' => 'App\\Http\\Controllers\\CategoriaController@restore',
        'namespace' => NULL,
        'prefix' => 'api/categorias',
        'where' => 
        array (
        ),
        'as' => 'categorias.restore',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'categorias.force-delete' => 
    array (
      'methods' => 
      array (
        0 => 'DELETE',
      ),
      'uri' => 'api/categorias/{id}/force',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\CategoriaController@forceDelete',
        'controller' => 'App\\Http\\Controllers\\CategoriaController@forceDelete',
        'namespace' => NULL,
        'prefix' => 'api/categorias',
        'where' => 
        array (
        ),
        'as' => 'categorias.force-delete',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'fornecedores.todos' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/fornecedores/todos',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\FornecedorController@indexWithTrashed',
        'controller' => 'App\\Http\\Controllers\\FornecedorController@indexWithTrashed',
        'namespace' => NULL,
        'prefix' => 'api/fornecedores',
        'where' => 
        array (
        ),
        'as' => 'fornecedores.todos',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'fornecedores.trashed' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/fornecedores/trashed',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\FornecedorController@indexOnlyTrashed',
        'controller' => 'App\\Http\\Controllers\\FornecedorController@indexOnlyTrashed',
        'namespace' => NULL,
        'prefix' => 'api/fornecedores',
        'where' => 
        array (
        ),
        'as' => 'fornecedores.trashed',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'fornecedores.deletados' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/fornecedores/deletados',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\FornecedorController@indexOnlyTrashed',
        'controller' => 'App\\Http\\Controllers\\FornecedorController@indexOnlyTrashed',
        'namespace' => NULL,
        'prefix' => 'api/fornecedores',
        'where' => 
        array (
        ),
        'as' => 'fornecedores.deletados',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'fornecedores.restore' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/fornecedores/{id}/restore',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\FornecedorController@restore',
        'controller' => 'App\\Http\\Controllers\\FornecedorController@restore',
        'namespace' => NULL,
        'prefix' => 'api/fornecedores',
        'where' => 
        array (
        ),
        'as' => 'fornecedores.restore',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'fornecedores.force-delete' => 
    array (
      'methods' => 
      array (
        0 => 'DELETE',
      ),
      'uri' => 'api/fornecedores/{id}/force',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\FornecedorController@forceDelete',
        'controller' => 'App\\Http\\Controllers\\FornecedorController@forceDelete',
        'namespace' => NULL,
        'prefix' => 'api/fornecedores',
        'where' => 
        array (
        ),
        'as' => 'fornecedores.force-delete',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'fornecedores.index' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/fornecedores',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
          4 => 'log.panel',
        ),
        'uses' => 'App\\Http\\Controllers\\FornecedorController@index',
        'controller' => 'App\\Http\\Controllers\\FornecedorController@index',
        'namespace' => NULL,
        'prefix' => 'api/fornecedores',
        'where' => 
        array (
        ),
        'as' => 'fornecedores.index',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'fornecedores.store' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/fornecedores',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\FornecedorController@store',
        'controller' => 'App\\Http\\Controllers\\FornecedorController@store',
        'namespace' => NULL,
        'prefix' => 'api/fornecedores',
        'where' => 
        array (
        ),
        'as' => 'fornecedores.store',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'fornecedores.show' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/fornecedores/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\FornecedorController@show',
        'controller' => 'App\\Http\\Controllers\\FornecedorController@show',
        'namespace' => NULL,
        'prefix' => 'api/fornecedores',
        'where' => 
        array (
        ),
        'as' => 'fornecedores.show',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'fornecedores.update' => 
    array (
      'methods' => 
      array (
        0 => 'PUT',
      ),
      'uri' => 'api/fornecedores/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\FornecedorController@update',
        'controller' => 'App\\Http\\Controllers\\FornecedorController@update',
        'namespace' => NULL,
        'prefix' => 'api/fornecedores',
        'where' => 
        array (
        ),
        'as' => 'fornecedores.update',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'fornecedores.destroy' => 
    array (
      'methods' => 
      array (
        0 => 'DELETE',
      ),
      'uri' => 'api/fornecedores/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\FornecedorController@destroy',
        'controller' => 'App\\Http\\Controllers\\FornecedorController@destroy',
        'namespace' => NULL,
        'prefix' => 'api/fornecedores',
        'where' => 
        array (
        ),
        'as' => 'fornecedores.destroy',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::UoALeYBN1KlurLpP' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/clientes/importar',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ClienteController@importar',
        'controller' => 'App\\Http\\Controllers\\ClienteController@importar',
        'namespace' => NULL,
        'prefix' => 'api/clientes',
        'where' => 
        array (
        ),
        'as' => 'generated::UoALeYBN1KlurLpP',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'clientes.index' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/clientes',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
          4 => 'log.panel',
        ),
        'uses' => 'App\\Http\\Controllers\\ClienteController@index',
        'controller' => 'App\\Http\\Controllers\\ClienteController@index',
        'namespace' => NULL,
        'prefix' => 'api/clientes',
        'where' => 
        array (
        ),
        'as' => 'clientes.index',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'clientes.destroy' => 
    array (
      'methods' => 
      array (
        0 => 'DELETE',
      ),
      'uri' => 'api/clientes/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ClienteController@destroy',
        'controller' => 'App\\Http\\Controllers\\ClienteController@destroy',
        'namespace' => NULL,
        'prefix' => 'api/clientes',
        'where' => 
        array (
        ),
        'as' => 'clientes.destroy',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'clientes.store' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/clientes',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'as' => 'clientes.store',
        'uses' => 'App\\Http\\Controllers\\ClienteController@store',
        'controller' => 'App\\Http\\Controllers\\ClienteController@store',
        'namespace' => NULL,
        'prefix' => 'api/',
        'where' => 
        array (
        ),
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'clientes.show' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/clientes/{cliente}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'as' => 'clientes.show',
        'uses' => 'App\\Http\\Controllers\\ClienteController@show',
        'controller' => 'App\\Http\\Controllers\\ClienteController@show',
        'namespace' => NULL,
        'prefix' => 'api/',
        'where' => 
        array (
        ),
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'clientes.update' => 
    array (
      'methods' => 
      array (
        0 => 'PUT',
        1 => 'PATCH',
      ),
      'uri' => 'api/clientes/{cliente}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'as' => 'clientes.update',
        'uses' => 'App\\Http\\Controllers\\ClienteController@update',
        'controller' => 'App\\Http\\Controllers\\ClienteController@update',
        'namespace' => NULL,
        'prefix' => 'api/',
        'where' => 
        array (
        ),
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'compras.index' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/compras',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
          4 => 'log.panel',
        ),
        'uses' => 'App\\Http\\Controllers\\CompraController@index',
        'controller' => 'App\\Http\\Controllers\\CompraController@index',
        'namespace' => NULL,
        'prefix' => 'api/compras',
        'where' => 
        array (
        ),
        'as' => 'compras.index',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'compras.store' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/compras',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\CompraController@store',
        'controller' => 'App\\Http\\Controllers\\CompraController@store',
        'namespace' => NULL,
        'prefix' => 'api/compras',
        'where' => 
        array (
        ),
        'as' => 'compras.store',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'compras.show' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/compras/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\CompraController@show',
        'controller' => 'App\\Http\\Controllers\\CompraController@show',
        'namespace' => NULL,
        'prefix' => 'api/compras',
        'where' => 
        array (
        ),
        'as' => 'compras.show',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'movimentos-stock.index' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/movimentos-stock',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
          4 => 'log.panel',
        ),
        'uses' => 'App\\Http\\Controllers\\MovimentoStockController@index',
        'controller' => 'App\\Http\\Controllers\\MovimentoStockController@index',
        'namespace' => NULL,
        'prefix' => 'api/movimentos-stock',
        'where' => 
        array (
        ),
        'as' => 'movimentos-stock.index',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'movimentos-stock.store' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/movimentos-stock',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\MovimentoStockController@store',
        'controller' => 'App\\Http\\Controllers\\MovimentoStockController@store',
        'namespace' => NULL,
        'prefix' => 'api/movimentos-stock',
        'where' => 
        array (
        ),
        'as' => 'movimentos-stock.store',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'movimentos-stock.ajuste' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/movimentos-stock/ajuste',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\MovimentoStockController@ajuste',
        'controller' => 'App\\Http\\Controllers\\MovimentoStockController@ajuste',
        'namespace' => NULL,
        'prefix' => 'api/movimentos-stock',
        'where' => 
        array (
        ),
        'as' => 'movimentos-stock.ajuste',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'estoque.resumo' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/movimentos-stock/resumo',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\MovimentoStockController@resumo',
        'controller' => 'App\\Http\\Controllers\\MovimentoStockController@resumo',
        'namespace' => NULL,
        'prefix' => 'api/movimentos-stock',
        'where' => 
        array (
        ),
        'as' => 'estoque.resumo',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'movimentos-stock.show' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/movimentos-stock/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\MovimentoStockController@show',
        'controller' => 'App\\Http\\Controllers\\MovimentoStockController@show',
        'namespace' => NULL,
        'prefix' => 'api/movimentos-stock',
        'where' => 
        array (
        ),
        'as' => 'movimentos-stock.show',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'vendas.index' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/vendas',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
          4 => 'log.panel',
        ),
        'uses' => 'App\\Http\\Controllers\\VendaController@index',
        'controller' => 'App\\Http\\Controllers\\VendaController@index',
        'namespace' => NULL,
        'prefix' => 'api/vendas',
        'where' => 
        array (
        ),
        'as' => 'vendas.index',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'vendas.store' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/vendas',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\VendaController@store',
        'controller' => 'App\\Http\\Controllers\\VendaController@store',
        'namespace' => NULL,
        'prefix' => 'api/vendas',
        'where' => 
        array (
        ),
        'as' => 'vendas.store',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'vendas.show' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/vendas/{venda}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\VendaController@show',
        'controller' => 'App\\Http\\Controllers\\VendaController@show',
        'namespace' => NULL,
        'prefix' => 'api/vendas',
        'where' => 
        array (
        ),
        'as' => 'vendas.show',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'venda' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'vendas.cancelar' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/vendas/{venda}/cancelar',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\VendaController@cancelar',
        'controller' => 'App\\Http\\Controllers\\VendaController@cancelar',
        'namespace' => NULL,
        'prefix' => 'api/vendas',
        'where' => 
        array (
        ),
        'as' => 'vendas.cancelar',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'venda' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'vendas.recibo' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/vendas/{venda}/recibo',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\VendaController@gerarRecibo',
        'controller' => 'App\\Http\\Controllers\\VendaController@gerarRecibo',
        'namespace' => NULL,
        'prefix' => 'api/vendas',
        'where' => 
        array (
        ),
        'as' => 'vendas.recibo',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'venda' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.adiantamentos-pendentes' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/documentos-fiscais/adiantamentos-pendentes',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@adiantamentosPendentes',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@adiantamentosPendentes',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.adiantamentos-pendentes',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.proformas-pendentes' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/documentos-fiscais/proformas-pendentes',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@proformasPendentes',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@proformasPendentes',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.proformas-pendentes',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.alertas' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/documentos-fiscais/alertas',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@alertas',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@alertas',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.alertas',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.dashboard' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/documentos-fiscais/dashboard',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@dashboard',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@dashboard',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.dashboard',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.processar-expirados' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/documentos-fiscais/processar-expirados',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@processarExpirados',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@processarExpirados',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.processar-expirados',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.emitir' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/documentos-fiscais/emitir',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@emitir',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@emitir',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.emitir',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::7gESYmlWcmscfGqR' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/documentos-fiscais/factura-global',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@emitirFacturaGlobal',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@emitirFacturaGlobal',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'generated::7gESYmlWcmscfGqR',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::UX9rTMWJ4jXWNbg7' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/documentos-fiscais/talao-venda',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@emitirTalaoVenda',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@emitirTalaoVenda',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'generated::UX9rTMWJ4jXWNbg7',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::77cZg8X2Y7p1WZrr' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/documentos-fiscais/auto-facturacao',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@emitirAutoFacturacao',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@emitirAutoFacturacao',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'generated::77cZg8X2Y7p1WZrr',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.aviso-cobranca' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/documentos-fiscais/aviso-cobranca',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@emitirAvisoCobranca',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@emitirAvisoCobranca',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.aviso-cobranca',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.aviso-cobranca-recibo' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/documentos-fiscais/{id}/aviso-cobranca-recibo',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@emitirAvisoCobrancaRecibo',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@emitirAvisoCobrancaRecibo',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.aviso-cobranca-recibo',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.nota-debito-autonoma' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/documentos-fiscais/nota-debito',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@criarNotaDebitoAutonoma',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@criarNotaDebitoAutonoma',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.nota-debito-autonoma',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.exportar-excel' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/documentos-fiscais/exportar-excel',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@exportarExcel',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@exportarExcel',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.exportar-excel',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.index' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/documentos-fiscais',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
          4 => 'log.panel',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@index',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@index',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.index',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.show' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/documentos-fiscais/{documento}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@show',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@show',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.show',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'documento' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.pdf-download' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/documentos-fiscais/{id}/pdf/download',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@downloadPdf',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@downloadPdf',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.pdf-download',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.pdf-viewer' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/documentos-fiscais/{id}/pdf-viewer',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@pdfViewer',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@pdfViewer',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.pdf-viewer',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.imprimir-termica' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/documentos-fiscais/{id}/imprimir-termica',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@imprimirTermica',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@imprimirTermica',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.imprimir-termica',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.print' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/documentos-fiscais/{id}/print-view',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@printView',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@printView',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.print',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.print-a4' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/documentos-fiscais/{id}/print-a4',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@pdfViewer',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@pdfViewer',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.print-a4',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.nota-credito' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/documentos-fiscais/{id}/nota-credito',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@criarNotaCredito',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@criarNotaCredito',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.nota-credito',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.nota-debito' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/documentos-fiscais/{id}/nota-debito',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@criarNotaDebito',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@criarNotaDebito',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.nota-debito',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.ver-nc-nd' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/documentos-fiscais/{id}/Ver_NC_ND',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@show',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@show',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.ver-nc-nd',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.converter-proforma' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/documentos-fiscais/{id}/converter-proforma',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@converterProforma',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@converterProforma',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.converter-proforma',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.recibos' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/documentos-fiscais/{documento}/recibos',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@listarRecibos',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@listarRecibos',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.recibos',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'documento' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.gerar-recibo' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/documentos-fiscais/{id}/recibo',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@gerarRecibo',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@gerarRecibo',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.gerar-recibo',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.estornar-recibo' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/documentos-fiscais/{id}/estorno',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@estornarRecibo',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@estornarRecibo',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.estornar-recibo',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.cancelar' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/documentos-fiscais/{documento}/cancelar',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@cancelar',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@cancelar',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.cancelar',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'documento' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'documentos.vincular' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/documentos-fiscais/{id}/vincular-adiantamento',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\DocumentoFiscalController@vincularAdiantamento',
        'controller' => 'App\\Http\\Controllers\\DocumentoFiscalController@vincularAdiantamento',
        'namespace' => NULL,
        'prefix' => 'api/documentos-fiscais',
        'where' => 
        array (
        ),
        'as' => 'documentos.vincular',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::lZsYPRdsc8ykHrsk' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/impressoras',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ImpressoraController@index',
        'controller' => 'App\\Http\\Controllers\\ImpressoraController@index',
        'namespace' => NULL,
        'prefix' => 'api/impressoras',
        'where' => 
        array (
        ),
        'as' => 'generated::lZsYPRdsc8ykHrsk',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::0ujeWFk7X8VFWmvA' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/impressoras/cups',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ImpressoraController@cupsDisponiveis',
        'controller' => 'App\\Http\\Controllers\\ImpressoraController@cupsDisponiveis',
        'namespace' => NULL,
        'prefix' => 'api/impressoras',
        'where' => 
        array (
        ),
        'as' => 'generated::0ujeWFk7X8VFWmvA',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::ERGyUOAz1jHjUAP4' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/impressoras',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ImpressoraController@store',
        'controller' => 'App\\Http\\Controllers\\ImpressoraController@store',
        'namespace' => NULL,
        'prefix' => 'api/impressoras',
        'where' => 
        array (
        ),
        'as' => 'generated::ERGyUOAz1jHjUAP4',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::x610vroLBjaz3NCs' => 
    array (
      'methods' => 
      array (
        0 => 'PATCH',
      ),
      'uri' => 'api/impressoras/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ImpressoraController@update',
        'controller' => 'App\\Http\\Controllers\\ImpressoraController@update',
        'namespace' => NULL,
        'prefix' => 'api/impressoras',
        'where' => 
        array (
        ),
        'as' => 'generated::x610vroLBjaz3NCs',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::W8FUbWaORyN8pEcu' => 
    array (
      'methods' => 
      array (
        0 => 'DELETE',
      ),
      'uri' => 'api/impressoras/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ImpressoraController@destroy',
        'controller' => 'App\\Http\\Controllers\\ImpressoraController@destroy',
        'namespace' => NULL,
        'prefix' => 'api/impressoras',
        'where' => 
        array (
        ),
        'as' => 'generated::W8FUbWaORyN8pEcu',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::uwMRS0EQLqoJeXyp' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/impressoras/{id}/default',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ImpressoraController@definirDefault',
        'controller' => 'App\\Http\\Controllers\\ImpressoraController@definirDefault',
        'namespace' => NULL,
        'prefix' => 'api/impressoras',
        'where' => 
        array (
        ),
        'as' => 'generated::uwMRS0EQLqoJeXyp',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::xeRjGLYFPk5otwGt' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/impressoras/selecionar',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ImpressoraController@selecionar',
        'controller' => 'App\\Http\\Controllers\\ImpressoraController@selecionar',
        'namespace' => NULL,
        'prefix' => 'api/impressoras',
        'where' => 
        array (
        ),
        'as' => 'generated::xeRjGLYFPk5otwGt',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::pVTyEQ3U3MyVxoVB' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/impressoras/testar',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\ImpressoraController@testar',
        'controller' => 'App\\Http\\Controllers\\ImpressoraController@testar',
        'namespace' => NULL,
        'prefix' => 'api/impressoras',
        'where' => 
        array (
        ),
        'as' => 'generated::pVTyEQ3U3MyVxoVB',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'pagamentos.index' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/pagamentos',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
          4 => 'log.panel',
        ),
        'uses' => 'App\\Http\\Controllers\\PagamentoController@index',
        'controller' => 'App\\Http\\Controllers\\PagamentoController@index',
        'namespace' => NULL,
        'prefix' => 'api/pagamentos',
        'where' => 
        array (
        ),
        'as' => 'pagamentos.index',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'pagamentos.store' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'api/pagamentos',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\PagamentoController@store',
        'controller' => 'App\\Http\\Controllers\\PagamentoController@store',
        'namespace' => NULL,
        'prefix' => 'api/pagamentos',
        'where' => 
        array (
        ),
        'as' => 'pagamentos.store',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'pagamentos.show' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/pagamentos/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\PagamentoController@show',
        'controller' => 'App\\Http\\Controllers\\PagamentoController@show',
        'namespace' => NULL,
        'prefix' => 'api/pagamentos',
        'where' => 
        array (
        ),
        'as' => 'pagamentos.show',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'pagamentos.update' => 
    array (
      'methods' => 
      array (
        0 => 'PUT',
      ),
      'uri' => 'api/pagamentos/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\PagamentoController@update',
        'controller' => 'App\\Http\\Controllers\\PagamentoController@update',
        'namespace' => NULL,
        'prefix' => 'api/pagamentos',
        'where' => 
        array (
        ),
        'as' => 'pagamentos.update',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'pagamentos.destroy' => 
    array (
      'methods' => 
      array (
        0 => 'DELETE',
      ),
      'uri' => 'api/pagamentos/{id}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\PagamentoController@destroy',
        'controller' => 'App\\Http\\Controllers\\PagamentoController@destroy',
        'namespace' => NULL,
        'prefix' => 'api/pagamentos',
        'where' => 
        array (
        ),
        'as' => 'pagamentos.destroy',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'id' => '[0-9a-fA-F-]{36}',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::WH9L5Le4P37DWMbw' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/relatorios/exportar-completo',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\RelatoriosController@exportarCompleto',
        'controller' => 'App\\Http\\Controllers\\RelatoriosController@exportarCompleto',
        'namespace' => NULL,
        'prefix' => 'api/relatorios',
        'where' => 
        array (
        ),
        'as' => 'generated::WH9L5Le4P37DWMbw',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'relatorios.debug' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/relatorios/debug',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\RelatoriosController@debug',
        'controller' => 'App\\Http\\Controllers\\RelatoriosController@debug',
        'namespace' => NULL,
        'prefix' => 'api/relatorios',
        'where' => 
        array (
        ),
        'as' => 'relatorios.debug',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'relatorios.dashboard' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/relatorios/dashboard',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
          4 => 'log.panel',
        ),
        'uses' => 'App\\Http\\Controllers\\RelatoriosController@dashboard',
        'controller' => 'App\\Http\\Controllers\\RelatoriosController@dashboard',
        'namespace' => NULL,
        'prefix' => 'api/relatorios',
        'where' => 
        array (
        ),
        'as' => 'relatorios.dashboard',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'relatorios.vendas' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/relatorios/vendas',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\RelatoriosController@vendas',
        'controller' => 'App\\Http\\Controllers\\RelatoriosController@vendas',
        'namespace' => NULL,
        'prefix' => 'api/relatorios',
        'where' => 
        array (
        ),
        'as' => 'relatorios.vendas',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'relatorios.compras' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/relatorios/compras',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\RelatoriosController@compras',
        'controller' => 'App\\Http\\Controllers\\RelatoriosController@compras',
        'namespace' => NULL,
        'prefix' => 'api/relatorios',
        'where' => 
        array (
        ),
        'as' => 'relatorios.compras',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'relatorios.faturacao' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/relatorios/faturacao',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\RelatoriosController@faturacao',
        'controller' => 'App\\Http\\Controllers\\RelatoriosController@faturacao',
        'namespace' => NULL,
        'prefix' => 'api/relatorios',
        'where' => 
        array (
        ),
        'as' => 'relatorios.faturacao',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'relatorios.stock' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/relatorios/stock',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\RelatoriosController@stock',
        'controller' => 'App\\Http\\Controllers\\RelatoriosController@stock',
        'namespace' => NULL,
        'prefix' => 'api/relatorios',
        'where' => 
        array (
        ),
        'as' => 'relatorios.stock',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'relatorios.movimentos-stock' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/relatorios/movimentos-stock',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\RelatoriosController@movimentosStock',
        'controller' => 'App\\Http\\Controllers\\RelatoriosController@movimentosStock',
        'namespace' => NULL,
        'prefix' => 'api/relatorios',
        'where' => 
        array (
        ),
        'as' => 'relatorios.movimentos-stock',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'relatorios.servicos' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/relatorios/servicos',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\RelatoriosController@servicos',
        'controller' => 'App\\Http\\Controllers\\RelatoriosController@servicos',
        'namespace' => NULL,
        'prefix' => 'api/relatorios',
        'where' => 
        array (
        ),
        'as' => 'relatorios.servicos',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'relatorios.retencoes' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/relatorios/retencoes',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\RelatoriosController@retencoes',
        'controller' => 'App\\Http\\Controllers\\RelatoriosController@retencoes',
        'namespace' => NULL,
        'prefix' => 'api/relatorios',
        'where' => 
        array (
        ),
        'as' => 'relatorios.retencoes',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'relatorios.documentos-fiscais' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/relatorios/documentos-fiscais',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\RelatoriosController@documentosFiscais',
        'controller' => 'App\\Http\\Controllers\\RelatoriosController@documentosFiscais',
        'namespace' => NULL,
        'prefix' => 'api/relatorios',
        'where' => 
        array (
        ),
        'as' => 'relatorios.documentos-fiscais',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'relatorios.proformas' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/relatorios/proformas',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\RelatoriosController@proformas',
        'controller' => 'App\\Http\\Controllers\\RelatoriosController@proformas',
        'namespace' => NULL,
        'prefix' => 'api/relatorios',
        'where' => 
        array (
        ),
        'as' => 'relatorios.proformas',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'relatorios.notas-correcao' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/relatorios/notas-correcao',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
        ),
        'uses' => 'App\\Http\\Controllers\\RelatoriosController@notasCorrecao',
        'controller' => 'App\\Http\\Controllers\\RelatoriosController@notasCorrecao',
        'namespace' => NULL,
        'prefix' => 'api/relatorios',
        'where' => 
        array (
        ),
        'as' => 'relatorios.notas-correcao',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'relatorios.pagamentos-pendentes' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/relatorios/pagamentos-pendentes',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
          4 => 'role:admin,gestor',
        ),
        'uses' => 'App\\Http\\Controllers\\RelatoriosController@pagamentosPendentes',
        'controller' => 'App\\Http\\Controllers\\RelatoriosController@pagamentosPendentes',
        'namespace' => NULL,
        'prefix' => 'api/relatorios',
        'where' => 
        array (
        ),
        'as' => 'relatorios.pagamentos-pendentes',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'relatorios.saft-alertas' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'api/relatorios/saft-alertas',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'api',
          1 => 'resolve.tenant',
          2 => 'auth.tenant',
          3 => 'role:admin,gestor,contablista,operador',
          4 => 'role:admin,gestor',
        ),
        'uses' => 'App\\Http\\Controllers\\RelatoriosController@saftAlertas',
        'controller' => 'App\\Http\\Controllers\\RelatoriosController@saftAlertas',
        'namespace' => NULL,
        'prefix' => 'api/relatorios',
        'where' => 
        array (
        ),
        'as' => 'relatorios.saft-alertas',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::gnR9IQBM5qqoa2e0' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'up',
      'action' => 
      array (
        'uses' => 'O:55:"Laravel\\SerializableClosure\\UnsignedSerializableClosure":1:{s:12:"serializable";O:46:"Laravel\\SerializableClosure\\Serializers\\Native":5:{s:3:"use";a:0:{}s:8:"function";s:854:"function () {
                    $exception = null;

                    try {
                        \\Illuminate\\Support\\Facades\\Event::dispatch(new \\Illuminate\\Foundation\\Events\\DiagnosingHealth);
                    } catch (\\Throwable $e) {
                        if (app()->hasDebugModeEnabled()) {
                            throw $e;
                        }

                        report($e);

                        $exception = $e->getMessage();
                    }

                    return response(\\Illuminate\\Support\\Facades\\View::file(\'/home/isidro-manuel/Sistema_de_fatura-o_mult_tenancy/backend/vendor/laravel/framework/src/Illuminate/Foundation/Configuration\'.\'/../resources/health-up.blade.php\', [
                        \'exception\' => $exception,
                    ]), status: $exception ? 500 : 200);
                }";s:5:"scope";s:54:"Illuminate\\Foundation\\Configuration\\ApplicationBuilder";s:4:"this";N;s:4:"self";s:32:"00000000000008ff0000000000000000";}}',
        'as' => 'generated::gnR9IQBM5qqoa2e0',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::ajLK3k5DbDifCdLJ' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'login',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'web',
          1 => 'web',
          2 => 'resolve.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\WebAuthController@login',
        'controller' => 'App\\Http\\Controllers\\WebAuthController@login',
        'namespace' => NULL,
        'prefix' => '',
        'where' => 
        array (
        ),
        'as' => 'generated::ajLK3k5DbDifCdLJ',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::LxVz7ANNfWp3A6tw' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'logout',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'web',
          1 => 'web',
          2 => 'resolve.tenant',
          3 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\WebAuthController@logout',
        'controller' => 'App\\Http\\Controllers\\WebAuthController@logout',
        'namespace' => NULL,
        'prefix' => '',
        'where' => 
        array (
        ),
        'as' => 'generated::LxVz7ANNfWp3A6tw',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::RxmhENOr09eediIu' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'me',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'web',
          1 => 'web',
          2 => 'resolve.tenant',
          3 => 'auth.tenant',
        ),
        'uses' => 'App\\Http\\Controllers\\WebAuthController@me',
        'controller' => 'App\\Http\\Controllers\\WebAuthController@me',
        'namespace' => NULL,
        'prefix' => '',
        'where' => 
        array (
        ),
        'as' => 'generated::RxmhENOr09eediIu',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::yp3IXVY9jbC5Kglr' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'teste-auth',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'web',
          1 => 'resolve.tenant',
        ),
        'uses' => 'O:55:"Laravel\\SerializableClosure\\UnsignedSerializableClosure":1:{s:12:"serializable";O:46:"Laravel\\SerializableClosure\\Serializers\\Native":5:{s:3:"use";a:0:{}s:8:"function";s:213:"function () {
    return \\response()->json([
        \'authenticated\' => \\auth()->guard(\'tenant\')->check(),
        \'user\' => \\auth()->guard(\'tenant\')->user(),
        \'session_id\' => \\session()->getId(),
    ]);
}";s:5:"scope";s:37:"Illuminate\\Routing\\RouteFileRegistrar";s:4:"this";N;s:4:"self";s:32:"000000000000088f0000000000000000";}}',
        'namespace' => NULL,
        'prefix' => '',
        'where' => 
        array (
        ),
        'as' => 'generated::yp3IXVY9jbC5Kglr',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::946mBAZ2XZVVKF3b' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => '{fallbackPlaceholder}',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'web',
        ),
        'uses' => 'O:55:"Laravel\\SerializableClosure\\UnsignedSerializableClosure":1:{s:12:"serializable";O:46:"Laravel\\SerializableClosure\\Serializers\\Native":5:{s:3:"use";a:0:{}s:8:"function";s:132:"function () {
    return \\response()->json([
        \'success\' => false,
        \'message\' => \'Rota não encontrada.\'
    ], 404);
}";s:5:"scope";s:37:"Illuminate\\Routing\\RouteFileRegistrar";s:4:"this";N;s:4:"self";s:32:"00000000000008220000000000000000";}}',
        'namespace' => NULL,
        'prefix' => '',
        'where' => 
        array (
        ),
        'as' => 'generated::946mBAZ2XZVVKF3b',
      ),
      'fallback' => true,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'fallbackPlaceholder' => '.*',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'generated::SyCpMLLBp9L3dVMe' => 
    array (
      'methods' => 
      array (
        0 => 'POST',
      ),
      'uri' => 'login/email-only',
      'action' => 
      array (
        'middleware' => 
        array (
          0 => 'web',
        ),
        'uses' => 'App\\Http\\Controllers\\WebAuthController@loginWithEmailOnly',
        'controller' => 'App\\Http\\Controllers\\WebAuthController@loginWithEmailOnly',
        'namespace' => NULL,
        'prefix' => '',
        'where' => 
        array (
        ),
        'as' => 'generated::SyCpMLLBp9L3dVMe',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'storage.local' => 
    array (
      'methods' => 
      array (
        0 => 'GET',
        1 => 'HEAD',
      ),
      'uri' => 'storage/{path}',
      'action' => 
      array (
        'uses' => 'O:55:"Laravel\\SerializableClosure\\UnsignedSerializableClosure":1:{s:12:"serializable";O:46:"Laravel\\SerializableClosure\\Serializers\\Native":5:{s:3:"use";a:3:{s:4:"disk";s:5:"local";s:6:"config";a:5:{s:6:"driver";s:5:"local";s:4:"root";s:80:"/home/isidro-manuel/Sistema_de_fatura-o_mult_tenancy/backend/storage/app/private";s:5:"serve";b:1;s:5:"throw";b:0;s:6:"report";b:0;}s:12:"isProduction";b:0;}s:8:"function";s:323:"function (\\Illuminate\\Http\\Request $request, string $path) use ($disk, $config, $isProduction) {
                    return (new \\Illuminate\\Filesystem\\ServeFile(
                        $disk,
                        $config,
                        $isProduction
                    ))($request, $path);
                }";s:5:"scope";s:47:"Illuminate\\Filesystem\\FilesystemServiceProvider";s:4:"this";N;s:4:"self";s:32:"000000000000081a0000000000000000";}}',
        'as' => 'storage.local',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'path' => '.*',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
    'storage.local.upload' => 
    array (
      'methods' => 
      array (
        0 => 'PUT',
      ),
      'uri' => 'storage/{path}',
      'action' => 
      array (
        'uses' => 'O:55:"Laravel\\SerializableClosure\\UnsignedSerializableClosure":1:{s:12:"serializable";O:46:"Laravel\\SerializableClosure\\Serializers\\Native":5:{s:3:"use";a:3:{s:4:"disk";s:5:"local";s:6:"config";a:5:{s:6:"driver";s:5:"local";s:4:"root";s:80:"/home/isidro-manuel/Sistema_de_fatura-o_mult_tenancy/backend/storage/app/private";s:5:"serve";b:1;s:5:"throw";b:0;s:6:"report";b:0;}s:12:"isProduction";b:0;}s:8:"function";s:325:"function (\\Illuminate\\Http\\Request $request, string $path) use ($disk, $config, $isProduction) {
                    return (new \\Illuminate\\Filesystem\\ReceiveFile(
                        $disk,
                        $config,
                        $isProduction
                    ))($request, $path);
                }";s:5:"scope";s:47:"Illuminate\\Filesystem\\FilesystemServiceProvider";s:4:"this";N;s:4:"self";s:32:"00000000000008180000000000000000";}}',
        'as' => 'storage.local.upload',
      ),
      'fallback' => false,
      'defaults' => 
      array (
      ),
      'wheres' => 
      array (
        'path' => '.*',
      ),
      'bindingFields' => 
      array (
      ),
      'lockSeconds' => NULL,
      'waitSeconds' => NULL,
      'withTrashed' => false,
    ),
  ),
)
);
