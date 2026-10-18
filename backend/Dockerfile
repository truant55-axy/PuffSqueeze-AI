FROM php:8.3-fpm-alpine

RUN apk add --no-cache ca-certificates libcurl oniguruma \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS curl-dev oniguruma-dev \
    && docker-php-ext-install -j$(nproc) pdo_mysql mbstring curl \
    && apk del .build-deps

WORKDIR /srv/backend
COPY . /srv/backend

RUN printf 'expose_php=Off\ndisplay_errors=Off\nlog_errors=On\npost_max_size=12M\nupload_max_filesize=8M\n' \
    > /usr/local/etc/php/conf.d/puffsqueeze.ini

EXPOSE 9000 10000

# Render provides PORT and needs an HTTP listener. The Docker Compose deployment
# has no PORT and keeps using PHP-FPM behind Nginx with schema preparation.
CMD ["sh", "-c", "if [ -n \"${PORT:-}\" ]; then exec php -S 0.0.0.0:${PORT} -t /srv/backend /srv/backend/index.php; else php /srv/backend/scripts/prepare-production.php && exec php-fpm; fi"]
