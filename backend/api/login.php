<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';

applyCors();
requireMethod('POST');

$body = getJsonBody();
$email = trim((string)($body['email'] ?? ''));
$password = (string)($body['password'] ?? '');

if ($email === '' || $password === '') {
    jsonResponse(['success' => false, 'message' => 'email and password are required'], 422);
}

try {
    $pdo = db();
    $table = tableName('puffsqueeze_users');

    $stmt = $pdo->prepare("SELECT id, email, display_name, plain_password FROM {$table} WHERE email = :email LIMIT 1");
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if (!$user || (string)$user['plain_password'] !== $password) {
        jsonResponse(['success' => false, 'message' => 'Invalid credentials'], 401);
    }

    jsonResponse([
        'success' => true,
        'message' => 'Login successful',
        'data' => [
            'id' => (int)$user['id'],
            'email' => (string)$user['email'],
            'display_name' => (string)$user['display_name'],
        ],
    ]);
} catch (Throwable $e) {
    jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
}

