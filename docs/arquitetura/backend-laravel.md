# Backend — Laravel

## 1. Introdução

O backend do FaturaJá é desenvolvido com Laravel, framework PHP utilizada para estruturar a lógica de negócio, disponibilizar APIs e gerir as operações da plataforma.

É responsável pelo processamento das solicitações provenientes do frontend e pela comunicação com a base de dados.

## 2. Responsabilidades

- Autenticação e autorização.
- Gestão de empresas e utilizadores.
- Gestão de produtos e serviços.
- Emissão e processamento de documentos fiscais.
- Gestão de vendas e pagamentos.
- Controlo de stock.
- Gestão multi-tenant.
- Integrações externas.
- Processamento e validação de dados.

## 3. Estrutura de referência

```text
backend/
├── app/
│   ├── Console/
│   ├── Http/
│   │   ├── Controllers/
│   │   ├── Middleware/
│   │   └── Requests/
│   ├── Models/
│   └── Services/
├── bootstrap/
├── config/
├── database/
│   ├── migrations/
│   ├── seeders/
│   └── factories/
├── routes/
│   ├── api.php
│   └── web.php
├── storage/
├── tests/
├── artisan
├── composer.json
└── .env
```

A estrutura efectiva deverá ser confirmada no código.

## 4. Organização das responsabilidades

### Controllers

Recebem os pedidos HTTP, coordenam a execução da operação e devolvem respostas.

### Models

Representam as entidades e os respectivos relacionamentos com a base de dados.

### Services

Centralizam operações e regras de negócio que devem ser reutilizadas.

### Middleware

Executa verificações antes de o pedido chegar ao controlador, incluindo autenticação e resolução do tenant.

### Requests

Podem centralizar a validação dos dados recebidos.

## 5. API

A API permite a comunicação entre o frontend e o backend.

Deverá seguir princípios REST, com utilização adequada dos métodos HTTP:

| Método | Finalidade |
|---|---|
| GET | Consultar dados |
| POST | Criar ou executar operações |
| PUT | Actualizar um recurso |
| PATCH | Actualizar parcialmente |
| DELETE | Remover um recurso |

As rotas concretas devem ser consultadas em `routes/api.php`.

## 6. Autenticação e autorização

O backend deverá garantir que cada utilizador apenas executa operações autorizadas.

O projecto utiliza Laravel Sanctum, conforme a configuração já identificada, devendo a implementação ser validada antes da publicação.

## 7. Processamento de documentos fiscais

O backend centraliza as regras de emissão, validação e processamento dos documentos fiscais.

A implementação deverá respeitar os requisitos fiscais aplicáveis em Angola e as configurações efectivamente suportadas pelo sistema.

## 8. Base de dados

A comunicação com o MySQL é realizada através da camada de persistência do Laravel.

O acesso aos dados deve respeitar o contexto da empresa e o modo multi-tenant.

## 9. Configuração

O ficheiro `.env` contém configurações específicas do ambiente.

Não deverá ser enviado para o repositório público nem partilhado com pessoas não autorizadas.

## 10. Boas práticas

- Utilizar validação adequada.
- Separar responsabilidades.
- Evitar lógica excessiva nos controllers.
- Utilizar transacções nas operações críticas.
- Proteger rotas e recursos.
- Registar erros relevantes.
- Criar testes automatizados.
- Rever migrações antes de as executar em produção.

## 11. Considerações finais

O backend constitui o núcleo funcional do FaturaJá, sendo responsável pela integridade das operações, regras de negócio e segurança dos dados.