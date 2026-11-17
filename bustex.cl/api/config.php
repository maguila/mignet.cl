<?php
/**
 * Comercial Bustex - Archivo de Configuración Principal API
 * Sistema ultraligero sin base de datos (Envío directo por Email nativo + WhatsApp)
 */

// Polyfill de compatibilidad para versiones anteriores de PHP (PHP 7.x)
if (!function_exists('str_contains')) {
    function str_contains($haystack, $needle) {
        return $needle !== '' && strpos($haystack, $needle) !== false;
    }
}

// Detectar si estamos en entorno local/testing (HTTP o consola CLI)
$remoteAddr = $_SERVER['REMOTE_ADDR'] ?? '';
$httpHost   = $_SERVER['HTTP_HOST'] ?? '';

$isLocal = (php_sapi_name() === 'cli')
    || in_array($remoteAddr, ['127.0.0.1', '::1']) 
    || (strpos($httpHost, 'localhost') !== false) 
    || (strpos($httpHost, '127.0.0.1') !== false);

define('IS_LOCAL', $isLocal);

// ============================================================
// SEGURO DE LIBERACIÓN Y PROTECCIÓN FREELANCE
// ============================================================
// IS_RELEASED: Permanece 'false' en la versión Demo. Se cambia a 'true' al realizar la entrega final.
define('IS_RELEASED', true);

// Si NO ha sido liberado oficialmente y se intenta ejecutar fuera de la carpeta /demo/ o localhost:
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
$isDemoPath = (strpos($requestUri, '/demo/') !== false) || (strpos($scriptName, '/demo/') !== false);

if (!IS_RELEASED && !$isLocal && !$isDemoPath) {
    http_response_code(403);
    
    // Responder en JSON si es una petición AJAX/API
    if (strpos($requestUri, '.php') !== false || (($_SERVER['HTTP_ACCEPT'] ?? '') === 'application/json')) {
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode([
            'status' => 'error',
            'message' => '⚠️ El proyecto se encuentra en fase de pruebas y demostración. Pendiente de liberación oficial.'
        ], JSON_UNESCAPED_UNICODE);
    } else {
        header('Content-Type: text/html; charset=UTF-8');
        echo '<!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Proyecto en Revisión | Comercial Bustex</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0F0F12; color: #F8FAFC; margin: 0; padding: 40px 20px; display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center; box-sizing: border-box; }
                .card { max-width: 520px; background: #16161A; border: 1px solid #22222A; border-radius: 20px; padding: 40px 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
                .badge { display: inline-block; padding: 6px 14px; background: rgba(250,204,21,0.1); border: 1px solid rgba(250,204,21,0.3); color: #FACC15; font-size: 11px; font-weight: 800; border-radius: 50px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 20px; }
                h1 { font-size: 24px; font-weight: 800; margin: 0 0 12px 0; color: #FFFFFF; }
                p { font-size: 14px; color: #94A3B8; line-height: 1.6; margin: 0 0 24px 0; }
                .footer-text { font-size: 11px; color: #64748B; border-top: 1px solid #22222A; padding-top: 16px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="card">
                <span class="badge">⚠️ FASE DE REVISIÓN Y DEMOSTRACIÓN</span>
                <h1>Plataforma en Proceso de Entrega</h1>
                <p>Este sistema web se encuentra instalado en entorno de pruebas para revisión previa. La versión oficial de producción será liberada tras completar la entrega final por parte del desarrollador.</p>
                <div class="footer-text">Comercial Bustex &copy; 2026 - Desarrollo de Software Protegido</div>
            </div>
        </body>
        </html>';
    }
    exit;
}

// ============================================================
// 1. PARÁMETROS PRINCIPALES DE PRODUCCIÓN Y TESTING
// ============================================================
define('WHATSAPP_PHONE', '56961689241');                    // Teléfono WhatsApp para atención
define('MAIL_TO', 'alfonso.iturra@bustex.cl');              // Correo receptor de cotizaciones
define('MAIL_FROM', 'notificaciones@bustex.cl');            // Remitente emisor configurado en cPanel
define('MAIL_FROM_NAME', 'Comercial Bustex');

// Claves de Cloudflare Turnstile (Cuenta: pruebadeveloperfullstack@gmail.com)
define('TURNSTILE_SITE_KEY', '0x4AAAAAAEIw1PK37qHxkAST');
define('TURNSTILE_SECRET_KEY', '0x4AAAAAAEIw1Nby5eivJQxCLVPbOqqpawY');

// ============================================================
// 2. CONFIGURACIÓN DE ENVÍO DE CORREO (SMTP cPanel / BenzaHosting)
// ============================================================
define('USE_SMTP', true);
define('SMTP_HOST', 'mail.bustex.cl');                      // Servidor de salida cPanel (o '127.0.0.1')
define('SMTP_PORT', 465);                                    // Puerto 465 SMTPS (SSL)
define('SMTP_USER', 'notificaciones@bustex.cl');            // Casilla de correo emisor
define('SMTP_PASS', 'REEMPLAZAR_POR_TU_CONTRASEÑA');        // Contraseña de notificaciones@bustex.cl
define('SMTP_SECURE', 'ssl');

// ============================================================
// 3. PARÁMETROS GENERALES DE SEGURIDAD Y LÍMITES
// ============================================================
define('MAX_REQUESTS_PER_WINDOW', 3);              // Máximo 3 solicitudes por ventana
define('RATE_LIMIT_WINDOW_SECONDS', 600);           // En una ventana de 10 minutos (600 s)
define('MAX_UPLOAD_SIZE_BYTES', 10 * 1024 * 1024); // Máximo 10 MB por imagen
