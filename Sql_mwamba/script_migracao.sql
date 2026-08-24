-- ============================================================
-- SCRIPT DE MIGRAÇÃO (Compatível com MySQL 5.7+)
-- mwamba_db → faturaja_shared
-- ============================================================

SET @tenant_id = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a';

-- ------------------------------------------------------------
-- 1. PROCEDIMENTO PARA ADICIONAR COLUNAS DE FORMA SEGURA
-- ------------------------------------------------------------
DELIMITER //

DROP PROCEDURE IF EXISTS AddColumnIfNotExists//
CREATE PROCEDURE AddColumnIfNotExists(
    IN tableName VARCHAR(128),
    IN columnName VARCHAR(128),
    IN columnDef VARCHAR(255)
)
BEGIN
    DECLARE col_exists INT DEFAULT 0;
    SELECT COUNT(*) INTO col_exists
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND COLUMN_NAME = columnName;

    IF col_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' ADD COLUMN ', columnName, ' ', columnDef);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END//
DELIMITER ;

-- ------------------------------------------------------------
-- 2. ADICIONAR COLUNA tenant_id EM TODAS AS TABELAS
-- ------------------------------------------------------------
CALL AddColumnIfNotExists('adiantamento_fatura', 'tenant_id', 'CHAR(36) NOT NULL AFTER `id`');
CALL AddColumnIfNotExists('apuramento_iva', 'tenant_id', 'CHAR(36) NOT NULL AFTER `id`');
CALL AddColumnIfNotExists('categorias', 'tenant_id', 'CHAR(36) NOT NULL AFTER `id`');
CALL AddColumnIfNotExists('clientes', 'tenant_id', 'CHAR(36) NOT NULL AFTER `id`');
CALL AddColumnIfNotExists('compras', 'tenant_id', 'CHAR(36) NOT NULL AFTER `id`');
CALL AddColumnIfNotExists('documentos_fiscais', 'tenant_id', 'CHAR(36) NOT NULL AFTER `id`');
CALL AddColumnIfNotExists('fornecedores', 'tenant_id', 'CHAR(36) NOT NULL AFTER `id`');
CALL AddColumnIfNotExists('historico_precos', 'tenant_id', 'CHAR(36) NOT NULL AFTER `id`');
CALL AddColumnIfNotExists('itens_compras', 'tenant_id', 'CHAR(36) NOT NULL AFTER `id`');
CALL AddColumnIfNotExists('itens_documento_fiscal', 'tenant_id', 'CHAR(36) NOT NULL AFTER `id`');
CALL AddColumnIfNotExists('itens_venda', 'tenant_id', 'CHAR(36) NOT NULL AFTER `id`');
CALL AddColumnIfNotExists('logs_auditoria', 'tenant_id', 'CHAR(36) NOT NULL AFTER `id`');
CALL AddColumnIfNotExists('logs_fiscais', 'tenant_id', 'CHAR(36) NOT NULL AFTER `id`');
CALL AddColumnIfNotExists('movimentos_stock', 'tenant_id', 'CHAR(36) NOT NULL AFTER `id`');
CALL AddColumnIfNotExists('produtos', 'tenant_id', 'CHAR(36) NOT NULL AFTER `id`');
CALL AddColumnIfNotExists('series_fiscais', 'tenant_id', 'CHAR(36) NULL AFTER `id`');
CALL AddColumnIfNotExists('vendas', 'tenant_id', 'CHAR(36) NOT NULL AFTER `id`');

