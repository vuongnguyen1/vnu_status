-- ====================================================================
-- Enterprise Status & Uptime Monitoring Platform
-- Database Migration & Initialization Script (MySQL 8.0+)
-- Clean skeleton schema with zero sensitive/internal endpoints.
-- ====================================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `check_locks`;
DROP TABLE IF EXISTS `check_logs`;
DROP TABLE IF EXISTS `service_stats_history`;
DROP TABLE IF EXISTS `logs`;
DROP TABLE IF EXISTS `services`;
DROP TABLE IF EXISTS `external_services`;
DROP TABLE IF EXISTS `admin_users`;
DROP TABLE IF EXISTS `api_permissions`;
DROP TABLE IF EXISTS `settings`;
DROP TABLE IF EXISTS `telegram_subscribers`;
SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------------------
-- 1. Table: admin_users (Administrative & Operator accounts)
-- --------------------------------------------------------------------
CREATE TABLE `admin_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `role` enum('admin','user') COLLATE utf8mb4_general_ci DEFAULT 'user',
  `display_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Default Administrator Seed:
-- Username: admin
-- Password: admin (BCrypt hash)
INSERT INTO `admin_users` (`id`, `username`, `password`, `role`, `display_name`)
VALUES (1, 'admin', '$2a$10$8zoUzPOA8rK4gZ.tdr7FpehIg8hv1qdGc7uHHBRNMq8TF2st06yFu', 'admin', 'System Administrator');

-- --------------------------------------------------------------------
-- 2. Table: services (Primary monitored target endpoints)
-- --------------------------------------------------------------------
CREATE TABLE `services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `url` varchar(500) COLLATE utf8mb4_general_ci NOT NULL,
  `keyword` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `check_type` enum('simple','login_verify') COLLATE utf8mb4_general_ci DEFAULT 'simple',
  `failure_threshold` int DEFAULT '2',
  `timeout` int DEFAULT '15',
  `total_checks` bigint DEFAULT '0',
  `total_failures` bigint DEFAULT '0',
  `login_verify_string` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `current_status` int DEFAULT '200',
  `is_online` tinyint(1) DEFAULT '1',
  `failure_count` float DEFAULT '0',
  `last_check` datetime DEFAULT NULL,
  `last_status_change` datetime DEFAULT NULL,
  `response_time` float DEFAULT '0',
  `check_resources` tinyint(1) DEFAULT '0',
  `category` enum('general','student','staff','internal') COLLATE utf8mb4_general_ci DEFAULT 'general',
  `check_method` enum('simple','keyword','selector','xpath') COLLATE utf8mb4_general_ci DEFAULT 'simple',
  `selector` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `xpath` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `follow_redirects` tinyint(1) DEFAULT '1',
  `use_cookies` tinyint(1) DEFAULT '0',
  `ssl_expiry` datetime DEFAULT NULL,
  `ssl_info` text COLLATE utf8mb4_general_ci,
  `ignore_ssl` tinyint(1) DEFAULT '1',
  `use_keyword` tinyint(1) DEFAULT '0',
  `use_selector` tinyint(1) DEFAULT '0',
  `use_xpath` tinyint(1) DEFAULT '0',
  `use_login_verify` tinyint(1) DEFAULT '0',
  `ssl_warning_sent` tinyint(1) DEFAULT '0',
  `last_ssl_error` text COLLATE utf8mb4_general_ci,
  `check_interval` int DEFAULT '60',
  `last_ssl_check` datetime DEFAULT NULL,
  `ssl_expiring_alert_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Sample Skeleton Services (Demo Targets)
INSERT INTO `services` (`id`, `name`, `url`, `check_type`, `category`, `check_interval`, `current_status`, `is_online`)
VALUES
(1, 'Central Authentication Gateway', 'https://example.com/idp', 'simple', 'general', 60, 200, 1),
(2, 'Student Information System', 'https://example.com/student', 'simple', 'student', 60, 200, 1),
(3, 'Staff & Faculty Portal', 'https://example.com/staff', 'simple', 'staff', 60, 200, 1),
(4, 'Institutional Webmail', 'https://example.com/mail', 'simple', 'general', 120, 200, 1);

