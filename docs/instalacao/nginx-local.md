# FATURA JÁ — CONFIGURAÇÃO DO NGINX NO AMBIENTE LOCAL

**Projecto:** FaturaJá — Sistema de Faturação Multi-Tenant  
**Ambiente:** Desenvolvimento local  
**Sistema operativo:** Zorin OS / Ubuntu  
**Servidor Web:** Nginx  
**Backend:** Laravel 12  
**Frontend:** Next.js  
**PHP:** PHP-FPM 8.5  
**Porta do Next.js:** 3000

---

## 1. Objectivo

Este documento descreve a configuração do Nginx utilizada no ambiente local do FaturaJá.

O Nginx funciona como servidor Web e proxy reverso, permitindo encaminhar os pedidos HTTP para os respectivos componentes da aplicação:

- Laravel: processamento da API, autenticação e operações do backend.
- Next.js: apresentação da interface e navegação do frontend.
- PHP-FPM: execução dos scripts PHP do Laravel.

A configuração permite utilizar o mesmo domínio local para aceder ao frontend e ao backend.

## 2. Arquitectura de comunicação

O fluxo de comunicação é organizado da seguinte forma:

```text
                    NAVEGADOR
                        |
                        |
                 NGINX - PORTA 80
                        |
             +----------+----------+
             |                     |
             |                     |
        PEDIDOS LARAVEL        PEDIDOS NEXT.JS
             |                     |
             |                     |
          PHP-FPM              PORTA 3000
             |                     |
             |                     |
         LARAVEL 12             NEXT.JS
             |                     |
             +----------+----------+
                        |
                     MYSQL
```

## 3. Configuração completa do Nginx

A configuração local utilizada pelo FaturaJá é a seguinte:

```nginx
upstream faturaja_next {
    server 127.0.0.1:3000;
}

map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    listen [::]:80;

    server_name app.factura-ja.localhost *.app.factura-ja.localhost
                app.factura-ja.ao        *.app.factura-ja.ao;

    root /home/isidro-manuel/Sistema_de_fatura-o_mult_tenancy/backend/public;
    index index.php;

    client_max_body_size 20M;

    # ── Laravel ──
    location ^~ /api/ {
        rewrite ^ /index.php last;
    }

    location = /sanctum/csrf-cookie {
        rewrite ^ /index.php last;
    }

    location = /me {
        rewrite ^ /index.php last;
    }

    location = /up {
        rewrite ^ /index.php last;
    }

    location ^~ /storage/ {
        try_files $uri =404;
    }

    # /login e /logout: POST → Laravel, GET → Next
    location = /login {
        error_page 418 = @laravel;
        if ($request_method = POST) { return 418; }
        try_files /dev/null @next;
    }

    location = /logout {
        error_page 418 = @laravel;
        if ($request_method = POST) { return 418; }
        try_files /dev/null @next;
    }

    location @laravel {
        rewrite ^ /index.php last;
    }

    location ~ ^/index\.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root/index.php;
        fastcgi_param SCRIPT_NAME     /index.php;
        fastcgi_pass unix:/run/php/php8.5-fpm.sock;
        fastcgi_read_timeout 300;
    }

    # ── Next.js ──
    location / {
        try_files /dev/null @next;
    }

    location @next {
        proxy_pass http://faturaja_next;
        proxy_http_version 1.1;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        $connection_upgrade;
    }

    location ~ /\.(?!well-known) {
        deny all;
    }
}
```

## 4. Explicação dos principais blocos

### 4.1. Upstream do Next.js

```nginx
upstream faturaja_next {
    server 127.0.0.1:3000;
}
```

Define um grupo de servidores denominado `faturaja_next`.

Neste caso, o grupo contém o servidor Next.js, que está disponível localmente na porta `3000`.

O Nginx utiliza este endereço para encaminhar os pedidos destinados ao frontend.

### 4.2. Configuração de WebSocket

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

Permite gerir os cabeçalhos necessários para ligações WebSocket.

