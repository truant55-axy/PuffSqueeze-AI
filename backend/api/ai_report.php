<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../services/metrics_service.php';
require_once __DIR__ . '/../services/ai_service.php';

applyCors();
requireMethod('GET');

$userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
if ($userId <= 0) {
    jsonResponse(['success' => false, 'message' => 'user_id is required'], 422);
}

try {
    $pdo = db();
    ensureUserExists($pdo, $userId);
    $dashboard = buildDashboard($pdo, $userId);

    $chatTable = tableName('puffsqueeze_chat_logs');
    $chatStmt = $pdo->prepare(
        "SELECT message_text, ai_reply_text, created_at
         FROM {$chatTable}
         WHERE user_id = :user_id
         ORDER BY created_at DESC
         LIMIT 10"
    );
    $chatStmt->execute(['user_id' => $userId]);
    $chatRows = $chatStmt->fetchAll();

    $recentQuestions = [];
    foreach ($chatRows as $row) {
        $q = trim((string)($row['message_text'] ?? ''));
        if ($q !== '') {
            $recentQuestions[] = $q;
        }
    }

    $stress = (float)$dashboard['current_stress'];
    $strikeLevel = 'low';
    if ($stress >= 75) {
        $strikeLevel = 'high';
    } elseif ($stress >= 50) {
        $strikeLevel = 'medium';
    }

    $prompt = sprintf(
        "You are a wellbeing coach. Create a concise report in Chinese for this user. Metrics: today_squeezes=%d, total_squeezes=%d, current_stress=%.2f, weekly_average_squeezes=%.1f, stress_status=%s. Use user's recent questions and recent data. Output sections: 1) 最近状态概览 2) 近期提问主题 3) 风险与积极信号 4) 接下来48小时行动建议(3条). Keep it practical and specific.",
        (int)$dashboard['today_squeezes'],
        (int)$dashboard['total_squeezes'],
        $stress,
        (float)$dashboard['weekly_average_squeezes'],
        (string)$dashboard['stress_status']
    );

    $report = geminiChat([], $prompt, $strikeLevel, [
        'weekly' => $dashboard['weekly'],
        'recent_questions' => $recentQuestions,
        'recent_question_count' => count($recentQuestions),
    ]);

    jsonResponse([
        'success' => true,
        'data' => [
            'report' => $report,
            'dashboard' => $dashboard,
            'recent_questions' => $recentQuestions,
        ],
    ]);
} catch (Throwable $e) {
    jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
}

