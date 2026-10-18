-- PuffSqueeze AI: upgrade the original GitHub database for the current local build.
-- Target database confirmed from TiDB metadata: moodle
-- This migration is additive: it does not drop existing tables or delete rows.

USE `moodle`;

-- The original users table stored passwords in plain_password. The current backend
-- writes secure password hashes here and migrates old passwords after login/startup.
ALTER TABLE `puffsqueeze_users`
  ADD COLUMN IF NOT EXISTS `password_hash` VARCHAR(255) NULL AFTER `display_name`;

-- Login sessions used by the current authenticated APIs.
CREATE TABLE IF NOT EXISTS `puffsqueeze_care_sessions` (
  `token_hash` CHAR(64) NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `expires_at` DATETIME NOT NULL,
  PRIMARY KEY (`token_hash`),
  KEY `idx_care_session_user` (`user_id`),
  CONSTRAINT `fk_ps_care_session_user`
    FOREIGN KEY (`user_id`) REFERENCES `puffsqueeze_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shared companion/pet state.
CREATE TABLE IF NOT EXISTS `puffsqueeze_pets` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_id` BIGINT UNSIGNED NOT NULL,
  `kind` VARCHAR(20) NOT NULL,
  `name` VARCHAR(60) NOT NULL DEFAULT '',
  `xp` INT UNSIGNED NOT NULL DEFAULT 0,
  `happiness` DECIMAL(6,2) NOT NULL DEFAULT 65,
  `fullness` DECIMAL(6,2) NOT NULL DEFAULT 55,
  `cleanliness` DECIMAL(6,2) NOT NULL DEFAULT 70,
  `energy` DECIMAL(6,2) NOT NULL DEFAULT 65,
  `updated_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_owner_kind` (`owner_id`, `kind`),
  CONSTRAINT `fk_ps_pet_owner`
    FOREIGN KEY (`owner_id`) REFERENCES `puffsqueeze_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `puffsqueeze_pet_members` (
  `pet_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `joined_at` DATETIME NOT NULL,
  PRIMARY KEY (`pet_id`, `user_id`),
  KEY `idx_pet_member_user` (`user_id`),
  CONSTRAINT `fk_ps_pet_member_pet`
    FOREIGN KEY (`pet_id`) REFERENCES `puffsqueeze_pets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ps_pet_member_user`
    FOREIGN KEY (`user_id`) REFERENCES `puffsqueeze_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `puffsqueeze_pet_invites` (
  `code_hash` CHAR(64) NOT NULL,
  `pet_id` BIGINT UNSIGNED NOT NULL,
  `expires_at` DATETIME NOT NULL,
  PRIMARY KEY (`code_hash`),
  KEY `idx_pet_invite_pet` (`pet_id`),
  CONSTRAINT `fk_ps_pet_invite_pet`
    FOREIGN KEY (`pet_id`) REFERENCES `puffsqueeze_pets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `puffsqueeze_pet_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pet_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `request_id` VARCHAR(64) NOT NULL,
  `action` VARCHAR(20) NOT NULL,
  `food` VARCHAR(20) NOT NULL DEFAULT '',
  `xp_gain` SMALLINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_care_request` (`user_id`, `request_id`),
  KEY `idx_pet_events` (`pet_id`, `id`),
  CONSTRAINT `fk_ps_pet_event_pet`
    FOREIGN KEY (`pet_id`) REFERENCES `puffsqueeze_pets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ps_pet_event_user`
    FOREIGN KEY (`user_id`) REFERENCES `puffsqueeze_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-account synchronized documents and append-only activity history.
CREATE TABLE IF NOT EXISTS `puffsqueeze_account_sync_locks` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_ps_account_lock_user`
    FOREIGN KEY (`user_id`) REFERENCES `puffsqueeze_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `puffsqueeze_account_documents` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `document_key` VARCHAR(80) NOT NULL,
  `value_json` LONGTEXT NOT NULL,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`user_id`, `document_key`),
  CONSTRAINT `fk_ps_account_document_user`
    FOREIGN KEY (`user_id`) REFERENCES `puffsqueeze_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `puffsqueeze_account_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `request_id` CHAR(32) NOT NULL,
  `record_type` ENUM('document','activity') NOT NULL,
  `record_key` VARCHAR(80) NOT NULL,
  `value_json` LONGTEXT NOT NULL,
  `client_time` VARCHAR(35) NOT NULL,
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_account_request` (`user_id`, `request_id`),
  KEY `idx_account_time` (`user_id`, `id`),
  CONSTRAINT `fk_ps_account_record_user`
    FOREIGN KEY (`user_id`) REFERENCES `puffsqueeze_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verification: the current application expects all 15 tables below.
SELECT `TABLE_NAME`
FROM `information_schema`.`TABLES`
WHERE `TABLE_SCHEMA` = 'moodle'
  AND `TABLE_NAME` IN (
    'puffsqueeze_users',
    'puffsqueeze_user_profiles',
    'puffsqueeze_connect_posts',
    'puffsqueeze_stress_records',
    'puffsqueeze_usage_logs',
    'puffsqueeze_chat_logs',
    'puffsqueeze_device_events',
    'puffsqueeze_care_sessions',
    'puffsqueeze_pets',
    'puffsqueeze_pet_members',
    'puffsqueeze_pet_invites',
    'puffsqueeze_pet_events',
    'puffsqueeze_account_sync_locks',
    'puffsqueeze_account_documents',
    'puffsqueeze_account_records'
  )
ORDER BY `TABLE_NAME`;

-- Verification: password_hash must appear in this result.
SHOW FULL COLUMNS FROM `puffsqueeze_users`;
