# Bases de Dados e Configuração — FaturaJá

## 1. Introdução

O FaturaJá utiliza MySQL como sistema de gestão de bases de dados.

A camada de persistência suporta o armazenamento das informações empresariais e a arquitectura multi-tenant híbrida.

## 2. Objectivos

- Organizar os dados da plataforma.
- Garantir integridade e consistência.
- Suportar diferentes empresas.
- Permitir consultas eficientes.
- Facilitar backups e recuperação.

## 3. Organização conceptual

A arquitectura contempla:

### Base landlord

Armazena informações centrais necessárias à administração e identificação das empresas.

### Base colectiva

Armazena os dados de várias empresas, utilizando identificadores de tenant para separar os registos.

### Bases dedicadas

Armazenam os dados de empresas que utilizam o modo singular.

## 4. Estrutura conceptual

```text
MySQL
│
├── faturaja_landlord
│
├── faturaja_colectivo
│   ├── produtos
│   ├── vendas
│   ├── facturas
│   └── movimentos_stock
│
├── tenant_empresa_a
│
└── tenant_empresa_b
```

Os nomes acima representam uma organização conceptual. Os nomes reais das bases e tabelas devem ser confirmados no código e nas configurações de produção.

## 5. Configuração da ligação

A ligação principal do Laravel é configurada através das variáveis de ambiente.

Exemplo:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=faturaja_landlord
DB_USERNAME=faturaja_user
DB_PASSWORD=SUBSTITUIR_POR_SEGREDO
```

Nunca publicar credenciais reais.

As ligações adicionais e dinâmicas para os tenants deverão seguir a implementação existente no projecto.

## 6. Migrações

As migrations do Laravel permitem versionar a estrutura das tabelas.

Consultar o estado:

```bash
php artisan migrate:status
```

Executar migrações num ambiente de desenvolvimento:

```bash
php artisan migrate
```

Em produção, as migrações devem ser previamente revistas, precedidas de backup e executadas com controlo.

## 7. Integridade dos dados

Devem ser utilizados:

- Chaves primárias.
- Chaves estrangeiras quando apropriado.
- Índices.
- Restrições de unicidade.
- Transacções.
- Validação de dados.
- Relações consistentes entre tabelas.

No modo colectivo, os índices e as restrições devem considerar o contexto do tenant sempre que necessário.

## 8. Segurança

- Criar utilizadores MySQL com privilégios mínimos.
- Não utilizar o utilizador root na aplicação.
- Evitar exposição pública da porta MySQL.
- Proteger credenciais.
- Restringir acessos.
- Registar operações relevantes.
- Separar dados de teste e produção.

## 9. Backups

Os backups deverão contemplar:

- Base landlord.
- Base colectiva.
- Bases dedicadas.
- Ficheiros associados aos documentos.
- Configurações e chaves necessárias à recuperação, guardadas separadamente e de forma segura.

É necessário testar regularmente a restauração.

## 10. Considerações finais

A base de dados é um componente crítico do FaturaJá. A sua administração deverá garantir disponibilidade, integridade, confidencialidade e capacidade de recuperação.