-- ------------------------------------------------------------
-- 3. PREENCHER tenant_id COM O VALOR CORRECTO
-- ------------------------------------------------------------
UPDATE `adiantamento_fatura` SET `tenant_id` = @tenant_id WHERE `tenant_id` IS NULL;
UPDATE `apuramento_iva`      SET `tenant_id` = @tenant_id WHERE `tenant_id` IS NULL;
UPDATE `categorias`          SET `tenant_id` = @tenant_id WHERE `tenant_id` IS NULL;
UPDATE `clientes`            SET `tenant_id` = @tenant_id WHERE `tenant_id` IS NULL;
UPDATE `compras`             SET `tenant_id` = @tenant_id WHERE `tenant_id` IS NULL;
UPDATE `documentos_fiscais`  SET `tenant_id` = @tenant_id WHERE `tenant_id` IS NULL;
UPDATE `fornecedores`        SET `tenant_id` = @tenant_id WHERE `tenant_id` IS NULL;
UPDATE `historico_precos`    SET `tenant_id` = @tenant_id WHERE `tenant_id` IS NULL;
UPDATE `itens_compras`       SET `tenant_id` = @tenant_id WHERE `tenant_id` IS NULL;
UPDATE `itens_documento_fiscal` SET `tenant_id` = @tenant_id WHERE `tenant_id` IS NULL;
UPDATE `itens_venda`         SET `tenant_id` = @tenant_id WHERE `tenant_id` IS NULL;
UPDATE `logs_auditoria`      SET `tenant_id` = @tenant_id WHERE `tenant_id` IS NULL;
UPDATE `logs_fiscais`        SET `tenant_id` = @tenant_id WHERE `tenant_id` IS NULL;
UPDATE `movimentos_stock`    SET `tenant_id` = @tenant_id WHERE `tenant_id` IS NULL;
UPDATE `produtos`            SET `tenant_id` = @tenant_id WHERE `tenant_id` IS NULL;
UPDATE `series_fiscais`      SET `tenant_id` = @tenant_id WHERE `tenant_id` IS NULL;
UPDATE `vendas`              SET `tenant_id` = @tenant_id WHERE `tenant_id` IS NULL;

-- ------------------------------------------------------------
-- 4. ADICIONAR AS RESTANTES COLUNAS
-- ------------------------------------------------------------
CALL AddColumnIfNotExists('clientes', 'user_id', 'CHAR(36) NULL AFTER `tenant_id`');
CALL AddColumnIfNotExists('clientes', 'cidade', 'VARCHAR(255) NULL AFTER `endereco`');
CALL AddColumnIfNotExists('clientes', 'codigo_postal', 'VARCHAR(255) NULL AFTER `cidade`');
CALL AddColumnIfNotExists('clientes', 'pais', 'VARCHAR(2) NOT NULL DEFAULT "AO" AFTER `codigo_postal`');
ALTER TABLE `clientes` MODIFY COLUMN `nif` VARCHAR(14) NULL;

CALL AddColumnIfNotExists('fornecedores', 'user_id', 'CHAR(36) NULL AFTER `tenant_id`');
CALL AddColumnIfNotExists('compras', 'user_id', 'CHAR(36) NULL AFTER `tenant_id`');
ALTER TABLE `compras` MODIFY COLUMN `user_id` CHAR(36) NULL;

CALL AddColumnIfNotExists('documentos_fiscais', 'cliente_endereco', 'VARCHAR(255) NULL AFTER `metodo_pagamento`');
CALL AddColumnIfNotExists('documentos_fiscais', 'cliente_cidade', 'VARCHAR(255) NULL AFTER `cliente_endereco`');
CALL AddColumnIfNotExists('documentos_fiscais', 'cliente_pais', 'VARCHAR(2) NULL AFTER `cliente_cidade`');
CALL AddColumnIfNotExists('documentos_fiscais', 'periodo', 'TINYINT UNSIGNED NULL AFTER `cliente_pais`');
CALL AddColumnIfNotExists('documentos_fiscais', 'nome_banco', 'VARCHAR(255) NULL AFTER `referencia_pagamento`');
CALL AddColumnIfNotExists('documentos_fiscais', 'iban', 'VARCHAR(255) NULL AFTER `nome_banco`');
CALL AddColumnIfNotExists('documentos_fiscais', 'numero_conta', 'VARCHAR(255) NULL AFTER `iban`');

