-- MySQL dump 10.13  Distrib 8.4.10, for Linux (x86_64)
--
-- Host: localhost    Database: faturaja_landlord
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
-- Current Database: `faturaja_landlord`
--

/*!40000 DROP DATABASE IF EXISTS `faturaja_landlord`*/;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `faturaja_landlord` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `faturaja_landlord`;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
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
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
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
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remetente_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remetente_tipo` enum('landlord','empresa') COLLATE utf8mb4_unicode_ci NOT NULL,
  `remetente_nome` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remetente_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mensagem` text COLLATE utf8mb4_unicode_ci NOT NULL,
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
INSERT INTO `empresa_mensagens` VALUES ('019fa481-e9b1-70da-95aa-d8310117d8d7','2ce3c60a-fcf2-46fe-91c7-4a690085298c','4f4df502-4e18-4e89-9d8c-0663ca192b8b','landlord','joao Neves','joaoneves@gmail.com','tuefvb',0,NULL,0,'2026-07-27 15:56:45','2026-07-27 15:56:45'),('019fa482-31c1-72a1-a750-613cabc2b4ea','8298aa98-7ab9-45d8-8b30-b21869efe824','4f4df502-4e18-4e89-9d8c-0663ca192b8b','landlord','joao Neves','joaoneves@gmail.com','agua turva',1,'2026-07-27 15:58:00',0,'2026-07-27 15:57:03','2026-07-27 15:58:00');
/*!40000 ALTER TABLE `empresa_mensagens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `empresas`
--

DROP TABLE IF EXISTS `empresas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `empresas` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nif` varchar(14) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endereco` text COLLATE utf8mb4_unicode_ci,
  `db_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subdomain` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modo` enum('singular','colectivo') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'colectivo',
  `regime_fiscal` enum('simplificado','geral') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'geral',
  `sujeito_iva` tinyint(1) NOT NULL DEFAULT '1',
  `iva_padrao` decimal(5,2) NOT NULL DEFAULT '14.00',
  `nome_banco` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_conta` varchar(11) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `iban` varchar(25) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('ativo','suspenso') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ativo',
  `data_registro` date DEFAULT NULL,
  `data_ativacao` date DEFAULT NULL,
  `data_desativacao` date DEFAULT NULL,
  `cidade` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pais` varchar(2) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AO',
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fax` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `software_validation_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
INSERT INTO `empresas` VALUES ('2ce3c60a-fcf2-46fe-91c7-4a690085298c','Messi','1234543217','messi@gmail.com','923332443','Lunda norte','empresa_messi','messi','singular','geral',1,14.00,'Banco BPC','54656565656','AO0653453456566767687876','logos/logo_2ce3c60a-fcf2-46fe-91c7-4a690085298c_1784567286.jpeg','ativo','2026-07-20',NULL,NULL,NULL,'AO',NULL,NULL,NULL,'2026-07-20 15:53:38','2026-07-20 16:08:06'),('4e9b0ed1-dff1-445d-8515-97b9d3707b67','XMiranda','3432432434','xmiranda@gmail.com','912093028','Luanda sul','empresa_xmiranda','xmiranda','colectivo','simplificado',0,0.00,'BAI','36353453454','AO06435345435353545454554','logos/logo_4e9b0ed1-dff1-445d-8515-97b9d3707b67_1784565267.png','ativo','2026-07-20',NULL,NULL,NULL,'AO',NULL,NULL,NULL,'2026-07-20 15:33:26','2026-07-20 15:34:27'),('67ad5e98-63e6-480c-8d27-493f6ba5e7f4','Neoegoista','6546456546','neogoista@gmail.com','987543454','capalo','empresa_neoegoista','neo','singular','geral',1,14.00,'BPC','34454654663','AO06456654654654763464356','logos/logo_67ad5e98-63e6-480c-8d27-493f6ba5e7f4_1784715819.jpg','ativo','2026-07-22',NULL,NULL,NULL,'AO',NULL,NULL,NULL,'2026-07-22 09:07:31','2026-07-22 09:23:40'),('6cee8ebe-7b33-42f0-9959-4a533ae78293','Tech','1234543556','tech@gmail.com','965654545','capalo','empresa_tech','tech','singular','geral',1,14.00,'BAI','46745554654','AO06325435345345435345432','logos/logo_6cee8ebe-7b33-42f0-9959-4a533ae78293_1784633855.jpeg','ativo','2026-07-21',NULL,NULL,NULL,'AO',NULL,NULL,NULL,'2026-07-21 10:31:03','2026-07-21 10:37:39'),('6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','Mundial','8975383458','mundial@gmail.com','926173826','Luanda sul','empresa_mundial','mundial','colectivo','geral',1,14.00,'BAI','87358973467','AO06873468934634876436983','logos/logo_6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf_1785160640.jpeg','ativo','2026-07-27',NULL,NULL,NULL,'AO',NULL,NULL,NULL,'2026-07-27 12:57:19','2026-07-27 12:57:20'),('8298aa98-7ab9-45d8-8b30-b21869efe824','AGUA','7567487658','agua@gmail.com','974647657','capalo','empresa_agua','agua','colectivo','geral',1,14.00,'Isidro Manuel','76666666666','AO06785656453542456676563','logos/logo_8298aa98-7ab9-45d8-8b30-b21869efe824_1785170932.png','ativo','2026-07-27',NULL,NULL,NULL,'AO',NULL,NULL,NULL,'2026-07-27 15:48:51','2026-07-27 15:48:52'),('95e3bffb-e8f4-48eb-b1c3-bd49cbd74968','Cristiano Ronaldo','1234567890','cris@gmail.com','922334455','Luanda','empresa_cristiano_ronaldo','cris','colectivo','geral',1,14.00,'BAI','46745645654','AO06546546456757567546565','logos/logo_95e3bffb-e8f4-48eb-b1c3-bd49cbd74968_1784565850.jpeg','ativo','2026-07-20',NULL,NULL,NULL,'AO',NULL,NULL,NULL,'2026-07-20 15:44:09','2026-07-20 15:44:10');
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
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
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
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `icone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
INSERT INTO `features` VALUES ('2b7a0e82-1318-495c-981d-f5d3a6795a7a','Relatórios Financeiros','Acompanhe vendas, faturação e desempenho com relatórios','fa-chart-line',1,'2026-07-20 15:30:41','2026-07-20 15:30:41'),('301a4132-738e-4fd1-8765-07ba8683b1e2','Logótipo','Personalize os seus documentos com o logótipo da empresa','fa-image',1,'2026-07-20 15:30:41','2026-07-20 15:30:41'),('47a4c8bb-b5bc-46d0-a74f-629d5bd77a15','Suporte Técnico','Atendimento prioritário e suporte especializado','fa-headset',1,'2026-07-20 15:30:40','2026-07-20 15:30:40'),('495dfe31-e005-42eb-aefb-d5518f167351','jjjjjjjjjjj','hgggggg',NULL,1,'2026-07-21 14:46:01','2026-07-21 14:46:01'),('61af9a87-561a-4a51-a1cd-4f37c822ca90','Gestão de Clientes','Cadastre e gerencie todos os seus clientes','fa-users',1,'2026-07-20 15:30:40','2026-07-20 15:30:40'),('61dd3ee8-6b3d-4da6-97f4-94406262e497','Moeda Estrangeira','Emita documentos em moeda estrangeira','fa-dollar-sign',1,'2026-07-20 15:30:41','2026-07-20 15:30:41'),('713c2290-35fc-49eb-b444-db549003c95b','Versão Mobile','Aceda à plataforma em dispositivos móveis','fa-mobile-alt',1,'2026-07-20 15:30:40','2026-07-20 15:30:40'),('754f3be5-1678-408f-a7c6-436a183670b2','API','Integre o FaturaJá com outros sistemas via API','fa-code',1,'2026-07-20 15:30:41','2026-07-20 15:30:41'),('786425b9-8008-45f2-b542-1e472d45cc00','Envio por Email','Envie documentos fiscais directamente por email','fa-envelope',1,'2026-07-20 15:30:40','2026-07-20 15:30:40'),('8393f123-3d7d-4fbf-9b83-8c7335dd7323','Gestão de Produtos','Gerencie produtos e serviços com controlo de stock','fa-boxes',1,'2026-07-20 15:30:40','2026-07-20 15:30:40'),('8ef859d9-bedb-4381-9af9-31aa225b5444','sdfd','dfs',NULL,1,'2026-07-21 14:45:21','2026-07-21 14:45:21'),('9681a6f6-a8bd-41ba-980f-cb6680037efe','Documentos/mês','Número de documentos fiscais que pode emitir por mês','fa-file-invoice',1,'2026-07-20 15:30:40','2026-07-20 15:30:40'),('c172f888-15bc-44e8-b549-fbf3eaa464ba','Exportação SAFT‑AO','Exporte o ficheiro SAFT‑AO para a Autoridade Tributária','fa-file-export',1,'2026-07-20 15:30:41','2026-07-20 15:30:41'),('d6ef56c1-88aa-4ca3-b69d-bd47880cd48c','Assinatura Digital','Assine digitalmente os seus documentos fiscais','fa-file-signature',1,'2026-07-20 15:30:41','2026-07-20 15:30:41'),('e29fa028-985d-4c32-941a-bc3512eb69a3','Impressão em Talões','Imprima documentos em impressoras térmicas (talões)','fa-print',1,'2026-07-20 15:30:41','2026-07-20 15:30:41'),('f9e3ce84-ebc6-4059-9749-bc39bc8ef1ca','Utilizadores','Número de utilizadores activos na sua empresa','fa-user-plus',1,'2026-07-20 15:30:40','2026-07-20 15:30:40');
/*!40000 ALTER TABLE `features` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
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
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
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
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'0001_01_01_000001_create_cache_table',1),(2,'0001_01_01_000002_create_jobs_table',1),(3,'2019_09_15_000010_create_empresas_table',1),(4,'2025_12_12_145039_create_sessions_table',1),(5,'2026_04_06_145456_users_landlord_table',1),(6,'2026_06_29_000001_add_iva_padrao_to_empresas_table',1),(7,'2026_06_30_105743_create_password_reset_tokens_table',1),(8,'2026_07_01_104436_create_planos_table',1),(9,'2026_07_01_104514_create_features_table',1),(10,'2026_07_01_104541_create_planos_features_table',1),(11,'2026_07_01_104612_create_subscricoes_table',1),(12,'2026_07_01_104627_create_pagamentos_table',1),(13,'2026_07_02_add_oauth_to_landlord_users',1),(14,'2026_07_15_083341_create_notificacoes_table',1),(15,'2026_07_22_000001_create_empresa_mensagens_table',2),(16,'2026_07_27_150944_add_referencia_to_notificacoes_table',3);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notificacoes`
--

DROP TABLE IF EXISTS `notificacoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificacoes` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `titulo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensagem` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('info','warning','danger') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `lida` tinyint(1) NOT NULL DEFAULT '0',
  `user_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Se null, é notificação global',
  `pagamento_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
INSERT INTO `notificacoes` VALUES ('019fa47b-b399-73eb-ab8b-d5f2469b8ac2','Novo comprovativo aguarda análise','A empresa **AGUA** enviou um comprovativo de pagamento no valor de **6.533,00 AOA**. Analise e aprove ou rejeite.','info',1,NULL,'6d0067ce-0ff3-4237-a70c-8d75cc6e1af7','2026-07-27 15:49:58','2026-07-27 15:52:14'),('019fa47d-7580-73b3-bf6b-6d3e84e09d3c','Novo comprovativo aguarda análise','A empresa **AGUA** enviou um comprovativo de pagamento no valor de **6.533,00 AOA**. Analise e aprove ou rejeite.','info',1,NULL,'6d0067ce-0ff3-4237-a70c-8d75cc6e1af7','2026-07-27 15:51:53','2026-07-27 15:52:14');
/*!40000 ALTER TABLE `notificacoes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pagamentos`
--

DROP TABLE IF EXISTS `pagamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pagamentos` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plano_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subscricao_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `valor` decimal(10,2) NOT NULL,
  `data_pagamento` timestamp NULL DEFAULT NULL,
  `data_vencimento` date DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendente',
  `metodo_pagamento` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `codigo_transacao` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `parcelas` int NOT NULL DEFAULT '1',
  `motivo_rejeicao` text COLLATE utf8mb4_unicode_ci,
  `comprovativo_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
INSERT INTO `pagamentos` VALUES ('0bc7b704-fd01-42e9-947c-fd9e570acafd','3c747bf3-efaa-460d-98bf-5baca1c01bf5','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','c0655306-cb64-4aa2-bb5e-5a607327fe76',7666.00,'2026-07-27 13:01:19','2026-08-01','pago','cartao_credito','REF-UJHDOFMX','Assinatura do plano Mini',1,NULL,'comprovativos/b8Ce6X76lwsplsRZsO6MgGIMUoyp7yOMTWouO7Z2.pdf','2026-07-27 12:57:21','2026-07-27 13:01:19'),('1c595270-b38c-45aa-9ba7-4d1dfe9581b6','3c747bf3-efaa-460d-98bf-5baca1c01bf5','95e3bffb-e8f4-48eb-b1c3-bd49cbd74968','2ca5aba3-2120-4d02-9e62-6600fae482fa',7666.00,'2026-07-20 15:46:24','2026-07-25','pago','multicaixa','REF-LFAR6IOJ','Assinatura do plano Kuia',1,NULL,'comprovativos/Y4UshXIwtv2J4BfE7p9cjWnE2qQhyqBcR4uwjSiJ.pdf','2026-07-20 15:44:11','2026-07-20 15:46:24'),('41d50e38-bfd6-484d-bfc4-7ac484edf06e','eac808bb-445e-448e-bd9d-0eb83fae3db5','6cee8ebe-7b33-42f0-9959-4a533ae78293','d64c1964-f925-4f59-92fa-7509abd79cc8',9633.00,'2026-07-21 12:12:33','2026-07-26','pago','multicaixa','REF-VLR7PMFN','Assinatura do plano Plus',1,NULL,'comprovativos/h5PxOMkJNORGVakFlJsxajkL5DigqanoszOS0j1c.pdf','2026-07-21 10:37:48','2026-07-21 12:12:33'),('6d0067ce-0ff3-4237-a70c-8d75cc6e1af7','58c82d27-bf4e-47fa-a775-d6c4e7ac7a72','8298aa98-7ab9-45d8-8b30-b21869efe824','d3c4b854-a06c-4537-97f4-59a167e93330',6533.00,'2026-07-27 15:52:13','2026-08-01','pago','cartao_credito','REF-ENZFILJJ','Assinatura do plano Kuia',1,NULL,'comprovativos/WnIrEm2fPElgIp73rMNOU6Dvj8ToZRP0GaANnbFN.jpg','2026-07-27 15:48:54','2026-07-27 15:52:13'),('99b11726-16f3-425d-b5a7-0034e2d6a0b3','58c82d27-bf4e-47fa-a775-d6c4e7ac7a72','67ad5e98-63e6-480c-8d27-493f6ba5e7f4','ede05611-4acc-48a4-ba93-aecfdcf206a2',6533.00,'2026-07-22 09:37:45','2026-07-27','pago','transferencia','REF-UMNQNDYI','Assinatura do plano Mini',1,NULL,'comprovativos/9z6e3Hppj7ETd2ARmRNCF9P8vu04DNJAttgZyYSX.pdf','2026-07-22 09:23:54','2026-07-22 09:37:48'),('a9787e6a-305b-4e6a-a0af-fad9e8a9c158','58c82d27-bf4e-47fa-a775-d6c4e7ac7a72','2ce3c60a-fcf2-46fe-91c7-4a690085298c','c0bf9d83-16d0-4ef1-b0ac-6c7aaacaba7b',6533.00,'2026-07-21 08:30:05','2026-07-25','pago','multicaixa','REF-R1JN1RAE','Assinatura do plano Mini',1,NULL,'comprovativos/XgIV4Vcm211OZjsSQHeAqLWhqSYyoZ370mvl5ADV.pdf','2026-07-20 16:08:10','2026-07-21 08:30:05'),('d6661862-f5d5-4325-a3b8-d587dc3b3983','eac808bb-445e-448e-bd9d-0eb83fae3db5','4e9b0ed1-dff1-445d-8515-97b9d3707b67','76073689-494d-46dd-ad8d-c552d01eae36',9633.00,'2026-07-20 15:35:58','2026-07-25','pago','cartao_credito','REF-KAFP1NNE','Assinatura do plano Plus',1,NULL,'comprovativos/5tvnSxapy9bs3x632JqB9NvxvWbftW8UNnpiQoUX.pdf','2026-07-20 15:34:28','2026-07-20 15:35:59');
/*!40000 ALTER TABLE `pagamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
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
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
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
INSERT INTO `planos` VALUES ('2d5af0d3-04e4-40df-90a6-5e83e095035b','Experimental','Plano gratuito para experimentar a plataforma durante 30 dias.',0.00,0.00,0.00,0.00,1,1,'2026-07-20 15:30:41','2026-07-23 13:36:41'),('3c747bf3-efaa-460d-98bf-5baca1c01bf5','Mini','Para empresas em crescimento com maior volume de documentos.',23000.00,42780.00,7666.00,74900.00,12,1,'2026-07-20 15:30:42','2026-07-27 13:13:11'),('58c82d27-bf4e-47fa-a775-d6c4e7ac7a72','Kuia','Ideal para pequenos negócios que estão a começar.',19600.00,36100.00,6533.00,69000.00,12,1,'2026-07-20 15:30:42','2026-07-23 13:29:35'),('eac808bb-445e-448e-bd9d-0eb83fae3db5','Plus','Solução completa para grandes empresas com alto volume.',28900.00,44200.00,9633.00,82600.00,12,1,'2026-07-20 15:30:43','2026-07-20 15:30:43');
/*!40000 ALTER TABLE `planos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `planos_features`
--

DROP TABLE IF EXISTS `planos_features`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `planos_features` (
  `plano_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `feature_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantidade` int NOT NULL DEFAULT '1',
  `unidade` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
INSERT INTO `planos_features` VALUES ('2d5af0d3-04e4-40df-90a6-5e83e095035b','2b7a0e82-1318-495c-981d-f5d3a6795a7a',0,NULL,'2026-07-23 13:36:44','2026-07-23 13:36:44'),('2d5af0d3-04e4-40df-90a6-5e83e095035b','301a4132-738e-4fd1-8765-07ba8683b1e2',1,NULL,'2026-07-23 13:36:43','2026-07-23 13:36:43'),('2d5af0d3-04e4-40df-90a6-5e83e095035b','61af9a87-561a-4a51-a1cd-4f37c822ca90',0,NULL,'2026-07-23 13:36:43','2026-07-23 13:36:43'),('2d5af0d3-04e4-40df-90a6-5e83e095035b','8393f123-3d7d-4fbf-9b83-8c7335dd7323',0,NULL,'2026-07-23 13:36:43','2026-07-23 13:36:43'),('2d5af0d3-04e4-40df-90a6-5e83e095035b','9681a6f6-a8bd-41ba-980f-cb6680037efe',10,'documentos','2026-07-23 13:36:43','2026-07-23 13:36:43'),('2d5af0d3-04e4-40df-90a6-5e83e095035b','c172f888-15bc-44e8-b549-fbf3eaa464ba',0,NULL,'2026-07-23 13:36:43','2026-07-23 13:36:43'),('2d5af0d3-04e4-40df-90a6-5e83e095035b','f9e3ce84-ebc6-4059-9749-bc39bc8ef1ca',1,'utilizador','2026-07-23 13:36:44','2026-07-23 13:36:44'),('3c747bf3-efaa-460d-98bf-5baca1c01bf5','754f3be5-1678-408f-a7c6-436a183670b2',1,NULL,'2026-07-27 13:13:12','2026-07-27 13:13:12'),('3c747bf3-efaa-460d-98bf-5baca1c01bf5','9681a6f6-a8bd-41ba-980f-cb6680037efe',-1,NULL,'2026-07-27 13:13:12','2026-07-27 13:13:12'),('3c747bf3-efaa-460d-98bf-5baca1c01bf5','d6ef56c1-88aa-4ca3-b69d-bd47880cd48c',1,NULL,'2026-07-27 13:13:12','2026-07-27 13:13:12'),('3c747bf3-efaa-460d-98bf-5baca1c01bf5','f9e3ce84-ebc6-4059-9749-bc39bc8ef1ca',-1,NULL,'2026-07-27 13:13:12','2026-07-27 13:13:12'),('58c82d27-bf4e-47fa-a775-d6c4e7ac7a72','2b7a0e82-1318-495c-981d-f5d3a6795a7a',1,NULL,'2026-07-23 13:29:38','2026-07-23 13:29:38'),('58c82d27-bf4e-47fa-a775-d6c4e7ac7a72','301a4132-738e-4fd1-8765-07ba8683b1e2',1,NULL,'2026-07-23 13:29:38','2026-07-23 13:29:38'),('58c82d27-bf4e-47fa-a775-d6c4e7ac7a72','47a4c8bb-b5bc-46d0-a74f-629d5bd77a15',1,NULL,'2026-07-23 13:29:38','2026-07-23 13:29:38'),('58c82d27-bf4e-47fa-a775-d6c4e7ac7a72','61af9a87-561a-4a51-a1cd-4f37c822ca90',1,NULL,'2026-07-23 13:29:37','2026-07-23 13:29:37'),('58c82d27-bf4e-47fa-a775-d6c4e7ac7a72','61dd3ee8-6b3d-4da6-97f4-94406262e497',1,NULL,'2026-07-23 13:29:38','2026-07-23 13:29:38'),('58c82d27-bf4e-47fa-a775-d6c4e7ac7a72','713c2290-35fc-49eb-b444-db549003c95b',1,NULL,'2026-07-23 13:29:38','2026-07-23 13:29:38'),('58c82d27-bf4e-47fa-a775-d6c4e7ac7a72','754f3be5-1678-408f-a7c6-436a183670b2',1,NULL,'2026-07-23 13:29:37','2026-07-23 13:29:37'),('58c82d27-bf4e-47fa-a775-d6c4e7ac7a72','786425b9-8008-45f2-b542-1e472d45cc00',1,NULL,'2026-07-23 13:29:37','2026-07-23 13:29:37'),('58c82d27-bf4e-47fa-a775-d6c4e7ac7a72','8393f123-3d7d-4fbf-9b83-8c7335dd7323',1,NULL,'2026-07-23 13:29:37','2026-07-23 13:29:37'),('58c82d27-bf4e-47fa-a775-d6c4e7ac7a72','9681a6f6-a8bd-41ba-980f-cb6680037efe',750,'documentos','2026-07-23 13:29:37','2026-07-23 13:29:37'),('58c82d27-bf4e-47fa-a775-d6c4e7ac7a72','c172f888-15bc-44e8-b549-fbf3eaa464ba',1,NULL,'2026-07-23 13:29:37','2026-07-23 13:29:37'),('58c82d27-bf4e-47fa-a775-d6c4e7ac7a72','d6ef56c1-88aa-4ca3-b69d-bd47880cd48c',1,NULL,'2026-07-23 13:29:37','2026-07-23 13:29:37'),('58c82d27-bf4e-47fa-a775-d6c4e7ac7a72','e29fa028-985d-4c32-941a-bc3512eb69a3',1,NULL,'2026-07-23 13:29:38','2026-07-23 13:29:38'),('58c82d27-bf4e-47fa-a775-d6c4e7ac7a72','f9e3ce84-ebc6-4059-9749-bc39bc8ef1ca',3,'utilizadores','2026-07-23 13:29:38','2026-07-23 13:29:38'),('eac808bb-445e-448e-bd9d-0eb83fae3db5','2b7a0e82-1318-495c-981d-f5d3a6795a7a',1,NULL,'2026-07-20 15:30:44','2026-07-20 15:30:44'),('eac808bb-445e-448e-bd9d-0eb83fae3db5','301a4132-738e-4fd1-8765-07ba8683b1e2',1,NULL,'2026-07-20 15:30:44','2026-07-20 15:30:44'),('eac808bb-445e-448e-bd9d-0eb83fae3db5','47a4c8bb-b5bc-46d0-a74f-629d5bd77a15',1,NULL,'2026-07-20 15:30:43','2026-07-20 15:30:43'),('eac808bb-445e-448e-bd9d-0eb83fae3db5','61af9a87-561a-4a51-a1cd-4f37c822ca90',1,NULL,'2026-07-20 15:30:43','2026-07-20 15:30:43'),('eac808bb-445e-448e-bd9d-0eb83fae3db5','61dd3ee8-6b3d-4da6-97f4-94406262e497',1,NULL,'2026-07-20 15:30:44','2026-07-20 15:30:44'),('eac808bb-445e-448e-bd9d-0eb83fae3db5','713c2290-35fc-49eb-b444-db549003c95b',1,NULL,'2026-07-20 15:30:43','2026-07-20 15:30:43'),('eac808bb-445e-448e-bd9d-0eb83fae3db5','754f3be5-1678-408f-a7c6-436a183670b2',1,NULL,'2026-07-20 15:30:43','2026-07-20 15:30:43'),('eac808bb-445e-448e-bd9d-0eb83fae3db5','786425b9-8008-45f2-b542-1e472d45cc00',1,NULL,'2026-07-20 15:30:43','2026-07-20 15:30:43'),('eac808bb-445e-448e-bd9d-0eb83fae3db5','8393f123-3d7d-4fbf-9b83-8c7335dd7323',1,NULL,'2026-07-20 15:30:43','2026-07-20 15:30:43'),('eac808bb-445e-448e-bd9d-0eb83fae3db5','9681a6f6-a8bd-41ba-980f-cb6680037efe',1500,'documentos','2026-07-20 15:30:43','2026-07-20 15:30:43'),('eac808bb-445e-448e-bd9d-0eb83fae3db5','c172f888-15bc-44e8-b549-fbf3eaa464ba',1,NULL,'2026-07-20 15:30:44','2026-07-20 15:30:44'),('eac808bb-445e-448e-bd9d-0eb83fae3db5','d6ef56c1-88aa-4ca3-b69d-bd47880cd48c',1,NULL,'2026-07-20 15:30:44','2026-07-20 15:30:44'),('eac808bb-445e-448e-bd9d-0eb83fae3db5','e29fa028-985d-4c32-941a-bc3512eb69a3',1,NULL,'2026-07-20 15:30:44','2026-07-20 15:30:44'),('eac808bb-445e-448e-bd9d-0eb83fae3db5','f9e3ce84-ebc6-4059-9749-bc39bc8ef1ca',15,'utilizadores','2026-07-20 15:30:43','2026-07-20 15:30:43');
/*!40000 ALTER TABLE `planos_features` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
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
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plano_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data_inicio` date NOT NULL,
  `data_fim` date DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ativa',
  `forma_pagamento` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `renovacao_automatica` tinyint(1) NOT NULL DEFAULT '1',
  `cancelado_em` date DEFAULT NULL,
  `criado_por` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
INSERT INTO `subscricoes` VALUES ('2ca5aba3-2120-4d02-9e62-6600fae482fa','95e3bffb-e8f4-48eb-b1c3-bd49cbd74968','3c747bf3-efaa-460d-98bf-5baca1c01bf5','2026-07-20','2027-07-20','ativa','multicaixa',1,NULL,NULL,'2026-07-20 15:46:24','2026-07-20 15:46:24'),('76073689-494d-46dd-ad8d-c552d01eae36','4e9b0ed1-dff1-445d-8515-97b9d3707b67','eac808bb-445e-448e-bd9d-0eb83fae3db5','2026-07-20','2027-07-20','ativa','cartao_credito',1,NULL,NULL,'2026-07-20 15:35:58','2026-07-20 15:35:58'),('c0655306-cb64-4aa2-bb5e-5a607327fe76','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','3c747bf3-efaa-460d-98bf-5baca1c01bf5','2026-07-27','2027-07-27','ativa','cartao_credito',1,NULL,NULL,'2026-07-27 13:01:19','2026-07-27 13:01:19'),('c0bf9d83-16d0-4ef1-b0ac-6c7aaacaba7b','2ce3c60a-fcf2-46fe-91c7-4a690085298c','58c82d27-bf4e-47fa-a775-d6c4e7ac7a72','2026-07-21','2027-07-21','ativa','multicaixa',1,NULL,NULL,'2026-07-21 08:30:05','2026-07-21 08:30:05'),('d3c4b854-a06c-4537-97f4-59a167e93330','8298aa98-7ab9-45d8-8b30-b21869efe824','58c82d27-bf4e-47fa-a775-d6c4e7ac7a72','2026-07-27','2027-07-27','ativa','cartao_credito',1,NULL,NULL,'2026-07-27 15:52:13','2026-07-27 15:52:13'),('d64c1964-f925-4f59-92fa-7509abd79cc8','6cee8ebe-7b33-42f0-9959-4a533ae78293','eac808bb-445e-448e-bd9d-0eb83fae3db5','2026-07-21','2027-07-21','ativa','multicaixa',1,NULL,NULL,'2026-07-21 12:12:33','2026-07-21 12:12:33'),('ede05611-4acc-48a4-ba93-aecfdcf206a2','67ad5e98-63e6-480c-8d27-493f6ba5e7f4','58c82d27-bf4e-47fa-a775-d6c4e7ac7a72','2026-07-22','2027-07-22','ativa','transferencia',1,NULL,NULL,'2026-07-22 09:37:46','2026-07-22 09:37:46');
/*!40000 ALTER TABLE `subscricoes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_landlord`
--

DROP TABLE IF EXISTS `users_landlord`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_landlord` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `empresa_id_atual` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `google_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `google_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `google_avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `oauth_verified` tinyint(1) NOT NULL DEFAULT '0',
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('super_admin','admin_empresa') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'admin_empresa',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `ultimo_login` timestamp NULL DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
INSERT INTO `users_landlord` VALUES ('065fc7b6-3f1b-4050-8815-b95f4b800bd4',NULL,NULL,'Sebastiao Manuel','sebastiaomanuel@messi.com',NULL,NULL,NULL,0,'$2y$12$HSVQrgJweUcuS300HZD.RexRJWrC5opGducGoKL7EEnAyfZJAXFju','admin_empresa',1,NULL,NULL,NULL,'2026-07-20 16:08:09','2026-07-20 16:08:09',NULL),('1db00198-e995-448e-ae63-6f0ece08cd3d',NULL,NULL,'Envaldo Miranda','envaldo@xmiranda.com',NULL,NULL,NULL,0,'$2y$12$lLuSlHLoHPB3GExjK03tueDcws5aGlPxAL2tmympxB2kKS20AxN/.','admin_empresa',1,NULL,NULL,NULL,'2026-07-20 15:34:28','2026-07-20 15:34:28',NULL),('49f37f13-50b8-4978-be34-74acd66e52e4',NULL,NULL,'alexandro','alexandro@cris.com',NULL,NULL,NULL,0,'$2y$12$Uu26CsYtSl76ZXBd39XTL.98wOcZCCWQX4pRHKK332o3jXrok7KsK','admin_empresa',1,NULL,NULL,NULL,'2026-07-21 15:44:37','2026-07-21 15:44:37',NULL),('4f4df502-4e18-4e89-9d8c-0663ca192b8b',NULL,NULL,'joao Neves','joaoneves@gmail.com',NULL,NULL,NULL,0,'$2y$12$sJr04JWUiRWuXe3dwjHBbuOvlN00u5.2.2t97HdEGhT6ZkfWnl4me','super_admin',1,NULL,NULL,NULL,'2026-07-22 13:22:32','2026-07-22 13:39:46',NULL),('51e403d8-b5ef-4468-9946-60d9838b1786',NULL,NULL,'francisco','francisco@agua.com',NULL,NULL,NULL,0,'$2y$12$mn/i1/vmpBBxkxiGf5wGNO5hZRxTu12c6CLOMM5oBkSghV1Ed30ny','admin_empresa',1,NULL,NULL,NULL,'2026-07-27 15:48:54','2026-07-27 15:48:54',NULL),('5d1f0386-1453-4140-859e-d4f9b7c2c26e',NULL,NULL,'kiliam','kiliam@tech.com',NULL,NULL,NULL,0,'$2y$12$Ig8J/b2HV66OrLucTzukm.30KxxK5bY3lAOTqeYUaX0b8QD0DlCqO','admin_empresa',1,NULL,NULL,NULL,'2026-07-21 10:37:45','2026-07-21 10:37:45',NULL),('62c56214-9bfd-41a3-bc06-a03038e8c0ff',NULL,NULL,'isagi','isagi@neo.com',NULL,NULL,NULL,0,'$2y$12$.D0JqGy9KWzsNUDDibvlg.ZzVxnMK5D7VKQWjwMkLCl5/L/eVUd5G','admin_empresa',1,NULL,NULL,NULL,'2026-07-22 09:23:43','2026-07-22 09:23:43',NULL),('6e8b3dca-8b01-4281-b5af-1b75ae3a1603',NULL,NULL,'Joao Neves','joaoneves@cris.com',NULL,NULL,NULL,0,'$2y$12$BysDlIYqiAM82bpOzH9ktOMNpupC7FAD229UeVjtbeYnGMTtzRs72','admin_empresa',1,NULL,NULL,NULL,'2026-07-20 15:44:10','2026-07-20 15:44:10',NULL),('7aa984a1-9bc0-4dfc-b50a-08f7a8b7697d',NULL,NULL,'KImbanda','KImbanda@messi.com',NULL,NULL,NULL,0,'$2y$12$uEq68S8O0vKf441M69t.y.3LSLnjmigrAskmlWdMU.3r9Ac.tjKxq','admin_empresa',1,NULL,NULL,NULL,'2026-07-27 13:58:20','2026-07-27 13:58:20',NULL),('98a50942-6324-48df-82ae-3c1599302fe1',NULL,NULL,'Isis Manuel NUNO','isidromanuel1141@gmail.com',NULL,NULL,NULL,0,'$2y$12$iS1UvNh60tSs74deOVNstuko97jUKe4pPf0A5PzjiRsAD1liPQ6TG','super_admin',1,NULL,NULL,NULL,'2026-07-21 09:29:18','2026-07-22 14:02:08',NULL),('a3a11600-4496-47e8-9a44-0dcf17dc3c40',NULL,NULL,'Enfatino','Efantino@mundial.com',NULL,NULL,NULL,0,'$2y$12$MPWOrMexKRmSvhjcAdjm4eDqjPtNBxXIB3JJSNmk6sJQ1thgSN0yS','admin_empresa',1,NULL,NULL,NULL,'2026-07-27 12:57:21','2026-07-27 12:57:21',NULL),('c061c58d-b1ea-4667-95cc-cf30ae3f4710',NULL,NULL,'Isis Manuel','isismanuel1141@gmail.com',NULL,NULL,NULL,0,'$2y$12$CG/Ee0RONwOvge/i33Oek.UpVMClB6NDGcJ8EUZ1mo5IJByQwX3Cu','admin_empresa',1,NULL,NULL,NULL,'2026-07-20 15:29:26','2026-07-22 11:18:11',NULL);
/*!40000 ALTER TABLE `users_landlord` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'faturaja_landlord'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-19 10:53:43
