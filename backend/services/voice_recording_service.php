<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';

/** Save one authenticated user's recognized recording, idempotently by audio hash. */
function saveVoiceRecording(
    PDO $pdo,
    int $userId,
    string $audio,
    string $mimeType,
    string $language,
    string $transcript
): int {
    if ($userId <= 0 || $audio === '' || strlen($audio) > 2 * 1024 * 1024
        || !in_array($mimeType, ['audio/webm', 'audio/ogg', 'audio/m4a', 'audio/wav'], true)
        || !in_array($language, ['en', 'zh'], true) || mb_strlen($transcript) > 600) {
        throw new InvalidArgumentException('Invalid voice recording');
    }

    $table = tableName('puffsqueeze_voice_recordings');
    $hash = hash('sha256', $audio);
    $statement = $pdo->prepare(
        "INSERT INTO {$table}
         (user_id, transcript, language, mime_type, audio_bytes, audio_sha256, audio_data, created_at)
         VALUES (:user_id, :transcript, :language, :mime_type, :audio_bytes, :audio_sha256, :audio_data, NOW())
         ON DUPLICATE KEY UPDATE
           transcript = VALUES(transcript),
           language = VALUES(language),
           mime_type = VALUES(mime_type),
           audio_bytes = VALUES(audio_bytes)"
    );
    $statement->bindValue(':user_id', $userId, PDO::PARAM_INT);
    $statement->bindValue(':transcript', $transcript, PDO::PARAM_STR);
    $statement->bindValue(':language', $language, PDO::PARAM_STR);
    $statement->bindValue(':mime_type', $mimeType, PDO::PARAM_STR);
    $statement->bindValue(':audio_bytes', strlen($audio), PDO::PARAM_INT);
    $statement->bindValue(':audio_sha256', $hash, PDO::PARAM_STR);
    $statement->bindValue(':audio_data', $audio, PDO::PARAM_LOB);
    $statement->execute();

    $find = $pdo->prepare("SELECT id FROM {$table} WHERE user_id = ? AND audio_sha256 = ? LIMIT 1");
    $find->execute([$userId, $hash]);
    $id = (int)$find->fetchColumn();
    if ($id <= 0) throw new RuntimeException('Voice recording was not saved');
    return $id;
}

