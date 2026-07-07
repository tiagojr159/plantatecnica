<?php

declare(strict_types=1);

$baseDir = __DIR__;
$action = (string) ($_GET['action'] ?? '');
$catalog = require $baseDir . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'component-catalog.php';

if (!function_exists('str_contains')) {
    function str_contains(string $haystack, string $needle): bool
    {
        return $needle === '' || strpos($haystack, $needle) !== false;
    }
}

try {
    switch ($action) {
        case 'components':
            handleListComponents($catalog, $baseDir);
            break;

        case 'projects':
            handleListProjects($baseDir);
            break;

        case 'project':
            handleGetProject($baseDir, (string) ($_GET['id'] ?? ''));
            break;

        case 'save_project':
            handleSaveProject($baseDir);
            break;

        case 'delete_project':
            handleDeleteProject($baseDir);
            break;

        default:
            jsonResponse([
                'error' => 'Acao invalida.',
            ], 400);
    }
} catch (Throwable $exception) {
    jsonResponse([
        'error' => $exception->getMessage(),
    ], 500);
}

function handleListComponents(array $catalog, string $baseDir): void
{
    $imageDir = $baseDir . DIRECTORY_SEPARATOR . 'images';
    if (!is_dir($imageDir)) {
        jsonResponse(['components' => []]);
    }

    $components = [];
    $files = scandir($imageDir) ?: [];

    foreach ($files as $file) {
        if ($file === '.' || $file === '..') {
            continue;
        }

        $path = $imageDir . DIRECTORY_SEPARATOR . $file;
        if (!is_file($path)) {
            continue;
        }

        $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (!in_array($extension, ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'], true)) {
            continue;
        }

        $size = @getimagesize($path);
        $pixelWidth = (int) ($size[0] ?? 0);
        $pixelHeight = (int) ($size[1] ?? 0);
        $config = $catalog[$file] ?? [];
        $fallback = buildFallbackComponent($file, $pixelWidth, $pixelHeight);
        $component = array_merge($fallback, $config);
        $depthM = inferComponentDepth($component, $file);

        $components[] = [
            'id' => (string) ($component['id'] ?? slugify(pathinfo($file, PATHINFO_FILENAME))),
            'filename' => $file,
            'name' => (string) ($component['name'] ?? friendlyName($file)),
            'image' => 'images/' . rawurlencode($file),
            'widthM' => round((float) ($component['widthM'] ?? 1), 2),
            'heightM' => round((float) ($component['heightM'] ?? 1), 2),
            'depthM' => $depthM,
            'category' => (string) ($component['category'] ?? inferCategory($file)),
            'shape' => (string) ($component['shape'] ?? ''),
            'diameterMm' => isset($component['diameterMm']) ? (float) $component['diameterMm'] : 0,
            'pixelWidth' => $pixelWidth,
            'pixelHeight' => $pixelHeight,
        ];
    }

    usort($components, static function (array $left, array $right): int {
        return [$left['category'], $left['name']] <=> [$right['category'], $right['name']];
    });

    jsonResponse(['components' => $components]);
}

function handleListProjects(string $baseDir): void
{
    $projectDir = ensureProjectDirectory($baseDir);
    $projects = [];

    foreach (glob($projectDir . DIRECTORY_SEPARATOR . '*.json') ?: [] as $filePath) {
        $content = file_get_contents($filePath);
        if ($content === false) {
            continue;
        }

        $project = json_decode($content, true);
        if (!is_array($project)) {
            continue;
        }

        $projects[] = buildProjectSummary($project, $filePath);
    }

    usort($projects, static function (array $left, array $right): int {
        return strcmp((string) ($right['updatedAt'] ?? ''), (string) ($left['updatedAt'] ?? ''));
    });

    jsonResponse(['projects' => $projects]);
}

function handleGetProject(string $baseDir, string $requestedId): void
{
    $projectId = sanitizeProjectId($requestedId);
    if ($projectId === '') {
        jsonResponse(['error' => 'Projeto invalido.'], 400);
    }

    $filePath = ensureProjectDirectory($baseDir) . DIRECTORY_SEPARATOR . $projectId . '.json';
    if (!is_file($filePath)) {
        jsonResponse(['error' => 'Projeto nao encontrado.'], 404);
    }

    $content = file_get_contents($filePath);
    if ($content === false) {
        jsonResponse(['error' => 'Nao foi possivel ler o projeto.'], 500);
    }

    $project = json_decode($content, true);
    if (!is_array($project)) {
        jsonResponse(['error' => 'Arquivo de projeto invalido.'], 500);
    }

    jsonResponse(['project' => $project]);
}

function handleSaveProject(string $baseDir): void
{
    if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
        jsonResponse(['error' => 'Metodo nao permitido.'], 405);
    }

    $payload = readJsonBody();
    $name = trim((string) ($payload['name'] ?? ''));
    if ($name === '') {
        $name = 'Projeto sem nome';
    }

    $projectId = sanitizeProjectId((string) ($payload['id'] ?? ''));
    $projectDir = ensureProjectDirectory($baseDir);
    $filePath = $projectDir . DIRECTORY_SEPARATOR . $projectId . '.json';
    $existingProject = [];

    if ($projectId !== '' && is_file($filePath)) {
        $existingContent = file_get_contents($filePath);
        $decoded = json_decode($existingContent ?: '', true);
        if (is_array($decoded)) {
            $existingProject = $decoded;
        }
    }

    $editor = sanitizeEditor((string) ($payload['editor'] ?? ($existingProject['editor'] ?? 'technical')));
    $canvas = is_array($payload['canvas'] ?? null) ? $payload['canvas'] : [];
    $canvasWidth = max(1, round((float) ($canvas['widthM'] ?? 20), 2));
    $canvasHeight = max(1, round((float) ($canvas['heightM'] ?? 8), 2));
    $items = sanitizeItems(is_array($payload['items'] ?? null) ? $payload['items'] : [], $editor);

    if ($projectId === '') {
        $slug = slugify($name);
        if ($slug === '') {
            $slug = 'projeto';
        }

        $projectId = $slug . '_' . date('Ymd_His');
        $filePath = $projectDir . DIRECTORY_SEPARATOR . $projectId . '.json';
    }

    $createdAt = (string) ($existingProject['createdAt'] ?? $payload['createdAt'] ?? date(DATE_ATOM));
    $updatedAt = date(DATE_ATOM);
    $view = sanitizeViewSettings(is_array($payload['view'] ?? null) ? $payload['view'] : (is_array($existingProject['view'] ?? null) ? $existingProject['view'] : []));
    $stats = sanitizeStats(is_array($payload['stats'] ?? null) ? $payload['stats'] : calculateProjectStats($items));
    $project = [
        'id' => $projectId,
        'editor' => $editor,
        'name' => $name,
        'createdAt' => $createdAt,
        'updatedAt' => $updatedAt,
        'canvas' => [
            'widthM' => $canvasWidth,
            'heightM' => $canvasHeight,
        ],
        'view' => $view,
        'items' => $items,
        'stats' => $stats,
    ];

    $json = json_encode($project, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        jsonResponse(['error' => 'Falha ao gerar o JSON do projeto.'], 500);
    }

    if (file_put_contents($filePath, $json) === false) {
        jsonResponse(['error' => 'Falha ao salvar o projeto.'], 500);
    }

    jsonResponse([
        'message' => 'Projeto salvo com sucesso.',
        'project' => $project,
        'summary' => buildProjectSummary($project, $filePath),
    ]);
}

