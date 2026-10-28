<?php
declare(strict_types=1);

require_once __DIR__ . '/gemini_http.php';

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

    try {
        $json = geminiGenerateContent($payload, [
            geminiModel('GEMINI_TRANSCRIBE_MODEL', 'gemini-3.8-flash'),
            geminiModel('GEMINI_TRANSCRIBE_FALLBACK_MODEL', 'gemini-3.6-flash'),
        ], 'transcription');
    } catch (Throwable $e) {
        throw new RuntimeException($e->getMessage() === 'gemini_not_configured'
            ? 'transcription_not_configured' : 'transcription_unavailable');
    }
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

