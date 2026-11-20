# FATURA JÁ — DOCUMENTAÇÃO DE IMPLANTAÇÃO EM PRODUÇÃO

**Documento:** Guia técnico de configuração e deployment  
**Projecto:** FaturaJá — Sistema de Faturação Multi-Tenant  
**Ambiente de desenvolvimento:** Zorin OS / Ubuntu  
**Ambiente de produção:** Servidor dedicado Ubuntu  
**Domínio principal:** `app.factura-ja.ao`  
**Domínio dos tenants:** `{empresa}.app.factura-ja.ao`

---

# 1. Objectivo

Este documento estabelece os procedimentos necessários para preparar e publicar o FaturaJá num servidor dedicado.

A implantação deverá preservar a arquitectura existente, composta por:

- Backend Laravel.
- Frontend Next.js.
- Base de dados MySQL.
- Arquitectura multi-tenant híbrida.
- Autenticação com Laravel Sanctum.
- Nginx como servidor Web e proxy reverso.
- PHP-FPM para executar o Laravel.
- HTTPS para o domínio principal e os subdomínios dos tenants.

**Regra fundamental:** o ambiente de produção deve ser configurado separadamente do ambiente local. Não se devem substituir indiscriminadamente as configurações de desenvolvimento.

# 2. Arquitectura da aplicação

## 2.1. Organização dos componentes

| Componente | Tecnologia | Responsabilidade |
|---|---|---|
| Frontend | Next.js | Interface do utilizador |
| Backend | Laravel 12 | API e regras de negócio |
| Autenticação | Sanctum 4 | Sessões e autenticação |
| Base de dados | MySQL | Armazenamento de dados |
| Servidor Web | Nginx | Recepção e encaminhamento dos pedidos |
| PHP | PHP-FPM | Execução do backend |
| Runtime frontend | Node.js | Execução do Next.js |

## 2.2. Arquitectura multi-tenant

O FaturaJá utiliza dois modos de armazenamento:

**Modo colectivo (`colectivo`)**

- Várias empresas partilham uma base de dados.
- Os registos são identificados pelo campo `tenant_id`.
- O middleware deve garantir o isolamento dos dados de cada empresa.

**Modo singular (`singular`)**

- Cada empresa possui uma base de dados própria.
- A ligação à base de dados é configurada dinamicamente.
- O middleware selecciona a ligação correspondente à empresa.

A resolução do tenant é efectuada pelo middleware `ResolveTenant`.

## 2.3. Domínios de produção

| Finalidade | Domínio |
|---|---|
| Aplicação principal | `https://app.factura-ja.ao` |
| Tenant da empresa A | `https://empresa-a.app.factura-ja.ao` |
| Tenant da empresa B | `https://empresa-b.app.factura-ja.ao` |
| API do tenant | Mesmo domínio do tenant |
| API do Landlord | Domínio principal |

O frontend utiliza o domínio actual do navegador para efectuar os pedidos do tenant. A API do Landlord utiliza o domínio principal.

# 3. Estrutura de directórios

A estrutura actualmente utilizada no desenvolvimento é:

```text
Sistema_de_fatura-o_mult_tenancy/
│
├── backend/
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   ├── public/
│   ├── routes/
│   ├── storage/
│   ├── vendor/
│   ├── .env
│   └── artisan
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── services/
│   ├── public/
│   ├── package.json
│   └── .env.local
│
└── deploy/
    └── nginx/
        └── faturaja.conf
```

Em produção, recomenda-se utilizar uma estrutura própria, por exemplo:

```text
/var/www/faturaja/
│
├── backend/
├── frontend/
└── deploy/
```

O caminho definitivo deve ser escolhido durante a preparação do servidor.

# 4. Ficheiros que precisam de configuração

Existem dois ambientes principais:

1. Backend Laravel.
2. Frontend Next.js.

As variáveis de ambiente devem ser configuradas nos respectivos projectos.

## 4.1. Backend Laravel

