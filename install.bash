#!/usr/bin/env bash
# Theta Field Principle Visualizer - Installer
# =============================================

set -e

echo "==============================================="
echo "  Theta Field Principle Visualizer - Setup"
echo "==============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${YELLOW}[*] Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}[OK] Node.js found: ${NODE_VERSION}${NC}"
else
    echo -e "${RED}[ERROR] Node.js not found!${NC}"
    echo -e "${YELLOW}        Please install Node.js from: https://nodejs.org/${NC}"
    exit 1
fi

# Check npm
echo -e "${YELLOW}[*] Checking npm...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}[OK] npm found: v${NPM_VERSION}${NC}"
else
    echo -e "${RED}[ERROR] npm not found!${NC}"
    exit 1
fi

echo ""

# Check files
if [ ! -f "server.js" ]; then
    echo -e "${RED}[ERROR] server.js not found in current directory!${NC}"
    exit 1
fi

if [ ! -d "ThetaFieldPrincipleVisualizer" ]; then
    echo -e "${RED}[ERROR] ThetaFieldPrincipleVisualizer directory not found!${NC}"
    exit 1
fi

echo -e "${GREEN}[OK] Directory structure verified${NC}"
echo ""

# Clean install - remove existing node_modules and package files
if [ -d "node_modules" ]; then
    echo -e "${YELLOW}[*] Removing existing node_modules...${NC}"
    rm -rf "node_modules"
    echo -e "${GREEN}[OK] Cleaned node_modules${NC}"
fi

if [ -f "package-lock.json" ]; then
    echo -e "${YELLOW}[*] Removing existing package-lock.json...${NC}"
    rm -f "package-lock.json"
    echo -e "${GREEN}[OK] Cleaned package-lock.json${NC}"
fi

echo ""

# Create package.json
echo -e "${YELLOW}[*] Creating package.json...${NC}"
cat > "package.json" <<'EOF'
{
  "name": "theta-field-principle-visualizer",
  "version": "1.0.0",
  "type": "module",
  "description": "Express server for Theta Field Principle Visualizer",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "compression": "^1.7.4",
    "helmet": "^7.1.0",
    "cors": "^2.8.5"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
EOF
echo -e "${GREEN}[OK] package.json created${NC}"
echo ""

# Install dependencies
echo -e "${YELLOW}[*] Installing npm dependencies...${NC}"
echo ""
npm install
echo ""
echo -e "${GREEN}[OK] Dependencies installed successfully${NC}"

echo ""
echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}===============================================${NC}"
echo ""
echo -e "${CYAN}To start the server:${NC}"
echo -e "  npm start"
echo ""
echo -e "${CYAN}Or run:${NC}"
echo -e "  ./start.bash"
echo ""
echo -e "${CYAN}The server will be available at:${NC}"
echo -e "  http://localhost:3000"
echo ""