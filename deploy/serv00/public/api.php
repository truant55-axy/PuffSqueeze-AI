<?php
declare(strict_types=1);

ini_set('display_errors', '0');

// PHP hosts may move Authorization into REDIRECT_HTTP_AUTHORIZATION.
if (empty($_SERVER['HTTP_AUTHORIZATION'])) {
    $authorization = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($authorization === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $key => $value) {
            if (strcasecmp($key, 'Authorization') === 0 && is_string($value)) {
                $authorization = $value;
                break;
            }
        }
    }
    if (is_string($authorization)) $_SERVER['HTTP_AUTHORIZATION'] = $authorization;
}

$backend = dirname(__DIR__) . '/puffsqueeze-private/backend';
if (!is_file($backend . '/index.php') || !is_file($backend . '/.env')) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode(['success' => false, 'message' => 'Website setup is not complete.'], JSON_UNESCAPED_UNICODE);
    exit;
}

require $backend . '/index.php';
