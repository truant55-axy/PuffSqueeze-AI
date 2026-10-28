<?php
declare(strict_types=1);
require_once __DIR__ . '/../services/auth_service.php';
require_once __DIR__ . '/../services/transcription_service.php';
require_once __DIR__ . '/../services/voice_recording_service.php';
applyCors();
requireMethod('POST');
$userId = authenticatedUserId();
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 2 * 1024 * 1024) {
    jsonResponse(['success' => false, 'code' => 'invalid_audio', 'message' => 'Recording exceeds 2 MB.'], 413);
}
$upload = $_FILES['audio'] ?? null;
$language = (string)($_POST['language'] ?? 'en');
if (!is_array($upload) || ($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK
    || !is_string($upload['tmp_name'] ?? null) || !is_uploaded_file($upload['tmp_name'])
    || ($upload['size'] ?? 0) < 100 || $upload['size'] > 2 * 1024 * 1024 || !in_array($language, ['en', 'zh'], true)) {
    jsonResponse(['success' => false, 'code' => 'invalid_audio', 'message' => 'Send a short audio recording.'], 422);
}
$signature = (string)file_get_contents($upload['tmp_name'], false, null, 0, 16);
$mimeType = '';
if (substr($signature, 0, 4) === "\x1a\x45\xdf\xa3") $mimeType = 'audio/webm';
elseif (substr($signature, 0, 4) === 'OggS') $mimeType = 'audio/ogg';
elseif (substr($signature, 4, 4) === 'ftyp') $mimeType = 'audio/m4a';
elseif (substr($signature, 0, 4) === 'RIFF' && substr($signature, 8, 4) === 'WAVE') $mimeType = 'audio/wav';
if ($mimeType === '') {
    jsonResponse(['success' => false, 'code' => 'invalid_audio', 'message' => 'Unsupported recording format.'], 422);
}

try {
    $audio = file_get_contents($upload['tmp_name']);
    if (!is_string($audio) || $audio === '') throw new RuntimeException('transcription_unavailable');
    $text = geminiTranscribeAudio($audio, $mimeType, $language);
    $recordingId = saveVoiceRecording(db(), $userId, $audio, $mimeType, $language, $text);
    // PHP removes the upload temp file; the authenticated copy is now stored in TiDB.
    jsonResponse(['success' => true, 'data' => ['text' => $text, 'recording_id' => $recordingId]]);
} catch (Throwable $e) {
    if ($e->getMessage() === 'transcription_not_configured') {
        jsonResponse(['success' => false, 'code' => 'transcription_not_configured', 'message' => 'Transcription service unavailable. Please try again.'], 409);
    }
    if ($e->getMessage() === 'transcription_unavailable') {
        jsonResponse(['success' => false, 'code' => 'transcription_unavailable', 'message' => 'Transcription service unavailable. Please try again.'], 502);
    }
    error_log('Voice recording storage failed: ' . $e->getMessage());
    jsonResponse(['success' => false, 'code' => 'recording_storage_unavailable', 'message' => 'Recording could not be saved. Please try again.'], 503);
}