**Ficheiro:** `backend/.env`

É neste ficheiro que devem ser alteradas as configurações do ambiente Laravel.

### Configuração da aplicação

| Variável | Desenvolvimento | Produção |
|---|---|---|
| `APP_ENV` | `local` | `production` |
| `APP_DEBUG` | `true` | `false` |
| `APP_URL` | `http://app.factura-ja.localhost` | `https://app.factura-ja.ao` |
| `APP_DOMAIN` | `app.factura-ja.localhost` | `app.factura-ja.ao` |
| `FRONTEND_URL` | `http://app.factura-ja.localhost` | `https://app.factura-ja.ao` |
| `FRONTEND_SCHEME` | `http` | `https` |

Exemplo de produção:

```env
APP_NAME=FaturaJa
APP_ENV=production
APP_DEBUG=false

APP_URL=https://app.factura-ja.ao
APP_DOMAIN=app.factura-ja.ao

FRONTEND_URL=https://app.factura-ja.ao
FRONTEND_SCHEME=https
```

**Atenção:** não gerar uma nova `APP_KEY` se a aplicação já tiver dados cifrados ou sessões que dependam da chave anterior. A chave deve ser preservada e protegida.

### Configuração da base de dados

No mesmo ficheiro:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=NOME_DA_BASE_LANDLORD
DB_USERNAME=UTILIZADOR_DA_BASE
DB_PASSWORD=PALAVRA_PASSE_SEGURA
```

Os valores devem corresponder à base de dados criada no servidor.

Se as bases de dados dos tenants estiverem no mesmo servidor MySQL, a configuração dinâmica de cada tenant deverá continuar a utilizar as credenciais e os nomes de bases de dados adequados.

Não colocar credenciais reais neste documento ou no repositório Git.

### Configuração de sessões

No ficheiro `backend/.env`:

```env
SESSION_DRIVER=database
SESSION_LIFETIME=120

SESSION_DOMAIN=.app.factura-ja.ao
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
SESSION_PATH=/
```

O domínio com ponto inicial permite partilhar o cookie entre o domínio principal e os subdomínios.

O driver `database` é uma opção de produção, desde que a tabela de sessões exista e esteja correctamente migrada.

Se a aplicação utilizar outro driver, manter a decisão arquitectural e validar a respectiva configuração antes da mudança.

### Configuração do Sanctum

No ficheiro `backend/.env`:

```env
SANCTUM_STATEFUL_DOMAINS=app.factura-ja.ao,*.app.factura-ja.ao
```

Esta configuração identifica os domínios considerados aplicações frontend de primeira parte.

A versão instalada no desenvolvimento é Sanctum 4.3.2. O código verificado utiliza `Str::is()` para comparar os domínios, pelo que o padrão wildcard é compatível com a lógica observada.

Deve ser testado em produção com pedidos reais de autenticação e cookies.

### Configuração de CORS

**Ficheiro:** `backend/config/cors.php`

Actualmente, o desenvolvimento permite origens locais.

Em produção, devem ser acrescentadas origens HTTPS correspondentes ao domínio principal e aos subdomínios dos tenants.

Exemplo de orientação:

```php
'allowed_origins' => [
    'https://app.factura-ja.ao',
],

'allowed_origins_patterns' => [
    '#^https://[a-z0-9-]+\.app\.factura-ja\.ao$#',
],

