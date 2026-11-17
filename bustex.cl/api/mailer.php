<?php
/**
 * Comercial Bustex - Módulo de Envío de Correo Electrónico Rediseñado
 * Cliente SMTP directo por Sockets con Quoted-Printable (RFC 2045) para evitar el límite de 2048 caracteres por línea de Exim.
 */

require_once __DIR__ . '/config.php';

/**
 * Función principal de envío de correos.
 * Intenta enviar por SMTP autenticado (Loopback 127.0.0.1 / mail.bustex.cl en puertos 465/587/25)
 * y realiza fallback automático a mail() nativo.
 */
function sendEmailNotification(string $to, string $subject, string $htmlBody): bool {
    $mailFrom = defined('MAIL_FROM') ? MAIL_FROM : 'notificaciones@bustex.cl';
    $fromName = defined('MAIL_FROM_NAME') ? MAIL_FROM_NAME : 'Comercial Bustex';

    // 1. Lista de servidores y puertos a intentar en orden de confiabilidad para cPanel
    $smtpConfigs = [];

    if (defined('SMTP_HOST') && !empty(SMTP_HOST)) {
        $smtpConfigs[] = [
            'host' => SMTP_HOST,
            'port' => defined('SMTP_PORT') ? (int)SMTP_PORT : 465,
            'user' => defined('SMTP_USER') ? SMTP_USER : '',
            'pass' => defined('SMTP_PASS') ? SMTP_PASS : ''
        ];
    }

    // Configuración de respaldo local (Loopback de cPanel en 127.0.0.1)
    $smtpConfigs[] = [
        'host' => '127.0.0.1',
        'port' => 25,
        'user' => '',
        'pass' => ''
    ];

    $smtpConfigs[] = [
        'host' => 'localhost',
        'port' => 25,
        'user' => '',
        'pass' => ''
    ];

    // Intentar cada configuración SMTP
    foreach ($smtpConfigs as $config) {
        $success = executeSmtpSend(
            $config['host'],
            $config['port'],
            $config['user'],
            $config['pass'],
            $mailFrom,
            $fromName,
            $to,
            $subject,
            $htmlBody
        );

        if ($success) {
            return true;
        }
    }

    // 2. Fallback final: mail() nativo de PHP con cabeceras Quoted-Printable
    $fromHeader = '=?UTF-8?B?' . base64_encode($fromName) . '?= <' . $mailFrom . '>';
    $subjectHeader = (strpos($subject, '=?UTF-8?B?') === 0) ? $subject : '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $encodedBody = quoted_printable_encode($htmlBody);

    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: quoted-printable',
        'From: ' . $fromHeader,
        'Reply-To: ' . $mailFrom,
        'Subject: ' . $subjectHeader,
        'X-Mailer: PHP/' . phpversion()
    ];

    $headersStr = implode("\n", $headers);
    $params = '-f ' . $mailFrom;

    $result = @mail($to, $subjectHeader, $encodedBody, $headersStr, $params);
    return (bool)$result;
}

/**
 * Cliente SMTP Socket limpio y robusto.
 * Maneja SMTPS (puerto 465), STARTTLS (puerto 587) y SMTP simple (puerto 25).
 * Codifica el cuerpo con Quoted-Printable (RFC 2045) para garantizar líneas < 76 caracteres.
 */
