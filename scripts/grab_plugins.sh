#!/bin/bash

# ============================================================
# Lampa Clean - Plugin Grabber Script v2.0
# 
# Features:
# - Downloads all plugins from plugins.json to local storage
# - Proxy fallback if direct download fails
# - Detailed statistics
# - Backup before update
# ============================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PLUGINS_JSON="$PROJECT_DIR/plugins.json"
LOCAL_DIR="$PROJECT_DIR/plugins/local"
LOCAL_JSON="$PROJECT_DIR/plugins_local.json"

# Proxy configuration (format: ip:port:user:pass)
PROXY="${1:-}"
PROXY_URL=""

if [[ -n "$PROXY" ]]; then
    IFS=':' read -r PROXY_IP PROXY_PORT PROXY_USER PROXY_PASS <<< "$PROXY"
    if [[ -n "$PROXY_USER" && -n "$PROXY_PASS" ]]; then
        PROXY_URL="http://${PROXY_USER}:${PROXY_PASS}@${PROXY_IP}:${PROXY_PORT}"
    else
        PROXY_URL="http://${PROXY_IP}:${PROXY_PORT}"
    fi
fi

# CORS Proxy fallback
CORS_PROXY="https://corsproxy.io/?"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Lampa Clean - Plugin Grabber v2.0                 ║${NC}"
echo -e "${BLUE}║      With Proxy Support & Detailed Stats               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

if [[ -n "$PROXY_URL" ]]; then
    echo -e "${CYAN}Using proxy: ${PROXY_IP}:${PROXY_PORT}${NC}"
else
    echo -e "${YELLOW}No proxy specified. Use: ./grab_plugins.sh ip:port:user:pass${NC}"
fi
echo ""

# Check dependencies
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required. Install with: brew install jq${NC}"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is required${NC}"
    exit 1
fi

# Create directories
mkdir -p "$LOCAL_DIR"

# Create backup of existing plugins
BACKUP_DIR="$PROJECT_DIR/plugins/backups"
mkdir -p "$BACKUP_DIR"
TODAY=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%H%M%S)
BACKUP_PATH="$BACKUP_DIR/local_${TODAY}_${TIMESTAMP}"

if [[ -d "$LOCAL_DIR" ]] && [[ $(find "$LOCAL_DIR" -name "*.js" 2>/dev/null | head -1) ]]; then
    echo -e "${YELLOW}Creating backup: $BACKUP_PATH${NC}"
    cp -r "$LOCAL_DIR" "$BACKUP_PATH"
    echo -e "${GREEN}Backup created successfully${NC}"
    echo ""
fi

# Stats
TOTAL=0
SUCCESS=0
FAILED=0
SKIPPED=0
PROXY_USED=0
CORS_USED=0
BYTES_DOWNLOADED=0

# Arrays for tracking
declare -a FAILED_PLUGINS=()
declare -a SUCCESS_PLUGINS=()

# Function to sanitize filename (use dashes, not underscores)
sanitize_filename() {
    echo "$1" | sed 's/[^a-zA-Z0-9.-]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//'
}

# Map Russian category names to English folder names
map_group_name() {
    local group="$1"
    case "$group" in
        *"Интерфейс"*) echo "interface" ;;
        *"Управление"*) echo "management" ;;
        *"Онлайн"*) echo "online" ;;
        *"Торренты"*) echo "torrents" ;;
        *"ТВ"*|*"TV"*) echo "tv" ;;
        *"Радио"*) echo "radio" ;;
        *"18+"*) echo "adult" ;;
        *) echo "$(sanitize_filename "$group")" ;;
    esac
}

