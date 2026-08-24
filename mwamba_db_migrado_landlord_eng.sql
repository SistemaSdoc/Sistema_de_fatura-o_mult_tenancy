-- MySQL dump 10.13  Distrib 8.4.10, for Linux (x86_64)
--
-- Host: localhost    Database: mwamba_db_landlord
-- ------------------------------------------------------
-- Server version	8.4.10-0ubuntu0.26.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `mwamba_db_landlord`
--

/*!40000 DROP DATABASE IF EXISTS `mwamba_db_landlord`*/;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `mwamba_db_landlord` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `mwamba_db_landlord`;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache`
--

LOCK TABLES `cache` WRITE;
/*!40000 ALTER TABLE `cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache_locks`
--

LOCK TABLES `cache_locks` WRITE;
/*!40000 ALTER TABLE `cache_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_locks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `empresa_mensagens`
--

DROP TABLE IF EXISTS `empresa_mensagens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `empresa_mensagens` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `empresa_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `remetente_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remetente_tipo` enum('landlord','empresa') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `remetente_nome` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remetente_email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mensagem` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `lida` tinyint(1) NOT NULL DEFAULT '0',
  `lida_em` timestamp NULL DEFAULT NULL,
  `eliminada_pelo_cliente` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `empresa_mensagens_empresa_id_created_at_index` (`empresa_id`,`created_at`),
  KEY `empresa_mensagens_empresa_id_index` (`empresa_id`),
  KEY `empresa_mensagens_remetente_id_index` (`remetente_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `empresa_mensagens`
--

