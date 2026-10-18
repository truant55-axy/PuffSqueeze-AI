#!/bin/sh
set -eu
cd "$(dirname "$0")"
umask 077
mkdir -p backups
target="backups/puffsqueeze-$(date -u +%Y%m%dT%H%M%SZ).sql"
docker compose exec -T db sh -c 'export MYSQL_PWD="$MARIADB_PASSWORD"; exec mariadb-dump --single-transaction --skip-lock-tables -u"$MARIADB_USER" "$MARIADB_DATABASE"' > "$target.part"
mv "$target.part" "$target"
gzip "$target"
printf 'Backup saved: %s.gz\n' "$target"
