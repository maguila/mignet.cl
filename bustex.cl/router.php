<?php
/**
 * Comercial Bustex - Router para Servidor de Desarrollo Local (php -S)
 * Permite simular las reglas de .htaccess de Apache cuando pruebas localmente.
 * 
 * Uso: C:\desarrollo\php\php.exe -S localhost:8000 router.php
 */

$uri  = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);

// Si es un archivo físico existente (imágenes, css, js, etc.), servirlo directamente
$file = __DIR__ . $path;
if ($path !== '/' && file_exists($file) && !is_dir($file)) {
    return false; // php -S sirve el archivo estático directamente
}

$isMaintenanceActive = file_exists(__DIR__ . '/MODO_MANTENCION');
$queryString = $_SERVER['QUERY_STRING'] ?? '';

$isBypass = (strpos($queryString, 'bypass=bustex_admin') !== false) || (strpos($queryString, 'admin=1') !== false);
$isAsset  = (bool) preg_match('#^/(css|js|img|uploads|vendor)/#i', $path);

// Redirección en local si el mantenimiento está activo
if ($isMaintenanceActive && !$isBypass && !$isAsset && $path !== '/mantenimiento.html') {
    header("Location: /mantenimiento.html", true, 302);
    exit;
}

// Ruta raíz por defecto
if ($path === '/' || $path === '') {
    if (file_exists(__DIR__ . '/index.html')) {
        readfile(__DIR__ . '/index.html');
        exit;
    }
}

return false;
