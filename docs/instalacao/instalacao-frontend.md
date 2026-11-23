# Instalação do Frontend — FaturaJá

## 1. Introdução

Este documento apresenta os procedimentos necessários para instalar, configurar e executar o frontend do FaturaJá.

O frontend utiliza Next.js, framework baseada em React, e TypeScript para desenvolver a interface de utilização da plataforma.

É responsável pela apresentação dos módulos, formulários, painéis administrativos e interacção com a API Laravel.

## 2. Objectivos

- Preparar o ambiente Node.js.
- Instalar as dependências do frontend.
- Configurar as variáveis de ambiente.
- Estabelecer a comunicação com o backend.
- Executar a aplicação localmente.
- Compilar a aplicação para produção.

## 3. Pré-requisitos

O técnico deverá possuir:

- Node.js numa versão compatível com o projecto.
- npm.
- Git.
- Acesso ao repositório.
- Editor de código.
- Backend Laravel configurado.

As versões exactas devem ser confirmadas no `package.json` e no ficheiro de lock.

## 4. Obter o código-fonte

Se o projecto ainda não estiver disponível localmente:

```bash
git clone <URL_DO_REPOSITORIO>
```

Entrar na pasta frontend:

```bash
cd Sistema_de_fatura-o_mult_tenancy/frontend
```

## 5. Verificar Node.js e npm

Consultar as versões instaladas:

```bash
node -v
npm -v
```

As versões devem respeitar os requisitos do projecto.

## 6. Instalar as dependências

Se o projecto possuir `package-lock.json`, executar:

```bash
npm ci
```

Este comando instala as dependências de acordo com o ficheiro de lock.

Para uma instalação inicial sem ficheiro de lock, poderá ser necessário:

```bash
npm install
```

Não utilizar os dois comandos indiscriminadamente.

## 7. Configurar as variáveis de ambiente

Verificar os ficheiros disponíveis:

```bash
ls -la .env*
```

Se existir `.env.example`, criar a configuração local:

```bash
cp .env.example .env.local
```

Exemplo de configuração:

```env
NEXT_PUBLIC_APP_DOMAIN=localhost:3000
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Os valores deverão ser adaptados à implementação real dos serviços de comunicação.

### Atenção às variáveis públicas

As variáveis que começam por `NEXT_PUBLIC_` podem ser disponibilizadas ao navegador e incorporadas durante a compilação.

Nunca colocar nelas:

- Palavras-passe.
- Tokens privados.
- Chaves secretas.
- Credenciais de bases de dados.
- Chaves privadas de integração.

## 8. Executar em desenvolvimento

Iniciar o servidor:

```bash
npm run dev
```

Por padrão, o Next.js disponibiliza a aplicação em:

```text
http://localhost:3000
```

O terminal deverá permanecer aberto enquanto o servidor de desenvolvimento estiver em execução.

## 9. Comunicação com o backend

O frontend comunica com o Laravel através da API.

A configuração deverá garantir:

- Endereço correcto da API.
- Envio de credenciais quando necessário.
- Gestão de cookies de autenticação.
- Tratamento de erros HTTP.
- Resolução correcta do domínio empresarial.
- Compatibilidade com as políticas CORS do backend.

A identificação do tenant no frontend não substitui as verificações de segurança no Laravel.

## 10. Verificar o projecto

Executar os comandos disponíveis no `package.json`.

Exemplos:

```bash
npm run lint
npx tsc --noEmit
```

Estes comandos só deverão ser utilizados se as ferramentas e scripts correspondentes estiverem configurados.

Verificar também:

- Carregamento das páginas.
- Navegação.
- Formulários.
- Comunicação com a API.
- Autenticação.
- Gestão do contexto empresarial.
- Apresentação de erros.

## 11. Compilar para produção

Instalar as dependências de forma reproduzível:

```bash
npm ci
```

Compilar:

```bash
npm run build
```

O Next.js deverá gerar a compilação de produção na pasta `.next`, quando utilizado o modo de build padrão.

## 12. Executar em produção

Para aplicações Next.js que utilizam o servidor Node.js:

```bash
npm start
```

A aplicação deverá executar através do servidor de produção do Next.js.

A configuração definitiva deverá respeitar o script `start` e o modo de deploy definidos no projecto.

## 13. Problemas frequentes

### Erro de dependências

Verificar:

```bash
node -v
npm -v
```

Consultar também o ficheiro de lock e os requisitos do projecto.

### Erro de comunicação com a API

Verificar:

- Endereço configurado.
- Backend activo.
- CORS.
- Cookies.
- Certificado HTTPS.
- Configuração de autenticação.

### Erro durante a compilação

Executar:

```bash
npm run build
```

Analisar as mensagens de erro e corrigir os problemas de TypeScript, importações, dependências ou configuração.

### Erro de variáveis de ambiente

Verificar se os nomes das variáveis correspondem aos utilizados no código.

Depois de alterar variáveis `NEXT_PUBLIC_*`, voltar a executar a compilação.

## 14. Boas práticas

- Utilizar TypeScript com tipos explícitos.
- Evitar o uso de `any`.
- Reutilizar componentes.
- Centralizar a comunicação com a API.
- Manter o ficheiro de lock actualizado.
- Não colocar segredos em variáveis públicas.
- Tratar correctamente erros e estados de carregamento.
- Testar a aplicação antes de publicar.

## 15. Considerações finais

A instalação correcta do frontend permite que os utilizadores acedam às funcionalidades do FaturaJá através de uma interface moderna, organizada e integrada com o backend Laravel.