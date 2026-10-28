<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/auth_service.php';
require_once __DIR__ . '/../services/voice_clone_service.php';
applyCors();
$userId = authenticatedUserId();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$pdo = db();

if ($method === 'GET') {
    jsonResponse(['success' => true, 'data' => ['profile' => voiceProfile($pdo, $userId)]]);
}
if ($method === 'POST') {
    $body = getJsonBody();
    $aiVoice = (string)($body['ai_voice'] ?? 'clone');
    $interactionVoice = (string)($body['interaction_voice'] ?? 'off');
    try {
        if (!updateVoiceProfileSettings($pdo, $userId, $aiVoice, $interactionVoice)) {
            jsonResponse(['success' => false, 'code' => 'clone_missing', 'message' => 'Create your voice first.'], 404);
        }
        jsonResponse(['success' => true, 'data' => ['profile' => voiceProfile($pdo, $userId)]]);
    } catch (InvalidArgumentException $e) {
        jsonResponse(['success' => false, 'code' => 'invalid_voice_setting', 'message' => 'Choose a supported voice.'], 422);
    }
}
if ($method === 'DELETE') {
    $providerId = deleteVoiceProfile($pdo, $userId);
    if ($providerId !== null) deleteProviderVoice($providerId);
    jsonResponse(['success' => true]);
}
jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
