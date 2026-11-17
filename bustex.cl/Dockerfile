FROM php:8.3-apache

# Instalar utilidades comunes, msmtp (sendmail wrapper) y módulos requeridos
RUN apt-get update && apt-get install -y \
    libpng-dev \
    zip \
    unzip \
    msmtp \
    msmtp-mta \
    mailutils \
    && a2enmod rewrite

# Directorio de trabajo
WORKDIR /var/www/html

# Copiar el código del proyecto al contenedor
COPY . /var/www/html/

# Asegurar permisos correctos para subida de adjuntos
RUN chown -R www-data:www-data /var/www/html
