

# Preparação do Ambiente Local — FaturaJá

## 1. Introdução

Este documento descreve os procedimentos necessários para preparar um ambiente local de desenvolvimento do FaturaJá.

O objectivo é permitir que os técnicos executem, testem e modifiquem a aplicação antes de enviarem alterações para o repositório central.

## 2. Pré-requisitos

Instalar e configurar:

- Git.
- PHP.
- Composer.
- Node.js.
- npm.
- MySQL.
- Editor de código.

As versões devem respeitar os requisitos do projecto.

## 3. Obter o código-fonte

Clonar o repositório oficial:

```bash
git clone <URL_DO_REPOSITORIO>
```

Entrar no projecto:

```bash
cd Sistema_de_fatura-o_mult_tenancy
```

A estrutura esperada deverá conter as pastas:

```text
projecto/
├── backend/
├── frontend/
└── docs/
```

A estrutura real será confirmada no repositório.

## 4. Preparar o backend

Entrar na pasta:

```bash
cd backend
```

Instalar as dependências:

```bash
composer install
```

Criar o ficheiro de ambiente a partir do exemplo, se existir:

```bash
cp .env.example .env
```

Gerar a chave da aplicação apenas para uma instalação local nova:

```bash
php artisan key:generate
```

Configurar as credenciais MySQL no `.env`.

Executar as migrações locais depois de confirmar a configuração da base de dados:

```bash
php artisan migrate
```

Iniciar o servidor de desenvolvimento:

```bash
php artisan serve
```

## 5. Preparar o frontend

Abrir outro terminal e entrar na pasta:

```bash
cd frontend
```

Instalar as dependências:

```bash
npm ci
```

Criar o ficheiro de ambiente local, caso o projecto disponibilize um exemplo:

```bash
cp .env.example .env.local
```

Configurar os endereços da API de desenvolvimento.

Iniciar o frontend:

```bash
npm run dev
```

## 6. Executar os dois serviços

O backend e o frontend deverão permanecer activos em terminais separados.

O frontend deverá comunicar com o endereço correcto da API Laravel.

As portas e os endereços definitivos dependem da configuração local.

## 7. Verificação

Confirmar:

- O backend inicia sem erros.
- O frontend compila.
- A ligação à base de dados funciona.
- A autenticação funciona.
- Os pedidos à API são processados.
- O contexto empresarial é resolvido correctamente.

## 8. Boas práticas

- Não partilhar ficheiros `.env`.
- Não enviar credenciais para o GitHub.
- Utilizar branches para desenvolver funcionalidades.
- Executar testes antes de criar commits.
- Manter as dependências actualizadas com controlo.
- Não utilizar dados reais de clientes em ambientes de teste sem autorização e protecção adequada.

## 9. Considerações finais

Um ambiente local correctamente preparado reduz erros de integração e permite que todos os técnicos trabalhem com uma configuração consistente.