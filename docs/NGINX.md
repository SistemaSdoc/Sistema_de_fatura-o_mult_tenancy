# FaturaJá — Nginx, domínios e variáveis de ambiente

Um só host serve frontend (Next.js :3000) e backend (Laravel via PHP-FPM).

    http://app.factura-ja.localhost        -> landlord
    http://acme.app.factura-ja.localhost   -> tenant "acme"
    (produção: app.factura-ja.ao e *.app.factura-ja.ao)

## Quem responde a quê

| Pedido                                              | Destino  |
|-----------------------------------------------------|----------|
| /api/*, /sanctum/csrf-cookie, /me, /up, /storage/*  | Laravel  |
| POST /login, POST /logout                           | Laravel  |
| GET /login, GET /logout e todo o resto (/_next/*)   | Next.js  |

O ficheiro de referência está em deploy/nginx/faturaja.conf.

## Variáveis de ambiente (têm de bater certo)

Backend (backend/.env):

    APP_URL=http://app.factura-ja.localhost
    APP_DOMAIN=app.factura-ja.localhost      # lido por config('app.domain')
    FRONTEND_URL="http://app.factura-ja.localhost"
    FRONTEND_SCHEME=http                     # https em produção
    FRONTEND_PORT=                           # vazio com Nginx na 80/443
    SESSION_DOMAIN=.app.factura-ja.localhost # ponto inicial: partilha cookie com os subdomínios
    SANCTUM_STATEFUL_DOMAINS=app.factura-ja.localhost,acme.app.factura-ja.localhost

Frontend (frontend/.env.local):

    NEXT_PUBLIC_APP_DOMAIN=app.factura-ja.localhost
    NEXT_PUBLIC_API_URL=http://app.factura-ja.localhost

Em produção troque apenas o domínio por app.factura-ja.ao e FRONTEND_SCHEME=https.
As variáveis NEXT_PUBLIC_* só são lidas no arranque: reinicie o `npm run dev`.

## Instalação local (Ubuntu)

    sudo cp deploy/nginx/faturaja.conf /etc/nginx/sites-available/faturaja
    sudo ln -sf /etc/nginx/sites-available/faturaja /etc/nginx/sites-enabled/faturaja
    sudo nginx -t && sudo systemctl reload nginx

Ajustar no ficheiro: `root` (pasta backend/public) e `fastcgi_pass` (ls /run/php/).
Permissões: o utilizador www-data precisa de x nas pastas do caminho e
escrita em backend/storage e backend/bootstrap/cache.

Depois de alterar .env ou config: php artisan config:clear

## Hosts

*.localhost resolve sozinho nos navegadores. Se não abrir, acrescente em /etc/hosts
(não aceita wildcard, um por tenant):

    127.0.0.1 app.factura-ja.localhost acme.app.factura-ja.localhost

## Problemas comuns

- 502 em /            : Next.js não está a correr (cd frontend && npm run dev)
- 500 em /up          : ver backend/storage/logs/laravel.log
- Redirect para https://tenant./  : APP_DOMAIN / FRONTEND_SCHEME em falta no .env
- "Empresa não encontrada"        : o subdomínio não existe na base faturaja_landlord
- Logs do Nginx: sudo tail -f /var/log/nginx/error.log
