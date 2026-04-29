<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = envValue('DB_HOST', '127.0.0.1');
    $port = envValue('DB_PORT', '3306');
    $name = envValue('DB_NAME', 'moodle');
    $user = envValue('DB_USER', 'root');
    $pass = envValue('DB_PASSWORD', envValue('DB_PASS', ''));
    $sslMode = (string)envValue('DB_SSL_MODE', '');
    $sslCa = (string)envValue('DB_SSL_CA', '');

    // TiDB Serverless requires secure transport. If no CA is provided,
    // use the common CA bundle path in Linux containers.
    if ($sslCa === '') {
        $sslCa = '/etc/ssl/certs/ca-certificates.crt';
    }

    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name);
    if ($sslMode !== '') {
        $dsn .= ';sslmode=' . $sslMode;
    }
    if ($sslCa !== '') {
        $dsn .= ';sslca=' . $sslCa;
    }
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ];
    if (defined('PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT')) {
        $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
    }
    if (defined('PDO::MYSQL_ATTR_SSL_CA')) {
        $options[PDO::MYSQL_ATTR_SSL_CA] = $sslCa;
    }

    $pdo = new PDO($dsn, $user, $pass, $options);
    return $pdo;
}

function tableName(string $name): string
{
    $prefix = envValue('MOODLE_TABLE_PREFIX', '');
    return $prefix . $name;
}
