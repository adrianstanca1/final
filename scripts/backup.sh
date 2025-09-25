#!/bin/bash

# Database backup script for production
# This script creates daily backups with retention

set -e

# Configuration
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup
echo "Creating database backup: $BACKUP_FILE"
pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE
echo "Backup compressed: $BACKUP_FILE.gz"

# Remove old backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "Old backups removed (older than $RETENTION_DAYS days)"

# Upload to cloud storage (optional)
if [ ! -z "$S3_BUCKET" ]; then
    aws s3 cp $BACKUP_FILE.gz s3://$S3_BUCKET/database-backups/
    echo "Backup uploaded to S3"
fi

echo "Backup completed successfully"