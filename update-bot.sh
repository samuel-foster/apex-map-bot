#!/bin/bash

# Auto-update script for Apex Map Bot
# This script checks for updates and rebuilds the container if needed

cd /home/sam/apex-map-bot

echo "$(date): Checking for updates..."

# Fetch latest changes
git fetch origin master

# Check if there are new commits
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "$(date): New changes detected, updating bot..."
    
    # Pull latest changes
    git pull origin master
    
    # Rebuild and restart containers
    docker-compose down
    docker-compose up -d --build
    
    echo "$(date): Bot updated successfully!"
    
    # Optional: Send notification to Discord (if webhook URL is set)
    # curl -X POST -H "Content-Type: application/json" \
    #   -d '{"content":"🤖 Apex Map Bot updated to latest version!"}' \
    #   "$DISCORD_WEBHOOK_URL"
    
else
    echo "$(date): No updates available"
fi
