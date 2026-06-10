#!/bin/sh

echo "Waiting for postgres..."

while ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; do
  sleep 1
done

echo "PostgreSQL started"

python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec "$@"
