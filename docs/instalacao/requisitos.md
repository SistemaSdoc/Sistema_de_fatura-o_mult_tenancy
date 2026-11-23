# Requisitos Técnicos — FaturaJá

## 1. Introdução

Este documento apresenta os requisitos de software e infraestrutura necessários para desenvolver, executar e publicar o FaturaJá.

Os requisitos deverão ser revistos sempre que as dependências do projecto forem actualizadas.

## 2. Tecnologias principais

| Tecnologia | Utilização |
|---|---|
| Git | Controlo de versões |
| GitHub | Repositório remoto |
| PHP | Linguagem do backend |
| Laravel | Framework backend |
| Composer | Gestão de dependências PHP |
| Node.js | Ambiente de execução do frontend |
| npm | Gestão de dependências JavaScript |
| Next.js | Framework frontend |
| React | Biblioteca de interface |
| TypeScript | Tipagem estática |
| MySQL | Sistema de gestão de base de dados |
| Nginx | Servidor web |

## 3. Requisitos de desenvolvimento

Cada técnico deverá dispor de:

- Computador com Linux, Windows ou macOS.
- Acesso ao repositório GitHub.
- Git instalado.
- PHP numa versão compatível com `composer.json`.
- Composer.
- Node.js numa versão compatível com o projecto.
- npm.
- MySQL.
- Editor de código.
- Acesso ao terminal.

## 4. Requisitos do backend

- PHP compatível com as dependências.
- Extensões PHP exigidas pelo projecto.
- Composer.
- Acesso à base de dados MySQL.
- Configuração adequada do ambiente Laravel.

As extensões deverão ser confirmadas através do `composer.json` e dos requisitos das bibliotecas.

## 5. Requisitos do frontend

- Node.js.
- npm.
- Next.js.
- React.
- TypeScript.
- Dependências declaradas no ficheiro de lock.

## 6. Requisitos de produção

A infraestrutura de produção deverá disponibilizar:

- Sistema operativo Linux suportado.
- Nginx.
- PHP-FPM.
- Node.js.
- MySQL.
- Composer.
- Certificados SSL.
- Firewall.
- Sistema de backups.
- Monitorização e registo de logs.

## 7. Requisitos de segurança

- HTTPS activo.
- Credenciais protegidas.
- Acesso SSH controlado.
- Base de dados protegida.
- Firewall configurada.
- Permissões adequadas.
- Backups periódicos.
- Separação entre ambientes de desenvolvimento e produção.

## 8. Versionamento

As versões exactas devem ser registadas depois da auditoria dos ficheiros:

- `backend/composer.json`
- `backend/composer.lock`
- `frontend/package.json`
- `frontend/package-lock.json`

Não se deverá actualizar uma dependência de produção sem avaliar a compatibilidade.

## 9. Considerações finais

A instalação deverá utilizar versões compatíveis e reproduzíveis, evitando diferenças de ambiente entre os programadores e o servidor de produção.