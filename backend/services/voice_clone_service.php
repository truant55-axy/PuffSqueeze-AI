<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';

const PUFF_VOICE_CHOICES = ['ana', 'xiaoxiao', 'clone', 'off'];

function voiceProfile(PDO $pdo, int $userId): ?array
{
    $table = tableName('puffsqueeze_voice_profiles');
    $statement = $pdo->prepare("SELECT display_name, ai_voice, interaction_voice, created_at, updated_at FROM {$table} WHERE user_id=? LIMIT 1");
    $statement->execute([$userId]);
    $row = $statement->fetch();
    return $row ?: null;
}

function providerVoiceId(PDO $pdo, int $userId): ?string
{
    $table = tableName('puffsqueeze_voice_profiles');
    $statement = $pdo->prepare("SELECT provider_voice_id FROM {$table} WHERE user_id=? LIMIT 1");
    $statement->execute([$userId]);
    $id = $statement->fetchColumn();
    return is_string($id) && preg_match('/^[A-Za-z0-9_-]{8,128}$/', $id) ? $id : null;
}

function saveVoiceProfile(PDO $pdo, int $userId, string $providerId, string $name): void
{
    if (!preg_match('/^[A-Za-z0-9_-]{8,128}$/', $providerId) || mb_strlen($name) < 1 || mb_strlen($name) > 80) {
        throw new InvalidArgumentException('Invalid voice profile');
    }
    $table = tableName('puffsqueeze_voice_profiles');
    $statement = $pdo->prepare(
        "INSERT INTO {$table} (user_id, provider_voice_id, display_name, ai_voice, interaction_voice, consent_at, created_at, updated_at)
         VALUES (?, ?, ?, 'clone', 'off', NOW(), NOW(), NOW())
         ON DUPLICATE KEY UPDATE provider_voice_id=VALUES(provider_voice_id), display_name=VALUES(display_name),
           consent_at=VALUES(consent_at), updated_at=NOW()"
    );
    $statement->execute([$userId, $providerId, $name]);
}

function updateVoiceProfileSettings(PDO $pdo, int $userId, string $aiVoice, string $interactionVoice): bool
{
    if (!in_array($aiVoice, PUFF_VOICE_CHOICES, true) || !in_array($interactionVoice, PUFF_VOICE_CHOICES, true)) {
        throw new InvalidArgumentException('Invalid voice setting');
    }
    $table = tableName('puffsqueeze_voice_profiles');
    $statement = $pdo->prepare("UPDATE {$table} SET ai_voice=?, interaction_voice=?, updated_at=NOW() WHERE user_id=?");
    $statement->execute([$aiVoice, $interactionVoice, $userId]);
    return $statement->rowCount() > 0 || providerVoiceId($pdo, $userId) !== null;
}

function deleteVoiceProfile(PDO $pdo, int $userId): ?string
{
    $id = providerVoiceId($pdo, $userId);
    if ($id === null) return null;
    $table = tableName('puffsqueeze_voice_profiles');
    $statement = $pdo->prepare("DELETE FROM {$table} WHERE user_id=?");
    $statement->execute([$userId]);
    return $id;
}

function elevenLabsKey(): string
{
    $key = trim((string)envValue('ELEVENLABS_API_KEY', ''));
    if ($key === '' || str_starts_with($key, 'your_')) throw new RuntimeException('clone_not_configured');
    return $key;
}

/** @return array{status:int, body:string, content_type:string} */
function elevenLabsRequest(string $method, string $path, mixed $body = null, array $headers = []): array
{
    $ch = curl_init('https://api.elevenlabs.io' . $path);
    if ($ch === false) throw new RuntimeException('clone_unavailable');
    $responseHeaders = [];
    $baseHeaders = ['xi-api-key: ' . elevenLabsKey()];
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => array_merge($baseHeaders, $headers),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 45,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_MAXREDIRS => 0,
        CURLOPT_HEADERFUNCTION => static function ($curl, string $line) use (&$responseHeaders): int {
            $parts = explode(':', $line, 2);
            if (count($parts) === 2) $responseHeaders[strtolower(trim($parts[0]))] = trim($parts[1]);
            return strlen($line);
        },
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    $result = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $contentType = strtolower((string)($responseHeaders['content-type'] ?? curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?? ''));
    $error = curl_error($ch);
    curl_close($ch);
    if (!is_string($result) || $result === '' || $status === 0) {
        error_log('ElevenLabs request failed: ' . ($error !== '' ? 'network' : 'empty response'));
        throw new RuntimeException('clone_unavailable');
    }
    return ['status' => $status, 'body' => $result, 'content_type' => $contentType];
}

function createProviderVoice(string $audio, string $mimeType, int $userId): string
{
    if ($audio === '' || strlen($audio) > 2 * 1024 * 1024 || !in_array($mimeType, ['audio/webm','audio/ogg','audio/m4a','audio/wav'], true)) {
        throw new InvalidArgumentException('Invalid clone sample');
    }
    $extension = ['audio/webm' => 'webm', 'audio/ogg' => 'ogg', 'audio/m4a' => 'm4a', 'audio/wav' => 'wav'][$mimeType];
    $file = new CURLStringFile($audio, $mimeType, 'voice-sample.' . $extension);
    $response = elevenLabsRequest('POST', '/v1/voices/add', [
        'name' => 'PuffSqueeze-' . $userId . '-' . gmdate('YmdHis'),
        'description' => 'Private voice created by an authenticated PuffSqueeze user with explicit consent.',
        'remove_background_noise' => 'false',
        'files[]' => $file,
    ]);
    if ($response['status'] < 200 || $response['status'] >= 300) {
        error_log('ElevenLabs clone rejected with HTTP ' . $response['status']);
        throw new RuntimeException($response['status'] === 401 ? 'clone_not_configured' : 'clone_unavailable');
    }
    $json = json_decode($response['body'], true);
    $id = is_array($json) ? (string)($json['voice_id'] ?? '') : '';
    if (!preg_match('/^[A-Za-z0-9_-]{8,128}$/', $id)) throw new RuntimeException('clone_unavailable');
    return $id;
}

function deleteProviderVoice(string $providerId): void
{
    if (!preg_match('/^[A-Za-z0-9_-]{8,128}$/', $providerId)) return;
    try { elevenLabsRequest('DELETE', '/v1/voices/' . rawurlencode($providerId)); }
    catch (Throwable $e) { error_log('Provider voice cleanup deferred'); }
}

function synthesizeProviderVoice(string $text, string $providerId): string
{
    if ($text === '' || mb_strlen($text) > 600 || !preg_match('/^[A-Za-z0-9_-]{8,128}$/', $providerId)) {
        throw new InvalidArgumentException('Invalid speech request');
    }
    $payload = json_encode([
        'text' => $text,
        'model_id' => (string)envValue('ELEVENLABS_TTS_MODEL', 'eleven_flash_v2_5'),
        'voice_settings' => ['stability' => 0.55, 'similarity_boost' => 0.75, 'style' => 0.0, 'use_speaker_boost' => true],
    ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    $response = elevenLabsRequest('POST', '/v1/text-to-speech/' . rawurlencode($providerId) . '?output_format=mp3_44100_128', $payload, [
        'Content-Type: application/json', 'Accept: audio/mpeg',
    ]);
    if ($response['status'] < 200 || $response['status'] >= 300
        || !str_starts_with($response['content_type'], 'audio/')
        || strlen($response['body']) < 100 || strlen($response['body']) > 1024 * 1024) {
        error_log('ElevenLabs speech rejected with HTTP ' . $response['status']);
        throw new RuntimeException('voice_unavailable');
    }
    return $response['body'];
}
