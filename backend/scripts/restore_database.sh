#!/bin/bash

# Restores CalibTrack database from a backup file created by
# backup_database.sh. USE WITH EXTREME CAUTION — this can
# overwrite existing data.
#
# Usage:
#   railway run bash scripts/restore_database.sh calibtrack_backup_20260615_080000.sql

if [ -z "$1" ]; then
    echo "Usage: ./restore_database.sh <backup_file.sql>"
    exit 1
fi

BACKUP_FILE=$1

echo "WARNING: This will overwrite the current database."
echo "Backup file: ${BACKUP_FILE}"
read -p "Type 'CONFIRM' to proceed: " confirmation

if [ "$confirmation" != "CONFIRM" ]; then
    echo "Restore cancelled."
    exit 0
fi

psql "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" < "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "Restore completed successfully."
else
    echo "Restore FAILED."
    exit 1
fi
