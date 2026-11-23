# Arquitectura Multi-Tenant — FaturaJá

## 1. Introdução

Multi-tenancy é uma abordagem arquitectónica que permite que diferentes organizações utilizem uma mesma aplicação, mantendo a separação dos seus dados.

O FaturaJá adopta uma arquitectura híbrida, combinando bases de dados partilhadas e bases de dados dedicadas.

## 2. Objectivos

- Permitir a utilização da plataforma por várias empresas.
- Garantir isolamento dos dados.
- Facilitar a administração empresarial.
- Suportar diferentes modelos de armazenamento.
- Permitir crescimento progressivo da plataforma.

## 3. Modelos de tenancy

### 3.1 Modo colectivo

Neste modelo, várias empresas partilham a mesma base de dados.

A separação dos registos é efectuada através de um identificador de tenant, como `tenant_id`, conforme o desenho de cada tabela.

Exemplo conceptual:

```text
Base de dados colectiva
│
├── Empresa A
│   ├── Produtos
│   └── Facturas
│
├── Empresa B
│   ├── Produtos
│   └── Facturas
│
└── Empresa C
    ├── Produtos
    └── Facturas
```

As consultas devem aplicar obrigatoriamente o contexto da empresa.

### 3.2 Modo singular

Neste modelo, cada empresa possui uma base de dados dedicada.

```text
Servidor MySQL
│
├── faturaja_landlord
├── tenant_empresa_a
├── tenant_empresa_b
└── tenant_empresa_c
```

Este modelo oferece maior separação física dos dados entre empresas.

## 4. Base landlord

A base landlord é responsável pela gestão centralizada das empresas e pelas informações necessárias para identificar os respectivos contextos.

Entre os dados de referência encontram-se:

- Identificação da empresa.
- NIF.
- Nome.
- Email.
- Estado.
- Subdomínio.
- Modo de tenancy.
- Identificação da base de dados, quando aplicável.

A estrutura exacta deverá ser confirmada nas migrations e models.

## 5. Resolução do tenant

A aplicação deverá identificar a empresa associada ao pedido.

O processo conceptual é:

1. Receber o pedido.
2. Identificar o domínio ou subdomínio.
3. Localizar a empresa na base landlord.
4. Verificar o estado e a configuração da empresa.
5. Determinar o modo de tenancy.
6. Seleccionar a base de dados ou contexto partilhado.
7. Validar o utilizador e as permissões.
8. Executar a operação no contexto correcto.

## 6. Isolamento dos dados

O isolamento é um requisito essencial.

No modo colectivo, as operações devem filtrar os registos pelo identificador da empresa.

No modo singular, as operações devem utilizar a ligação à base de dados dedicada.

O frontend não deve ser considerado uma barreira de segurança. Todas as verificações devem ser efectuadas no backend.

## 7. Autenticação e autorização

A autenticação identifica o utilizador.

A autorização determina se o utilizador pode realizar determinada operação dentro da empresa.

Os papéis e permissões devem ser verificados no contexto empresarial.

## 8. Riscos a prevenir

- Consultas sem filtro de tenant.
- Utilização incorrecta da ligação à base de dados.
- Troca de contexto entre empresas.
- Acesso a documentos de outra organização.
- Manipulação de identificadores enviados pelo navegador.
- Cache partilhada sem separação de tenant.
- Filas e tarefas executadas no contexto empresarial errado.

## 9. Testes de isolamento

Devem ser realizados testes para confirmar que:

- Uma empresa não consulta produtos de outra.
- Uma empresa não consulta facturas de outra.
- Um utilizador não acede a uma empresa sem autorização.
- As operações respeitam o modo de tenancy.
- As exportações e relatórios respeitam o contexto empresarial.

## 10. Boas práticas

- Validar o tenant no backend.
- Utilizar transacções.
- Rever consultas e relacionamentos.
- Proteger as ligações às bases de dados.
- Testar operações entre tenants.
- Registar operações administrativas.
- Fazer backups independentes e verificáveis.

## 11. Considerações finais

A arquitectura multi-tenant é um dos componentes centrais do FaturaJá. A sua implementação deve garantir que a partilha da plataforma nunca compromete a confidencialidade e a integridade dos dados empresariais.