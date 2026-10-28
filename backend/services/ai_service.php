<?php
declare(strict_types=1);

require_once __DIR__ . '/gemini_http.php';

function strikePromptHint(string $level): string
{
    if ($level === 'low') {
        return 'User strike intensity is LOW. Respond softly and encourage calm breathing.';
    }
    if ($level === 'medium') {
        return 'User strike intensity is MEDIUM. Respond with grounding advice and structured steps.';
    }
    if ($level === 'high') {
        return 'User strike intensity is HIGH. Prioritize emotional de-escalation and short, reassuring instructions.';
    }
    return 'User strike intensity is unknown. Keep response gentle and supportive.';
}

function sanitizeAiText(string $text): string
{
    // Remove common markdown formatting markers to keep plain text output.
    $text = str_replace(['**', '*', '`', '#'], '', $text);
    $text = str_replace(["\r\n", "\r"], "\n", $text);
    return trim($text);
}

function geminiChat(array $history, string $message, string $strikeLevel, array $deviceData = []): string
{
    if (!envValue('GEMINI_API_KEY')) {
        throw new RuntimeException('GEMINI_API_KEY is not configured.');
    }

    $systemInstruction = implode("\n", [
        "You are Healing AI in PuffSqueeze.",
        "Tone: gentle, practical, and concise.",
        "Output plain text only. Do not use markdown or symbols like *, **, #, -, or numbered markdown formatting.",
        strikePromptHint($strikeLevel),
    ]);

    $contents = [];
    foreach (array_slice($history, -30) as $item) {
        if (!is_array($item)) {
            continue;
        }
        $role = ($item['role'] ?? 'user') === 'model' ? 'model' : 'user';
        $text = '';
        if (isset($item['parts'][0]['text']) && is_string($item['parts'][0]['text'])) {
            $text = mb_substr($item['parts'][0]['text'], 0, 6000);
        }
        if ($text !== '') {
            $contents[] = [
                'role' => $role,
                'parts' => [['text' => $text]],
            ];
        }
    }

    $deviceSummary = $deviceData ? "\nDevice data: " . json_encode($deviceData, JSON_UNESCAPED_UNICODE) : '';
    $contents[] = [
        'role' => 'user',
        'parts' => [[
            'text' => "Current user message: {$message}{$deviceSummary}",
        ]],
    ];

    $payload = [
        'system_instruction' => [
            'parts' => [['text' => $systemInstruction]],
        ],
        'contents' => $contents,
    ];

    $json = geminiGenerateContent($payload, [
        geminiModel('GEMINI_CHAT_MODEL', 'gemini-3.8-flash'),
        geminiModel('GEMINI_CHAT_FALLBACK_MODEL', 'gemini-3.6-flash'),
    ], 'chat');
    $text = $json['candidates'][0]['content']['parts'][0]['text'] ?? null;
    if (!is_string($text) || trim($text) === '') {
        throw new RuntimeException('Gemini returned empty content.');
    }

    return sanitizeAiText($text);
}
