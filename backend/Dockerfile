FROM php:8.3-fpm-alpine

RUN apk add --no-cache ca-certificates libcurl oniguruma python3 py3-pip \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS curl-dev oniguruma-dev \
    && docker-php-ext-install -j$(nproc) pdo_mysql mbstring curl \
    && pip3 install --no-cache-dir --break-system-packages 'edge-tts>=7.2,<8' \
    && apk del .build-deps

WORKDIR /srv/backend
COPY . /srv/backend
COPY docker-entrypoint.sh /usr/local/bin/puffsqueeze-entrypoint

RUN printf 'expose_php=Off\ndisplay_errors=Off\nlog_errors=On\npost_max_size=12M\nupload_max_filesize=8M\n' > /usr/local/etc/php/conf.d/puffsqueeze.ini

ENV VOICE_PYTHON=/usr/bin/python3

EXPOSE 10000

ENTRYPOINT ["sh", "/usr/local/bin/puffsqueeze-entrypoint"]

# Render supplies PORT. The fallback keeps the image runnable outside Render.
CMD ["sh", "-c", "exec php -S 0.0.0.0:${PORT:-10000} -t /srv/backend /srv/backend/index.php"]