CALL AddColumnIfNotExists('produtos', 'user_id', 'CHAR(36) NULL AFTER `tenant_id`');
CALL AddColumnIfNotExists('produtos', 'custo_medio', 'DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER `preco_venda`');
CALL AddColumnIfNotExists('produtos', 'taxa_retencao', 'DECIMAL(5,2) NULL AFTER `taxa_iva`');
CALL AddColumnIfNotExists('produtos', 'duracao_estimada', 'VARCHAR(50) NULL AFTER `codigo_isencao`');
CALL AddColumnIfNotExists('produtos', 'unidade_medida', 'ENUM("hora","dia","semana","mes") NULL AFTER `duracao_estimada`');
CALL AddColumnIfNotExists('produtos', 'despesas_adicionais', 'DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER `estoque_minimo`');
CALL AddColumnIfNotExists('produtos', 'tipo_preco', 'ENUM("margem","markup","fixo") NOT NULL DEFAULT "margem" AFTER `despesas_adicionais`');
CALL AddColumnIfNotExists('produtos', 'margem_lucro', 'DECIMAL(5,2) NULL AFTER `tipo_preco`');
CALL AddColumnIfNotExists('produtos', 'markup', 'DECIMAL(5,2) NULL AFTER `margem_lucro`');
CALL AddColumnIfNotExists('produtos', 'preco_minimo', 'DECIMAL(15,2) NULL AFTER `markup`');
CALL AddColumnIfNotExists('produtos', 'preco_maximo', 'DECIMAL(15,2) NULL AFTER `preco_minimo`');
CALL AddColumnIfNotExists('produtos', 'preco_controlado', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `preco_maximo`');
CALL AddColumnIfNotExists('produtos', 'permite_preco_livre', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `preco_controlado`');
CALL AddColumnIfNotExists('produtos', 'deleted_at', 'TIMESTAMP NULL AFTER `updated_at`');
ALTER TABLE `produtos` MODIFY COLUMN `custo_medio` DECIMAL(15,2) NOT NULL DEFAULT 0.00;

CALL AddColumnIfNotExists('historico_precos', 'user_id', 'CHAR(36) NULL AFTER `tenant_id`');

-- ------------------------------------------------------------
-- 5. CRIAR NOVAS TABELAS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `empresa_mensagens` (
  `id` char(36) NOT NULL,
  `empresa_id` char(36) NOT NULL,
  `remetente_id` char(36) DEFAULT NULL,
  `remetente_tipo` enum('landlord','empresa') NOT NULL,
  `remetente_nome` varchar(255) DEFAULT NULL,
  `remetente_email` varchar(255) DEFAULT NULL,
  `mensagem` text NOT NULL,
  `lida` tinyint(1) NOT NULL DEFAULT '0',
  `lida_em` timestamp NULL DEFAULT NULL,
  `eliminada_pelo_cliente` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `empresa_mensagens_empresa_id_created_at_index` (`empresa_id`,`created_at`),
  KEY `empresa_mensagens_empresa_id_index` (`empresa_id`),
  KEY `empresa_mensagens_remetente_id_index` (`remetente_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `saft_export_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `empresa_id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `ano` int NOT NULL,
  `mes` int NOT NULL,
  `exportado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_id` char(36) DEFAULT NULL,
  `caminho_arquivo` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `saft_export_logs_empresa_id_ano_mes_index` (`empresa_id`,`ano`,`mes`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 6. ADICIONAR CHAVES ESTRANGEIRAS (VERIFICAÇÃO PRÉVIA)
-- ------------------------------------------------------------
DELIMITER //

DROP PROCEDURE IF EXISTS AddForeignKeyIfNotExists//
CREATE PROCEDURE AddForeignKeyIfNotExists(
    IN fkName VARCHAR(64),
    IN tableName VARCHAR(64),
    IN columnName VARCHAR(64),
    IN refTable VARCHAR(64),
    IN refColumn VARCHAR(64)
)
BEGIN
    DECLARE fk_exists INT DEFAULT 0;
    SELECT COUNT(*) INTO fk_exists
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND CONSTRAINT_NAME = fkName;

    IF fk_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName,
                          ' ADD CONSTRAINT ', fkName,
                          ' FOREIGN KEY (', columnName, ') REFERENCES ', refTable, '(', refColumn, ') ON DELETE SET NULL');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END//
DELIMITER ;

CALL AddForeignKeyIfNotExists('clientes_user_id_foreign', 'clientes', 'user_id', 'users', 'id');
CALL AddForeignKeyIfNotExists('fornecedores_user_id_foreign', 'fornecedores', 'user_id', 'users', 'id');
CALL AddForeignKeyIfNotExists('compras_user_id_foreign', 'compras', 'user_id', 'users', 'id');
CALL AddForeignKeyIfNotExists('produtos_user_id_foreign', 'produtos', 'user_id', 'users', 'id');

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================