É particularmente relevante para funcionalidades de comunicação persistente e mecanismos de actualização utilizados pelo ambiente de desenvolvimento do Next.js.

### 4.3. Porta e domínios

```nginx
listen 80;
listen [::]:80;
```

Permite receber ligações HTTP através de IPv4 e IPv6.

```nginx
server_name app.factura-ja.localhost *.app.factura-ja.localhost
            app.factura-ja.ao *.app.factura-ja.ao;
```

Define os nomes de domínio aceites por este bloco.

Inclui o domínio local e os respectivos subdomínios, bem como os domínios de produção.

**Nota:** aceitar estes nomes no Nginx não configura automaticamente o DNS nem os certificados HTTPS.

### 4.4. Directório público do Laravel

```nginx
root /home/isidro-manuel/Sistema_de_fatura-o_mult_tenancy/backend/public;
index index.php;
```

Indica o directório público do Laravel.

O Nginx utiliza este directório como raiz para os recursos públicos e para localizar o ponto de entrada `index.php`.

### 4.5. Limite de carregamento de ficheiros

```nginx
client_max_body_size 20M;
```

Define o tamanho máximo dos pedidos HTTP que contêm corpo de dados para 20 MB.

É relevante para carregamento de documentos, imagens e outros ficheiros utilizados pelo sistema.

### 4.6. Encaminhamento da API Laravel

```nginx
location ^~ /api/ {
    rewrite ^ /index.php last;
}
```

Encaminha os pedidos iniciados por `/api/` para o ponto de entrada do Laravel.

O Laravel recebe o pedido e executa o processamento através das suas rotas e controladores.

### 4.7. Autenticação com Sanctum

```nginx
location = /sanctum/csrf-cookie {
    rewrite ^ /index.php last;
}
```

Encaminha o pedido de obtenção do cookie CSRF para o Laravel Sanctum.

Também são encaminhados os seguintes caminhos:

```nginx
location = /me {
    rewrite ^ /index.php last;
}

location = /up {
    rewrite ^ /index.php last;
}
```

Estes caminhos são tratados pelo backend.

### 4.8. Ficheiros públicos

```nginx
location ^~ /storage/ {
    try_files $uri =404;
}
```

Permite servir ficheiros existentes no caminho `/storage/`.

Caso o ficheiro solicitado não exista, o Nginx devolve o erro HTTP 404.

### 4.9. Encaminhamento de login e logout

```nginx
location = /login {
    error_page 418 = @laravel;
    if ($request_method = POST) { return 418; }
    try_files /dev/null @next;
}
```

A configuração distingue os pedidos de login de acordo com o método HTTP:

- `POST /login`: encaminhado para o Laravel.
- `GET /login`: encaminhado para o Next.js.

O mesmo princípio é aplicado ao endpoint `/logout`.

Esta separação permite que o frontend apresente as páginas de autenticação, enquanto o backend processa as operações correspondentes.

### 4.10. Processamento PHP-FPM

```nginx
location ~ ^/index\.php$ {
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root/index.php;
    fastcgi_param SCRIPT_NAME /index.php;
    fastcgi_pass unix:/run/php/php8.5-fpm.sock;
    fastcgi_read_timeout 300;
}
```

Este bloco estabelece a comunicação entre o Nginx e o PHP-FPM.

Principais directivas:

- `include fastcgi_params`: carrega os parâmetros FastCGI.
- `SCRIPT_FILENAME`: identifica o ficheiro PHP que será executado.
- `SCRIPT_NAME`: define o nome do script.
- `fastcgi_pass`: indica o socket Unix do PHP-FPM.
- `fastcgi_read_timeout`: define o tempo máximo de espera pela resposta do PHP-FPM.

**Atenção:** o socket `/run/php/php8.5-fpm.sock` deve existir no sistema local. Caso esteja instalada outra versão do PHP-FPM, será necessário ajustar este caminho.

### 4.11. Encaminhamento do Next.js

```nginx
location / {
    try_files /dev/null @next;
}
```

Encaminha os pedidos que não são tratados pelas regras anteriores para o frontend Next.js.