function handleDeleteProject(string $baseDir): void
{
    if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
        jsonResponse(['error' => 'Metodo nao permitido.'], 405);
    }

    $payload = readJsonBody();
    $projectId = sanitizeProjectId((string) ($payload['id'] ?? ''));
    if ($projectId === '') {
        jsonResponse(['error' => 'Projeto invalido.'], 400);
    }

    $filePath = ensureProjectDirectory($baseDir) . DIRECTORY_SEPARATOR . $projectId . '.json';
    if (!is_file($filePath)) {
        jsonResponse(['error' => 'Projeto nao encontrado.'], 404);
    }

    if (!unlink($filePath)) {
        jsonResponse(['error' => 'Falha ao apagar o projeto.'], 500);
    }

    jsonResponse([
        'message' => 'Projeto apagado com sucesso.',
        'id' => $projectId,
    ]);
}

function sanitizeItems(array $items, string $editor = 'technical'): array
{
    $cleanItems = [];

    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }

        $widthM = round((float) ($item['widthM'] ?? 0), 2);
        $heightM = round((float) ($item['heightM'] ?? 0), 2);
        if ($widthM <= 0 || $heightM <= 0) {
            continue;
        }

        $depthM = round(max(0.02, (float) ($item['depthM'] ?? inferDepthFromSize($widthM, $heightM))), 2);
        $x = max(0, round((float) ($item['x'] ?? 0), 2));
        $y = max(0, round((float) ($item['y'] ?? 0), 2));
        $rotationZDeg = round((float) ($item['rotationZDeg'] ?? $item['rotationDeg'] ?? 0), 2);
        $flipX = filter_var($item['flipX'] ?? false, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false;

        $cleanItems[] = [
            'id' => sanitizeItemId((string) ($item['id'] ?? uniqid('item_', true))),
            'componentId' => sanitizeItemId((string) ($item['componentId'] ?? '')),
            'name' => trim((string) ($item['name'] ?? 'Componente')),
            'image' => trim((string) ($item['image'] ?? '')),
            'widthM' => $widthM,
            'heightM' => $heightM,
            'depthM' => $depthM,
            'mountMode' => sanitizeMountMode((string) ($item['mountMode'] ?? defaultMountMode((string) ($item['componentId'] ?? '')))),
            'x' => $x,
            'y' => $y,
            'z' => max(0, round((float) ($item['z'] ?? 0), 2)),
            'zIndex' => max(1, (int) ($item['zIndex'] ?? 1)),
            'rotationDeg' => round((float) ($item['rotationDeg'] ?? $rotationZDeg), 2),
            'rotationXDeg' => round((float) ($item['rotationXDeg'] ?? 0), 2),
            'rotationYDeg' => round((float) ($item['rotationYDeg'] ?? 0), 2),
            'rotationZDeg' => $rotationZDeg,
            'flipX' => $flipX,
            'color' => sanitizeColor((string) ($item['color'] ?? defaultItemColor((string) ($item['componentId'] ?? '')))),
        ];
    }

    return $cleanItems;
}

