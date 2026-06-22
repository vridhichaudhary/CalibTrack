#!/bin/bash

# Manual database backup script for CalibTrack.
# Run this periodically (weekly recommended) via Railway CLI
# or a local cron job that connects to the production database.
#
# Usage:
#   railway run bash scripts/backup_database.sh
#
# This creates a timestamped SQL dump that can be used to
# restore the entire database if data is ever lost or corrupted.

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="calibtrack_backup_${TIMESTAMP}.sql"

echo "Starting backup of CalibTrack database..."

pg_dump "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" > "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "Backup successful: ${BACKUP_FILE}"
    echo "File size: $(du -h ${BACKUP_FILE} | cut -f1)"
else
    echo "Backup FAILED. Check database credentials and connection."
    exit 1
fi

echo "IMPORTANT: Download this file to a safe location (Google Drive,
local machine, etc.) — it will not persist on Railway's ephemeral
filesystem after this session ends."
