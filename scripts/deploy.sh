#!/bin/bash

# Check arguments
if [ $# -lt 1 ]; then
    echo "Usage: $0 <branch>"
    exit 1
fi

BRANCH=$1
WORKSPACE_DIR="."

# Enter workspace directory
cd "$WORKSPACE_DIR" || exit 1

echo "Start deploying branch: $BRANCH"

# Pull latest code
echo "Pulling latest code..."
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

# Install dependencies
echo "Installing dependencies..."
if [ -f "yarn.lock" ]; then
    yarn install
elif [ -f "package-lock.json" ]; then
    npm ci
else
    npm install
fi

# Build project (if needed)
if [ -f "package.json" ]; then
    if grep -q "\"build\"" package.json; then
        echo "Building project..."
        npm run build
    fi
fi

echo "Deployment completed!" 