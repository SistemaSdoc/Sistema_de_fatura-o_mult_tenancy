-- ============================================================
-- Preencher tenant_id em todas as tabelas do mwamba_db
-- Tenant fixo: b9142669-dfc7-4d46-a015-ea4ffbdf587a
-- ============================================================

USE `mwamba_db`;

START TRANSACTION;

-- 1. Actualizar todas as tabelas que possuem tenant_id
UPDATE `adiantamento_fatura`   SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `apuramento_iva`        SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `categorias`            SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `clientes`              SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `compras`               SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `documentos_fiscais`    SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `empresa_mensagens`     SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `fornecedores`          SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `historico_precos`      SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `itens_compras`         SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `itens_documento_fiscal` SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `itens_venda`           SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `logs_auditoria`        SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `logs_fiscais`          SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `movimentos_stock`      SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';

-- 2. Verificação: devem retornar 0 para todas as linhas
SELECT 'adiantamento_fatura'   AS Tabela, COUNT(*) AS Registos_Sem_Tenant FROM `adiantamento_fatura`   WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'apuramento_iva',        COUNT(*) FROM `apuramento_iva`        WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'categorias',            COUNT(*) FROM `categorias`            WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'clientes',              COUNT(*) FROM `clientes`              WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'compras',               COUNT(*) FROM `compras`               WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'documentos_fiscais',    COUNT(*) FROM `documentos_fiscais`    WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'empresa_mensagens',     COUNT(*) FROM `empresa_mensagens`     WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'fornecedores',          COUNT(*) FROM `fornecedores`          WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'historico_precos',      COUNT(*) FROM `historico_precos`      WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'itens_compras',         COUNT(*) FROM `itens_compras`         WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'itens_documento_fiscal',COUNT(*) FROM `itens_documento_fiscal` WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'itens_venda',           COUNT(*) FROM `itens_venda`           WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'logs_auditoria',        COUNT(*) FROM `logs_auditoria`        WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'logs_fiscais',          COUNT(*) FROM `logs_fiscais`          WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'movimentos_stock',      COUNT(*) FROM `movimentos_stock`      WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL;

COMMIT;