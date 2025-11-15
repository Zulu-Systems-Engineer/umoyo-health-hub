#!/bin/bash

# Umoyo Health Hub - Project Setup Script
# This script helps set up the development environment

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 Umoyo Health Hub - Project Setup"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."
echo ""

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "   Please install Node.js >= 18.0.0 from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be >= 18.0.0 (current: $(node -v))${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

if ! command_exists pnpm; then
    echo -e "${YELLOW}⚠️  pnpm is not installed${NC}"
    echo "   Installing pnpm..."
    npm install -g pnpm@9.0.0
fi
echo -e "${GREEN}✅ pnpm $(pnpm -v)${NC}"

if ! command_exists firebase; then
    echo -e "${YELLOW}⚠️  Firebase CLI is not installed${NC}"
    echo "   Installing Firebase CLI..."
    npm install -g firebase-tools
fi
echo -e "${GREEN}✅ Firebase CLI $(firebase --version)${NC}"

echo ""
echo "📦 Installing dependencies..."
echo ""

# Install root dependencies
if [ -f "package.json" ]; then
    pnpm install
fi

# Install function dependencies
if [ -d "functions" ]; then
    echo "Installing function dependencies..."
    cd functions
    pnpm install
    cd "$PROJECT_ROOT"
fi

# Install web dependencies
if [ -d "apps/web" ]; then
    echo "Installing web dependencies..."
    cd apps/web
    pnpm install
    cd "$PROJECT_ROOT"
fi

echo ""
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Create frontend .env file
echo "📝 Setting up environment files..."
echo ""

FRONTEND_ENV="apps/web/.env"
if [ ! -f "$FRONTEND_ENV" ]; then
    echo "Creating $FRONTEND_ENV..."
    cat > "$FRONTEND_ENV" << 'EOF'
# Firebase Configuration
# Get these values from: https://console.firebase.google.com/project/umoyo-health-hub/settings/general
# Scroll to "Your apps" section and copy the config values

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=umoyo-health-hub.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=umoyo-health-hub
VITE_FIREBASE_STORAGE_BUCKET=umoyo-health-hub.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Backend URL (for tRPC)
# This will be auto-discovered, but you can set it manually if needed
VITE_TRPC_URL=http://localhost:5000/umoyo-health-hub/us-central1/api/trpc
EOF
    echo -e "${YELLOW}⚠️  Created $FRONTEND_ENV - Please fill in Firebase config values${NC}"
else
    echo -e "${GREEN}✅ $FRONTEND_ENV already exists${NC}"
fi

# Create backend .env file
BACKEND_ENV="functions/.env"
if [ ! -f "$BACKEND_ENV" ]; then
    echo "Creating $BACKEND_ENV..."
    cat > "$BACKEND_ENV" << 'EOF'
# Firebase Functions Environment Variables
# Development Configuration

# Google Cloud Project Configuration
GCP_PROJECT_ID=umoyo-health-hub
GCP_LOCATION=us-central1
GCP_REGION=us-central1

# Firebase Project ID
FIREBASE_PROJECT_ID=umoyo-health-hub

# Development/Testing
FIREBASE_USE_EMULATOR=true
NODE_ENV=development

# Optional - For RAG (leave empty to use mock data in development)
RAG_CORPUS_ID=
RAG_CORPUS_NAME=umoyo-medical-knowledge

# Optional - For Gemini AI Model
GEMINI_MODEL=gemini-2.0-flash-exp
GEMINI_TEMPERATURE=0.7
EOF
    echo -e "${GREEN}✅ Created $BACKEND_ENV${NC}"
else
    echo -e "${GREEN}✅ $BACKEND_ENV already exists${NC}"
fi

echo ""
echo "🔨 Building functions..."
echo ""

if [ -d "functions" ]; then
    cd functions
    pnpm build
    cd "$PROJECT_ROOT"
    echo -e "${GREEN}✅ Functions built successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Functions directory not found${NC}"
fi

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. ${BLUE}Configure Firebase:${NC}"
echo "   - Go to: https://console.firebase.google.com/project/umoyo-health-hub/settings/general"
echo "   - Scroll to 'Your apps' section"
echo "   - If no web app exists, click 'Add app' → Web (</> icon)"
echo "   - Copy the config values to apps/web/.env"
echo ""
echo "2. ${BLUE}Enable Firebase Authentication:${NC}"
echo "   - Go to: https://console.firebase.google.com/project/umoyo-health-hub/authentication"
echo "   - Click 'Get started' if needed"
echo "   - Go to 'Sign-in method' tab"
echo "   - Enable 'Email/Password' provider"
echo ""
echo "3. ${BLUE}Start the development servers:${NC}"
echo ""
echo "   Terminal 1 - Start emulators:"
echo "   ${GREEN}firebase emulators:start --only functions,firestore,auth,ui${NC}"
echo ""
echo "   Terminal 2 - Start frontend:"
echo "   ${GREEN}cd apps/web && pnpm dev${NC}"
echo ""
echo "4. ${BLUE}Open your browser:${NC}"
echo "   - Frontend: http://localhost:5173 (or the port shown by Vite)"
echo "   - Emulator UI: http://localhost:6001"
echo ""
echo -e "${YELLOW}Note:${NC} The chat will work with mock responses in development mode."
echo "      For real AI responses, configure GCP credentials later."
echo ""

