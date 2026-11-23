# Instalação do Backend — FaturaJá

## 1. Introdução

Este documento apresenta os procedimentos necessários para instalar, configurar e executar o backend do FaturaJá.

O backend é desenvolvido com Laravel e PHP, sendo responsável pela lógica de negócio, autenticação, gestão de utilizadores, processamento de documentos fiscais, gestão de stock e comunicação com a base de dados.

## 2. Objectivos

- Preparar o ambiente de execução do Laravel.
- Instalar as dependências PHP.
- Configurar as variáveis de ambiente.
- Preparar a ligação ao MySQL.
- Executar as migrações necessárias.
- Iniciar e testar a API.

## 3. Pré-requisitos

Antes da instalação, o técnico deverá possuir:

- PHP numa versão compatível com o projecto.
- Composer.
- MySQL.
- Git.
- Extensões PHP exigidas pelas dependências.
- Acesso ao código-fonte do FaturaJá.

As versões exactas devem ser confirmadas nos ficheiros `composer.json` e `composer.lock`.

## 4. Obter o código-fonte

Se o repositório ainda não estiver disponível localmente:

```bash
git clone <URL_DO_REPOSITORIO>
```

Entrar na pasta do backend:

```bash
cd Sistema_de_fatura-o_mult_tenancy/backend
```

## 5. Verificar os requisitos PHP

Verificar a versão instalada:

```bash
php -v
```

Verificar as extensões:

```bash
php -m
```

Verificar a instalação do Composer:

```bash
composer --version
```

A versão do PHP deverá satisfazer os requisitos definidos pelo projecto e pelas respectivas dependências.

## 6. Instalar as dependências

Executar:

```bash
composer install
```

Este comando instala as dependências declaradas no `composer.lock`, garantindo maior consistência entre os ambientes dos programadores.

Em produção, utilizar:

```bash
composer install --no-dev --optimize-autoloader
```

Não executar o Composer como utilizador root.

## 7. Configurar o ambiente

Verificar se existe um ficheiro de exemplo:

```bash
ls -la .env*
```

Se existir `.env.example`, criar o ambiente local:

```bash
cp .env.example .env
```

O ficheiro `.env` deverá conter as configurações necessárias para o ambiente.

Exemplo de configuração MySQL:

```env
APP_NAME=FaturaJa
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=faturaja_landlord
DB_USERNAME=faturaja_user
DB_PASSWORD=SUBSTITUIR_POR_SEGREDO
```

Os nomes e valores deverão ser ajustados à configuração real do projecto.

## 8. Gerar a chave da aplicação

Para uma instalação local nova:

```bash
php artisan key:generate
```

A chave gerada é utilizada pelo Laravel para funcionalidades de segurança e encriptação.

Não gerar uma nova chave numa instalação existente sem avaliar as consequências para os dados e sessões.

## 9. Configurar a base de dados

Criar previamente a base de dados e o utilizador MySQL com privilégios adequados.

Depois de configurar o `.env`, verificar a ligação através de uma operação de teste.

Consultar o estado das migrações:

```bash
php artisan migrate:status
```

Executar as migrações em desenvolvimento:

```bash
php artisan migrate
```

As migrações devem ser revistas antes da execução, principalmente quando existem várias bases de dados e ligações dinâmicas para tenants.

## 10. Preparar permissões

O Laravel necessita de permissões de escrita nas pastas:

```text
storage/
bootstrap/cache/
```

Em Linux, as permissões devem ser atribuídas ao utilizador responsável pela execução da aplicação.

Não utilizar permissões globais como `chmod -R 777`.

## 11. Limpar e preparar as configurações

Em ambiente local:

```bash
php artisan optimize:clear
```

Este comando limpa caches de configuração, rotas, views e outros elementos de optimização.

## 12. Executar o backend

Iniciar o servidor de desenvolvimento:

```bash
php artisan serve
```

Por padrão, o Laravel disponibiliza o servidor em:

```text
http://127.0.0.1:8000
```

A porta efectiva poderá ser diferente, dependendo da configuração.

## 13. Verificar o funcionamento

Executar verificações:

```bash
php artisan about
php artisan route:list
php artisan migrate:status
```

Confirmar:

- O Laravel inicia sem erros.
- A ligação MySQL funciona.
- As rotas da API estão disponíveis.
- A autenticação funciona.
- O middleware de resolução do tenant funciona.
- As permissões de ficheiros estão correctas.

## 14. Problemas frequentes

### Erro de extensão PHP

Verificar as extensões necessárias:

```bash
php -m
```

Instalar as extensões em falta de acordo com a versão PHP utilizada.

### Erro de ligação MySQL

Verificar:

- Serviço MySQL activo.
- Host e porta.
- Nome da base de dados.
- Utilizador e palavra-passe.
- Privilégios de acesso.

### Erro de permissões

Verificar as permissões de `storage` e `bootstrap/cache`.

### Erro de dependências Composer

Consultar os requisitos:

```bash
composer check-platform-reqs
```

## 15. Boas práticas

- Utilizar `composer install` em vez de actualizar dependências indiscriminadamente.
- Não partilhar ficheiros `.env`.
- Não executar comandos destrutivos sem backup.
- Rever migrations antes da produção.
- Utilizar transacções nas operações críticas.
- Implementar testes automatizados.
- Manter o backend separado das responsabilidades de interface.

## 16. Considerações finais

A instalação correcta do backend é essencial para garantir o funcionamento das regras de negócio, da API e da arquitectura multi-tenant do FaturaJá.