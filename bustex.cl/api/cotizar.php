<?php
/**
 * Comercial Bustex - Endpoint de Procesamiento de Cotizaciones (Sin Base de Datos)
 * Procesa formulario con 4 capas de seguridad: Honeypot, Rate Limiting (archivo), Turnstile y Upload Hardening.
 * Envía la solicitud directamente por correo electrónico y abre el chat de WhatsApp.
 */

header('Content-Type: application/json; charset=utf-8');

// Desactivar despliegue de errores HTML en respuesta JSON
ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/config.php';

function sendJsonResponse(string $status, string $message, array $extra = [], int $httpCode = 200): void {
    http_response_code($httpCode);
    echo json_encode(array_merge([
        'status' => $status,
        'message' => $message,
    ], $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

// 1. Validar Método HTTP
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse('error', 'Método no permitido', [], 405);
}

// 2. Capa de Seguridad 1: Campo Trampa Honeypot
$honeypot = trim($_POST['b_website_hp'] ?? '');
if (!empty($honeypot)) {
    // Respuesta fingida de éxito para engatusar al bot automatizado
    sendJsonResponse('success', 'Cotización recibida con éxito.', ['quote_ref' => 'REF-' . rand(1000, 9999)]);
}

$ipAddress = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

// 3. Capa de Seguridad 2: Rate Limiting por IP Ligero en Archivo (Sin BD)
$uploadsDir = __DIR__ . '/../uploads';
if (!is_dir($uploadsDir)) {
    @mkdir($uploadsDir, 0755, true);
}
$rateLimitFile = $uploadsDir . '/.rate_limits.json';
$now = time();
$rateLimits = [];

if (file_exists($rateLimitFile)) {
    $rawContent = @file_get_contents($rateLimitFile);
    $rateLimits = json_decode($rawContent, true) ?: [];
}

// Limpiar IPs antiguas
foreach ($rateLimits as $ip => $data) {
    if (($now - ($data['last_request'] ?? 0)) > RATE_LIMIT_WINDOW_SECONDS) {
        unset($rateLimits[$ip]);
    }
}

if (isset($rateLimits[$ipAddress])) {
    $ipData = $rateLimits[$ipAddress];
    if (($now - $ipData['last_request']) < RATE_LIMIT_WINDOW_SECONDS) {
        if ($ipData['count'] >= MAX_REQUESTS_PER_WINDOW) {
            sendJsonResponse('error', 'Has superado el límite de cotizaciones permitidas. Por favor espera unos minutos.', [], 429);
        }
        $rateLimits[$ipAddress]['count']++;
    } else {
        $rateLimits[$ipAddress] = ['count' => 1, 'last_request' => $now];
    }
} else {
    $rateLimits[$ipAddress] = ['count' => 1, 'last_request' => $now];
}

@file_put_contents($rateLimitFile, json_encode($rateLimits), LOCK_EX);

// 4. Capa de Seguridad 3: Validación de Cloudflare Turnstile
$turnstileToken = $_POST['cf-turnstile-response'] ?? '';
if (!empty(TURNSTILE_SECRET_KEY) && !IS_LOCAL) {
    if (empty($turnstileToken)) {
        sendJsonResponse('error', 'Por favor completa la verificación de seguridad anti-bot.', [], 400);
    }

    $verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    $postData = http_build_query([
        'secret' => TURNSTILE_SECRET_KEY,
        'response' => $turnstileToken,
        'remoteip' => $ipAddress
    ]);

    $opts = [
        'http' => [
            'method'  => 'POST',
            'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
            'content' => $postData,
            'timeout' => 5
        ]
    ];
    $context  = stream_context_create($opts);
    $verifyResult = @file_get_contents($verifyUrl, false, $context);
    $responseKeys = json_decode($verifyResult, true);

    if (empty($responseKeys['success'])) {
        sendJsonResponse('error', 'Validación de seguridad anti-bot fallida. Por favor intenta de nuevo.', [], 400);
    }
}

// 5. Sanitización y Validación de Datos de Entrada
$nombre = trim(strip_tags($_POST['client-name'] ?? ''));
$telefono = trim(strip_tags($_POST['client-phone'] ?? ''));
$vehiculo = trim(strip_tags($_POST['vehicle-info'] ?? ''));
$vin = trim(strip_tags($_POST['vin-number'] ?? ''));
$repuesto = trim(strip_tags($_POST['part-description'] ?? ''));
$canalPreferido = trim($_POST['preferred_channel'] ?? 'whatsapp');

if (!in_array($canalPreferido, ['whatsapp', 'email'])) {
    $canalPreferido = 'whatsapp';
}

if (empty($nombre) || empty($telefono) || empty($vehiculo) || empty($repuesto)) {
    sendJsonResponse('error', 'Por favor completa todos los campos obligatorios del formulario.', [], 400);
}

// 6. Capa de Seguridad 4: Procesamiento de Imagen Adjunta (Upload Hardening)
$relativeImagePath = null;

if (isset($_FILES['part-image']) && $_FILES['part-image']['error'] === UPLOAD_ERR_OK) {
    $fileTmpPath = $_FILES['part-image']['tmp_name'];
    $fileSize = $_FILES['part-image']['size'];

    // Validar Tamaño
    if ($fileSize > MAX_UPLOAD_SIZE_BYTES) {
        sendJsonResponse('error', 'La imagen seleccionada supera el límite máximo permitido (10 MB).', [], 400);
    }

    // Validar Tipo MIME Real de forma segura sin requerir la extensión fileinfo
    $mimeType = null;
    if (function_exists('getimagesize')) {
        $imgInfo = @getimagesize($fileTmpPath);
        if ($imgInfo && isset($imgInfo['mime'])) {
            $mimeType = $imgInfo['mime'];
        }
    }

    if (!$mimeType && function_exists('finfo_open')) {
        $finfo = @finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo) {
            $mimeType = @finfo_file($finfo, $fileTmpPath);
            @finfo_close($finfo);
        }
    }

    if (!$mimeType) {
        $mimeType = $_FILES['part-image']['type'] ?? '';
    }

    $allowedMimes = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
    ];

    if (!isset($allowedMimes[$mimeType])) {
        sendJsonResponse('error', 'Formato de imagen no permitido. Usa archivos JPG, PNG o WEBP.', [], 400);
    }

    $ext = $allowedMimes[$mimeType];
    $uploadDir = __DIR__ . '/../uploads/cotizaciones/';

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Generar nombre de archivo único con hash criptográficamente seguro
    $newFileName = 'cot_' . date('Ymd_His') . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
    $destPath = $uploadDir . $newFileName;

    if (move_uploaded_file($fileTmpPath, $destPath)) {
        $relativeImagePath = 'uploads/cotizaciones/' . $newFileName;
    } else {
        error_log("Error al mover imagen subida a " . $destPath);
    }
}

