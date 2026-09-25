#!/bin/bash
set -e

# ==============================================================================
# Trinetra AI - Docker Deployment Script
# Usage: ./deploy.sh [backend|frontend|all]
# ==============================================================================

TARGET="$1"

print_usage() {
    echo "=========================================================="
    echo "  Trinetra AI - Deployment Helper"
    echo "=========================================================="
    echo "Usage: ./deploy.sh [backend|frontend|all]"
    echo ""
    echo "Options:"
    echo "  backend   Rebuild and restart the FastAPI backend container"
    echo "  frontend  Rebuild and restart the Next.js frontend container"
    echo "  all       Rebuild and restart both backend & frontend"
    echo ""
    echo "Network: trinetra-net (preserved)"
    echo "Envs:    ./backend/.env, ./frontend/.env (preserved)"
    echo "=========================================================="
}

if [ -z "$TARGET" ]; then
    print_usage
    exit 1
fi

# Ensure trinetra-net network exists
if ! docker network inspect trinetra-net >/dev/null 2>&1; then
    echo "[Info] Creating Docker network 'trinetra-net'..."
    docker network create trinetra-net
fi

deploy_backend() {
    echo "----------------------------------------------------------"
    echo ">>> Rebuilding backend image (trinetra-backend)..."
    echo "----------------------------------------------------------"
    docker build -t trinetra-backend ./backend

    echo ">>> Stopping existing trinetra-backend container (if running)..."
    docker stop trinetra-backend 2>/dev/null || true
    docker rm trinetra-backend 2>/dev/null || true

    echo ">>> Starting new trinetra-backend container..."
    BACKEND_ENV_FLAG=""
    if [ -f "./backend/.env" ]; then
        BACKEND_ENV_FLAG="--env-file ./backend/.env"
    elif [ -f "./backend/.env.local" ]; then
        BACKEND_ENV_FLAG="--env-file ./backend/.env.local"
    fi

    docker run -d \
        --name trinetra-backend \
        --network trinetra-net \
        --restart unless-stopped \
        $BACKEND_ENV_FLAG \
        -p 8000:8000 \
        trinetra-backend

    echo ">>> Backend is live."
}

deploy_frontend() {
    echo "----------------------------------------------------------"
    echo ">>> Rebuilding frontend image (trinetra-frontend)..."
    echo "----------------------------------------------------------"
    docker build -t trinetra-frontend ./frontend

    echo ">>> Stopping existing trinetra-frontend container (if running)..."
    docker stop trinetra-frontend 2>/dev/null || true
    docker rm trinetra-frontend 2>/dev/null || true

    echo ">>> Starting new trinetra-frontend container..."
    FRONTEND_ENV_FLAG=""
    if [ -f "./frontend/.env" ]; then
        FRONTEND_ENV_FLAG="--env-file ./frontend/.env"
    elif [ -f "./frontend/.env.local" ]; then
        FRONTEND_ENV_FLAG="--env-file ./frontend/.env.local"
    fi

    docker run -d \
        --name trinetra-frontend \
        --network trinetra-net \
        --restart unless-stopped \
        $FRONTEND_ENV_FLAG \
        -p 3000:3000 \
        trinetra-frontend

    echo ">>> Frontend is live."
}

case "$TARGET" in
    backend)
        deploy_backend
        ;;
    frontend)
        deploy_frontend
        ;;
    all)
        deploy_backend
        deploy_frontend
        ;;
    *)
        echo "[Error] Invalid argument: '$TARGET'"
        print_usage
        exit 1
        ;;
esac

echo "=========================================================="
echo "Deployment completed successfully."
echo "=========================================================="
