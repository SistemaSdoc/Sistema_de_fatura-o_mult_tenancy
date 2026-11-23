# Arquitectura Geral do FaturaJá

## 1. Introdução

O FaturaJá é uma plataforma SaaS (Software as a Service) destinada à facturação, gestão comercial e controlo de stock empresarial.

A sua arquitectura foi concebida para permitir que várias empresas utilizem uma única plataforma, mantendo a separação lógica e, quando necessário, física dos respectivos dados.

O sistema adopta uma arquitectura cliente-servidor, organizada em frontend, backend e camada de persistência de dados.

## 2. Objectivos da arquitectura

- Garantir escalabilidade e facilidade de manutenção.
- Separar a interface da lógica de negócio.
- Permitir comunicação através de APIs.
- Suportar múltiplas empresas.
- Garantir isolamento e segurança dos dados.
- Facilitar futuras integrações com serviços externos.

## 3. Tecnologias principais

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js |
| Linguagem do frontend | TypeScript |
| Backend | Laravel |
| Linguagem do backend | PHP |
| Base de dados | MySQL |
| Servidor web | Nginx |
| Runtime do frontend | Node.js |
| Controlo de versões | Git e GitHub |

As versões exactas das dependências deverão ser confirmadas nos ficheiros de configuração do projecto.

## 4. Organização da arquitectura

### 4.1 Frontend

O frontend é desenvolvido com Next.js e é responsável pela interface gráfica, navegação, apresentação dos dados e interacção com os utilizadores.

### 4.2 Backend

O backend é desenvolvido com Laravel e concentra as regras de negócio, autenticação, autorização, processamento de operações e disponibilização dos endpoints da API.

### 4.3 Base de dados

O MySQL é responsável pelo armazenamento dos dados empresariais, documentos fiscais, utilizadores, produtos, serviços, movimentos de stock e configurações.

### 4.4 Comunicação

O frontend comunica com o backend através de pedidos HTTP, utilizando uma API.

As operações de autenticação e autorização são controladas pelo backend.

## 5. Arquitectura multi-tenant

O FaturaJá utiliza uma abordagem multi-tenant híbrida:

- Modo colectivo: diferentes empresas partilham uma base de dados, com separação dos registos através de identificadores de tenant.
- Modo singular: cada empresa possui uma base de dados própria.

A resolução do tenant determina o contexto empresarial utilizado em cada operação.

## 6. Fluxo geral de funcionamento

1. O utilizador acede à aplicação.
2. O frontend apresenta a interface.
3. O utilizador efectua uma operação.
4. O frontend envia o pedido à API Laravel.
5. O backend valida a autenticação e as permissões.
6. O contexto da empresa é identificado.
7. A regra de negócio é executada.
8. Os dados são consultados ou persistidos no MySQL.
9. O backend devolve uma resposta.
10. O frontend apresenta o resultado.

## 7. Segurança

A arquitectura deverá assegurar:

- Autenticação dos utilizadores.
- Autorização baseada em permissões.
- Isolamento dos dados empresariais.
- Protecção das credenciais.
- Comunicação HTTPS.
- Validação dos dados recebidos.
- Registo de operações relevantes.

## 8. Escalabilidade e manutenção

A separação entre frontend, backend e base de dados permite evoluir cada componente de forma organizada.

A arquitectura também permite, futuramente, separar os serviços em servidores diferentes, caso o crescimento da plataforma justifique essa decisão.

## 9. Considerações finais

A arquitectura do FaturaJá procura equilibrar segurança, organização, escalabilidade e facilidade de manutenção, proporcionando uma base técnica para a evolução contínua da plataforma.