# Function to download with fallback
download_with_fallback() {
    local url="$1"
    local filepath="$2"
    local method_used=""
    
    # Try 1: Direct download
    if curl -sL --max-time 15 -o "$filepath" "$url" 2>/dev/null; then
        if [[ -s "$filepath" ]] && ! grep -q "<!DOCTYPE html>" "$filepath" 2>/dev/null; then
            method_used="direct"
            return 0
        fi
    fi
    
    # Try 2: With proxy (if configured)
    if [[ -n "$PROXY_URL" ]]; then
        if curl -sL --max-time 15 --proxy "$PROXY_URL" -o "$filepath" "$url" 2>/dev/null; then
            if [[ -s "$filepath" ]] && ! grep -q "<!DOCTYPE html>" "$filepath" 2>/dev/null; then
                method_used="proxy"
                ((PROXY_USED++))
                return 0
            fi
        fi
    fi
    
    # Try 3: CORS proxy (for HTTP URLs)
    if [[ "$url" == http://* ]]; then
        local cors_url="${CORS_PROXY}$(echo "$url" | sed 's/:/%3A/g; s/\//%2F/g')"
        if curl -sL --max-time 20 -o "$filepath" "$cors_url" 2>/dev/null; then
            if [[ -s "$filepath" ]] && ! grep -q "<!DOCTYPE html>" "$filepath" 2>/dev/null; then
                method_used="cors"
                ((CORS_USED++))
                return 0
            fi
        fi
    fi
    
    rm -f "$filepath"
    return 1
}

# Function to download plugin
download_plugin() {
    local url="$1"
    local name="$2"
    local group="$3"
    
    # Create group directory with proper English name
    local group_dir="$LOCAL_DIR/$(map_group_name "$group")"
    mkdir -p "$group_dir"
    
    # Determine filename
    local filename=$(basename "$url" | cut -d'?' -f1)
    if [[ -z "$filename" || "$filename" == "/" ]]; then
        filename="$(sanitize_filename "$name").js"
    fi
    
    local filepath="$group_dir/$filename"
    
    ((TOTAL++))
    
    # Skip if already exists
    if [[ -f "$filepath" ]]; then
        echo -e "  ${YELLOW}↳ Skipped (exists):${NC} $name"
        ((SKIPPED++))
        return 0
    fi
    
    # Download with fallback
    echo -e "  ${BLUE}↳ Downloading:${NC} $name"
    
    if download_with_fallback "$url" "$filepath"; then
        local size=$(stat -f%z "$filepath" 2>/dev/null || stat -c%s "$filepath" 2>/dev/null || echo 0)
        BYTES_DOWNLOADED=$((BYTES_DOWNLOADED + size))
        
        local size_kb=$((size / 1024))
        echo -e "    ${GREEN}✓ Saved:${NC} $filename (${size_kb}KB)"
        ((SUCCESS++))
        SUCCESS_PLUGINS+=("$name")
        return 0
    else
        echo -e "    ${RED}✗ Failed:${NC} $name"
        ((FAILED++))
        FAILED_PLUGINS+=("$name|$url")
        return 1
    fi
}

# Main processing
echo -e "${BLUE}Loading plugins.json...${NC}"

# Get all groups
GROUPS=$(jq -r '.groups | length' "$PLUGINS_JSON")

echo -e "${GREEN}Found $GROUPS groups${NC}"
echo ""

START_TIME=$(date +%s)

# Process each group
for ((g=0; g<GROUPS; g++)); do
    GROUP_TITLE=$(jq -r ".groups[$g].title" "$PLUGINS_JSON")
    PLUGINS=$(jq -r ".groups[$g].plugins | length" "$PLUGINS_JSON")
    
    echo -e "${MAGENTA}━━━ $GROUP_TITLE ($PLUGINS plugins) ━━━${NC}"
    
    for ((p=0; p<PLUGINS; p++)); do
        URL=$(jq -r ".groups[$g].plugins[$p].url" "$PLUGINS_JSON")
        NAME=$(jq -r ".groups[$g].plugins[$p].name" "$PLUGINS_JSON")
        
        download_plugin "$URL" "$NAME" "$GROUP_TITLE"
    done
    
    echo ""
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Calculate sizes
SIZE_MB=$(echo "scale=2; $BYTES_DOWNLOADED / 1048576" | bc 2>/dev/null || echo "0")

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      Statistics                        ║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC} Total Plugins:     ${CYAN}$TOTAL${NC}"
echo -e "${BLUE}║${NC} Successful:        ${GREEN}$SUCCESS${NC}"
echo -e "${BLUE}║${NC} Failed:            ${RED}$FAILED${NC}"
echo -e "${BLUE}║${NC} Skipped:           ${YELLOW}$SKIPPED${NC}"
echo -e "${BLUE}╠════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC} Downloaded:        ${CYAN}${SIZE_MB}MB${NC}"
echo -e "${BLUE}║${NC} Time:              ${CYAN}${DURATION}s${NC}"
echo -e "${BLUE}║${NC} Via Proxy:         ${MAGENTA}$PROXY_USED${NC}"
echo -e "${BLUE}║${NC} Via CORS:          ${MAGENTA}$CORS_USED${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"

# Failed plugins list
if [[ ${#FAILED_PLUGINS[@]} -gt 0 ]]; then
    echo ""
    echo -e "${RED}Failed plugins:${NC}"
    for failed in "${FAILED_PLUGINS[@]}"; do
        IFS='|' read -r name url <<< "$failed"
        echo -e "  ${RED}✗${NC} $name"
        echo -e "    ${YELLOW}$url${NC}"
    done
fi

# Update date in plugins.json
TODAY=$(date +%Y-%m-%d)
echo ""
echo -e "${BLUE}Updating plugins.json date to: $TODAY${NC}"

# Update the 'updated' field
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/\"updated\": \"[0-9-]*\"/\"updated\": \"$TODAY\"/" "$PLUGINS_JSON"
else
    # Linux
    sed -i "s/\"updated\": \"[0-9-]*\"/\"updated\": \"$TODAY\"/" "$PLUGINS_JSON"
fi

# List downloaded files
echo ""
echo -e "${BLUE}Local plugins directory:${NC}"
echo -e "$LOCAL_DIR"
echo ""

# Count files by category
echo -e "${BLUE}Files by category:${NC}"
for dir in "$LOCAL_DIR"/*/; do
    if [[ -d "$dir" ]]; then
        count=$(find "$dir" -name "*.js" -type f | wc -l | tr -d ' ')
        dirname=$(basename "$dir")
        echo -e "  ${CYAN}$dirname:${NC} $count plugins"
    fi
done

echo ""
echo -e "${GREEN}Done! Plugins saved to: $LOCAL_DIR${NC}"

if [[ $FAILED -gt 0 ]]; then
    echo ""
    echo -e "${YELLOW}Tip: Try with proxy to download failed plugins:${NC}"
    echo -e "${CYAN}./grab_plugins.sh 150.241.110.232:7236:dvpizwym:4dkg4n8qf1qz${NC}"
fi
