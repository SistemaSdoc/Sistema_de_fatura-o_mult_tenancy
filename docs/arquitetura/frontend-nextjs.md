# Frontend — Next.js

## 1. Introdução

O frontend do FaturaJá é desenvolvido com Next.js, uma framework baseada em React que permite construir aplicações web modernas, organizadas e escaláveis.

A sua função é disponibilizar a interface através da qual os utilizadores interagem com as funcionalidades do sistema.

## 2. Objectivos

- Apresentar os módulos da aplicação.
- Permitir a navegação entre funcionalidades.
- Comunicar com a API Laravel.
- Apresentar informações empresariais.
- Implementar formulários e validações de interface.
- Garantir uma experiência de utilização consistente.

## 3. Tecnologias

- Next.js.
- React.
- TypeScript.
- Tailwind CSS.
- Axios, caso confirmado na configuração do projecto.
- Lucide React, caso confirmado nas dependências.

As versões e bibliotecas efectivamente utilizadas deverão ser verificadas no `package.json` e no ficheiro de lock.

## 4. Estrutura do frontend

A estrutura exacta deverá acompanhar a organização real do repositório.

Uma organização de referência:

```text
frontend/
├── app/
├── components/
├── context/
├── hooks/
├── services/
├── public/
├── types/
├── package.json
├── package-lock.json
├── next.config.*
└── tsconfig.json
```

### 4.1 app/

Contém as páginas, layouts e rotas da aplicação, caso seja utilizado o App Router.

### 4.2 components/

Contém os componentes reutilizáveis da interface.

### 4.3 context/

Centraliza contextos partilhados, como temas e estados globais, quando aplicável.

### 4.4 hooks/

Contém hooks personalizados para reutilização de lógica React.

### 4.5 services/

Agrupa os serviços responsáveis pela comunicação com a API.

### 4.6 public/

Armazena recursos públicos, como imagens, ícones e outros ficheiros estáticos.

## 5. Comunicação com o backend

O frontend comunica com o Laravel através de pedidos HTTP.

O serviço de comunicação deverá centralizar:

- Endereços da API.
- Cabeçalhos.
- Cookies e credenciais.
- Tratamento de respostas.
- Tratamento de erros.
- Identificação do contexto empresarial, conforme a arquitectura implementada.

## 6. Multi-tenancy no frontend

A aplicação deverá reconhecer o domínio ou subdomínio utilizado pelo utilizador e comunicar com o backend de acordo com o contexto empresarial.

A identificação do tenant no frontend não substitui a validação de segurança no backend.

## 7. Variáveis de ambiente

As variáveis públicas e privadas devem ser devidamente separadas.

Exemplo inicial de variáveis públicas:

```env
NEXT_PUBLIC_APP_DOMAIN=app.factura-ja.ao
NEXT_PUBLIC_API_URL=https://app.factura-ja.ao
```

As variáveis com prefixo `NEXT_PUBLIC_` podem ser incorporadas no bundle disponibilizado ao navegador. Nunca devem conter segredos.

## 8. Execução em desenvolvimento

```bash
npm install
npm run dev
```

## 9. Compilação para produção

```bash
npm ci
npm run build
npm start
```

Os comandos definitivos dependem dos scripts existentes no `package.json`.

## 10. Boas práticas

- Evitar duplicação de componentes.
- Definir tipos TypeScript explícitos.
- Evitar o uso de `any`.
- Centralizar os pedidos à API.
- Tratar estados de carregamento e erros.
- Validar formulários.
- Não expor credenciais.
- Testar as funcionalidades antes da publicação.

## 11. Considerações finais

O frontend deverá manter uma separação clara entre apresentação, estado da aplicação e comunicação com os serviços do backend.