<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

/**
 * Transcribe a short browser recording through Gemini without storing it.
 * The caller has already authenticated the user and validated the file signature.
 */
function geminiTranscribeAudio(string $audio, string $mimeType, string $language): string
{
    $apiKey = (string)envValue('GEMINI_API_KEY', '');
    if ($apiKey === '') {
        throw new RuntimeException('transcription_not_configured');
    }

    $model = trim((string)envValue('GEMINI_TRANSCRIBE_MODEL', 'gemini-flash-latest'));
    if (!preg_match('/^[a-zA-Z0-9._-]{1,80}$/', $model)) {
        throw new RuntimeException('transcription_not_configured');
    }

    $languageHint = $language === 'zh'
        ? 'The expected language is Simplified Chinese, but preserve any English words that are actually spoken.'
        : 'The expected language is English, but preserve any Chinese words that are actually spoken.';
    $prompt = implode("\n", [
        'Transcribe the spoken words in this short recording.',
        $languageHint,
        'Return only the transcript as plain text.',
        'Do not add a summary, timestamps, speaker labels, quotation marks, markdown, or commentary.',
        'If there is no intelligible speech, return an empty string.',
    ]);

    $payload = [
        'contents' => [[
            'role' => 'user',
            'parts' => [
                ['text' => $prompt],
                ['inline_data' => [
                    'mime_type' => $mimeType,
                    'data' => base64_encode($audio),
                ]],
            ],
        ]],
        'generation_config' => [
            'temperature' => 0,
            'max_output_tokens' => 1024,
        ],
    ];

    $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE);
    if (!is_string($encoded)) {
        throw new RuntimeException('transcription_unavailable');
    }

    $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent';
    $ch = curl_init($url);
    if ($ch === false) {
        throw new RuntimeException('transcription_unavailable');
    }
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'X-goog-api-key: ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS => $encoded,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 45,
        CURLOPT_MAXREDIRS => 0,
    ]);

    $response = curl_exec($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if (!is_string($response) || $curlError !== '' || $httpCode < 200 || $httpCode >= 300) {
        $errorJson = is_string($response) ? json_decode($response, true) : null;
        $providerMessage = is_array($errorJson) && is_string($errorJson['error']['message'] ?? null)
            ? mb_substr($errorJson['error']['message'], 0, 240)
            : '';
        error_log('Gemini transcription failed with HTTP ' . $httpCode
            . ($providerMessage !== '' ? ': ' . $providerMessage : ''));
        throw new RuntimeException($httpCode === 401 || $httpCode === 403
            ? 'transcription_not_configured'
            : 'transcription_unavailable');
    }

    $json = json_decode($response, true);
    $text = $json['candidates'][0]['content']['parts'][0]['text'] ?? null;
    if (!is_string($text)) {
        throw new RuntimeException('transcription_unavailable');
    }

    $text = trim(str_replace(["```text", "```", "\r\n", "\r"], ['', '', "\n", "\n"], $text));
    if (strlen($text) >= 2 && (($text[0] === '"' && substr($text, -1) === '"')
        || ($text[0] === "'" && substr($text, -1) === "'"))) {
        $text = trim(substr($text, 1, -1));
    }
    return mb_substr($text, 0, 600);
}

