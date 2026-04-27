<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../services/metrics_service.php';

applyCors();
requireMethod('POST');

$body = getJsonBody();
$userId = (int)($body['user_id'] ?? 0);
$contentText = trim((string)($body['content_text'] ?? ''));
$mediaType = trim((string)($body['media_type'] ?? 'none'));
$mediaMime = trim((string)($body['media_mime'] ?? ''));
$mediaData = (string)($body['media_data'] ?? '');
$mediaUrl = trim((string)($body['media_url'] ?? ''));

if ($userId <= 0) {
    jsonResponse(['success' => false, 'message' => 'user_id is required'], 422);
}

$allowedMediaTypes = ['none', 'image', 'video'];
if (!in_array($mediaType, $allowedMediaTypes, true)) {
    jsonResponse(['success' => false, 'message' => 'media_type must be none, image, or video'], 422);
}

if ($contentText === '' && $mediaType === 'none') {
    jsonResponse(['success' => false, 'message' => 'content_text or media is required'], 422);
}

if ($contentText !== '' && strlen($contentText) > 20000) {
    jsonResponse(['success' => false, 'message' => 'content_text is too long'], 422);
}

if (($mediaType === 'image' || $mediaType === 'video') && $mediaData === '' && $mediaUrl === '') {
    jsonResponse(['success' => false, 'message' => 'media_data or media_url is required for image/video'], 422);
}

try {
    $pdo = db();
    ensureUserExists($pdo, $userId);
    $postsTable = tableName('puffsqueeze_connect_posts');

    $stmt = $pdo->prepare(
        "INSERT INTO {$postsTable}
         (user_id, content_text, media_type, media_mime, media_data, media_url, visibility, published_at, created_at, updated_at)
         VALUES
         (:user_id, :content_text, :media_type, :media_mime, :media_data, :media_url, 'public', NOW(), NOW(), NOW())"
    );

    $stmt->execute([
        'user_id' => $userId,
        'content_text' => $contentText !== '' ? $contentText : null,
        'media_type' => $mediaType,
        'media_mime' => $mediaMime !== '' ? $mediaMime : null,
        'media_data' => $mediaData !== '' ? $mediaData : null,
        'media_url' => $mediaUrl !== '' ? $mediaUrl : null,
    ]);

    jsonResponse([
        'success' => true,
        'message' => 'Post created',
        'data' => [
            'id' => (int)$pdo->lastInsertId(),
        ],
    ], 201);
} catch (Throwable $e) {
    jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
}
