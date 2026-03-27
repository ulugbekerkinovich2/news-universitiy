#!/bin/bash

# University Hub Frontend Deployment Script
# Usage: ./frontend-deploy.sh <VPS_IP_OR_DOMAIN>

if [ -z "$1" ]; then
    echo "❌ Error: Please provide the VPS IP or Domain."
    echo "Usage: ./frontend-deploy.sh 123.123.123.123"
    exit 1
fi

IP=$1
ENV_FILE=".env"

echo "🚀 Preparing frontend for deployment to $IP..."

# 1. Update .env with production API URL
echo "📝 Updating $ENV_FILE..."
# Create/Update VITE_API_URL
if grep -q "VITE_API_URL" "$ENV_FILE"; then
    sed -i '' "s|VITE_API_URL=.*|VITE_API_URL=http://$IP:8000/api/v1|" "$ENV_FILE"
else
    echo "VITE_API_URL=http://$IP:8000/api/v1" >> "$ENV_FILE"
fi

# 2. Build the project
echo "🛠️ Building static assets..."
npm install
npm run build

# 3. PM2 Management
echo "📦 Restarting PM2 process..."
pm2 delete univ-frontend 2>/dev/null || true
pm2 start pm2.config.js

echo "✅ Deployment complete!"
echo "📍 Access your site at: http://$IP:5173"
