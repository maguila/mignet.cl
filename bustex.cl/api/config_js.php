<?php
/**
 * Comercial Bustex - Puente de Configuración PHP a JavaScript
 * Entrega dinámicamente las constantes de api/config.php al navegador
 */
header('Content-Type: application/javascript; charset=utf-8');
require_once __DIR__ . '/config.php';
?>
window.APP_CONFIG = {
  whatsappPhone: <?php echo json_encode(WHATSAPP_PHONE); ?>,
  emailContact: <?php echo json_encode(MAIL_TO); ?>,
  turnstileSiteKey: <?php echo json_encode(TURNSTILE_SITE_KEY); ?>
};
