#!/usr/bin/env bash

if [ ! -d "node_modules" ]; then
    echo "[ERROR] Dependencies not installed. Run ./install.bash first!"
    exit 1
fi

echo "[*] Starting Theta Field Principle Visualizer..."
echo "    Server: http://localhost:3000"
echo "    Press Ctrl+C to stop"
echo ""

node server.js