LOCK TABLES `empresa_mensagens` WRITE;
/*!40000 ALTER TABLE `empresa_mensagens` DISABLE KEYS */;
/*!40000 ALTER TABLE `empresa_mensagens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `empresas`
--

DROP TABLE IF EXISTS `empresas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `empresas` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nif` varchar(14) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endereco` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `db_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `subdomain` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `modo` enum('singular','colectivo') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'colectivo',
  `regime_fiscal` enum('simplificado','geral') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'geral',
  `sujeito_iva` tinyint(1) NOT NULL DEFAULT '1',
  `iva_padrao` decimal(5,2) NOT NULL DEFAULT '14.00',
  `nome_banco` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_conta` varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `iban` varchar(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('ativo','suspenso') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ativo',
  `data_registro` date DEFAULT NULL,
  `data_ativacao` date DEFAULT NULL,
  `data_desativacao` date DEFAULT NULL,
  `cidade` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pais` varchar(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AO',
  `website` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fax` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `software_validation_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `empresas_email_unique` (`email`),
  UNIQUE KEY `empresas_subdomain_unique` (`subdomain`),
  UNIQUE KEY `empresas_nif_unique` (`nif`),
  UNIQUE KEY `empresas_numero_conta_unique` (`numero_conta`),
  UNIQUE KEY `empresas_iban_unique` (`iban`),
  KEY `empresas_subdomain_index` (`subdomain`),
  KEY `empresas_status_index` (`status`),
  KEY `empresas_regime_fiscal_index` (`regime_fiscal`),
  KEY `empresas_sujeito_iva_index` (`sujeito_iva`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `empresas`
--

LOCK TABLES `empresas` WRITE;
/*!40000 ALTER TABLE `empresas` DISABLE KEYS */;
INSERT INTO `empresas` VALUES ('b9142669-dfc7-4d46-a015-ea4ffbdf587a','b9142669-dfc7-4d46-a015-ea4ffbdf587a','MWAMBA-COMERCIAL, COMERCIO A RETALHO','2484011121','mwamba@gmail.com','+244 938 747 267','Rua do Paiol, Bairro Gameke, (Proximo da Farmacia Pedrito), Provincia de Luanda','mwamba_db','mwamba','colectivo','simplificado',0,14.00,NULL,NULL,NULL,'logos/logo_b9142669-dfc7-4d46-a015-ea4ffbdf587a_1781000463.jpeg','ativo','2026-05-05','2026-05-05',NULL,NULL,'AO',NULL,NULL,NULL,'2026-05-05 13:34:22','2026-06-09 09:21:21');
/*!40000 ALTER TABLE `empresas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `failed_jobs`
--

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `features`
--

DROP TABLE IF EXISTS `features`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `features` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `icone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `features`
--

LOCK TABLES `features` WRITE;
/*!40000 ALTER TABLE `features` DISABLE KEYS */;
INSERT INTO `features` VALUES ('0229b4d6-4330-462e-8dea-7f1014954cd2','b9142669-dfc7-4d46-a015-ea4ffbdf587a','API','Integre o FaturaJá com outros sistemas via API','fa-code',1,'2026-08-20 08:03:39','2026-08-20 08:03:39'),('0dafdb45-79f7-43a7-90d1-524524ec14d3','b9142669-dfc7-4d46-a015-ea4ffbdf587a','Exportação SAFT‑AO','Exporte o ficheiro SAFT‑AO para a Autoridade Tributária','fa-file-export',1,'2026-08-20 08:03:40','2026-08-20 08:03:40'),('0e3f445d-8de3-42ac-b808-094615a1e5c5','b9142669-dfc7-4d46-a015-ea4ffbdf587a','Logótipo','Personalize os seus documentos com o logótipo da empresa','fa-image',1,'2026-08-20 08:03:40','2026-08-20 08:03:40'),('1855054f-174d-4b89-adb9-45d85d220f9c','b9142669-dfc7-4d46-a015-ea4ffbdf587a','Relatórios Financeiros','Acompanhe vendas, faturação e desempenho com relatórios','fa-chart-line',1,'2026-08-20 08:03:40','2026-08-20 08:03:40'),('2f7a2c64-cb8c-4270-99fd-fb6e7da6ad3a','b9142669-dfc7-4d46-a015-ea4ffbdf587a','Moeda Estrangeira','Emita documentos em moeda estrangeira','fa-dollar-sign',1,'2026-08-20 08:03:40','2026-08-20 08:03:40'),('5ed8320f-4926-41ce-9041-2dd0a4fc112d','b9142669-dfc7-4d46-a015-ea4ffbdf587a','Utilizadores','Número de utilizadores activos na sua empresa','fa-user-plus',1,'2026-08-20 08:03:39','2026-08-20 08:03:39'),('7074982f-7801-4cb6-b9f0-2dff270b6735','b9142669-dfc7-4d46-a015-ea4ffbdf587a','Gestão de Produtos','Gerencie produtos e serviços com controlo de stock','fa-boxes',1,'2026-08-20 08:03:39','2026-08-20 08:03:39'),('72916a16-8a71-41d9-8f85-09d16bcdba37','b9142669-dfc7-4d46-a015-ea4ffbdf587a','Assinatura Digital','Assine digitalmente os seus documentos fiscais','fa-file-signature',1,'2026-08-20 08:03:40','2026-08-20 08:03:40'),('7a714b51-82da-412a-9e1f-8517d2e0d77a','b9142669-dfc7-4d46-a015-ea4ffbdf587a','Envio por Email','Envie documentos fiscais directamente por email','fa-envelope',1,'2026-08-20 08:03:39','2026-08-20 08:03:39'),('8ac76098-3325-4e75-a5d1-93f22adbbe67','b9142669-dfc7-4d46-a015-ea4ffbdf587a','usuarios','usuarios',NULL,1,'2026-08-20 07:51:31','2026-08-20 07:51:31'),('a33f0c87-d405-4da7-acaa-3cc798ba053d','b9142669-dfc7-4d46-a015-ea4ffbdf587a','faturas','faturas',NULL,1,'2026-08-20 07:51:17','2026-08-20 07:51:17'),('a49e06a5-11f3-4e31-a242-768c510b8483','b9142669-dfc7-4d46-a015-ea4ffbdf587a','Gestão de Clientes','Cadastre e gerencie todos os seus clientes','fa-users',1,'2026-08-20 08:03:39','2026-08-20 08:03:39'),('ad009274-421e-4a10-8e2f-10efb7cf37bd','b9142669-dfc7-4d46-a015-ea4ffbdf587a','Documentos/mês','Número de documentos fiscais que pode emitir por mês','fa-file-invoice',1,'2026-08-20 08:03:39','2026-08-20 08:03:39'),('bc553626-65d1-4314-b9e0-e842c64e5ba8','b9142669-dfc7-4d46-a015-ea4ffbdf587a','Suporte Técnico','Atendimento prioritário e suporte especializado','fa-headset',1,'2026-08-20 08:03:39','2026-08-20 08:03:39'),('c5c9966c-e664-4297-8ad4-f466fad87244','b9142669-dfc7-4d46-a015-ea4ffbdf587a','documentos',NULL,NULL,1,'2026-08-20 07:56:39','2026-08-20 07:56:39'),('d1f392af-ba6f-4cdd-94e5-1ee131a27538','b9142669-dfc7-4d46-a015-ea4ffbdf587a','Impressão em Talões','Imprima documentos em impressoras térmicas (talões)','fa-print',1,'2026-08-20 08:03:40','2026-08-20 08:03:40'),('e4639feb-2572-4a8b-bfea-931c50295328','b9142669-dfc7-4d46-a015-ea4ffbdf587a','Versão Mobile','Aceda à plataforma em dispositivos móveis','fa-mobile-alt',1,'2026-08-20 08:03:39','2026-08-20 08:03:39');
/*!40000 ALTER TABLE `features` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_batches`
--

LOCK TABLES `job_batches` WRITE;
/*!40000 ALTER TABLE `job_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'2025_12_11_172047_create_personal_access_tokens_table',1),(2,'2026_01_14_112709_create_users_table',1),(3,'2026_01_14_112932_create_categorias_table',1),(4,'2026_01_14_113007_create_produtos_table',1),(5,'2026_01_14_113047_create_fornecedores_table',1),(6,'2026_01_14_113146_create_clientes_table',1),(7,'2026_01_14_113218_create_compras_table',1),(8,'2026_01_14_113218_create_historicos_precos_table',1),(9,'2026_01_14_114052_create_vendas_table',1),(10,'2026_01_14_114416_create_movimentos_stock_table',1),(11,'2026_01_14_114457_create_logs_auditoria_table',1),(12,'2026_02_01_190435_create_logs_fiscais_table',1),(13,'2026_02_01_190520_create_series_fiscais_table',1),(14,'2026_02_01_190605_create_apuramento_iva_table',1),(15,'2026_02_11_084944_fix_movimentos_stock_foreign_key',1),(16,'2026_02_17_172921_create_documentos_fiscais_table',1),(17,'2026_02_20_082431_add_fp_to_documentos_fiscais',1),(18,'2026_04_09_131427_add_desconto_global_and_troco_to_vendas_table',1),(19,'2026_04_15_125915_add_taxa_iva_to_categorias_table',1),(20,'2026_04_15_135612_add_softdeletes_to_categorias_table',1);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notificacoes`
--

DROP TABLE IF EXISTS `notificacoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificacoes` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `titulo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensagem` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('info','warning','danger') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `lida` tinyint(1) NOT NULL DEFAULT '0',
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Se null, é notificação global',
  `pagamento_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificacoes`
--

LOCK TABLES `notificacoes` WRITE;
/*!40000 ALTER TABLE `notificacoes` DISABLE KEYS */;
INSERT INTO `notificacoes` VALUES ('01a01e60-85f3-70fc-af53-4faf28df79e6','b9142669-dfc7-4d46-a015-ea4ffbdf587a','Novo comprovativo aguarda análise','A empresa **MWAMBA-COMERCIAL, COMERCIO A RETALHO** enviou um comprovativo de pagamento no valor de **1.000,00 AOA**. Analise e aprove ou rejeite.','info',1,NULL,'6d754d51-21ab-448b-812d-f7b8a3f2119f','2026-08-20 07:53:57','2026-08-20 07:54:33'),('01a01e6c-295f-7032-b52f-9bb2a77b9f8f','b9142669-dfc7-4d46-a015-ea4ffbdf587a','Novo comprovativo aguarda análise','A empresa **MWAMBA-COMERCIAL, COMERCIO A RETALHO** enviou um comprovativo de pagamento no valor de **9.633,00 AOA**. Analise e aprove ou rejeite.','info',1,NULL,'51440f53-160c-457e-a3fe-4a81f61f7b09','2026-08-20 08:06:40','2026-08-20 08:06:47');
/*!40000 ALTER TABLE `notificacoes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pagamentos`
--

DROP TABLE IF EXISTS `pagamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pagamentos` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plano_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `empresa_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subscricao_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `valor` decimal(10,2) NOT NULL,
  `data_pagamento` timestamp NULL DEFAULT NULL,
  `data_vencimento` date DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendente',
  `metodo_pagamento` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `codigo_transacao` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descricao` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `parcelas` int NOT NULL DEFAULT '1',
  `motivo_rejeicao` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `comprovativo_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pagamentos_empresa_id_foreign` (`empresa_id`),
  KEY `pagamentos_plano_id_foreign` (`plano_id`),
  KEY `pagamentos_subscricao_id_index` (`subscricao_id`),
  KEY `pagamentos_status_index` (`status`),
  KEY `pagamentos_data_vencimento_index` (`data_vencimento`),
  CONSTRAINT `pagamentos_empresa_id_foreign` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pagamentos_plano_id_foreign` FOREIGN KEY (`plano_id`) REFERENCES `planos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pagamentos_subscricao_id_foreign` FOREIGN KEY (`subscricao_id`) REFERENCES `subscricoes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pagamentos`
--

LOCK TABLES `pagamentos` WRITE;
/*!40000 ALTER TABLE `pagamentos` DISABLE KEYS */;
INSERT INTO `pagamentos` VALUES ('51440f53-160c-457e-a3fe-4a81f61f7b09','b9142669-dfc7-4d46-a015-ea4ffbdf587a','64ef8ed5-9261-4b37-9ccc-88ffaffcf216','b9142669-dfc7-4d46-a015-ea4ffbdf587a','a2e04b13-c7d5-4325-8f91-019fa73669c5',9633.00,'2026-08-20 08:06:47','2026-08-25','pago','transferencia','REF-XWJFG93W','Assinatura do plano Plus',1,NULL,'comprovativos/t4HunVtTzNMpp0tOYrUMa5OZUF6RtOHkt2lHH1ON.pdf','2026-08-20 08:05:47','2026-08-20 08:06:47'),('6d754d51-21ab-448b-812d-f7b8a3f2119f','b9142669-dfc7-4d46-a015-ea4ffbdf587a','99dc6306-2981-47e8-b218-786eae8ae1f8','b9142669-dfc7-4d46-a015-ea4ffbdf587a','e74aa0aa-2434-4811-9853-ba4f73aed1eb',1000.00,'2026-08-20 07:54:32','2026-08-25','pago','transferencia','REF-QL0NTVVD','Assinatura do plano MWAMBA',1,NULL,'comprovativos/EZPdRq6tzPxx6WBD2gVZ2pwbyZTnnV4Tl48YQ2O6.pdf','2026-08-20 07:53:11','2026-08-20 07:54:32');
/*!40000 ALTER TABLE `pagamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  KEY `password_reset_tokens_email_index` (`email`),
  KEY `password_reset_tokens_tenant_id_index` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `planos`
--

DROP TABLE IF EXISTS `planos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `planos` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `valor_trimestral` decimal(10,2) DEFAULT NULL,
  `valor_semestral` decimal(10,2) DEFAULT NULL,
  `valor_mensal` decimal(10,2) NOT NULL,
  `valor_anual` decimal(10,2) DEFAULT NULL,
  `duracao_meses` int NOT NULL DEFAULT '1',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `planos`
--

LOCK TABLES `planos` WRITE;
/*!40000 ALTER TABLE `planos` DISABLE KEYS */;
INSERT INTO `planos` VALUES ('211fe308-9f18-4bf9-b160-d95b0c8b3296','b9142669-dfc7-4d46-a015-ea4ffbdf587a','Mini','Ideal para pequenos negócios que estão a começar.',19600.00,36100.00,6533.00,69000.00,12,1,'2026-08-20 08:03:40','2026-08-20 08:03:40'),('379216bc-81fb-456c-af6e-1f8be937ab17','b9142669-dfc7-4d46-a015-ea4ffbdf587a','Kuia','Para empresas em crescimento com maior volume de documentos.',23000.00,42780.00,7666.00,74900.00,12,1,'2026-08-20 08:03:41','2026-08-20 08:03:41'),('59273acf-50e2-47a8-9e8a-ce2baefcd822','b9142669-dfc7-4d46-a015-ea4ffbdf587a','Experimental','Plano gratuito para experimentar a plataforma durante 30 dias.',0.00,0.00,0.00,0.00,1,1,'2026-08-20 08:03:40','2026-08-20 08:03:40'),('64ef8ed5-9261-4b37-9ccc-88ffaffcf216','b9142669-dfc7-4d46-a015-ea4ffbdf587a','Plus','Solução completa para grandes empresas com alto volume.',28900.00,44200.00,9633.00,82600.00,12,1,'2026-08-20 08:03:42','2026-08-20 08:18:39'),('99dc6306-2981-47e8-b218-786eae8ae1f8','b9142669-dfc7-4d46-a015-ea4ffbdf587a','MWAMBA','especifico',NULL,NULL,1000.00,12000.00,3,1,'2026-08-20 07:51:59','2026-08-20 07:56:53');
/*!40000 ALTER TABLE `planos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `planos_features`
--

DROP TABLE IF EXISTS `planos_features`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `planos_features` (
  `plano_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `feature_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantidade` int NOT NULL DEFAULT '1',
  `unidade` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`plano_id`,`feature_id`),
  KEY `planos_features_feature_id_foreign` (`feature_id`),
  CONSTRAINT `planos_features_feature_id_foreign` FOREIGN KEY (`feature_id`) REFERENCES `features` (`id`) ON DELETE CASCADE,
  CONSTRAINT `planos_features_plano_id_foreign` FOREIGN KEY (`plano_id`) REFERENCES `planos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `planos_features`
--

LOCK TABLES `planos_features` WRITE;
/*!40000 ALTER TABLE `planos_features` DISABLE KEYS */;
INSERT INTO `planos_features` VALUES ('211fe308-9f18-4bf9-b160-d95b0c8b3296','0229b4d6-4330-462e-8dea-7f1014954cd2',1,NULL,'2026-08-20 08:03:41','2026-08-20 08:03:41'),('211fe308-9f18-4bf9-b160-d95b0c8b3296','0dafdb45-79f7-43a7-90d1-524524ec14d3',1,NULL,'2026-08-20 08:03:41','2026-08-20 08:03:41'),('211fe308-9f18-4bf9-b160-d95b0c8b3296','0e3f445d-8de3-42ac-b808-094615a1e5c5',1,NULL,'2026-08-20 08:03:41','2026-08-20 08:03:41'),('211fe308-9f18-4bf9-b160-d95b0c8b3296','1855054f-174d-4b89-adb9-45d85d220f9c',1,NULL,'2026-08-20 08:03:41','2026-08-20 08:03:41'),('211fe308-9f18-4bf9-b160-d95b0c8b3296','2f7a2c64-cb8c-4270-99fd-fb6e7da6ad3a',1,NULL,'2026-08-20 08:03:41','2026-08-20 08:03:41'),('211fe308-9f18-4bf9-b160-d95b0c8b3296','5ed8320f-4926-41ce-9041-2dd0a4fc112d',3,'utilizadores','2026-08-20 08:03:41','2026-08-20 08:03:41'),('211fe308-9f18-4bf9-b160-d95b0c8b3296','7074982f-7801-4cb6-b9f0-2dff270b6735',1,NULL,'2026-08-20 08:03:41','2026-08-20 08:03:41'),('211fe308-9f18-4bf9-b160-d95b0c8b3296','72916a16-8a71-41d9-8f85-09d16bcdba37',1,NULL,'2026-08-20 08:03:41','2026-08-20 08:03:41'),('211fe308-9f18-4bf9-b160-d95b0c8b3296','7a714b51-82da-412a-9e1f-8517d2e0d77a',1,NULL,'2026-08-20 08:03:41','2026-08-20 08:03:41'),('211fe308-9f18-4bf9-b160-d95b0c8b3296','a49e06a5-11f3-4e31-a242-768c510b8483',1,NULL,'2026-08-20 08:03:40','2026-08-20 08:03:40'),('211fe308-9f18-4bf9-b160-d95b0c8b3296','ad009274-421e-4a10-8e2f-10efb7cf37bd',750,'documentos','2026-08-20 08:03:41','2026-08-20 08:03:41'),('211fe308-9f18-4bf9-b160-d95b0c8b3296','bc553626-65d1-4314-b9e0-e842c64e5ba8',1,NULL,'2026-08-20 08:03:41','2026-08-20 08:03:41'),('211fe308-9f18-4bf9-b160-d95b0c8b3296','d1f392af-ba6f-4cdd-94e5-1ee131a27538',1,NULL,'2026-08-20 08:03:41','2026-08-20 08:03:41'),('211fe308-9f18-4bf9-b160-d95b0c8b3296','e4639feb-2572-4a8b-bfea-931c50295328',1,NULL,'2026-08-20 08:03:41','2026-08-20 08:03:41'),('379216bc-81fb-456c-af6e-1f8be937ab17','0229b4d6-4330-462e-8dea-7f1014954cd2',1,NULL,'2026-08-20 08:03:41','2026-08-20 08:03:41'),('379216bc-81fb-456c-af6e-1f8be937ab17','0dafdb45-79f7-43a7-90d1-524524ec14d3',1,NULL,'2026-08-20 08:03:42','2026-08-20 08:03:42'),('379216bc-81fb-456c-af6e-1f8be937ab17','0e3f445d-8de3-42ac-b808-094615a1e5c5',1,NULL,'2026-08-20 08:03:41','2026-08-20 08:03:41'),('379216bc-81fb-456c-af6e-1f8be937ab17','1855054f-174d-4b89-adb9-45d85d220f9c',1,NULL,'2026-08-20 08:03:42','2026-08-20 08:03:42'),('379216bc-81fb-456c-af6e-1f8be937ab17','2f7a2c64-cb8c-4270-99fd-fb6e7da6ad3a',1,NULL,'2026-08-20 08:03:42','2026-08-20 08:03:42'),('379216bc-81fb-456c-af6e-1f8be937ab17','5ed8320f-4926-41ce-9041-2dd0a4fc112d',8,'utilizadores','2026-08-20 08:03:41','2026-08-20 08:03:41'),('379216bc-81fb-456c-af6e-1f8be937ab17','7074982f-7801-4cb6-b9f0-2dff270b6735',1,NULL,'2026-08-20 08:03:41','2026-08-20 08:03:41'),('379216bc-81fb-456c-af6e-1f8be937ab17','72916a16-8a71-41d9-8f85-09d16bcdba37',1,NULL,'2026-08-20 08:03:42','2026-08-20 08:03:42'),('379216bc-81fb-456c-af6e-1f8be937ab17','7a714b51-82da-412a-9e1f-8517d2e0d77a',1,NULL,'2026-08-20 08:03:41','2026-08-20 08:03:41'),('379216bc-81fb-456c-af6e-1f8be937ab17','a49e06a5-11f3-4e31-a242-768c510b8483',1,NULL,'2026-08-20 08:03:41','2026-08-20 08:03:41'),('379216bc-81fb-456c-af6e-1f8be937ab17','ad009274-421e-4a10-8e2f-10efb7cf37bd',1000,'documentos','2026-08-20 08:03:41','2026-08-20 08:03:41'),('379216bc-81fb-456c-af6e-1f8be937ab17','bc553626-65d1-4314-b9e0-e842c64e5ba8',1,NULL,'2026-08-20 08:03:41','2026-08-20 08:03:41'),('379216bc-81fb-456c-af6e-1f8be937ab17','d1f392af-ba6f-4cdd-94e5-1ee131a27538',1,NULL,'2026-08-20 08:03:42','2026-08-20 08:03:42'),('379216bc-81fb-456c-af6e-1f8be937ab17','e4639feb-2572-4a8b-bfea-931c50295328',1,NULL,'2026-08-20 08:03:41','2026-08-20 08:03:41'),('59273acf-50e2-47a8-9e8a-ce2baefcd822','0229b4d6-4330-462e-8dea-7f1014954cd2',0,NULL,'2026-08-20 08:03:40','2026-08-20 08:03:40'),('59273acf-50e2-47a8-9e8a-ce2baefcd822','0dafdb45-79f7-43a7-90d1-524524ec14d3',0,NULL,'2026-08-20 08:03:40','2026-08-20 08:03:40'),('59273acf-50e2-47a8-9e8a-ce2baefcd822','0e3f445d-8de3-42ac-b808-094615a1e5c5',0,NULL,'2026-08-20 08:03:40','2026-08-20 08:03:40'),('59273acf-50e2-47a8-9e8a-ce2baefcd822','1855054f-174d-4b89-adb9-45d85d220f9c',1,NULL,'2026-08-20 08:03:40','2026-08-20 08:03:40'),('59273acf-50e2-47a8-9e8a-ce2baefcd822','2f7a2c64-cb8c-4270-99fd-fb6e7da6ad3a',0,NULL,'2026-08-20 08:03:40','2026-08-20 08:03:40'),('59273acf-50e2-47a8-9e8a-ce2baefcd822','5ed8320f-4926-41ce-9041-2dd0a4fc112d',1,'utilizador','2026-08-20 08:03:40','2026-08-20 08:03:40'),('59273acf-50e2-47a8-9e8a-ce2baefcd822','7074982f-7801-4cb6-b9f0-2dff270b6735',1,NULL,'2026-08-20 08:03:40','2026-08-20 08:03:40'),('59273acf-50e2-47a8-9e8a-ce2baefcd822','72916a16-8a71-41d9-8f85-09d16bcdba37',0,NULL,'2026-08-20 08:03:40','2026-08-20 08:03:40'),('59273acf-50e2-47a8-9e8a-ce2baefcd822','7a714b51-82da-412a-9e1f-8517d2e0d77a',1,NULL,'2026-08-20 08:03:40','2026-08-20 08:03:40'),('59273acf-50e2-47a8-9e8a-ce2baefcd822','a49e06a5-11f3-4e31-a242-768c510b8483',1,NULL,'2026-08-20 08:03:40','2026-08-20 08:03:40'),('59273acf-50e2-47a8-9e8a-ce2baefcd822','ad009274-421e-4a10-8e2f-10efb7cf37bd',50,'documentos','2026-08-20 08:03:40','2026-08-20 08:03:40'),('59273acf-50e2-47a8-9e8a-ce2baefcd822','bc553626-65d1-4314-b9e0-e842c64e5ba8',1,NULL,'2026-08-20 08:03:40','2026-08-20 08:03:40'),('59273acf-50e2-47a8-9e8a-ce2baefcd822','d1f392af-ba6f-4cdd-94e5-1ee131a27538',1,NULL,'2026-08-20 08:03:40','2026-08-20 08:03:40'),('59273acf-50e2-47a8-9e8a-ce2baefcd822','e4639feb-2572-4a8b-bfea-931c50295328',1,NULL,'2026-08-20 08:03:40','2026-08-20 08:03:40'),('64ef8ed5-9261-4b37-9ccc-88ffaffcf216','0229b4d6-4330-462e-8dea-7f1014954cd2',1,NULL,'2026-08-20 08:18:40','2026-08-20 08:18:40'),('64ef8ed5-9261-4b37-9ccc-88ffaffcf216','0dafdb45-79f7-43a7-90d1-524524ec14d3',1,NULL,'2026-08-20 08:18:41','2026-08-20 08:18:41'),('64ef8ed5-9261-4b37-9ccc-88ffaffcf216','0e3f445d-8de3-42ac-b808-094615a1e5c5',1,NULL,'2026-08-20 08:18:41','2026-08-20 08:18:41'),('64ef8ed5-9261-4b37-9ccc-88ffaffcf216','1855054f-174d-4b89-adb9-45d85d220f9c',1,NULL,'2026-08-20 08:18:41','2026-08-20 08:18:41'),('64ef8ed5-9261-4b37-9ccc-88ffaffcf216','2f7a2c64-cb8c-4270-99fd-fb6e7da6ad3a',1,NULL,'2026-08-20 08:18:41','2026-08-20 08:18:41'),('64ef8ed5-9261-4b37-9ccc-88ffaffcf216','5ed8320f-4926-41ce-9041-2dd0a4fc112d',15,'utilizadores','2026-08-20 08:18:41','2026-08-20 08:18:41'),('64ef8ed5-9261-4b37-9ccc-88ffaffcf216','7074982f-7801-4cb6-b9f0-2dff270b6735',1,NULL,'2026-08-20 08:18:41','2026-08-20 08:18:41'),('64ef8ed5-9261-4b37-9ccc-88ffaffcf216','72916a16-8a71-41d9-8f85-09d16bcdba37',1,NULL,'2026-08-20 08:18:40','2026-08-20 08:18:40'),('64ef8ed5-9261-4b37-9ccc-88ffaffcf216','7a714b51-82da-412a-9e1f-8517d2e0d77a',1,NULL,'2026-08-20 08:18:41','2026-08-20 08:18:41'),('64ef8ed5-9261-4b37-9ccc-88ffaffcf216','a49e06a5-11f3-4e31-a242-768c510b8483',1,NULL,'2026-08-20 08:18:41','2026-08-20 08:18:41'),('64ef8ed5-9261-4b37-9ccc-88ffaffcf216','ad009274-421e-4a10-8e2f-10efb7cf37bd',5000,'documentos','2026-08-20 08:18:40','2026-08-20 08:18:40'),('64ef8ed5-9261-4b37-9ccc-88ffaffcf216','bc553626-65d1-4314-b9e0-e842c64e5ba8',1,NULL,'2026-08-20 08:18:41','2026-08-20 08:18:41'),('64ef8ed5-9261-4b37-9ccc-88ffaffcf216','c5c9966c-e664-4297-8ad4-f466fad87244',-1,'mes','2026-08-20 08:18:40','2026-08-20 08:18:40'),('64ef8ed5-9261-4b37-9ccc-88ffaffcf216','d1f392af-ba6f-4cdd-94e5-1ee131a27538',1,NULL,'2026-08-20 08:18:41','2026-08-20 08:18:41'),('64ef8ed5-9261-4b37-9ccc-88ffaffcf216','e4639feb-2572-4a8b-bfea-931c50295328',1,NULL,'2026-08-20 08:18:42','2026-08-20 08:18:42'),('99dc6306-2981-47e8-b218-786eae8ae1f8','8ac76098-3325-4e75-a5d1-93f22adbbe67',-1,'usuarios','2026-08-20 07:56:53','2026-08-20 07:56:53'),('99dc6306-2981-47e8-b218-786eae8ae1f8','a33f0c87-d405-4da7-acaa-3cc798ba053d',-1,'documentos','2026-08-20 07:56:53','2026-08-20 07:56:53'),('99dc6306-2981-47e8-b218-786eae8ae1f8','c5c9966c-e664-4297-8ad4-f466fad87244',-1,'mes','2026-08-20 07:56:54','2026-08-20 07:56:54');
/*!40000 ALTER TABLE `planos_features` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscricoes`
--

DROP TABLE IF EXISTS `subscricoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscricoes` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `empresa_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `plano_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `data_inicio` date NOT NULL,
  `data_fim` date DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ativa',
  `forma_pagamento` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `renovacao_automatica` tinyint(1) NOT NULL DEFAULT '1',
  `cancelado_em` date DEFAULT NULL,
  `criado_por` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `subscricoes_criado_por_foreign` (`criado_por`),
  KEY `subscricoes_empresa_id_index` (`empresa_id`),
  KEY `subscricoes_plano_id_index` (`plano_id`),
  KEY `subscricoes_status_index` (`status`),
  KEY `subscricoes_data_inicio_index` (`data_inicio`),
  KEY `subscricoes_data_fim_index` (`data_fim`),
  CONSTRAINT `subscricoes_criado_por_foreign` FOREIGN KEY (`criado_por`) REFERENCES `users_landlord` (`id`) ON DELETE SET NULL,
  CONSTRAINT `subscricoes_empresa_id_foreign` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subscricoes_plano_id_foreign` FOREIGN KEY (`plano_id`) REFERENCES `planos` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscricoes`
--

LOCK TABLES `subscricoes` WRITE;
/*!40000 ALTER TABLE `subscricoes` DISABLE KEYS */;
INSERT INTO `subscricoes` VALUES ('a2e04b13-c7d5-4325-8f91-019fa73669c5','b9142669-dfc7-4d46-a015-ea4ffbdf587a','b9142669-dfc7-4d46-a015-ea4ffbdf587a','64ef8ed5-9261-4b37-9ccc-88ffaffcf216','2026-08-20','2027-08-20','ativa','transferencia',1,NULL,NULL,'2026-08-20 08:06:47','2026-08-20 08:06:47'),('e74aa0aa-2434-4811-9853-ba4f73aed1eb','b9142669-dfc7-4d46-a015-ea4ffbdf587a','b9142669-dfc7-4d46-a015-ea4ffbdf587a','99dc6306-2981-47e8-b218-786eae8ae1f8','2026-08-20','2026-11-20','cancelada','transferencia',1,'2026-08-20',NULL,'2026-08-20 07:54:32','2026-08-20 08:04:48');
/*!40000 ALTER TABLE `subscricoes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_landlord`
--

DROP TABLE IF EXISTS `users_landlord`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_landlord` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `empresa_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `empresa_id_atual` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `google_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `google_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `google_avatar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `oauth_verified` tinyint(1) NOT NULL DEFAULT '0',
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('super_admin','admin_empresa') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'admin_empresa',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `ultimo_login` timestamp NULL DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `remember_token` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_landlord_email_unique` (`email`),
  UNIQUE KEY `users_landlord_google_id_unique` (`google_id`),
  KEY `users_landlord_empresa_id_foreign` (`empresa_id`),
  KEY `users_landlord_empresa_id_atual_foreign` (`empresa_id_atual`),
  CONSTRAINT `users_landlord_empresa_id_atual_foreign` FOREIGN KEY (`empresa_id_atual`) REFERENCES `empresas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_landlord_empresa_id_foreign` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_landlord`
--

LOCK TABLES `users_landlord` WRITE;
/*!40000 ALTER TABLE `users_landlord` DISABLE KEYS */;
INSERT INTO `users_landlord` VALUES ('304ba07b-46b2-4d6b-b138-c09c0677aec3',NULL,NULL,NULL,'isidro','isidro@mwamba.com',NULL,NULL,NULL,0,'$2y$12$BBU0cko5dMrJQvp9d9N9ueXuc82M7YeD1S7wohrm.J32.k0R7ruQq','super_admin',1,NULL,NULL,NULL,'2026-08-19 13:01:22','2026-08-19 13:01:22',NULL),('a76699b2-ee08-4295-a6a5-4272d5842907','b9142669-dfc7-4d46-a015-ea4ffbdf587a',NULL,NULL,'Mwamba Admin','mwamba@gmail.com',NULL,NULL,NULL,0,'$2y$12$ghF3MmZ/W3R95BMKd1I9Ku4vI.pWqwNer57jylveKMZ7gUc6nPcZa','super_admin',1,NULL,NULL,NULL,'2026-05-05 13:37:02','2026-05-05 13:37:02',NULL),('ef513090-cd9a-43c9-a148-927dcf498d86','b9142669-dfc7-4d46-a015-ea4ffbdf587a',NULL,NULL,'mwanba1','mwamba1@gmail.com',NULL,NULL,NULL,0,'$2y$12$sHi76iByFryX5Yv9cnx8reNTA6G2IAuiqVuWLMf0sKDhqv7.WYgC.','super_admin',1,NULL,NULL,NULL,'2026-05-11 08:44:44','2026-05-11 08:44:44',NULL),('f66d73ed-4992-4c1f-8b3b-aec95ae187d5','b9142669-dfc7-4d46-a015-ea4ffbdf587a',NULL,NULL,'Elisa Mwamba','elisamwamba@gmail.com',NULL,NULL,NULL,0,'$2y$12$.BgkInsd7NMw4PCmeMRUNO5irkHDhzWYs0OZHz9J17FeT2S9iSEji','super_admin',1,NULL,NULL,NULL,'2026-06-09 10:26:16','2026-06-09 10:26:16',NULL);
/*!40000 ALTER TABLE `users_landlord` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'mwamba_db_landlord'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-24  2:31:32
