<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

applyCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

$routes = [
    '/api/health' => __DIR__ . '/api/health.php',
    '/api/register' => __DIR__ . '/api/register.php',
    '/api/login' => __DIR__ . '/api/login.php',
    '/api/profile' => __DIR__ . '/api/profile.php',
    '/api/profile/update' => __DIR__ . '/api/profile_update.php',
    '/api/connect/posts' => __DIR__ . '/api/connect_posts_list.php',
    '/api/connect/post/create' => __DIR__ . '/api/connect_post_create.php',
    '/api/usage' => __DIR__ . '/api/usage.php',
    '/api/squeeze-event' => __DIR__ . '/api/squeeze_event.php',
    '/api/stress-record' => __DIR__ . '/api/stress_record.php',
    '/api/dashboard' => __DIR__ . '/api/dashboard.php',
    '/api/ai/suggestion' => __DIR__ . '/api/ai_suggestion.php',
    '/api/ai/report' => __DIR__ . '/api/ai_report.php',
    '/api/device-event' => __DIR__ . '/api/device_event.php',
    '/api/ai/chat' => __DIR__ . '/api/ai_chat.php',
];

if (isset($routes[$path])) {
    require $routes[$path];
    exit;
}

jsonResponse(['success' => false, 'message' => 'Not found: ' . $path], 404);
