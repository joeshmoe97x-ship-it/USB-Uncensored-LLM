#!/bin/bash
# ===================================================
#  Portable AI - Linux AI Engine Installer
# ===================================================

echo "==================================================="
echo "  Downloading Portable Linux AI Engine (Ollama)"
echo "==================================================="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
USB_ROOT="$(dirname "$SCRIPT_DIR")"
SHARED_BIN="$USB_ROOT/Shared/bin"

mkdir -p "$SHARED_BIN"

if [ -f "$SHARED_BIN/ollama-linux" ]; then
    echo "  Ollama already installed for Linux! Skipping..."
else
    echo "  Downloading ~50MB offline core engine..."
    curl -L --progress-bar "https://github.com/ollama/ollama/releases/latest/download/ollama-linux-amd64" -o "$SHARED_BIN/ollama-linux"
    if [ $? -ne 0 ]; then
        echo "  ERROR: Download failed. Please check your internet connection."
        read -n 1 -s -r -p "Press any key to exit..."
        echo ""
        exit 1
    fi
    chmod +x "$SHARED_BIN/ollama-linux"
    echo "  Linux AI Engine Setup Complete!"
fi

echo ""
echo "==================================================="
echo "  IMPORTANT NOTE ABOUT AI MODELS:"
echo "==================================================="
echo "  This script only downloads the Linux AI engine software."
echo "  To easily download the heavy AI brains (GGUF models),"
echo "  it is highly recommended to plug this USB into a"
echo "  Windows computer and run the Windows/install.bat script"
echo "  to use the automated download menu."
echo ""
echo "  (All downloaded models are globally saved to 'Shared/models'"
echo "  so your Linux PC will automatically be able to use them!)"
echo ""

read -n 1 -s -r -p "Press any key to close this installer..."
echo ""