O encaminhamento é efectuado através do bloco `@next`.

```nginx
location @next {
    proxy_pass http://faturaja_next;
    proxy_http_version 1.1;
}
```

O Nginx utiliza o proxy reverso para comunicar com o servidor Next.js na porta `3000`.

Os restantes cabeçalhos configurados permitem encaminhar informações sobre o host, o endereço IP do cliente, o protocolo original e as ligações WebSocket.

### 4.12. Protecção de ficheiros ocultos

```nginx
location ~ /\.(?!well-known) {
    deny all;
}
```

Impede o acesso directo a ficheiros e directórios ocultos, como ficheiros de configuração iniciados por ponto.

A excepção `.well-known` permite preservar caminhos utilizados por determinados mecanismos de validação e certificados.

---

## 5. Instalação da configuração local

### 5.1. Criar o ficheiro de configuração

```bash
sudo nano /etc/nginx/sites-available/faturaja
```

Colocar a configuração apresentada na secção 3.

### 5.2. Activar o site

```bash
sudo ln -s /etc/nginx/sites-available/faturaja \
/etc/nginx/sites-enabled/faturaja
```

Se o link já existir, não é necessário recriá-lo.

### 5.3. Validar a configuração

```bash
sudo nginx -t
```

O resultado esperado é semelhante a:

```text
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5.4. Reiniciar o Nginx

```bash
sudo systemctl reload nginx
```

Para verificar o estado:

```bash
sudo systemctl status nginx
```

---

## 6. Executar os serviços localmente

O Nginx depende de dois serviços principais para disponibilizar a aplicação.

### Backend Laravel

```bash
cd ~/Sistema_de_fatura-o_mult_tenancy/backend

php artisan serve --host=127.0.0.1 --port=8000
```

**Nota:** este comando é apenas um exemplo de execução local. A configuração Nginx apresentada utiliza PHP-FPM directamente através do socket, não encaminha o Laravel para a porta 8000.

### Frontend Next.js

```bash
cd ~/Sistema_de_fatura-o_mult_tenancy/frontend

npm run dev -- --hostname 127.0.0.1 --port 3000
```

O Next.js ficará disponível na porta `3000`, que corresponde ao endereço definido no bloco `upstream`.

---

## 7. Verificação e diagnóstico

Para verificar se o Nginx está activo:

```bash
sudo systemctl status nginx
```

Para verificar o PHP-FPM:

```bash
sudo systemctl status php8.5-fpm
```

Para verificar se o Next.js está a escutar na porta 3000:

```bash
sudo ss -lntp | grep ':3000'
```

Para verificar o socket PHP-FPM:

```bash
ls -l /run/php/php8.5-fpm.sock
```

Para consultar os erros do Nginx:

```bash
sudo tail -f /var/log/nginx/error.log
```

Para consultar os pedidos recebidos:

```bash
sudo tail -f /var/log/nginx/access.log
```

---

## 8. Considerações técnicas

1. O caminho `root` deve corresponder ao directório real do backend no computador.
2. O socket PHP-FPM deve corresponder à versão efectivamente instalada.
3. O Next.js deve estar activo na porta `3000`.
4. O Nginx deve ter permissões para aceder aos ficheiros públicos do Laravel.
5. O domínio local deve resolver correctamente para o endereço da máquina.
6. A configuração apresentada utiliza HTTP na porta 80, não HTTPS.
7. Esta configuração é destinada ao ambiente local e não deve ser copiada directamente para produção sem revisão.

## 9. Conclusão

O Nginx desempenha um papel central na integração entre o frontend Next.js e o backend Laravel do FaturaJá.

Através do encaminhamento de pedidos, da comunicação com PHP-FPM e da utilização de proxy reverso, torna possível disponibilizar os diferentes componentes da aplicação através de uma estrutura de acesso unificada.

A configuração também estabelece a base de comunicação necessária para o funcionamento da arquitectura multi-tenant, devendo ser complementada pelas configurações de domínio, autenticação, sessões e isolamento de empresas.