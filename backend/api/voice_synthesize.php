<?php
declare(strict_types=1);
require_once __DIR__ . '/../services/auth_service.php';
require_once __DIR__ . '/../services/voice_service.php';
require_once __DIR__ . '/../services/voice_clone_service.php';
applyCors();
requireMethod('POST');
$userId = authenticatedUserId();
$body = getJsonBody();
$text = trim((string)($body['text'] ?? ''));
$voice = (string)($body['voice'] ?? 'ana');
$purpose = (string)($body['purpose'] ?? 'studio');
if ($text === '' || mb_strlen($text) > 600 || !in_array($voice, ['ana', 'xiaoxiao', 'clone', 'auto'], true)
    || !in_array($purpose, ['studio', 'ai', 'interaction'], true)) {
    jsonResponse(['success' => false, 'code' => 'invalid_voice_input', 'message' => 'Use 1–600 characters and a supported voice.'], 422);
}

if ($voice === 'auto') {
    $profile = voiceProfile(db(), $userId);
    $voice = (string)($profile[$purpose === 'interaction' ? 'interaction_voice' : 'ai_voice'] ?? 'off');
    if ($voice === 'off') jsonResponse(['success' => false, 'code' => 'voice_disabled', 'message' => 'This voice is turned off.'], 409);
}
if ($voice === 'clone') {
    try {
        $providerId = providerVoiceId(db(), $userId);
        if ($providerId === null) jsonResponse(['success' => false, 'code' => 'clone_missing', 'message' => 'Create your voice first.'], 404);
        $audio = synthesizeProviderVoice($text, $providerId);
        jsonResponse(['success' => true, 'data' => ['audio_base64' => base64_encode($audio), 'mime_type' => 'audio/mpeg', 'voice' => 'clone']]);
    } catch (Throwable $e) {
        $code = $e->getMessage() === 'clone_not_configured' ? 'voice_not_configured' : 'voice_unavailable';
        voiceFailure($code);
    }
}
$result = runVoiceWorker('voice_synthesize.py', ['text' => $text, 'voice' => $voice], $userId, 'tts');
if (isset($result['error'])) voiceFailure($result['error']);
if (strlen($result['data']) < 100) voiceFailure('voice_unavailable');
jsonResponse(['success' => true, 'data' => ['audio_base64' => base64_encode($result['data']), 'mime_type' => 'audio/mpeg', 'voice' => $voice]]);
