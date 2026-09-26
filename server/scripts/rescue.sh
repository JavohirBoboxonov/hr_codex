#!/bin/bash
# HR-Lodex Rescue Script
# Run this script on the production server if the site is down.

set -e

PROJECT_DIR=~/hr-lodex
BACKEND_PORT=5001

echo "🔍 Starting Rescue Operation..."

cd $PROJECT_DIR

# 1. Update Code
echo "📥 Pulling latest code..."
git fetch origin main
git reset --hard origin/main
git clean -fd

# 2. Setup Environment
echo "⚙️ Configuring Environment..."
touch server/.env
# Ensure Port is correct
sed -i '/^PORT=/d' server/.env && echo "PORT=$BACKEND_PORT" >> server/.env

# 3. Backend Deployment
echo "🚀 Restarting Backend..."
cd server
npm install --production
pm2 delete hr-lodex || true
pm2 start src/index.js --name hr-lodex
pm2 save

# 4. Frontend Deployment
echo "🎨 Rebuilding Frontend..."
cd ../client
npm install
npm run build
sudo mkdir -p /var/www/hrlodex-frontend
sudo rsync -av --delete ./dist/ /var/www/hrlodex-frontend/

# 5. Check Health
echo "✅ Checking Backend Health..."
sleep 2
curl -I http://localhost:$BACKEND_PORT/api/health || echo "❌ Backend is NOT responding on port $BACKEND_PORT"

echo "✨ Rescue Operation Complete!"
