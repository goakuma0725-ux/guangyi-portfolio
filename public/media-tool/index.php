<?php
declare(strict_types=1);

/**
 * Self-hosted image upload + auto-resize tool for 光翊設計.
 *
 * Runs entirely on this server (no third-party storage). Resizes the
 * uploaded image here with GD, then commits the small result directly
 * into the same GitHub path Sveltia CMS's media library reads from
 * (public/images/uploads/), so the browser never has to push a large
 * raw file straight to GitHub's API — that's what was failing before.
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');

const REPO = 'goakuma0725-ux/guangyi-portfolio';
const BRANCH = 'main';
const TARGET_DIR = 'public/images/uploads';
const MAX_EDGE = 2400;
const JPEG_QUALITY = 85;

$secretFile = __DIR__ . '/secret.php';
if (!file_exists($secretFile)) {
    http_response_code(500);
    exit('缺少 secret.php，請先依設定說明建立這個檔案。');
}
/** @var array{password: string, github_token: string} $secret */
$secret = require $secretFile;

session_set_cookie_params(['secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
session_start();

function h(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

function uploadErrorMessage(int $code): string
{
    return match ($code) {
        UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => '檔案超過大小限制',
        UPLOAD_ERR_PARTIAL => '檔案只上傳了一部分，請重試',
        UPLOAD_ERR_NO_FILE => '沒有選擇檔案',
        default => '上傳失敗（錯誤代碼 ' . $code . '）',
    };
}

/** @return array<int, array{name: string, type: string, tmp_name: string, error: int, size: int}> */
function normalizeFilesArray(array $filesField): array
{
    $out = [];
    $count = count($filesField['name']);
    for ($i = 0; $i < $count; $i++) {
        $out[] = [
            'name' => $filesField['name'][$i],
            'type' => $filesField['type'][$i],
            'tmp_name' => $filesField['tmp_name'][$i],
            'error' => $filesField['error'][$i],
            'size' => $filesField['size'][$i],
        ];
    }
    return $out;
}

function safeFilename(string $original, string $ext): string
{
    $base = pathinfo($original, PATHINFO_FILENAME);
    $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $base) ?? '');
    $slug = trim($slug, '-');
    if ($slug === '') {
        $slug = 'image';
    }
    $suffix = bin2hex(random_bytes(3));
    return $slug . '-' . $suffix . '.' . $ext;
}

function urlEncodePath(string $path): string
{
    return implode('/', array_map('rawurlencode', explode('/', $path)));
}

/** @return array{status: int, data: array} */
function githubApiRequest(string $method, string $url, string $token, ?array $body = null): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $token,
            'Accept: application/vnd.github+json',
            'Content-Type: application/json',
            'X-GitHub-Api-Version: 2022-11-28',
            'User-Agent: guangyi-media-tool',
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 60,
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    $response = curl_exec($ch);
    if ($response === false) {
        $err = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException('GitHub API 連線失敗：' . $err);
    }
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = json_decode($response, true);
    return ['status' => $status, 'data' => is_array($data) ? $data : []];
}

function commitToGitHub(string $path, string $binary, string $token): void
{
    $url = 'https://api.github.com/repos/' . REPO . '/contents/' . urlEncodePath($path);
    $result = githubApiRequest('PUT', $url, $token, [
        'message' => '透過上傳工具新增圖片：' . basename($path),
        'content' => base64_encode($binary),
        'branch' => BRANCH,
    ]);
    if ($result['status'] !== 201 && $result['status'] !== 200) {
        $msg = $result['data']['message'] ?? ('HTTP ' . $result['status']);
        throw new RuntimeException('GitHub 寫入失敗：' . $msg);
    }
}

/** @return array{name: string, ok: bool, path?: string, dataUri?: string, msg?: string} */
function processAndCommit(array $file, string $githubToken): array
{
    $info = @getimagesize($file['tmp_name']);
    if ($info === false) {
        throw new RuntimeException('不是有效的圖片檔');
    }
    [$width, $height, $type] = $info;

    switch ($type) {
        case IMAGETYPE_JPEG:
            $src = imagecreatefromjpeg($file['tmp_name']);
            $ext = 'jpg';
            $hasAlpha = false;
            break;
        case IMAGETYPE_PNG:
            $src = imagecreatefrompng($file['tmp_name']);
            $ext = 'png';
            $hasAlpha = true;
            break;
        case IMAGETYPE_WEBP:
            if (!function_exists('imagecreatefromwebp')) {
                throw new RuntimeException('此主機的 GD 不支援 WebP，請改用 JPEG 或 PNG');
            }
            $src = imagecreatefromwebp($file['tmp_name']);
            $ext = 'webp';
            $hasAlpha = true;
            break;
        default:
            throw new RuntimeException('只支援 JPEG / PNG / WebP 圖片');
    }
    if ($src === false) {
        throw new RuntimeException('圖片讀取失敗，檔案可能已損毀');
    }

    $longEdge = max($width, $height);
    if ($longEdge > MAX_EDGE) {
        $scale = MAX_EDGE / $longEdge;
        $newW = max(1, (int) round($width * $scale));
        $newH = max(1, (int) round($height * $scale));
        $resized = imagecreatetruecolor($newW, $newH);
        if ($hasAlpha) {
            imagealphablending($resized, false);
            imagesavealpha($resized, true);
        }
        imagecopyresampled($resized, $src, 0, 0, 0, 0, $newW, $newH, $width, $height);
        imagedestroy($src);
        $src = $resized;
    }

    ob_start();
    if ($ext === 'jpg') {
        imagejpeg($src, null, JPEG_QUALITY);
    } elseif ($ext === 'png') {
        imagepng($src, null, 6);
    } else {
        imagewebp($src, null, 85);
    }
    $binary = ob_get_clean();
    imagedestroy($src);

    $filename = safeFilename($file['name'], $ext);
    $path = TARGET_DIR . '/' . $filename;
    commitToGitHub($path, $binary, $githubToken);

    return [
        'name' => $file['name'],
        'ok' => true,
        'path' => '/images/uploads/' . $filename,
        'dataUri' => 'data:image/' . ($ext === 'jpg' ? 'jpeg' : $ext) . ';base64,' . base64_encode($binary),
    ];
}

