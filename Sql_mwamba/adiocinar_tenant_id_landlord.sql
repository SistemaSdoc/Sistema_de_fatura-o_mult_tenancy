-- ============================================================
-- Garantir tenant_id em todas as tabelas de domínio (landlord)
-- Tenant fixo: b9142669-dfc7-4d46-a015-ea4ffbdf587a
-- ============================================================

USE `mwamba_db_landlord`;

START TRANSACTION;

-- 1. Actualizar todas as tabelas que possuem a coluna tenant_id
UPDATE `empresa_mensagens`     SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `empresas`              SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `features`              SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `notificacoes`          SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `pagamentos`            SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `password_reset_tokens` SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `planos`                SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `subscricoes`           SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';
UPDATE `users_landlord`        SET `tenant_id` = 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' WHERE `tenant_id` IS NULL OR `tenant_id` = '';

-- ============================================================
-- Alterar tenant_id para permitir NULL (mwamba_db_landlord)
-- ============================================================

-- Alterar todas as tabelas com tenant_id para aceitar NULL
ALTER TABLE `empresa_mensagens`     MODIFY `tenant_id` CHAR(36) NULL;
ALTER TABLE `empresas`              MODIFY `tenant_id` CHAR(36) NULL;
ALTER TABLE `features`              MODIFY `tenant_id` CHAR(36) NULL;
ALTER TABLE `notificacoes`          MODIFY `tenant_id` CHAR(36) NULL;
ALTER TABLE `pagamentos`            MODIFY `tenant_id` CHAR(36) NULL;
ALTER TABLE `password_reset_tokens` MODIFY `tenant_id` CHAR(36) NULL;
ALTER TABLE `planos`                MODIFY `tenant_id` CHAR(36) NULL;
ALTER TABLE `subscricoes`           MODIFY `tenant_id` CHAR(36) NULL;
ALTER TABLE `users_landlord`        MODIFY `tenant_id` CHAR(36) NULL;


-- 2. Verificação: devem retornar 0 para todas as linhas
SELECT 'empresa_mensagens'     AS Tabela, COUNT(*) AS Registos_Sem_Tenant FROM `empresa_mensagens`     WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'empresas',              COUNT(*) FROM `empresas`              WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'features',              COUNT(*) FROM `features`              WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'notificacoes',          COUNT(*) FROM `notificacoes`          WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'pagamentos',            COUNT(*) FROM `pagamentos`            WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'password_reset_tokens', COUNT(*) FROM `password_reset_tokens` WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'planos',                COUNT(*) FROM `planos`                WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'subscricoes',           COUNT(*) FROM `subscricoes`           WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL
UNION ALL
SELECT 'users_landlord',        COUNT(*) FROM `users_landlord`        WHERE `tenant_id` != 'b9142669-dfc7-4d46-a015-ea4ffbdf587a' OR `tenant_id` IS NULL;

COMMIT;