'supports_credentials' => true,
```

Esta é uma referência de configuração, não uma substituição integral do ficheiro.

Manter os restantes parâmetros necessários à aplicação, incluindo os caminhos de API, métodos e cabeçalhos utilizados.

Não utilizar `Access-Control-Allow-Origin: *` quando são utilizadas credenciais e cookies.

### Configuração de armazenamento

Verificar:

```env
FILESYSTEM_DISK=public
```

Confirmar que o armazenamento público está correctamente ligado e que os ficheiros enviados pelas empresas são persistidos no servidor.

Os documentos, logótipos, PDFs e restantes ficheiros importantes não devem depender de armazenamento temporário.

### Configuração de email

Se a aplicação enviar emails de recuperação de senha, notificações ou mensagens:

```env
MAIL_MAILER=smtp
MAIL_HOST=SERVIDOR_SMTP
MAIL_PORT=587
MAIL_USERNAME=UTILIZADOR_SMTP
MAIL_PASSWORD=PALAVRA_PASSE_SMTP
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=EMAIL_DA_APLICACAO
MAIL_FROM_NAME="${APP_NAME}"
```

Substituir os valores pelos dados do serviço de email escolhido.

# 5. Frontend Next.js

**Ficheiro:** `frontend/.env.production`

Criar ou actualizar o ficheiro de ambiente de produção.

Variáveis importantes:

```env
NEXT_PUBLIC_APP_DOMAIN=app.factura-ja.ao
NEXT_PUBLIC_API_URL=https://app.factura-ja.ao
```

O frontend utiliza estas variáveis em `frontend/services/axios.ts`.

### Comportamento das APIs

A aplicação tem duas instâncias principais:

**tenantApi**

- Utiliza o hostname actual do navegador.
- Num tenant, os pedidos permanecem no subdomínio da empresa.
- Permite resolver o contexto da empresa pelo subdomínio.

**landlordApi**

- Utiliza o domínio principal.
- Serve as operações administrativas do Landlord.

A estratégia actual deve ser preservada. Não se deve configurar todas as chamadas para um único endereço fixo sem antes rever o funcionamento da autenticação e da resolução de tenants.

### Importante sobre Next.js

As variáveis `NEXT_PUBLIC_*` são incorporadas no build do frontend.

Sempre que forem alteradas, é necessário gerar novamente a versão de produção:

```bash
cd frontend

npm install
npm run build
```

Depois, reiniciar o serviço Next.js.

# 6. Configuração do Nginx

**Ficheiro de desenvolvimento actual:**

```text
deploy/nginx/faturaja.conf
```

Este ficheiro contém a configuração local e referências aos domínios de desenvolvimento e produção.

Para evitar conflitos, recomenda-se criar um ficheiro independente:

```text
deploy/nginx/faturaja.production.conf
```

A configuração de produção deve contemplar:

1. Redireccionamento HTTP para HTTPS.
2. Certificado TLS para o domínio principal.
3. Certificado TLS wildcard para os subdomínios.
4. Encaminhamento das rotas Laravel para PHP-FPM.
5. Encaminhamento das páginas Next.js para Node.js.
6. Limite de upload.
7. Cabeçalhos de proxy.
8. Protecção de ficheiros ocultos.
9. Persistência e acesso aos ficheiros públicos.

### Directivas importantes

O Nginx deverá reconhecer:

```nginx
server_name app.factura-ja.ao *.app.factura-ja.ao;
```

A aplicação Next.js deverá estar acessível internamente:

```nginx
proxy_pass http://127.0.0.1:3000;
```

O Laravel deverá utilizar o socket PHP-FPM existente no servidor.

Exemplo:

```nginx
fastcgi_pass unix:/run/php/php8.5-fpm.sock;
```

O caminho acima é apenas um exemplo baseado no ambiente de desenvolvimento. No servidor dedicado, confirmar a versão PHP-FPM e o socket efectivamente instalado.

**Não publicar o ficheiro local sem rever as directivas de produção, os certificados, os caminhos e as permissões.**

# 7. DNS e domínio

No fornecedor responsável pelo domínio `factura-ja.ao`, devem ser criados os registos DNS necessários.

| Tipo | Nome | Destino |
|---|---|---|
| A | `app` | IP público do servidor |
| A ou CNAME | `*.app` | IP público ou destino do servidor |

O registo wildcard deverá encaminhar os subdomínios dos tenants para o mesmo servidor.

A configuração final depende do fornecedor DNS.

# 8. Certificados HTTPS

A produção deve utilizar HTTPS.

É necessário obter certificados para:

```text
app.factura-ja.ao
*.app.factura-ja.ao
```

Um certificado wildcard normalmente exige validação DNS-01.

O servidor deverá renovar os certificados automaticamente e o Nginx deverá carregar os respectivos ficheiros.

Não utilizar certificados de desenvolvimento em produção.

# 9. Middleware e autenticação

Os ficheiros relevantes são:

```text
backend/bootstrap/app.php

