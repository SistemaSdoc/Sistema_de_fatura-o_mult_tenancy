-- MySQL dump 10.13  Distrib 8.4.10, for Linux (x86_64)
--
-- Host: localhost    Database: faturaja_shared
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
-- Table structure for table `adiantamento_fatura`
--

DROP TABLE IF EXISTS `adiantamento_fatura`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `adiantamento_fatura` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `adiantamento_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fatura_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor_utilizado` decimal(15,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `adiantamento_fatura_adiantamento_id_fatura_id_unique` (`adiantamento_id`,`fatura_id`),
  KEY `adiantamento_fatura_adiantamento_id_index` (`adiantamento_id`),
  KEY `adiantamento_fatura_fatura_id_index` (`fatura_id`),
  CONSTRAINT `adiantamento_fatura_adiantamento_id_foreign` FOREIGN KEY (`adiantamento_id`) REFERENCES `documentos_fiscais` (`id`) ON DELETE CASCADE,
  CONSTRAINT `adiantamento_fatura_fatura_id_foreign` FOREIGN KEY (`fatura_id`) REFERENCES `documentos_fiscais` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `adiantamento_fatura`
--

LOCK TABLES `adiantamento_fatura` WRITE;
/*!40000 ALTER TABLE `adiantamento_fatura` DISABLE KEYS */;
/*!40000 ALTER TABLE `adiantamento_fatura` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `apuramento_iva`
--

DROP TABLE IF EXISTS `apuramento_iva`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `apuramento_iva` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `periodo` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `iva_liquidado` decimal(12,2) NOT NULL DEFAULT '0.00',
  `iva_dedutivel` decimal(12,2) NOT NULL DEFAULT '0.00',
  `iva_a_pagar` decimal(12,2) NOT NULL DEFAULT '0.00',
  `estado` enum('aberto','fechado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'aberto',
  `data_fecho` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `apuramento_iva_user_id_foreign` (`user_id`),
  CONSTRAINT `apuramento_iva_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `apuramento_iva`
--

LOCK TABLES `apuramento_iva` WRITE;
/*!40000 ALTER TABLE `apuramento_iva` DISABLE KEYS */;
/*!40000 ALTER TABLE `apuramento_iva` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categorias`
--

DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('ativo','inativo') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ativo',
  `tipo` enum('produto','servico') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'produto',
  `taxa_iva` decimal(5,2) NOT NULL DEFAULT '14.00' COMMENT 'Taxa de IVA aplicada a todos os produtos desta categoria (AGT Angola)',
  `sujeito_iva` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Se false, produto isento de IVA (ex: produtos agrícolas)',
  `codigo_isencao` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Código de isenção SAF-T para categorias isentas de IVA',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `categorias_user_id_foreign` (`user_id`),
  CONSTRAINT `categorias_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias`
--

LOCK TABLES `categorias` WRITE;
/*!40000 ALTER TABLE `categorias` DISABLE KEYS */;
INSERT INTO `categorias` VALUES ('019fa3e5-2df2-7090-b9ea-088a42e885b3','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','Alimentos','cmomida','cf67d291-96a4-4b67-9dad-2e15878d8bbe','ativo','produto',14.00,1,NULL,'2026-07-27 13:05:33','2026-07-27 13:05:33',NULL),('019fa3e5-a501-70f8-8e77-8ea2f1b2177b','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','construção','consteucao','cf67d291-96a4-4b67-9dad-2e15878d8bbe','ativo','produto',14.00,1,NULL,'2026-07-27 13:06:04','2026-07-27 13:06:04',NULL),('019fa3e5-d2a3-7153-83ff-bfdc12fa7b03','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','Informatica','info','cf67d291-96a4-4b67-9dad-2e15878d8bbe','ativo','produto',14.00,1,NULL,'2026-07-27 13:06:15','2026-07-27 13:06:15',NULL);
/*!40000 ALTER TABLE `categorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nif` varchar(14) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo` enum('consumidor_final','empresa') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'consumidor_final',
  `status` enum('ativo','inativo') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ativo',
  `data_registro` date NOT NULL,
  `telefone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endereco` text COLLATE utf8mb4_unicode_ci,
  `cidade` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `codigo_postal` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pais` varchar(2) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AO',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clientes_nif_unique` (`nif`),
  UNIQUE KEY `clientes_email_unique` (`email`),
  KEY `clientes_user_id_index` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes`
--

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
INSERT INTO `clientes` VALUES ('0d9f4a89-2b40-4bd6-881c-1dc46c06242f','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'Restaurante Sabores de Angola','9988776655','empresa','ativo','2025-07-14','+244222334499','reservas@saboresdeangola.co.ao','Rua Rainha Njinga Mbandi, 12, Luanda',NULL,NULL,'AO','2026-07-27 13:07:58','2026-07-27 13:07:58',NULL),('0fa81eb4-0372-458e-8a6d-c0b1d00c7bbf','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'Isabel Cristina Oliveira','011456789OP012','consumidor_final','ativo','2026-06-10','+244930123456','isabel.oliveira@hotmail.com','Rua dos Heróis, 101, Huambo',NULL,NULL,'AO','2026-07-27 13:07:58','2026-07-27 13:07:58',NULL),('136f47a4-84e5-437f-8bcf-9c2dfb303fb0','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'Maria Fernanda dos Santos','005789012CD456','consumidor_final','ativo','2026-02-10','+244924567890','maria.santos@email.com','Avenida Revolução de Outubro, 45, Maianga, Luanda',NULL,NULL,'AO','2026-07-27 13:07:58','2026-07-27 13:07:58',NULL),('1743e6f7-60ba-445e-a5e3-2cf142712c95','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'João Manuel da Silva','004123456AB123','consumidor_final','ativo','2026-01-15','+244923456789','joao.silva@email.com','Rua da Missão, 123, Luanda',NULL,NULL,'AO','2026-07-27 13:07:58','2026-07-27 13:07:58',NULL),('2bb1dd68-4799-4577-b362-631befb3ad98','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'Carlos Eduardo Pereira','006345678EF901','consumidor_final','ativo','2026-03-05','+244925678901','carlos.pereira@gmail.com','Bairro Palanca, Casa 78, Luanda',NULL,NULL,'AO','2026-07-27 13:07:58','2026-07-27 13:07:58',NULL),('32aee33d-3b72-4d78-958e-a82ea51a6997','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'Pedro Henrique Lima','008567890IJ234','consumidor_final','ativo','2026-04-18','+244927890123','pedro.lima@yahoo.com','Bairro Cazenga, Rua Principal, 89, Luanda',NULL,NULL,'AO','2026-07-27 13:07:58','2026-07-27 13:07:58',NULL),('4d724023-0ad6-4fa5-b3d3-2c519fa998da','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'Luísa Maria Ferreira','009789012KL678','consumidor_final','ativo','2026-05-22','+244928901234','luisa.ferreira@email.com','Rua Amílcar Cabral, 67, Benguela',NULL,NULL,'AO','2026-07-27 13:07:58','2026-07-27 13:07:58',NULL),('91a03d8b-e1b2-454e-bc04-49cad164d5c9','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'Construções Angola, LDA','1234567890','empresa','ativo','2025-08-20','+244222334455','geral@construcoesangola.co.ao','Rua Rainha Ginga, 200, 1º Andar, Luanda',NULL,NULL,'AO','2026-07-27 13:07:58','2026-07-27 13:07:58',NULL),('a71e8da7-c1cc-4805-ac80-787d40c0b18b','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'Fernando António Ribeiro','010123456MN890','consumidor_final','inativo','2025-10-08','+244929012345','fernando.ribeiro@gmail.com','Bairro Alvalade, Casa 23, Lubango',NULL,NULL,'AO','2026-07-27 13:07:58','2026-07-27 13:07:58',NULL),('ac755a1c-91e7-4365-b03e-639c9a3d3fd5','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'TechSoluções, SA','9876543210','empresa','ativo','2025-11-12','+244222112233','contacto@techsolucoes.co.ao','Edifício Millennium, Torre B, Escritório 305, Luanda',NULL,NULL,'AO','2026-07-27 13:07:58','2026-07-27 13:07:58',NULL),('b1d9c396-1666-410f-b19f-4c62ea108fdf','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'Farmácia Bem-Estar, LDA','1122334455','empresa','ativo','2025-12-01','+244222778899','farmacia.bemestar@email.com','Avenida Deolinda Rodrigues, 34, Luanda',NULL,NULL,'AO','2026-07-27 13:07:58','2026-07-27 13:07:58',NULL),('bab5a045-3a97-4c37-aa88-727243233da6','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'Consultoria Global, LDA','3344556677','empresa','ativo','2025-04-25','+244222667788','info@consultoriaglobal.co.ao','Edifício Sky Tower, Andar 10, Luanda',NULL,NULL,'AO','2026-07-27 13:07:58','2026-07-27 13:07:58',NULL),('c5fb91e6-7f6a-465c-be5d-e861ded82882','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'Ana Beatriz Costa','007901234GH567','consumidor_final','inativo','2025-06-30','+244926789012','ana.costa@hotmail.com','Rua 11 de Novembro, 56, Talatona',NULL,NULL,'AO','2026-07-27 13:07:58','2026-07-27 13:07:58',NULL),('d11f3e06-4589-400e-a6c4-5c9b6b55f37d','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'Transportes Rápidos, SA','2233445566','empresa','ativo','2026-01-30','+244222556677','logistica@transportesrapidos.co.ao','Estrada de Catete, Km 15, Viana, Luanda',NULL,NULL,'AO','2026-07-27 13:07:58','2026-07-27 13:07:58',NULL),('e10e99c6-6f5e-4fb1-b136-cc72c74ebf9b','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'Distribuidora Nacional, LDA','5555666677','empresa','ativo','2025-09-15','+244222445566','vendas@distribuidoranacional.co.ao','Zona Industrial de Viana, Lote 12, Luanda',NULL,NULL,'AO','2026-07-27 13:07:58','2026-07-27 13:07:58',NULL);
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `compras`
--

DROP TABLE IF EXISTS `compras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `compras` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fornecedor_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` date NOT NULL,
  `tipo_documento` enum('fatura','nota_credito') COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_documento` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data_emissao` date NOT NULL,
  `base_tributavel` decimal(14,2) NOT NULL,
  `total_iva` decimal(14,2) NOT NULL,
  `total_fatura` decimal(14,2) NOT NULL,
  `validado_fiscalmente` tinyint(1) NOT NULL DEFAULT '1',
  `total` decimal(12,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `compras_fornecedor_id_foreign` (`fornecedor_id`),
  KEY `compras_user_id_index` (`user_id`),
  CONSTRAINT `compras_fornecedor_id_foreign` FOREIGN KEY (`fornecedor_id`) REFERENCES `fornecedores` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `compras`
--

LOCK TABLES `compras` WRITE;
/*!40000 ALTER TABLE `compras` DISABLE KEYS */;
/*!40000 ALTER TABLE `compras` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documentos_fiscais`
--

DROP TABLE IF EXISTS `documentos_fiscais`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documentos_fiscais` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `venda_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_nome` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_nif` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fatura_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serie` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero` int NOT NULL,
  `numero_documento` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_documento` enum('FT','FR','FP','FA','NC','ND','RC','FRt') COLLATE utf8mb4_unicode_ci NOT NULL,
  `data_emissao` date NOT NULL,
  `hora_emissao` time NOT NULL,
  `data_vencimento` date DEFAULT NULL,
  `data_cancelamento` date DEFAULT NULL,
  `base_tributavel` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_iva` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_retencao` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_liquido` decimal(15,2) NOT NULL DEFAULT '0.00',
  `estado` enum('emitido','paga','parcialmente_paga','cancelado','expirado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'emitido',
  `motivo` text COLLATE utf8mb4_unicode_ci,
  `motivo_cancelamento` text COLLATE utf8mb4_unicode_ci,
  `user_cancelamento_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metodo_pagamento` enum('transferencia','multibanco','dinheiro','cheque','cartao') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_endereco` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_cidade` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_pais` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `periodo` tinyint unsigned DEFAULT NULL,
  `referencia_pagamento` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome_banco` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `iban` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_conta` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hash_fiscal` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rsa_assinatura` text COLLATE utf8mb4_unicode_ci,
  `rsa_versao_chave` tinyint unsigned DEFAULT NULL,
  `hash_anterior` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qr_code` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referencia_externa` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `documentos_fiscais_numero_documento_unique` (`numero_documento`),
  KEY `documentos_fiscais_user_id_foreign` (`user_id`),
  KEY `documentos_fiscais_user_cancelamento_id_foreign` (`user_cancelamento_id`),
  KEY `documentos_fiscais_tipo_documento_estado_index` (`tipo_documento`,`estado`),
  KEY `documentos_fiscais_cliente_id_index` (`cliente_id`),
  KEY `documentos_fiscais_data_emissao_index` (`data_emissao`),
  KEY `documentos_fiscais_data_vencimento_index` (`data_vencimento`),
  KEY `documentos_fiscais_serie_numero_index` (`serie`,`numero`),
  KEY `documentos_fiscais_tipo_documento_created_at_index` (`tipo_documento`,`created_at`),
  KEY `documentos_fiscais_hash_fiscal_index` (`hash_fiscal`),
  KEY `documentos_fiscais_venda_id_index` (`venda_id`),
  KEY `documentos_fiscais_fatura_id_index` (`fatura_id`),
  CONSTRAINT `documentos_fiscais_cliente_id_foreign` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `documentos_fiscais_fatura_id_foreign` FOREIGN KEY (`fatura_id`) REFERENCES `documentos_fiscais` (`id`) ON DELETE SET NULL,
  CONSTRAINT `documentos_fiscais_user_cancelamento_id_foreign` FOREIGN KEY (`user_cancelamento_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `documentos_fiscais_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documentos_fiscais`
--

LOCK TABLES `documentos_fiscais` WRITE;
/*!40000 ALTER TABLE `documentos_fiscais` DISABLE KEYS */;
INSERT INTO `documentos_fiscais` VALUES ('1044c9c8-c48a-4fdc-9c9c-ba974aa14729','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe','8a1cb6e2-42e2-4728-b750-86093ef8e364','136f47a4-84e5-437f-8bcf-9c2dfb303fb0',NULL,NULL,NULL,'MUNDIAL',1,'FT MUNDIAL/2026/0001','FT','2026-07-27','15:09:19','2026-08-26',NULL,14200.00,1988.00,0.00,16188.00,'emitido',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'BAI','AO06873468934634876436983','87358973467','9f994df9425c99244fcb98f06631c41fbce48271f3a29424f8513f77872f1c8a','aCiidIjZ3OUkzeLRkO6ixDAeYMJWuajuC5kVEy+EmaDcMuLL6cD5uQdK3W9Om1IvhCSHMgqxw+o4nvQWKlgCPAz+Rgxfw7UGOe9V2BFszPv7X2kllhinji6z07QGZ6tUIPA2d3vIdYM7EXYzmx5mZyjisRmMUQ6cTYJ3VPB18qGzQD6OLuwo8RAOCiQDY8JxFhqFXLdsU577EX7YUOGborXITd9ZRG8uux/z6S/LAArXd6A5ywEC7mGTq5VgtWgtqz5WlFIr8XHiKIpEJWjxzounHfuYzoKa7keLjHi7eKhnPKoCFNnbNk3H7gcnr1azHb4S17dZzuByeGANlvM5WQ==',1,'0','8975383458*005789012CD456*2026-07-27 00:00:00*14200.00*1988.00*16188.00*9F99*AGT-CERT-XXXX',NULL,'2026-07-27 13:09:19','2026-07-27 13:09:19'),('6124c9e9-c2be-40f9-9d15-83b8c9aa94ff','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'2bb1dd68-4799-4577-b362-631befb3ad98',NULL,NULL,NULL,'MUNDIAL',1,'FP MUNDIAL/2026/0001','FP','2026-07-27','15:09:52',NULL,NULL,14200.00,1988.00,0.00,16188.00,'emitido',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'BAI','AO06873468934634876436983','87358973467','bc9dcb51ab7c593759a677171df975d4f79ebfcba89c09e57651c3eb4d3c8bcb',NULL,NULL,NULL,NULL,NULL,'2026-07-27 13:09:52','2026-07-27 13:09:52'),('83e857b4-c557-420b-81ab-e94c781d7df9','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe','1d1b938b-c41e-446f-9b6e-4621abf26927','0fa81eb4-0372-458e-8a6d-c0b1d00c7bbf',NULL,NULL,NULL,'MUNDIAL',1,'FR MUNDIAL/2026/0001','FR','2026-07-27','15:08:36','2026-07-27',NULL,11200.00,1568.00,0.00,12768.00,'paga',NULL,NULL,NULL,'dinheiro',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'c938fc57709f289558a1ea036a4d0f54ed7a6ea50ee1ef2f715e9fcceb201caf','ET8sPZMusCFJSZaMJBNA+gXux4Uq5eYraMkj2/H8g6nxYUPOAtqW+TtBnA4bRvDiBGi0mR2ZpGmszc2acHQ3A5cENREby8VhrG4S4vlqpfYl+b6iGlhCQ6MuXaRSSl6WXFvMh92efwEPgrzOqhZuzOumbWYuM9CPBNwPfEbb8TNF04K00gNA94oaunv5ZB2sbWzbWPzxrxL/YwqzqDoc97DKBFYPv+LCa9HEtmFoyryiZcAmUHX63EkTrBp8KO9bR9L0OszjAMwyhhpbe7fb8khhVATzKZnB3fCUeogTlckKtTgNmz4VK1QQHgyOOgxkmQcIYxxTIVKeGj3iUwq8ew==',1,'0','8975383458*011456789OP012*2026-07-27 00:00:00*11200.00*1568.00*12768.00*C938*AGT-CERT-XXXX',NULL,'2026-07-27 13:08:36','2026-07-27 13:08:36');
/*!40000 ALTER TABLE `documentos_fiscais` ENABLE KEYS */;
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
INSERT INTO `empresa_mensagens` VALUES ('019f84f4-32db-723e-929b-94bd85fde61e','4e9b0ed1-dff1-445d-8515-97b9d3707b67','98a50942-6324-48df-82ae-3c1599302fe1','landlord','Isis Manuel','isidromanuel1141@gmail.com','vvvvvvvvvvvvvvvvvvvvv',0,NULL,0,'2026-07-21 12:53:44','2026-07-21 12:53:44'),('019f84f4-8999-70b3-baa1-1c9885a61a5d','2ce3c60a-fcf2-46fe-91c7-4a690085298c','98a50942-6324-48df-82ae-3c1599302fe1','landlord','Isis Manuel','isidromanuel1141@gmail.com','bnnnbnbnbnbbnbnb',1,'2026-07-21 15:04:49',0,'2026-07-21 12:54:06','2026-07-21 15:04:49'),('019f84f5-14f8-730d-8775-aa9a4d77c0f8','6cee8ebe-7b33-42f0-9959-4a533ae78293','98a50942-6324-48df-82ae-3c1599302fe1','landlord','Isis Manuel','isidromanuel1141@gmail.com','nbn',1,'2026-07-21 12:54:57',1,'2026-07-21 12:54:42','2026-07-21 12:55:07');
/*!40000 ALTER TABLE `empresa_mensagens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fornecedores`
--

DROP TABLE IF EXISTS `fornecedores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fornecedores` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nif` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endereco` text COLLATE utf8mb4_unicode_ci,
  `tipo` enum('nacional','internacional') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'nacional',
  `status` enum('ativo','inativo') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ativo',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fornecedores_nif_unique` (`nif`),
  KEY `fornecedores_nome_index` (`nome`),
  KEY `fornecedores_tipo_index` (`tipo`),
  KEY `fornecedores_status_index` (`status`),
  KEY `fornecedores_user_id_index` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fornecedores`
--

LOCK TABLES `fornecedores` WRITE;
/*!40000 ALTER TABLE `fornecedores` DISABLE KEYS */;
/*!40000 ALTER TABLE `fornecedores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `historico_precos`
--

DROP TABLE IF EXISTS `historico_precos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `historico_precos` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `produto_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `preco_antigo` decimal(15,2) NOT NULL,
  `preco_novo` decimal(15,2) NOT NULL,
  `custo_antigo` decimal(15,2) DEFAULT NULL,
  `custo_novo` decimal(15,2) DEFAULT NULL,
  `margem_antiga` decimal(5,2) DEFAULT NULL,
  `margem_nova` decimal(5,2) DEFAULT NULL,
  `motivo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `historico_precos_produto_id_foreign` (`produto_id`),
  KEY `historico_precos_user_id_index` (`user_id`),
  CONSTRAINT `historico_precos_produto_id_foreign` FOREIGN KEY (`produto_id`) REFERENCES `produtos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `historico_precos`
--

LOCK TABLES `historico_precos` WRITE;
/*!40000 ALTER TABLE `historico_precos` DISABLE KEYS */;
/*!40000 ALTER TABLE `historico_precos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `itens_compras`
--

DROP TABLE IF EXISTS `itens_compras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `itens_compras` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `compra_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `produto_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantidade` int NOT NULL,
  `preco_compra` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `base_tributavel` decimal(14,2) NOT NULL,
  `valor_iva` decimal(14,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `itens_compras_compra_id_foreign` (`compra_id`),
  KEY `itens_compras_produto_id_foreign` (`produto_id`),
  CONSTRAINT `itens_compras_compra_id_foreign` FOREIGN KEY (`compra_id`) REFERENCES `compras` (`id`) ON DELETE CASCADE,
  CONSTRAINT `itens_compras_produto_id_foreign` FOREIGN KEY (`produto_id`) REFERENCES `produtos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `itens_compras`
--

LOCK TABLES `itens_compras` WRITE;
/*!40000 ALTER TABLE `itens_compras` DISABLE KEYS */;
/*!40000 ALTER TABLE `itens_compras` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `itens_documento_fiscal`
--

DROP TABLE IF EXISTS `itens_documento_fiscal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `itens_documento_fiscal` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `documento_fiscal_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `produto_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `item_origem_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `referencia` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unidade` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UN',
  `quantidade` decimal(15,4) NOT NULL,
  `preco_unitario` decimal(15,4) NOT NULL,
  `desconto` decimal(15,2) NOT NULL DEFAULT '0.00',
  `base_tributavel` decimal(15,2) NOT NULL,
  `taxa_iva` decimal(5,2) NOT NULL DEFAULT '0.00',
  `valor_iva` decimal(15,2) NOT NULL DEFAULT '0.00',
  `codigo_isencao` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `motivo_isencao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `taxa_retencao` decimal(5,2) NOT NULL DEFAULT '0.00',
  `valor_retencao` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_linha` decimal(15,2) NOT NULL,
  `ordem` int NOT NULL DEFAULT '1',
  `motivo_alteracao` text COLLATE utf8mb4_unicode_ci,
  `observacoes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `itens_documento_fiscal_documento_fiscal_id_index` (`documento_fiscal_id`),
  KEY `itens_documento_fiscal_produto_id_index` (`produto_id`),
  KEY `itens_documento_fiscal_documento_fiscal_id_ordem_index` (`documento_fiscal_id`,`ordem`),
  KEY `itens_documento_fiscal_item_origem_id_index` (`item_origem_id`),
  CONSTRAINT `itens_documento_fiscal_documento_fiscal_id_foreign` FOREIGN KEY (`documento_fiscal_id`) REFERENCES `documentos_fiscais` (`id`) ON DELETE CASCADE,
  CONSTRAINT `itens_documento_fiscal_item_origem_id_foreign` FOREIGN KEY (`item_origem_id`) REFERENCES `itens_documento_fiscal` (`id`) ON DELETE SET NULL,
  CONSTRAINT `itens_documento_fiscal_produto_id_foreign` FOREIGN KEY (`produto_id`) REFERENCES `produtos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `itens_documento_fiscal`
--

LOCK TABLES `itens_documento_fiscal` WRITE;
/*!40000 ALTER TABLE `itens_documento_fiscal` DISABLE KEYS */;
INSERT INTO `itens_documento_fiscal` VALUES ('027509ef-06a5-42c7-a1e4-b501c535ddb8','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','1044c9c8-c48a-4fdc-9c9c-ba974aa14729','9011fcfa-f120-4d5e-8684-0adc0b4a8eef',NULL,'Tinta Branca 3.6L',NULL,'UN',1.0000,11200.0000,0.00,11200.00,14.00,1568.00,NULL,NULL,0.00,0.00,12768.00,3,NULL,NULL,'2026-07-27 14:09:19','2026-07-27 14:09:19'),('160d8dc3-5aab-4ce7-8d48-4a61d29b606d','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','6124c9e9-c2be-40f9-9d15-83b8c9aa94ff','9011fcfa-f120-4d5e-8684-0adc0b4a8eef',NULL,'Tinta Branca 3.6L',NULL,'UN',1.0000,11200.0000,0.00,11200.00,14.00,1568.00,NULL,NULL,0.00,0.00,12768.00,3,NULL,NULL,'2026-07-27 14:09:52','2026-07-27 14:09:52'),('66581846-f20c-42e4-8e31-1f9fe0654265','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','6124c9e9-c2be-40f9-9d15-83b8c9aa94ff','ea223917-5418-40fc-8609-91f580f845dd',NULL,'Cabo HDMI 3m',NULL,'UN',1.0000,1250.0000,0.00,1250.00,14.00,175.00,NULL,NULL,0.00,0.00,1425.00,4,NULL,NULL,'2026-07-27 14:09:52','2026-07-27 14:09:52'),('6cbfa8de-07b6-4235-8646-3fc2cc70987d','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','1044c9c8-c48a-4fdc-9c9c-ba974aa14729','7e970000-75cd-4494-9c30-e6d39d7b6fe0',NULL,'Mouse Óptico USB',NULL,'UN',1.0000,1750.0000,0.00,1750.00,14.00,245.00,NULL,NULL,0.00,0.00,1995.00,2,NULL,NULL,'2026-07-27 14:09:19','2026-07-27 14:09:19'),('71c5661a-06e6-4981-9651-bcd100fe7959','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','1044c9c8-c48a-4fdc-9c9c-ba974aa14729','ea223917-5418-40fc-8609-91f580f845dd',NULL,'Cabo HDMI 3m',NULL,'UN',1.0000,1250.0000,0.00,1250.00,14.00,175.00,NULL,NULL,0.00,0.00,1425.00,1,NULL,NULL,'2026-07-27 14:09:19','2026-07-27 14:09:19'),('80991aa8-46a3-472b-b6cb-d9d976142e29','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','83e857b4-c557-420b-81ab-e94c781d7df9','9011fcfa-f120-4d5e-8684-0adc0b4a8eef',NULL,'Tinta Branca 3.6L',NULL,'UN',1.0000,11200.0000,0.00,11200.00,14.00,1568.00,NULL,NULL,0.00,0.00,12768.00,1,NULL,NULL,'2026-07-27 14:08:36','2026-07-27 14:08:36'),('c48d4b0c-4df8-4107-bbac-fb88390a17cf','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','6124c9e9-c2be-40f9-9d15-83b8c9aa94ff','1aaed233-0409-480b-baf6-1f0a82d49141',NULL,'Cimento 50kg',NULL,'UN',1.0000,0.0000,0.00,0.00,14.00,0.00,NULL,NULL,0.00,0.00,0.00,1,NULL,NULL,'2026-07-27 14:09:52','2026-07-27 14:09:52'),('d0a0d208-2b57-4058-b4d3-f3c7318e369c','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','6124c9e9-c2be-40f9-9d15-83b8c9aa94ff','7e970000-75cd-4494-9c30-e6d39d7b6fe0',NULL,'Mouse Óptico USB',NULL,'UN',1.0000,1750.0000,0.00,1750.00,14.00,245.00,NULL,NULL,0.00,0.00,1995.00,2,NULL,NULL,'2026-07-27 14:09:52','2026-07-27 14:09:52');
/*!40000 ALTER TABLE `itens_documento_fiscal` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `itens_venda`
--

DROP TABLE IF EXISTS `itens_venda`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `itens_venda` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `venda_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `produto_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo_produto` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unidade` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UN',
  `quantidade` int NOT NULL,
  `preco_venda` decimal(15,4) NOT NULL,
  `desconto` decimal(15,2) NOT NULL DEFAULT '0.00',
  `base_tributavel` decimal(15,2) NOT NULL DEFAULT '0.00',
  `taxa_iva` decimal(5,2) NOT NULL,
  `valor_iva` decimal(15,2) NOT NULL DEFAULT '0.00',
  `codigo_isencao` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `taxa_retencao` decimal(5,2) NOT NULL DEFAULT '0.00',
  `valor_retencao` decimal(15,2) NOT NULL DEFAULT '0.00',
  `subtotal` decimal(15,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `itens_venda_venda_id_index` (`venda_id`),
  KEY `itens_venda_produto_id_index` (`produto_id`),
  CONSTRAINT `itens_venda_produto_id_foreign` FOREIGN KEY (`produto_id`) REFERENCES `produtos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `itens_venda_venda_id_foreign` FOREIGN KEY (`venda_id`) REFERENCES `vendas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `itens_venda`
--

LOCK TABLES `itens_venda` WRITE;
/*!40000 ALTER TABLE `itens_venda` DISABLE KEYS */;
INSERT INTO `itens_venda` VALUES ('0031d2c4-8863-4b62-97a6-31f14a334437','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','8a1cb6e2-42e2-4728-b750-86093ef8e364','ea223917-5418-40fc-8609-91f580f845dd','Cabo HDMI 3m','PRD-015','UN',1,1250.0000,0.00,1250.00,14.00,175.00,NULL,0.00,0.00,1425.00,'2026-07-27 13:09:19','2026-07-27 13:09:19'),('1bf4f4f3-9519-4e27-9080-649b845386d5','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','8a1cb6e2-42e2-4728-b750-86093ef8e364','7e970000-75cd-4494-9c30-e6d39d7b6fe0','Mouse Óptico USB','PRD-009','UN',1,1750.0000,0.00,1750.00,14.00,245.00,NULL,0.00,0.00,1995.00,'2026-07-27 13:09:19','2026-07-27 13:09:19'),('31d4d172-f924-40fd-a659-e97a3554a487','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','1d1b938b-c41e-446f-9b6e-4621abf26927','9011fcfa-f120-4d5e-8684-0adc0b4a8eef','Tinta Branca 3.6L','PRD-005','UN',1,11200.0000,0.00,11200.00,14.00,1568.00,NULL,0.00,0.00,12768.00,'2026-07-27 13:08:35','2026-07-27 13:08:35'),('edcf36b1-83f6-4ecc-88f4-5a19a204ed4a','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','8a1cb6e2-42e2-4728-b750-86093ef8e364','9011fcfa-f120-4d5e-8684-0adc0b4a8eef','Tinta Branca 3.6L','PRD-005','UN',1,11200.0000,0.00,11200.00,14.00,1568.00,NULL,0.00,0.00,12768.00,'2026-07-27 13:09:19','2026-07-27 13:09:19');
/*!40000 ALTER TABLE `itens_venda` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `logs_auditoria`
--

DROP TABLE IF EXISTS `logs_auditoria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `logs_auditoria` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidade` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidade_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `acao` enum('criar','emitir','anular','fechar') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detalhe` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `logs_auditoria_user_id_foreign` (`user_id`),
  CONSTRAINT `logs_auditoria_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `logs_auditoria`
--

LOCK TABLES `logs_auditoria` WRITE;
/*!40000 ALTER TABLE `logs_auditoria` DISABLE KEYS */;
/*!40000 ALTER TABLE `logs_auditoria` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `logs_fiscais`
--

DROP TABLE IF EXISTS `logs_fiscais`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `logs_fiscais` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidade` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidade_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `acao` enum('criar','emitir','anular','fechar','pagar') COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data_acao` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `detalhe` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `logs_fiscais_user_id_foreign` (`user_id`),
  CONSTRAINT `logs_fiscais_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `logs_fiscais`
--

LOCK TABLES `logs_fiscais` WRITE;
/*!40000 ALTER TABLE `logs_fiscais` DISABLE KEYS */;
/*!40000 ALTER TABLE `logs_fiscais` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'2025_12_11_172047_create_personal_access_tokens_table',1),(2,'2026_01_14_112709_create_users_table',1),(3,'2026_01_14_112932_create_categorias_table',1),(4,'2026_01_14_113007_create_produtos_table',1),(5,'2026_01_14_113047_create_fornecedores_table',1),(6,'2026_01_14_113146_create_clientes_table',1),(7,'2026_01_14_113218_create_compras_table',1),(8,'2026_01_14_113218_create_historicos_precos_table',1),(9,'2026_01_14_114052_create_vendas_table',1),(10,'2026_01_14_114416_create_movimentos_stock_table',1),(11,'2026_01_14_114457_create_logs_auditoria_table',1),(12,'2026_02_01_190435_create_logs_fiscais_table',1),(13,'2026_02_01_190520_create_series_fiscais_table',1),(14,'2026_02_01_190605_create_apuramento_iva_table',1),(15,'2026_02_11_084944_fix_movimentos_stock_foreign_key',1),(16,'2026_02_17_172921_create_documentos_fiscais_table',1),(17,'2026_02_20_082431_add_fp_to_documentos_fiscais',1),(18,'2026_04_09_131427_add_desconto_global_and_troco_to_vendas_table',1),(19,'2026_04_15_125915_add_taxa_iva_to_categorias_table',1),(20,'2026_04_15_135612_add_softdeletes_to_categorias_table',1),(21,'2026_05_18_151909_create_saft_export_logs_table',1),(22,'2026_05_20_112344_add_email_verified_at_to_users_table',1),(23,'2026_07_08_111247_add_dados_bancarios_to_documentos_fiscais_table',1),(24,'2026_07_11_082713_add_dados_bancarios_to_documentos_fiscais_shared_table',1),(25,'2026_07_17_000001_create_empresa_mensagens_table',1),(26,'2026_07_20_112734_add_eliminada_pelo_cliente_to_empresa_mensagens',1);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movimentos_stock`
--

DROP TABLE IF EXISTS `movimentos_stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movimentos_stock` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `produto_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('entrada','saida') COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_movimento` enum('compra','venda','nota_credito','ajuste','venda_cancelada','devolucao') COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantidade` int NOT NULL,
  `estoque_anterior` int NOT NULL DEFAULT '0',
  `estoque_novo` int NOT NULL DEFAULT '0',
  `stock_minimo` int NOT NULL DEFAULT '0',
  `custo_medio` decimal(15,2) NOT NULL DEFAULT '0.00',
  `custo_unitario` decimal(15,2) DEFAULT NULL,
  `referencia` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observacao` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `movimentos_stock_produto_id_index` (`produto_id`),
  KEY `movimentos_stock_user_id_index` (`user_id`),
  KEY `movimentos_stock_tipo_index` (`tipo`),
  KEY `movimentos_stock_tipo_movimento_index` (`tipo_movimento`),
  KEY `movimentos_stock_created_at_index` (`created_at`),
  KEY `movimentos_stock_referencia_index` (`referencia`),
  KEY `movimentos_stock_produto_id_created_at_index` (`produto_id`,`created_at`),
  KEY `movimentos_stock_tipo_movimento_created_at_index` (`tipo_movimento`,`created_at`),
  CONSTRAINT `movimentos_stock_produto_id_foreign` FOREIGN KEY (`produto_id`) REFERENCES `produtos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `movimentos_stock_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movimentos_stock`
--

LOCK TABLES `movimentos_stock` WRITE;
/*!40000 ALTER TABLE `movimentos_stock` DISABLE KEYS */;
INSERT INTO `movimentos_stock` VALUES ('387a925a-add4-4a7c-80a9-43dd59b7bdef','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','9011fcfa-f120-4d5e-8684-0adc0b4a8eef','cf67d291-96a4-4b67-9dad-2e15878d8bbe','saida','venda',-1,11,10,5,8500.00,NULL,'FT MUNDIAL/2026/0001','Venda referente a FT MUNDIAL/2026/0001','2026-07-27 13:09:19','2026-07-27 13:09:19'),('516096b1-0bba-4b07-a33e-524090016e71','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','ea223917-5418-40fc-8609-91f580f845dd','cf67d291-96a4-4b67-9dad-2e15878d8bbe','saida','venda',-1,18,17,5,900.00,NULL,'FT MUNDIAL/2026/0001','Venda referente a FT MUNDIAL/2026/0001','2026-07-27 13:09:19','2026-07-27 13:09:19'),('75ae55cf-df2a-4038-a545-5c6a8cb81661','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','7e970000-75cd-4494-9c30-e6d39d7b6fe0','cf67d291-96a4-4b67-9dad-2e15878d8bbe','saida','venda',-1,15,14,5,1200.00,NULL,'FT MUNDIAL/2026/0001','Venda referente a FT MUNDIAL/2026/0001','2026-07-27 13:09:19','2026-07-27 13:09:19'),('82f1b79a-f8ea-4e83-85d7-96f9a23918ed','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','1aaed233-0409-480b-baf6-1f0a82d49141','cf67d291-96a4-4b67-9dad-2e15878d8bbe','entrada','compra',25,0,25,5,6500.00,NULL,NULL,'Entrada de compra com custo médio actualizado','2026-07-27 13:06:48','2026-07-27 13:06:48'),('8479a805-9e63-4b8b-b1d4-403ac80e7dc8','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','7e970000-75cd-4494-9c30-e6d39d7b6fe0','cf67d291-96a4-4b67-9dad-2e15878d8bbe','entrada','compra',15,0,15,5,1200.00,NULL,NULL,'Entrada de compra com custo médio actualizado','2026-07-27 13:06:48','2026-07-27 13:06:48'),('add5fd76-479a-4d7f-8d10-16dd2b005c7a','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','9011fcfa-f120-4d5e-8684-0adc0b4a8eef','cf67d291-96a4-4b67-9dad-2e15878d8bbe','entrada','compra',12,0,12,5,8500.00,NULL,NULL,'Entrada de compra com custo médio actualizado','2026-07-27 13:06:48','2026-07-27 13:06:48'),('b616ae57-5e59-49f1-82e2-11862019dc94','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','374dc168-2f1b-4f53-a95d-56147ade50b5','cf67d291-96a4-4b67-9dad-2e15878d8bbe','entrada','compra',10,0,10,5,1800.00,NULL,NULL,'Entrada de compra com custo médio actualizado','2026-07-27 13:06:48','2026-07-27 13:06:48'),('e3906ea1-890d-4e7f-b4fe-418a8905a984','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','9011fcfa-f120-4d5e-8684-0adc0b4a8eef','cf67d291-96a4-4b67-9dad-2e15878d8bbe','saida','venda',-1,12,11,5,8500.00,NULL,'FR MUNDIAL/2026/0001','Venda referente a FR MUNDIAL/2026/0001','2026-07-27 13:08:36','2026-07-27 13:08:36'),('e45fd498-940e-406f-9cbb-01eee9c63945','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','ea223917-5418-40fc-8609-91f580f845dd','cf67d291-96a4-4b67-9dad-2e15878d8bbe','entrada','compra',18,0,18,5,900.00,NULL,NULL,'Entrada de compra com custo médio actualizado','2026-07-27 13:06:48','2026-07-27 13:06:48'),('e5c56245-a27c-48ac-b480-73d58708f4bc','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','50dd6d57-8b14-42ce-9bdf-4e2339253630','cf67d291-96a4-4b67-9dad-2e15878d8bbe','entrada','compra',200,0,200,5,350.00,NULL,NULL,'Entrada de compra com custo médio actualizado','2026-07-27 13:06:48','2026-07-27 13:06:48');
/*!40000 ALTER TABLE `movimentos_stock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tokenable_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_id_tokenable_type_index` (`tokenable_id`,`tokenable_type`),
  KEY `personal_access_tokens_user_id_index` (`user_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_access_tokens`
--

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `produtos`
--

DROP TABLE IF EXISTS `produtos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `produtos` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fornecedor_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `tipo` enum('produto','servico') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'produto',
  `status` enum('ativo','inativo') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ativo',
  `preco_compra` decimal(15,2) NOT NULL DEFAULT '0.00',
  `preco_venda` decimal(15,2) NOT NULL,
  `custo_medio` decimal(15,2) NOT NULL DEFAULT '0.00',
  `sujeito_iva` tinyint(1) DEFAULT NULL,
  `taxa_iva` decimal(5,2) DEFAULT NULL,
  `taxa_retencao` decimal(5,2) DEFAULT NULL,
  `codigo_isencao` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duracao_estimada` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unidade_medida` enum('hora','dia','semana','mes') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estoque_atual` int NOT NULL DEFAULT '0',
  `estoque_minimo` int NOT NULL DEFAULT '5',
  `despesas_adicionais` decimal(15,2) NOT NULL DEFAULT '0.00',
  `tipo_preco` enum('margem','markup','fixo') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'margem',
  `margem_lucro` decimal(5,2) DEFAULT NULL,
  `markup` decimal(5,2) DEFAULT NULL,
  `preco_minimo` decimal(15,2) DEFAULT NULL,
  `preco_maximo` decimal(15,2) DEFAULT NULL,
  `preco_controlado` tinyint(1) NOT NULL DEFAULT '0',
  `permite_preco_livre` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `produtos_codigo_unique` (`codigo`),
  KEY `produtos_categoria_id_foreign` (`categoria_id`),
  KEY `produtos_tipo_index` (`tipo`),
  KEY `produtos_status_index` (`status`),
  KEY `produtos_nome_index` (`nome`),
  KEY `produtos_tipo_status_index` (`tipo`,`status`),
  KEY `produtos_user_id_index` (`user_id`),
  KEY `produtos_fornecedor_id_index` (`fornecedor_id`),
  CONSTRAINT `produtos_categoria_id_foreign` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `produtos`
--

LOCK TABLES `produtos` WRITE;
/*!40000 ALTER TABLE `produtos` DISABLE KEYS */;
INSERT INTO `produtos` VALUES ('040457c0-e8f4-4cb9-ac75-5b2d0ee9e22c',NULL,'6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'Aulas de Inglês',NULL,NULL,'servico','ativo',0.00,5209.00,0.00,0,0.00,6.50,NULL,'1','hora',0,0,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 13:06:48','2026-07-27 13:06:48',NULL),('0543070c-61fc-4aa6-a4c4-acdce8f17d55',NULL,'6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'Consultoria Fiscal',NULL,'6.5','servico','ativo',0.00,120000.00,0.00,0,0.00,6.50,NULL,'1','hora',0,0,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 13:06:48','2026-07-27 13:06:48',NULL),('0771969f-0250-483b-9405-28ee129def2a',NULL,'6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'Consultoria RH',NULL,'10','servico','ativo',0.00,90509.00,0.00,0,0.00,6.50,NULL,'1','hora',0,0,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 13:06:48','2026-07-27 13:06:48',NULL),('18900400-ef16-4d39-95d8-e4406a9214e4',NULL,'6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'Reparação Eletrodomésticos',NULL,'6.5','servico','ativo',0.00,39000.00,0.00,0,0.00,6.50,NULL,'1','hora',0,0,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 13:06:48','2026-07-27 13:06:48',NULL),('1aaed233-0409-480b-baf6-1f0a82d49141','019fa3e5-a501-70f8-8e77-8ea2f1b2177b','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'Cimento 50kg','PRD-004','Cimento Portland, saco de 50kg','produto','ativo',6500.00,0.00,6500.00,1,14.00,NULL,NULL,NULL,NULL,25,5,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 13:06:47','2026-07-27 13:06:48',NULL),('3083cf65-ab80-441d-b39d-0886ac9ef66f',NULL,'6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'Tradução Documentos',NULL,'15','servico','ativo',0.00,6467.00,0.00,0,0.00,6.50,NULL,'1','hora',0,0,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 13:06:48','2026-07-27 13:06:48',NULL),('374dc168-2f1b-4f53-a95d-56147ade50b5','019fa3e5-d2a3-7153-83ff-bfdc12fa7b03','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'Teclado Multimédia','PRD-010','Teclado ABNT2, membrana','produto','ativo',1800.00,0.00,1800.00,1,14.00,NULL,NULL,NULL,NULL,10,5,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 13:06:48','2026-07-27 13:06:48',NULL),('3e0507a3-a6e4-4a11-ac6b-6aae44266bff',NULL,'6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'Marketing Digital',NULL,'10','servico','ativo',0.00,70595.00,0.00,0,0.00,6.50,NULL,'1','hora',0,0,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 13:06:48','2026-07-27 13:06:48',NULL),('41b282ef-688c-409c-88f0-b2701403a00d',NULL,'6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'Design Gráfico',NULL,'10','servico','ativo',0.00,9044.00,0.00,0,0.00,6.50,NULL,'1','hora',0,0,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 13:06:48','2026-07-27 13:06:48',NULL),('50dd6d57-8b14-42ce-9bdf-4e2339253630','019fa3e5-a501-70f8-8e77-8ea2f1b2177b','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'Parafuso 4x30mm','PRD-006','Caixa com 100 unidades','produto','ativo',350.00,583.33,350.00,1,14.00,NULL,NULL,NULL,NULL,200,5,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 13:06:48','2026-07-27 13:06:48',NULL),('68490a13-565b-48e2-84c0-da2739130ecd',NULL,'4e9b0ed1-dff1-445d-8515-97b9d3707b67','31bdc23e-be87-4946-a131-ecfe65ac21da',NULL,'Instalação do pacote Office',NULL,'instalacao','servico','ativo',0.00,18090.00,0.00,1,14.00,6.50,NULL,'1 hora','hora',0,0,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 14:53:41','2026-07-27 14:53:41',NULL),('7507ccce-5621-4cb0-996d-f39f62adf3c7',NULL,'6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'Fotografia',NULL,'6.5','servico','ativo',0.00,2000.00,0.00,0,0.00,6.50,NULL,'1','hora',0,0,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 13:06:48','2026-07-27 13:06:48',NULL),('7da81198-c2b2-46e1-9ceb-d0240dd2859e',NULL,'6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'Consultoria Jurídica',NULL,'6.5','servico','ativo',0.00,49000.00,0.00,0,0.00,6.50,NULL,'1','hora',0,0,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 13:06:48','2026-07-27 13:06:48',NULL),('7e970000-75cd-4494-9c30-e6d39d7b6fe0','019fa3e5-d2a3-7153-83ff-bfdc12fa7b03','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'Mouse Óptico USB','PRD-009','Mouse com fio, plug-and-play','produto','ativo',1200.00,1750.00,1200.00,1,14.00,NULL,NULL,NULL,NULL,14,5,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 13:06:48','2026-07-27 13:09:19',NULL),('9011fcfa-f120-4d5e-8684-0adc0b4a8eef','019fa3e5-a501-70f8-8e77-8ea2f1b2177b','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'Tinta Branca 3.6L','PRD-005','Tinta látex, acabamento fosco','produto','ativo',8500.00,11200.00,8500.00,1,14.00,NULL,NULL,NULL,NULL,10,5,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 13:06:48','2026-07-27 13:09:19',NULL),('a4389c4f-52b3-4f03-b3a8-6542e20b3236',NULL,'6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'Manutenção Computadores',NULL,'6.5','servico','ativo',0.00,6453.00,0.00,0,0.00,6.50,NULL,'1','hora',0,0,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 13:06:48','2026-07-27 13:06:48',NULL),('ae34c43e-30e8-407d-8069-a3a315ca7a30',NULL,'6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'Limpeza Profissional',NULL,NULL,'servico','ativo',0.00,43420.00,0.00,0,0.00,6.50,NULL,'1','hora',0,0,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 13:06:48','2026-07-27 13:06:48',NULL),('c71ce45e-423c-455f-82c4-e7716df769e2',NULL,'6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'Desenvolvimento Web',NULL,'6.5','servico','ativo',0.00,3090000.00,0.00,0,0.00,6.50,NULL,'1','hora',0,0,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 13:06:48','2026-07-27 13:06:48',NULL),('c998637a-5495-4320-92e0-7cf13db24e68',NULL,'6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'Entregas',NULL,NULL,'servico','ativo',0.00,9034.00,0.00,0,0.00,6.50,NULL,'1','hora',0,0,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 13:06:48','2026-07-27 13:06:48',NULL),('d5db67f7-34ef-4cae-82b7-e8f7ff078cd8',NULL,'6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'Assessoria Imprensa',NULL,'6.5','servico','ativo',0.00,4535.00,0.00,0,0.00,6.50,NULL,'1','hora',0,0,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 13:06:48','2026-07-27 13:06:48',NULL),('e2b96cec-4684-433b-bf92-25f631a7d7d2',NULL,'6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'Jardinagem',NULL,'5','servico','ativo',0.00,34000.00,0.00,0,0.00,6.50,NULL,'1','hora',0,0,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 13:06:48','2026-07-27 13:06:48',NULL),('ea223917-5418-40fc-8609-91f580f845dd','019fa3e5-d2a3-7153-83ff-bfdc12fa7b03','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','cf67d291-96a4-4b67-9dad-2e15878d8bbe',NULL,'Cabo HDMI 3m','PRD-015','Cabo HDMI versão 2.0, 3 metros','produto','ativo',900.00,1250.00,900.00,1,14.00,NULL,NULL,NULL,NULL,17,5,0.00,'margem',NULL,NULL,NULL,NULL,0,0,'2026-07-27 13:06:48','2026-07-27 13:09:19',NULL);
/*!40000 ALTER TABLE `produtos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saft_export_logs`
--

DROP TABLE IF EXISTS `saft_export_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saft_export_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ano` int NOT NULL,
  `mes` int NOT NULL,
  `exportado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `caminho_arquivo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `saft_export_logs_empresa_id_ano_mes_index` (`empresa_id`,`ano`,`mes`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saft_export_logs`
--

LOCK TABLES `saft_export_logs` WRITE;
/*!40000 ALTER TABLE `saft_export_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `saft_export_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `series_fiscais`
--

DROP TABLE IF EXISTS `series_fiscais`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `series_fiscais` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_documento` enum('FT','FR','FP','FA','NC','ND','RC','FRt') COLLATE utf8mb4_unicode_ci NOT NULL,
  `serie` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ano` year NOT NULL,
  `ultimo_numero` int unsigned NOT NULL DEFAULT '0',
  `digitos` tinyint unsigned NOT NULL DEFAULT '4',
  `ativa` tinyint(1) NOT NULL DEFAULT '1',
  `padrao` tinyint(1) NOT NULL DEFAULT '0',
  `valida_agt` tinyint(1) NOT NULL DEFAULT '1',
  `observacoes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_serie_tipo_ano` (`tipo_documento`,`serie`,`ano`),
  KEY `series_fiscais_user_id_foreign` (`user_id`),
  KEY `series_fiscais_tipo_documento_ativa_index` (`tipo_documento`,`ativa`),
  KEY `series_fiscais_tipo_documento_ano_ativa_index` (`tipo_documento`,`ano`,`ativa`),
  KEY `series_fiscais_tipo_documento_padrao_ativa_index` (`tipo_documento`,`padrao`,`ativa`),
  CONSTRAINT `series_fiscais_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `series_fiscais`
--

LOCK TABLES `series_fiscais` WRITE;
/*!40000 ALTER TABLE `series_fiscais` DISABLE KEYS */;
INSERT INTO `series_fiscais` VALUES ('102ebd29-f0f7-4b98-8bea-2d490a6a83f6','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'NC','MUNDIAL','Série padrão — Notas de Crédito',2026,0,4,1,1,1,NULL,'2026-07-27 13:08:35','2026-07-27 13:08:35'),('28368eb6-ff1d-4c25-9e2a-8ecaed5d03ea',NULL,NULL,'NC','CREDITO','Série padrão — Notas de Crédito',2026,0,4,1,1,1,NULL,'2026-07-20 15:33:57','2026-07-20 15:33:57'),('2bb3015f-346d-418d-b641-7a05b483e6f1','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'FA','MUNDIAL','Série padrão — Faturas de Adiantamento',2026,0,4,1,1,1,NULL,'2026-07-27 13:08:35','2026-07-27 13:08:35'),('2f97adac-6d52-4f68-85af-0f0112f27c90',NULL,NULL,'ND','DEBITO','Série padrão — Notas de Débito',2026,0,4,1,1,1,NULL,'2026-07-20 15:33:57','2026-07-20 15:33:57'),('347168f8-a3b9-4dfe-863c-e37cd98ad996','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'FR','MUNDIAL','Série padrão — Faturas-Recibo',2026,1,4,1,1,1,NULL,'2026-07-27 13:08:35','2026-07-27 13:08:36'),('3b4f1f74-7388-446d-9b88-9ada6e34e366',NULL,NULL,'FR','A','Série padrão — Faturas-Recibo (Loja Principal)',2026,0,4,1,1,1,NULL,'2026-07-20 15:33:57','2026-07-20 15:33:57'),('4895eff0-c327-4d1d-af2f-4afd15e3c1cd',NULL,NULL,'FRt','RETIF','Série padrão — Faturas de Retificação',2026,0,4,1,1,1,NULL,'2026-07-20 15:33:57','2026-07-20 15:33:57'),('512ada2b-09d9-48e4-a871-c25bc41e9114',NULL,NULL,'RC','RECIBO','Série padrão — Recibos',2026,0,4,1,1,0,NULL,'2026-07-20 15:33:57','2026-07-20 15:33:57'),('79696b18-1234-42b2-b72a-8139e0c63349','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'RC','MUNDIAL','Série padrão — Recibos',2026,0,4,1,1,0,NULL,'2026-07-27 13:08:35','2026-07-27 13:08:35'),('85910d6a-19f6-4827-adc1-52c0c9bb9b1f',NULL,NULL,'FT','A','Série padrão — Faturas (Loja Principal)',2026,0,4,1,1,1,NULL,'2026-07-20 15:33:57','2026-07-20 15:33:57'),('9b174cca-6d60-4263-a4bc-0c16c4657524',NULL,NULL,'FP','PROFORMA','Série padrão — Faturas Proforma',2026,0,4,1,1,0,NULL,'2026-07-20 15:33:57','2026-07-20 15:33:57'),('a1eed442-0c80-42af-b480-4276d5b72edc','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'FT','MUNDIAL','Série padrão — Faturas',2026,1,4,1,1,1,NULL,'2026-07-27 13:08:35','2026-07-27 13:09:19'),('b7465ba0-fa9f-4f20-bd6c-2f218a83bb2b',NULL,NULL,'FA','ADTO','Série padrão — Faturas de Adiantamento',2026,0,4,1,1,1,NULL,'2026-07-20 15:33:57','2026-07-20 15:33:57'),('bfcd9732-e267-4f13-8550-30fafd0751f3','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'FP','MUNDIAL','Série padrão — Faturas Proforma',2026,1,4,1,1,0,NULL,'2026-07-27 13:08:35','2026-07-27 13:09:52'),('d55e845e-be8a-47c6-89ed-6ee070377cac','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'ND','MUNDIAL','Série padrão — Notas de Débito',2026,0,4,1,1,1,NULL,'2026-07-27 13:08:35','2026-07-27 13:08:35'),('d905ab91-ecc5-499d-a804-fc5180adac94','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'FRt','MUNDIAL','Série padrão — Faturas de Retificação',2026,0,4,1,1,1,NULL,'2026-07-27 13:08:35','2026-07-27 13:08:35');
/*!40000 ALTER TABLE `series_fiscais` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','operador','contablista','gestor') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'operador',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `ultimo_login` timestamp NULL DEFAULT NULL,
  `printer_ip` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_user_id_index` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('2e165ed4-384a-4e1d-b273-de39c5d4f224','95e3bffb-e8f4-48eb-b1c3-bd49cbd74968',NULL,'Garnacho','garnacho@gmail.com','$2y$12$yNA0nmcCLwc9jXImXJ4mbeNL27yDQTdcln6L52f7uRtINKPEH3MTm','operador',1,NULL,NULL,NULL,'2026-07-20 15:47:46','2026-07-20 15:47:46'),('31bdc23e-be87-4946-a131-ecfe65ac21da','4e9b0ed1-dff1-445d-8515-97b9d3707b67',NULL,'Envaldo Miranda','envaldo@xmiranda.com','$2y$12$lLuSlHLoHPB3GExjK03tueDcws5aGlPxAL2tmympxB2kKS20AxN/.','admin',1,'2026-07-27 14:06:35',NULL,NULL,'2026-07-20 15:34:27','2026-07-27 14:06:35'),('671374d4-d391-4d61-b354-a0e2085d856b','4e9b0ed1-dff1-445d-8515-97b9d3707b67',NULL,'silva joao','silva@xmiranda.com','$2y$12$JW6CIW91ZN3BvX4NEudkUeqJo4pdedQvWy38oePXMXW0SD.kgcpNi','operador',1,NULL,NULL,NULL,'2026-07-20 15:37:48','2026-07-20 15:37:48'),('8ff16190-ac70-4425-a430-e2f801c3a590','95e3bffb-e8f4-48eb-b1c3-bd49cbd74968',NULL,'wile','wile@cris.com','$2y$12$XuuLlAD11kJAsetnmQij3OhO14uGtQsozUJXEOTbL3udCYKcRIKL.','operador',1,NULL,NULL,NULL,'2026-07-27 14:04:16','2026-07-27 14:04:16'),('920c6dbe-46dd-474b-95ed-54d43b3d62c1','4e9b0ed1-dff1-445d-8515-97b9d3707b67',NULL,'joao silva','joao@xmiranda.com','$2y$12$ciWG7eWzhDnJcDQHKWK2BOOURvlcmh.TLALRFo9m4K15ubfVoCqSK','contablista',1,NULL,NULL,NULL,'2026-07-20 15:37:11','2026-07-20 15:37:11'),('a54a2e93-6220-481e-a838-bf6028aaa68d','4e9b0ed1-dff1-445d-8515-97b9d3707b67',NULL,'XMIRANDA','xmiranda@xmiranda.com','$2y$12$4.WDoumtKhilQEIqclMuZefwXdnLGzmhkjvxJEA1nvqU3UhUSW7S2','admin',1,NULL,NULL,NULL,'2026-07-20 15:39:24','2026-07-20 15:39:24'),('b074d07a-e921-4569-8337-473651b05304','95e3bffb-e8f4-48eb-b1c3-bd49cbd74968',NULL,'alexandro','alexandro@cris.com','$2y$12$Uu26CsYtSl76ZXBd39XTL.98wOcZCCWQX4pRHKK332o3jXrok7KsK','contablista',1,'2026-07-27 14:01:58',NULL,NULL,'2026-07-20 15:48:53','2026-07-27 14:01:58'),('b1ceadc6-6206-44b5-84ce-01993657dfa0','4e9b0ed1-dff1-445d-8515-97b9d3707b67',NULL,'js','js@xmiranda.com','$2y$12$Lqg0r2mhO1p64OPp9NHr1usZt2DJxgWF40DW/g9S.EMSOEiVcma6S','gestor',1,NULL,NULL,NULL,'2026-07-20 15:38:32','2026-07-20 15:38:32'),('b202e7a0-a461-4c92-b331-6440e9718748','8298aa98-7ab9-45d8-8b30-b21869efe824',NULL,'francisco','francisco@agua.com','$2y$12$mn/i1/vmpBBxkxiGf5wGNO5hZRxTu12c6CLOMM5oBkSghV1Ed30ny','admin',1,'2026-07-27 15:48:54',NULL,NULL,'2026-07-27 15:48:51','2026-07-27 15:48:54'),('b7cf59f8-ff95-4d3a-9323-1c9832bdfa1a','95e3bffb-e8f4-48eb-b1c3-bd49cbd74968',NULL,'liwe','liwe@cris.com','$2y$12$cuqi8fAvOcSq9vT.WRny9e6KFDRjxp92mweit73Oy3qKrqbBMJBhe','operador',1,NULL,NULL,NULL,'2026-07-27 14:04:47','2026-07-27 14:04:47'),('cf67d291-96a4-4b67-9dad-2e15878d8bbe','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf',NULL,'Enfatino','Efantino@mundial.com','$2y$12$MPWOrMexKRmSvhjcAdjm4eDqjPtNBxXIB3JJSNmk6sJQ1thgSN0yS','admin',1,'2026-07-27 15:25:12',NULL,NULL,'2026-07-27 12:57:19','2026-07-27 15:25:12'),('e4f8ad93-fb69-48d3-9c74-2e37f87501b3','95e3bffb-e8f4-48eb-b1c3-bd49cbd74968',NULL,'Joao Neves','joaoneves@cris.com','$2y$12$BysDlIYqiAM82bpOzH9ktOMNpupC7FAD229UeVjtbeYnGMTtzRs72','admin',1,'2026-07-27 14:03:13',NULL,NULL,'2026-07-20 15:44:10','2026-07-27 14:03:13'),('f43fc00a-ad44-4ef3-a324-91a11af9014d','95e3bffb-e8f4-48eb-b1c3-bd49cbd74968',NULL,'kiliam','mbappe@gmail.com','$2y$12$wONjWJIxayAbZxHZS8t5RuUKrsXSEIRKjLhAHQRfo1bn8XGdM04BC','operador',1,NULL,NULL,NULL,'2026-07-27 14:05:45','2026-07-27 14:05:45');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendas`
--

DROP TABLE IF EXISTS `vendas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendas` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cliente_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_nome` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_nif` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `documento_fiscal_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero` int NOT NULL,
  `numero_documento` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `base_tributavel` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_iva` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_retencao` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_pagar` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total` decimal(15,2) NOT NULL DEFAULT '0.00',
  `desconto_global` decimal(15,2) NOT NULL DEFAULT '0.00',
  `troco` decimal(15,2) NOT NULL DEFAULT '0.00',
  `data_venda` date NOT NULL,
  `hora_venda` time NOT NULL,
  `status` enum('aberta','faturada','cancelada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'aberta',
  `estado_pagamento` enum('pendente','paga','parcial','cancelada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendente',
  `tipo_documento_fiscal` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observacoes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `vendas_user_id_foreign` (`user_id`),
  KEY `vendas_cliente_id_index` (`cliente_id`),
  KEY `vendas_status_index` (`status`),
  KEY `vendas_estado_pagamento_index` (`estado_pagamento`),
  KEY `vendas_data_venda_index` (`data_venda`),
  KEY `vendas_tipo_documento_fiscal_index` (`tipo_documento_fiscal`),
  KEY `vendas_status_estado_pagamento_index` (`status`,`estado_pagamento`),
  KEY `vendas_data_venda_tipo_documento_fiscal_index` (`data_venda`,`tipo_documento_fiscal`),
  KEY `vendas_cliente_id_estado_pagamento_index` (`cliente_id`,`estado_pagamento`),
  KEY `vendas_documento_fiscal_id_index` (`documento_fiscal_id`),
  KEY `vendas_numero_documento_index` (`numero_documento`),
  KEY `vendas_desconto_global_index` (`desconto_global`),
  CONSTRAINT `vendas_cliente_id_foreign` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `vendas_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendas`
--

LOCK TABLES `vendas` WRITE;
/*!40000 ALTER TABLE `vendas` DISABLE KEYS */;
INSERT INTO `vendas` VALUES ('1d1b938b-c41e-446f-9b6e-4621abf26927','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','0fa81eb4-0372-458e-8a6d-c0b1d00c7bbf',NULL,NULL,'cf67d291-96a4-4b67-9dad-2e15878d8bbe','83e857b4-c557-420b-81ab-e94c781d7df9',1,'VD-000001',11200.00,1568.00,0.00,12768.00,12768.00,0.00,0.00,'2026-07-27','15:08:35','faturada','paga','FR',NULL,'2026-07-27 13:08:35','2026-07-27 13:08:36',NULL),('8a1cb6e2-42e2-4728-b750-86093ef8e364','6e3c8fa3-64c8-4e77-aa28-3fda1d8502cf','136f47a4-84e5-437f-8bcf-9c2dfb303fb0',NULL,NULL,'cf67d291-96a4-4b67-9dad-2e15878d8bbe','1044c9c8-c48a-4fdc-9c9c-ba974aa14729',2,'VD-000002',14200.00,1988.00,0.00,16188.00,16188.00,0.00,0.00,'2026-07-27','15:09:19','faturada','pendente','FT',NULL,'2026-07-27 13:09:19','2026-07-27 13:09:19',NULL);
/*!40000 ALTER TABLE `vendas` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-18 15:17:58