// Generar Código de Referencia Único para el correo
$quoteRef = date('Ymd-Hi') . '-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));

// 7. Envío de Correo Electrónico de Notificación Operativa al Equipo de Ventas
try {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $baseUrl = $protocol . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $imageUrlFull = $relativeImagePath ? $baseUrl . '/' . $relativeImagePath : null;

    // Asunto optimizado para búsquedas en la casilla (Outlook/Gmail/Webmail)
    $subjectText = "[COTIZACIÓN {$quoteRef}] {$vehiculo} - {$nombre}";
    $subject = "=?UTF-8?B?" . base64_encode($subjectText) . "?=";
    
    // Limpiar teléfono para enlace directo de WhatsApp
    $cleanPhone = preg_replace('/[^0-9]/', '', $telefono);
    $waText = urlencode("Hola {$nombre}, te contacto de Comercial Bustex sobre tu solicitud de cotización para {$vehiculo}.");
    $waDirectLink = "https://api.whatsapp.com/send?phone={$cleanPhone}&text={$waText}";

    $imageHtml = "";
    if ($imageUrlFull) {
        $imageHtml = "
        <div style='margin-top:20px; padding:16px; background-color:#f1f5f9; border-radius:10px; text-align:center; border:1px solid #e2e8f0;'>
            <span style='font-size:11px; font-weight:bold; color:#475569; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:10px;'>📷 Imagen Adjunta por el Cliente</span>
            <a href='{$imageUrlFull}' target='_blank' style='display:inline-block;'>
                <img src='{$imageUrlFull}' alt='Foto del repuesto' style='max-width:100%; max-height:300px; border-radius:8px; border:1px solid #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.08);' />
            </a>
            <div style='margin-top:10px;'>
                <a href='{$imageUrlFull}' target='_blank' style='color:#b45309; font-weight:bold; font-size:12px; text-decoration:underline;'>🔗 Abrir / Descargar Imagen en HD</a>
            </div>
        </div>";
    }

    $badgeColor = ($canalPreferido === 'whatsapp') ? '#16a34a' : '#2563eb';

    $emailBody = "
    <!DOCTYPE html>
    <html lang='es'>
    <head>
        <meta charset='UTF-8'>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background-color: #f8fafc; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
            .header { background: #0f172a; padding: 24px; color: #ffffff; border-bottom: 4px solid #facc15; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; }
            .header p { margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; }
            .content { padding: 24px; }
            .field-group { margin-bottom: 18px; }
            .label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; display: block; }
            .value { font-size: 15px; font-weight: 600; color: #0f172a; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #f1f5f9; }
            .value-box { font-size: 15px; color: #0f172a; background: #fffbeb; padding: 14px; border-radius: 8px; border: 1px solid #fef3c7; line-height: 1.6; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase; }
            .btn-whatsapp { display: block; width: calc(100% - 32px); text-align: center; background-color: #25D366; color: #ffffff !important; font-weight: 800; font-size: 14px; padding: 14px 16px; border-radius: 10px; text-decoration: none; margin: 20px 0 10px 0; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.2); }
            .footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>Nueva Solicitud de Cotización #{$quoteRef}</h1>
                <p>Comercial Bustex - Notificación de Ventas</p>
            </div>
            <div class='content'>
                
                <!-- Acciones Rápida -->
                <a href='{$waDirectLink}' target='_blank' class='btn-whatsapp'>
                    💬 ABRIR CHAT DIRECTO EN WHATSAPP
                </a>

                <div class='field-group'>
                    <span class='label'>Cliente</span>
                    <div class='value'>{$nombre}</div>
                </div>

                <div class='field-group'>
                    <span class='label'>Teléfono / WhatsApp</span>
                    <div class='value'>{$telefono}</div>
                </div>

                <div class='field-group'>
                    <span class='label'>Vehículo (Marca, Modelo, Año)</span>
                    <div class='value'>{$vehiculo}</div>
                </div>

                <div class='field-group'>
                    <span class='label'>Nº de Chasis / VIN</span>
                    <div class='value'>" . ($vin ?: 'No especificado por el cliente') . "</div>
                </div>

                <div class='field-group'>
                    <span class='label'>Canal de Contacto Preferido</span>
                    <div>
                        <span class='badge' style='background-color: {$badgeColor};'>" . strtoupper($canalPreferido) . "</span>
                    </div>
                </div>

                <div class='field-group'>
                    <span class='label'>Repuesto Solicitado</span>
                    <div class='value-box'>" . nl2br(htmlspecialchars($repuesto)) . "</div>
                </div>

                {$imageHtml}

            </div>
            <div class='footer'>
                Registrado el " . date('d/m/Y H:i:s') . " hrs | IP: {$ipAddress}
            </div>
        </div>
    </body>
    </html>
    ";

    require_once __DIR__ . '/mailer.php';
    sendEmailNotification(MAIL_TO, $subject, $emailBody);

} catch (Exception $e) {
    error_log("Aviso: No se pudo enviar el correo de notificación: " . $e->getMessage());
}

// 8. Respuesta JSON Exitoso al Frontend
sendJsonResponse('success', 'Cotización procesada exitosamente.', [
    'quote_ref'    => $quoteRef,
    'client_name'  => $nombre,
    'vehicle_info' => $vehiculo,
    'has_image'    => $relativeImagePath !== null
]);