backend/app/Http/Middleware/ResolveTenant.php

backend/app/Http/Middleware/AuthTenant.php

backend/app/Http/Middleware/EnsureTenantConnection.php

backend/app/Http/Controllers/WebAuthController.php
```

### ResolveTenant

Responsável por:

- Identificar o subdomínio.
- Encontrar a empresa no Landlord.
- Validar o estado da empresa.
- Resolver o modo colectivo ou singular.
- Configurar a ligação à base de dados.
- Definir o contexto da empresa.

### AuthTenant

Responsável por:

- Confirmar a autenticação.
- Validar se a sessão pertence à empresa do pedido.
- Impedir que uma sessão de uma empresa seja utilizada noutra empresa.

### EnsureTenantConnection

Responsável por verificar a ligação e a autorização do utilizador no contexto do tenant.

### Atenção antes da produção

No `bootstrap/app.php` existem os seguintes aliases:

```php
'tenant.auth' => EnsureTenantConnection::class,
'auth.tenant' => AuthTenant::class,
```

As rotas analisadas utilizam `auth.tenant`.

Antes de publicar, deve ser validado se todas as regras de autorização necessárias estão efectivamente cobertas por esse middleware, especialmente o acesso de utilizadores com vínculo a várias empresas.

Também deve ser verificado se todas as rotas sensíveis estão protegidas.

# 10. Preparação do servidor dedicado

O servidor deverá ter, no mínimo, os seguintes componentes:

- Ubuntu Server LTS.
- Nginx.
- PHP e extensões exigidas pelo Laravel.
- PHP-FPM.
- Composer.
- Node.js numa versão compatível com o projecto.
- MySQL.
- Certbot ou mecanismo equivalente de certificados.
- Git.
- Firewall configurada.

### Portas

| Porta | Serviço | Acesso |
|---|---|---|
| 22 | SSH | Administração controlada |
| 80 | HTTP | Público |
| 443 | HTTPS | Público |
| 3306 | MySQL | Apenas interno |
| 3000 | Next.js | Apenas localhost |
| 9000 ou socket | PHP-FPM | Interno |

Não expor directamente o MySQL ou o Next.js à Internet.

# 11. Deploy da aplicação

## 11.1. Preparação

1. Preparar o sistema operativo.
2. Instalar as dependências.
3. Criar o utilizador de execução da aplicação.
4. Preparar as bases de dados.
5. Configurar permissões.
6. Configurar DNS.
7. Instalar certificados.
8. Configurar Nginx.

## 11.2. Backend

Na pasta `backend`:

```bash
composer install --no-dev --optimize-autoloader
```

Configurar o `.env` de produção e verificar as credenciais.

Depois:

```bash
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Antes de executar migrations, fazer backup e verificar o estado das bases de dados.

Não executar migrations de forma indiscriminada numa base de dados que já contém dados de produção.

## 11.3. Frontend

Na pasta `frontend`:

```bash
npm install
npm run build
```

O Next.js deve funcionar como serviço persistente, por exemplo através de systemd.

O serviço deverá reiniciar automaticamente após reinicializações do servidor.

## 11.4. Nginx

Depois de criar a configuração de produção:

```bash
sudo nginx -t
```

Se a validação for bem-sucedida:

```bash
sudo systemctl reload nginx
```

# 12. Variáveis que devem ser alteradas na passagem para produção