function sanitizeEditor(string $editor): string
{
    if ($editor === 'terrain' || $editor === 'rigging' || $editor === 'rigging2') {
        return $editor;
    }

    return 'technical';
}

function sanitizeStats(array $stats): array
{
    return [
        'minX' => round((float) ($stats['minX'] ?? 0), 2),
        'minY' => round((float) ($stats['minY'] ?? 0), 2),
        'maxX' => round((float) ($stats['maxX'] ?? 0), 2),
        'maxY' => round((float) ($stats['maxY'] ?? 0), 2),
        'minZ' => round((float) ($stats['minZ'] ?? 0), 2),
        'maxZ' => round((float) ($stats['maxZ'] ?? 0), 2),
        'widthM' => round(max(0, (float) ($stats['widthM'] ?? 0)), 2),
        'heightM' => round(max(0, (float) ($stats['heightM'] ?? 0)), 2),
        'depthM' => round(max(0, (float) ($stats['depthM'] ?? 0)), 2),
    ];
}

function sanitizeViewSettings(array $view): array
{
    return [
        'showDimensions' => filter_var($view['showDimensions'] ?? true, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true,
        'showNames' => filter_var($view['showNames'] ?? true, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true,
        'showDepth' => filter_var($view['showDepth'] ?? true, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true,
    ];
}

function buildProjectSummary(array $project, ?string $filePath = null): array
{
    $stats = is_array($project['stats'] ?? null) ? sanitizeStats($project['stats']) : calculateProjectStats(is_array($project['items'] ?? null) ? $project['items'] : []);

    return [
        'id' => (string) ($project['id'] ?? pathinfo((string) $filePath, PATHINFO_FILENAME)),
        'name' => (string) ($project['name'] ?? 'Projeto sem nome'),
        'editor' => sanitizeEditor((string) ($project['editor'] ?? 'technical')),
        'createdAt' => (string) ($project['createdAt'] ?? ($filePath ? date(DATE_ATOM, (int) filectime($filePath)) : date(DATE_ATOM))),
        'updatedAt' => (string) ($project['updatedAt'] ?? ($filePath ? date(DATE_ATOM, (int) filemtime($filePath)) : date(DATE_ATOM))),
        'itemCount' => count(is_array($project['items'] ?? null) ? $project['items'] : []),
        'canvas' => [
            'widthM' => round((float) ($project['canvas']['widthM'] ?? 0), 2),
            'heightM' => round((float) ($project['canvas']['heightM'] ?? 0), 2),
        ],
        'stats' => $stats,
    ];
}

function calculateProjectStats(array $items): array
{
    if ($items === []) {
        return [
            'minX' => 0,
            'minY' => 0,
            'maxX' => 0,
            'maxY' => 0,
            'minZ' => 0,
            'maxZ' => 0,
            'widthM' => 0,
            'heightM' => 0,
            'depthM' => 0,
        ];
    }

    $minX = INF;
    $minY = INF;
    $minZ = INF;
    $maxX = 0.0;
    $maxY = 0.0;
    $maxZ = 0.0;

    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }

        $x = (float) ($item['x'] ?? 0);
        $y = (float) ($item['y'] ?? 0);
        $z = max(0, (float) ($item['z'] ?? 0));
        $geometry = calculateRiggingGeometry($item);
        $rotationDeg = (float) ($item['rotationZDeg'] ?? $item['rotationDeg'] ?? 0);

        if ($rotationDeg !== 0.0) {
            $bounds = calculateRotatedBounds($x, $y, $geometry['footprintWidthM'], $geometry['footprintHeightM'], $rotationDeg);
            $minX = min($minX, $bounds['minX']);
            $minY = min($minY, $bounds['minY']);
            $maxX = max($maxX, $bounds['maxX']);
            $maxY = max($maxY, $bounds['maxY']);
        } else {
            $minX = min($minX, $x);
            $minY = min($minY, $y);
            $maxX = max($maxX, $x + $geometry['footprintWidthM']);
            $maxY = max($maxY, $y + $geometry['footprintHeightM']);
        }

        $minZ = min($minZ, $z);
        $maxZ = max($maxZ, $z + $geometry['verticalHeightM']);
    }

    if (!is_finite($minX) || !is_finite($minY) || !is_finite($minZ)) {
        return [
            'minX' => 0,
            'minY' => 0,
            'maxX' => 0,
            'maxY' => 0,
            'minZ' => 0,
            'maxZ' => 0,
            'widthM' => 0,
            'heightM' => 0,
            'depthM' => 0,
        ];
    }

    return [
        'minX' => round($minX, 2),
        'minY' => round($minY, 2),
        'maxX' => round($maxX, 2),
        'maxY' => round($maxY, 2),
        'minZ' => round($minZ, 2),
        'maxZ' => round($maxZ, 2),
        'widthM' => round(max(0, $maxX - $minX), 2),
        'heightM' => round(max(0, $maxY - $minY), 2),
        'depthM' => round(max(0, $maxZ - $minZ), 2),
    ];
}

function calculateRotatedBounds(float $x, float $y, float $widthM, float $heightM, float $rotationDeg): array
{
    $centerX = $x + ($widthM / 2);
    $centerY = $y + ($heightM / 2);
    $radians = deg2rad($rotationDeg);
    $corners = [
        [$x, $y],
        [$x + $widthM, $y],
        [$x + $widthM, $y + $heightM],
        [$x, $y + $heightM],
    ];
    $rotated = array_map(static function (array $corner) use ($centerX, $centerY, $radians): array {
        $translatedX = $corner[0] - $centerX;
        $translatedY = $corner[1] - $centerY;
        $cos = cos($radians);
        $sin = sin($radians);

        return [
            $centerX + ($translatedX * $cos) - ($translatedY * $sin),
            $centerY + ($translatedX * $sin) + ($translatedY * $cos),
        ];
    }, $corners);

    return [
        'minX' => min(array_column($rotated, 0)),
        'minY' => min(array_column($rotated, 1)),
        'maxX' => max(array_column($rotated, 0)),
        'maxY' => max(array_column($rotated, 1)),
    ];
}

function buildFallbackComponent(string $filename, int $pixelWidth, int $pixelHeight): array
{
    $basename = strtolower(pathinfo($filename, PATHINFO_FILENAME));
    $name = friendlyName($filename);
    $category = inferCategory($filename);
    $widthM = 1.0;
    $heightM = 1.0;

    if (preg_match('/(\d+(?:[\.,]\d+)?)(cm|m)\s*[x]\s*(\d+(?:[\.,]\d+)?)(cm|m)/i', $basename, $matches)) {
        $first = convertToMeters($matches[1], $matches[2]);
        $second = convertToMeters($matches[3], $matches[4]);
        if ($pixelWidth >= $pixelHeight) {
            $widthM = max($first, $second);
            $heightM = min($first, $second);
        } else {
            $widthM = min($first, $second);
            $heightM = max($first, $second);
        }
    } elseif (preg_match('/(\d+(?:[\.,]\d+)?)(cm|m)/i', $basename, $matches)) {
        $major = convertToMeters($matches[1], $matches[2]);

        if (str_contains($basename, 'cubo')) {
            $widthM = $major;
            $heightM = $major;
        } elseif (str_contains($basename, 'escada')) {
            $widthM = $major;
            $heightM = $major;
        } elseif (str_contains($basename, 'grid')) {
            if ($pixelHeight >= $pixelWidth) {
                $widthM = 0.30;
                $heightM = $major;
            } else {
                $widthM = $major;
                $heightM = 0.30;
            }
        } else {
            if ($pixelHeight >= $pixelWidth) {
                $heightM = $major;
                $ratio = $pixelHeight > 0 ? $pixelWidth / $pixelHeight : 0.50;
                $widthM = round(max(0.30, $major * $ratio), 2);
            } else {
                $widthM = $major;
                $ratio = $pixelWidth > 0 ? $pixelHeight / $pixelWidth : 0.50;
                $heightM = round(max(0.30, $widthM * $ratio), 2);
            }
        }
    } else {
        if ($pixelWidth > 0 && $pixelHeight > 0) {
            if ($pixelWidth >= $pixelHeight) {
                $widthM = 1.5;
                $heightM = round(max(0.30, $widthM * ($pixelHeight / $pixelWidth)), 2);
            } else {
                $heightM = 1.5;
                $widthM = round(max(0.30, $heightM * ($pixelWidth / $pixelHeight)), 2);
            }
        }
    }

    return [
        'id' => slugify($basename),
        'name' => $name,
        'widthM' => round($widthM, 2),
        'heightM' => round($heightM, 2),
        'category' => $category,
    ];
}

function inferCategory(string $filename): string
{
    $lower = strtolower($filename);

    if (str_contains($lower, 'grid')) {
        return 'Grid';
    }
    if (str_contains($lower, 'piso')) {
        return 'Pisos';
    }
    if (str_contains($lower, 'escada') || str_contains($lower, 'rampa')) {
        return 'Acessos';
    }
    if (str_contains($lower, 'cubo')) {
        return 'Estruturas';
    }
    if (str_contains($lower, 'fechamento')) {
        return 'Fechamentos';
    }

    return 'Outros';
}

function friendlyName(string $filename): string
{
    $name = pathinfo($filename, PATHINFO_FILENAME);
    $name = str_replace(['_', '-'], ' ', $name);
    $name = preg_replace('/\s+/', ' ', $name) ?? $name;

    return ucwords(trim($name));
}

function convertToMeters(string $value, string $unit): float
{
    $numeric = (float) str_replace(',', '.', $value);

    return strtolower($unit) === 'cm' ? round($numeric / 100, 2) : round($numeric, 2);
}

function ensureProjectDirectory(string $baseDir): string
{
    $projectDir = $baseDir . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'projects';
    if (!is_dir($projectDir) && !mkdir($projectDir, 0775, true) && !is_dir($projectDir)) {
        throw new RuntimeException('Nao foi possivel criar a pasta de projetos.');
    }

    return $projectDir;
}

function sanitizeProjectId(string $value): string
{
    $value = slugify($value);

    return preg_replace('/[^a-z0-9_\-]/', '', $value) ?? '';
}

function sanitizeItemId(string $value): string
{
    $value = strtolower(trim($value));
    $value = preg_replace('/[^a-z0-9_\-]/', '_', $value) ?? '';
    $value = trim($value, '_');

    if ($value === '') {
        $value = 'item_' . date('His') . '_' . random_int(100, 999);
    }

    return $value;
}

function slugify(string $value): string
{
    $value = trim($value);
    if ($value === '') {
        return '';
    }

    if (function_exists('iconv')) {
        $converted = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        if ($converted !== false) {
            $value = $converted;
        }
    }

    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9]+/', '_', $value) ?? '';

    return trim($value, '_');
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        jsonResponse(['error' => 'JSON invalido.'], 400);
    }

    return $decoded;
}

function jsonResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function inferComponentDepth(array $component, string $filename): float
{
    if (isset($component['depthM'])) {
        return round(max(0.02, (float) $component['depthM']), 2);
    }

    $lower = strtolower($filename);
    if (str_contains($lower, 'grid')) {
        return 0.05;
    }
    if (str_contains($lower, 'piso')) {
        return 0.12;
    }
    if (str_contains($lower, 'fechamento')) {
        return 0.08;
    }
    if (str_contains($lower, 'escada') || str_contains($lower, 'rampa')) {
        return 0.18;
    }

    return inferDepthFromSize((float) ($component['widthM'] ?? 1), (float) ($component['heightM'] ?? 1));
}

function inferDepthFromSize(float $widthM, float $heightM): float
{
    return round(max(0.02, min(max(min($widthM, $heightM) * 0.12, 0.04), 0.35)), 2);
}

function sanitizeMountMode(string $value): string
{
    $value = strtolower(trim($value));

    return in_array($value, ['floor', 'wall_x', 'wall_y'], true) ? $value : 'floor';
}

function defaultMountMode(string $componentId): string
{
    $componentId = strtolower($componentId);

    return str_contains($componentId, 'fechamento') ? 'wall_x' : 'floor';
}

function calculateRiggingGeometry(array $item): array
{
    $widthM = max(0, (float) ($item['widthM'] ?? 0));
    $heightM = max(0, (float) ($item['heightM'] ?? 0));
    $depthM = max(0, (float) ($item['depthM'] ?? inferDepthFromSize($widthM, $heightM)));
    $mountMode = sanitizeMountMode((string) ($item['mountMode'] ?? defaultMountMode((string) ($item['componentId'] ?? ''))));

    if ($mountMode === 'wall_x') {
        return [
            'footprintWidthM' => $widthM,
            'footprintHeightM' => $depthM,
            'verticalHeightM' => $heightM,
        ];
    }

    if ($mountMode === 'wall_y') {
        return [
            'footprintWidthM' => $depthM,
            'footprintHeightM' => $widthM,
            'verticalHeightM' => $heightM,
        ];
    }

    return [
        'footprintWidthM' => $widthM,
        'footprintHeightM' => $heightM,
        'verticalHeightM' => $depthM,
    ];
}

function sanitizeColor(string $value): string
{
    $value = trim($value);
    if (preg_match('/^#[0-9a-f]{6}$/i', $value)) {
        return strtoupper($value);
    }

    return '#3F4B5B';
}

function defaultItemColor(string $componentId): string
{
    $componentId = strtolower($componentId);
    if (str_contains($componentId, 'grid') || str_contains($componentId, 'portico') || str_contains($componentId, 'trelica')) {
        return '#2F3A48';
    }
    if (str_contains($componentId, 'piso') || str_contains($componentId, 'rampa')) {
        return '#C8A88F';
    }
    if (str_contains($componentId, 'escada') || str_contains($componentId, 'fachada')) {
        return '#A45C44';
    }
    if (str_contains($componentId, 'fechamento')) {
        return '#1693D1';
    }

    return '#4C5E73';
}