function executeSmtpSend(
    string $host,
    int $port,
    string $user,
    string $pass,
    string $mailFrom,
    string $fromName,
    string $to,
    string $subject,
    string $htmlBody
): bool {
    // Contexto SSL permisivo para evitar errores de certificados autofirmados en cPanel
    $sslOptions = [
        'ssl' => [
            'verify_peer'       => false,
            'verify_peer_name'  => false,
            'allow_self_signed' => true,
        ]
    ];

    $context = stream_context_create($sslOptions);
    $transport = ($port === 465) ? 'ssl://' : 'tcp://';
    $remote = $transport . $host . ':' . $port;

    $socket = @stream_socket_client($remote, $errno, $errstr, 10, STREAM_CLIENT_CONNECT, $context);
    if (!$socket) {
        return false;
    }

    stream_set_timeout($socket, 10);

    $readResponse = function() use ($socket) {
        $response = '';
        while ($line = @fgets($socket, 512)) {
            $response .= $line;
            if (strlen($line) >= 4 && substr($line, 3, 1) === ' ') {
                break;
            }
        }
        return $response;
    };

    $sendCommand = function(string $command) use ($socket, $readResponse) {
        @fputs($socket, $command . "\r\n");
        return $readResponse();
    };

    // 1. Leer Banner de Bienvenida (espera código 220)
    $banner = $readResponse();
    if (substr($banner, 0, 3) !== '220') {
        @fclose($socket);
        return false;
    }

    // 2. EHLO
    $clientHost = !empty($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'bustex.cl';
    $ehlo = $sendCommand("EHLO " . $clientHost);
    if (substr($ehlo, 0, 3) !== '250') {
        @fclose($socket);
        return false;
    }

    // 3. STARTTLS para puerto 587 si no es conexión SSL directa
    if ($port === 587) {
        $starttls = $sendCommand("STARTTLS");
        if (substr($starttls, 0, 3) === '220') {
            $crypto = @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT);
            if (!$crypto) {
                @fclose($socket);
                return false;
            }
            $sendCommand("EHLO " . $clientHost);
        }
    }

    // 4. Autenticación (si se proporcionan usuario y contraseña)
    if (!empty($user) && !empty($pass)) {
        $auth = $sendCommand("AUTH LOGIN");
        if (substr($auth, 0, 3) === '334') {
            $userResp = $sendCommand(base64_encode($user));
            if (substr($userResp, 0, 3) === '334') {
                $passResp = $sendCommand(base64_encode($pass));
                if (substr($passResp, 0, 3) !== '235') {
                    @fclose($socket);
                    return false;
                }
            } else {
                @fclose($socket);
                return false;
            }
        }
    }

    // 5. Comandos de Correo (MAIL FROM, RCPT TO, DATA)
    $mailFromResp = $sendCommand("MAIL FROM: <" . $mailFrom . ">");
    if (substr($mailFromResp, 0, 3) !== '250') {
        @fclose($socket);
        return false;
    }

    $rcptResp = $sendCommand("RCPT TO: <" . $to . ">");
    if (substr($rcptResp, 0, 3) !== '250' && substr($rcptResp, 0, 3) !== '251') {
        @fclose($socket);
        return false;
    }

    $dataResp = $sendCommand("DATA");
    if (substr($dataResp, 0, 3) !== '354') {
        @fclose($socket);
        return false;
    }

    // 6. Encabezados y Cuerpo del mensaje (RFC 2822 + RFC 2045 Quoted-Printable)
    $fromHeader = '=?UTF-8?B?' . base64_encode($fromName) . '?= <' . $mailFrom . '>';
    $subjectHeader = (strpos($subject, '=?UTF-8?B?') === 0) ? $subject : '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $encodedBody = quoted_printable_encode($htmlBody);

    $headers = [
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8",
        "Content-Transfer-Encoding: quoted-printable",
        "From: {$fromHeader}",
        "To: <{$to}>",
        "Reply-To: <{$mailFrom}>",
        "Subject: {$subjectHeader}",
        "Date: " . date("r"),
        "Message-ID: <" . time() . "." . uniqid() . "@bustex.cl>"
    ];

    $messageContent = implode("\r\n", $headers) . "\r\n\r\n" . $encodedBody . "\r\n.";
    $sendBodyResp = $sendCommand($messageContent);

    $sendCommand("QUIT");
    @fclose($socket);

    return (substr($sendBodyResp, 0, 3) === '250');
}