| Localização | O que alterar |
|---|---|
| `backend/.env` | Ambiente, domínio, URL, base de dados, sessões, Sanctum, email |
| `frontend/.env.production` | Domínio principal e URL de fallback da API |
| `backend/config/cors.php` | Origens autorizadas de produção |
| `backend/config/session.php` | Confirmar domínio e segurança dos cookies |
| `backend/config/sanctum.php` | Confirmar domínios stateful |
| `backend/config/app.php` | Confirmar utilização das variáveis de ambiente |
| `deploy/nginx/faturaja.production.conf` | Domínios, caminhos, PHP-FPM, TLS e proxy |
| DNS do domínio | IP público e wildcard |
| Serviço systemd | Caminho do projecto e execução do Next.js |

Não é necessário modificar o código-fonte apenas para trocar os domínios se as configurações estiverem correctamente parametrizadas.

# 13. Segurança e backups

Antes da publicação:

- Desactivar `APP_DEBUG`.
- Proteger o ficheiro `.env`.
- Não publicar chaves privadas no Git.
- Utilizar credenciais fortes.
- Restringir o acesso SSH.
- Activar firewall.
- Não expor a porta MySQL.
- Garantir permissões correctas em `storage` e `bootstrap/cache`.
- Configurar backups automáticos.
- Testar a recuperação de backups.
- Proteger os certificados e as chaves fiscais.
- Rever os logs de autenticação e acesso entre tenants.

Os backups devem abranger:

1. Base de dados Landlord.
2. Bases de dados dos tenants.
3. Documentos e ficheiros enviados.
4. Chaves e configurações fiscais necessárias.
5. Configurações importantes do servidor.

Os backups devem ser guardados também fora do servidor principal.

# 14. Testes obrigatórios após publicação

| Teste | Resultado esperado |
|---|---|
| Abrir domínio principal | Frontend carregado |
| Abrir subdomínio de tenant | Empresa correcta identificada |
| Login no Landlord | Autenticação funcional |
| Login no tenant | Sessão correctamente criada |
| Consultar `/api/me` | Utilizador correcto |
| Criar produto | Registo no tenant correcto |
| Criar venda | Dados isolados por empresa |
| Emitir documento fiscal | Documento persistido correctamente |
| Upload de logótipo | Ficheiro acessível |
| Logout | Sessão terminada |
| Acesso entre tenants | Bloqueado sem autorização |
| HTTPS | Certificado válido |
| Reiniciar servidor | Serviços recuperam automaticamente |

# 15. Plano de reversão

Em caso de falha:

1. Suspender novas operações, quando necessário.
2. Guardar os logs do erro.
3. Restaurar a versão anterior do código.
4. Restaurar backups apenas se a integridade dos dados exigir.
5. Repor a configuração anterior do Nginx.
6. Reiniciar os serviços.
7. Testar autenticação e acesso aos tenants.

Nunca substituir uma base de dados de produção por uma cópia de desenvolvimento.

# 16. Pendências antes da implantação definitiva

Os seguintes pontos ainda devem ser confirmados no servidor dedicado:

- IP público e hostname do servidor.
- Versão exacta do Ubuntu.
- Versão de PHP e socket PHP-FPM.
- Versão de Node.js.
- Versão de MySQL.
- Caminho definitivo da aplicação.
- Nome e credenciais das bases de dados.
- Estratégia de backup.
- Serviço de email.
- Fornecedor DNS.
- Certificado TLS.
- Configuração final do CORS.
- Testes de isolamento e autorização entre tenants.
- Comportamento das sessões e cookies em HTTPS.
- Configuração de proxies confiáveis, caso exista um proxy externo.

# 17. Conclusão

A implantação do FaturaJá deverá manter a arquitectura multi-tenant existente, separando claramente as configurações de desenvolvimento e produção.

A principal mudança na passagem para produção será a configuração dos domínios, credenciais, sessões, CORS, certificados, serviços e caminhos do servidor.

O código da aplicação deverá ser alterado apenas quando as verificações técnicas demonstrarem essa necessidade.

**Princípio de implantação:** primeiro preparar, depois validar, efectuar backup e só então publicar.