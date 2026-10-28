<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/auth_service.php';
require_once __DIR__ . '/../services/voice_clone_service.php';
applyCors();
requireMethod('POST');
$userId = authenticatedUserId();
$body = getJsonBody();
$recordingId = (int)($body['recording_id'] ?? 0);
$name = trim((string)($body['name'] ?? 'My voice'));
$consent = ($body['consent'] ?? false) === true;
if ($recordingId <= 0 || !$consent || mb_strlen($name) < 1 || mb_strlen($name) > 80) {
    jsonResponse(['success' => false, 'code' => 'clone_consent_required', 'message' => 'Confirm ownership and select a valid recording.'], 422);
}

try {
    $pdo = db();
    $existing = voiceProfile($pdo, $userId);
    if ($existing && strtotime((string)$existing['updated_at']) > time() - 60) {
        jsonResponse(['success' => false, 'code' => 'clone_busy', 'message' => 'Wait a minute before replacing your voice.'], 429);
    }
    $recordings = tableName('puffsqueeze_voice_recordings');
    $statement = $pdo->prepare("SELECT audio_data, mime_type FROM {$recordings} WHERE id=? AND user_id=? LIMIT 1");
    $statement->execute([$recordingId, $userId]);
    $sample = $statement->fetch();
    if (!$sample || !is_string($sample['audio_data'] ?? null) || strlen($sample['audio_data']) < 100) {
        jsonResponse(['success' => false, 'code' => 'clone_sample_missing', 'message' => 'Record a voice sample first.'], 404);
    }
    $oldId = providerVoiceId($pdo, $userId);
    $newId = createProviderVoice($sample['audio_data'], (string)$sample['mime_type'], $userId);
    try { saveVoiceProfile($pdo, $userId, $newId, $name); }
    catch (Throwable $e) { deleteProviderVoice($newId); throw $e; }
    if ($oldId !== null && $oldId !== $newId) deleteProviderVoice($oldId);
    jsonResponse(['success' => true, 'data' => ['profile' => voiceProfile($pdo, $userId)]]);
} catch (Throwable $e) {
    $code = $e->getMessage();
    if ($code === 'clone_not_configured') jsonResponse(['success' => false, 'code' => $code, 'message' => 'Voice cloning is not configured.'], 409);
    error_log('Voice cloning failed: ' . get_class($e));
    jsonResponse(['success' => false, 'code' => 'clone_unavailable', 'message' => 'Voice cloning is temporarily unavailable.'], 502);
}