$authed = ($_SESSION['authed'] ?? false) === true;
$error = null;
$results = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!$authed) {
        $postedPassword = (string) ($_POST['password'] ?? '');
        if ($postedPassword !== '' && hash_equals($secret['password'], $postedPassword)) {
            $_SESSION['authed'] = true;
            $authed = true;
        } else {
            $error = '密碼錯誤';
        }
    }

    if ($authed && isset($_FILES['images'])) {
        foreach (normalizeFilesArray($_FILES['images']) as $file) {
            if ($file['error'] !== UPLOAD_ERR_OK) {
                if ($file['error'] === UPLOAD_ERR_NO_FILE && $file['name'] === '') {
                    continue;
                }
                $results[] = ['name' => $file['name'], 'ok' => false, 'msg' => uploadErrorMessage($file['error'])];
                continue;
            }
            try {
                $results[] = processAndCommit($file, $secret['github_token']);
            } catch (Throwable $e) {
                $results[] = ['name' => $file['name'], 'ok' => false, 'msg' => $e->getMessage()];
            }
        }
    }
}
?><!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>圖片上傳工具 · 光翊設計</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    font-family: "Noto Sans TC", system-ui, sans-serif;
    background: #FAFAF9;
    color: #111111;
    margin: 0;
    padding: 48px 20px;
    line-height: 1.6;
  }
  .wrap { max-width: 640px; margin: 0 auto; }
  h1 { font-size: 20px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
  p.sub { color: #6B6B68; font-size: 14px; margin: 0 0 28px; }
  .badge { display: inline-block; font-size: 12px; color: #6B6B68; margin-bottom: 20px; }
  .card {
    background: #fff;
    border: 1px solid #E2E2DE;
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 20px;
  }
  label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
  input[type="password"], input[type="file"] {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #E2E2DE;
    border-radius: 6px;
    font-size: 14px;
    margin-bottom: 16px;
    font-family: inherit;
  }
  button {
    background: #111111;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 10px 20px;
    font-size: 14px;
    cursor: pointer;
  }
  button:hover { background: #333; }
  .error { color: #B4232C; font-size: 13px; margin-bottom: 16px; }
  .result { display: flex; gap: 12px; align-items: center; padding: 12px 0; border-bottom: 1px solid #E2E2DE; }
  .result:last-child { border-bottom: none; }
  .result img { width: 64px; height: 64px; object-fit: cover; border-radius: 4px; background: #eee; flex-shrink: 0; }
  .result .path { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 13px; word-break: break-all; }
  .result.fail .path { color: #B4232C; font-family: inherit; }
  .hint { font-size: 13px; color: #6B6B68; margin: 16px 0 0; }
</style>
</head>
<body>
<div class="wrap">
  <h1>圖片上傳工具</h1>
  <p class="sub">上傳後自動縮圖並存到網站的圖片庫，完成後回到後台選取即可。</p>

  <?php if ($authed): ?><span class="badge">已登入</span><?php endif; ?>

  <?php if ($error): ?><div class="error"><?= h($error) ?></div><?php endif; ?>

  <?php if ($results): ?>
    <div class="card">
      <?php foreach ($results as $r): ?>
        <div class="result <?= $r['ok'] ? '' : 'fail' ?>">
          <?php if ($r['ok']): ?>
            <img src="<?= h($r['dataUri']) ?>" alt="">
            <div class="path"><?= h($r['path']) ?></div>
          <?php else: ?>
            <div class="path"><?= h($r['name']) ?>：<?= h($r['msg']) ?></div>
          <?php endif; ?>
        </div>
      <?php endforeach; ?>
      <p class="hint">上傳完成。回到後台 → 對應圖片欄位 → 選擇既有檔案，就會看到這些圖片。</p>
    </div>
  <?php endif; ?>

  <form class="card" method="post" enctype="multipart/form-data">
    <?php if (!$authed): ?>
      <label for="password">密碼</label>
      <input type="password" id="password" name="password" required autofocus>
    <?php endif; ?>

    <label for="images">選擇圖片（可多選）</label>
    <input type="file" id="images" name="images[]" accept="image/jpeg,image/png,image/webp" multiple required>

    <button type="submit">上傳並縮圖</button>
  </form>
</div>
</body>
</html>
