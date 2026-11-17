FROM php:8.3-apache

# Utilidades y soporte de correo/imágenes requerido por bustex.cl
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpng-dev \
    zip \
    unzip \
    msmtp \
    msmtp-mta \
    mailutils \
    && rm -rf /var/lib/apt/lists/* \
    && a2enmod rewrite headers

WORKDIR /var/www/html

COPY . /var/www/html/

RUN chown -R www-data:www-data /var/www/html

EXPOSE 80