-- --------------------------------------------------------------------
-- 3. Table: external_services (Third-party & upstream dependency checks)
-- --------------------------------------------------------------------
CREATE TABLE `external_services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `url` varchar(500) COLLATE utf8mb4_general_ci NOT NULL,
  `provider` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'other',
  `selector` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `good_keyword` varchar(255) COLLATE utf8mb4_general_ci DEFAULT 'Operational',
  `current_status` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'Unknown',
  `last_check` datetime DEFAULT NULL,
  `last_status_change` datetime DEFAULT NULL,
  `check_method` enum('simple','keyword','selector','xpath') COLLATE utf8mb4_general_ci DEFAULT 'simple',
  `xpath` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `follow_redirects` tinyint(1) DEFAULT '1',
  `use_cookies` tinyint(1) DEFAULT '0',
  `ssl_expiry` datetime DEFAULT NULL,
  `ssl_info` text COLLATE utf8mb4_general_ci,
  `ignore_ssl` tinyint(1) DEFAULT '1',
  `use_keyword` tinyint(1) DEFAULT '0',
  `use_selector` tinyint(1) DEFAULT '0',
  `use_xpath` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------------------
-- 4. Table: check_logs (Detailed audit log for every probe execution)
-- --------------------------------------------------------------------
CREATE TABLE `check_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `service_id` int NOT NULL,
  `check_time` datetime NOT NULL,
  `http_code` int DEFAULT NULL,
  `response_time` float DEFAULT NULL,
  `is_online` tinyint(1) DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_general_ci,
  `headers` text COLLATE utf8mb4_general_ci,
  `response_size` int DEFAULT NULL,
  `dns_time` float DEFAULT NULL,
  `connect_time` float DEFAULT NULL,
  `pretransfer_time` float DEFAULT NULL,
  `starttransfer_time` float DEFAULT NULL,
  `redirect_time` float DEFAULT NULL,
  `speed_download` float DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_service_time` (`service_id`,`check_time`),
  KEY `idx_check_time` (`check_time`),
  CONSTRAINT `check_logs_fk_1` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------------------
-- 5. Table: service_stats_history (Historical SLA & Availability points)
-- --------------------------------------------------------------------
CREATE TABLE `service_stats_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `service_id` int NOT NULL,
  `status_code` int NOT NULL,
  `response_time` float NOT NULL,
  `is_online` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `service_id` (`service_id`),
  CONSTRAINT `service_stats_fk_1` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------------------
-- 6. Table: logs (High-level system event & error log)
-- --------------------------------------------------------------------
CREATE TABLE `logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `service_id` int NOT NULL,
  `status_code` int NOT NULL,
  `response_time` float NOT NULL,
  `message` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------------------
-- 7. Table: check_locks (Distributed lock prevention for scheduler)
-- --------------------------------------------------------------------
CREATE TABLE `check_locks` (
  `service_id` int NOT NULL,
  `locked_at` datetime NOT NULL,
  `locked_by` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `process_id` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`service_id`),
  KEY `idx_locked_at` (`locked_at`),
  CONSTRAINT `check_locks_fk_1` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------------------
-- 8. Table: settings (Key-value platform configuration)
-- --------------------------------------------------------------------
CREATE TABLE `settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key_name` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `value` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key_name` (`key_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `settings` (`key_name`, `value`) VALUES
('site_title', 'System Status & Availability Platform'),
('refresh_rate', '60'),
('telegram_alert_enabled', '0'),
('ssl_warning_days', '14');

-- --------------------------------------------------------------------
-- 9. Table: api_permissions (External integrations & partner access)
-- --------------------------------------------------------------------
CREATE TABLE `api_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `partner_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `allowed_domain` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `api_secret` varchar(100) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'secret_token',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------------------
-- 10. Table: telegram_subscribers (Notification recipients)
-- --------------------------------------------------------------------
CREATE TABLE `telegram_subscribers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `telegram_user_id` bigint NOT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `telegram_user_id` (`telegram_user_id`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
