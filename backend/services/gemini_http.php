<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

function geminiModel(string $environmentName, string $default): string
{
    $model = trim((string)envValue($environmentName, $default));
    if (!preg_match('/^[a-zA-Z0-9._-]{1,80}$/', $model)) {
        throw new RuntimeException('Gemini model configuration is invalid.');
    }
    return $model;
}

/**
 * Call Gemini within the browser's 45-second request budget. A transient primary
 * failure gets one short backoff followed by the stable fallback model.
 */
function geminiGenerateContent(array $payload, array $models, string $operation): array
{
    $apiKey = trim((string)envValue('GEMINI_API_KEY', ''));
    if ($apiKey === '') throw new RuntimeException('gemini_not_configured');
    $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    $models = array_values(array_unique(array_filter($models)));
    if (!$models) throw new RuntimeException('Gemini model configuration is invalid.');
    $retryable = [404, 408, 425, 429, 500, 502, 503, 504];
    $lastStatus = 0;

    foreach ($models as $attempt => $model) {
        if (!preg_match('/^[a-zA-Z0-9._-]{1,80}$/', $model)) continue;
        if ($attempt > 0) usleep(750000);
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent';
        $ch = curl_init($url);
        if ($ch === false) throw new RuntimeException('Gemini service temporarily unavailable.');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json', 'X-goog-api-key: ' . $apiKey],
            CURLOPT_POSTFIELDS => $encoded,
            CURLOPT_CONNECTTIMEOUT => 6,
            CURLOPT_TIMEOUT => 17,
            CURLOPT_MAXREDIRS => 0,
        ]);
        $response = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        $lastStatus = $status;

        if (is_string($response) && $curlError === '' && $status >= 200 && $status < 300) {
            $json = json_decode($response, true);
            if (is_array($json)) return $json;
            throw new RuntimeException('Gemini returned an invalid response.');
        }

        $errorJson = is_string($response) ? json_decode($response, true) : null;
        $providerMessage = is_array($errorJson) && is_string($errorJson['error']['message'] ?? null)
            ? mb_substr($errorJson['error']['message'], 0, 180) : '';
        error_log('Gemini ' . $operation . ' attempt ' . ($attempt + 1) . ' using ' . $model
            . ' failed with HTTP ' . $status . ($curlError !== '' ? ' (network timeout/error)' : '')
            . ($providerMessage !== '' ? ': ' . $providerMessage : ''));

        if ($status === 401 || $status === 403) throw new RuntimeException('gemini_not_configured');
        $transient = $curlError !== '' || $status === 0 || in_array($status, $retryable, true);
        if (!$transient) throw new RuntimeException('Gemini request rejected with HTTP ' . $status . '.');
    }
    throw new RuntimeException('Gemini service temporarily unavailable after fallback (HTTP ' . $lastStatus . ').');
}
