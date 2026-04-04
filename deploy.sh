#!/bin/bash
# Deploy Masters Calcutta to Ubuntu server
# Usage: ./deploy.sh [user@host]

set -e

HOST=${1:-"your-server"}
REMOTE_DIR="/var/www/masters"

echo "Building..."
npm run build

echo "Deploying to $HOST..."
ssh $HOST "mkdir -p $REMOTE_DIR"
rsync -avz --delete dist/ $HOST:$REMOTE_DIR/dist/

echo "Done! App deployed to $HOST"
echo "Make sure nginx is configured with nginx.conf.example"
