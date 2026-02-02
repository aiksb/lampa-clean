#!/bin/bash

# ============================================================
# Lampa Clean - Plugin Grabber Script
# 
# Downloads all plugins from plugins.json to local storage
# and updates URLs to point to local copies.
# ============================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PLUGINS_JSON="$PROJECT_DIR/plugins.json"
LOCAL_DIR="$PROJECT_DIR/plugins/local"
LOCAL_JSON="$PROJECT_DIR/plugins_local.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    Lampa Clean - Plugin Grabber v1.0       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
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
BACKUP_PATH="$BACKUP_DIR/local_$TODAY"

if [[ -d "$LOCAL_DIR" ]] && [[ $(find "$LOCAL_DIR" -name "*.js" 2>/dev/null | head -1) ]]; then
    echo -e "${YELLOW}Creating backup: $BACKUP_PATH${NC}"
    if [[ -d "$BACKUP_PATH" ]]; then
        echo -e "${YELLOW}Backup already exists for today, skipping...${NC}"
    else
        cp -r "$LOCAL_DIR" "$BACKUP_PATH"
        echo -e "${GREEN}Backup created successfully${NC}"
    fi
    echo ""
fi

# Stats
TOTAL=0
SUCCESS=0
FAILED=0
SKIPPED=0

# Function to sanitize filename
sanitize_filename() {
    echo "$1" | sed 's/[^a-zA-Z0-9._-]/_/g'
}

# Function to download plugin
download_plugin() {
    local url="$1"
    local name="$2"
    local group="$3"
    
    # Create group directory
    local group_dir="$LOCAL_DIR/$(sanitize_filename "$group")"
    mkdir -p "$group_dir"
    
    # Determine filename
    local filename=$(basename "$url" | cut -d'?' -f1)
    if [[ -z "$filename" || "$filename" == "/" ]]; then
        filename="$(sanitize_filename "$name").js"
    fi
    
    local filepath="$group_dir/$filename"
    
    # Skip if already exists
    if [[ -f "$filepath" ]]; then
        echo -e "${YELLOW}  ↳ Skipped (exists): $name${NC}"
        ((SKIPPED++))
        echo "$filepath"
        return
    fi
    
    # Download
    echo -e "${BLUE}  ↳ Downloading: $name${NC}"
    
    if curl -sL --max-time 30 -o "$filepath" "$url" 2>/dev/null; then
        # Check if file is valid (not empty and not HTML error page)
        if [[ -s "$filepath" ]] && ! grep -q "<!DOCTYPE html>" "$filepath" 2>/dev/null; then
            echo -e "${GREEN}    ✓ Saved: $filename${NC}"
            ((SUCCESS++))
            echo "$filepath"
        else
            rm -f "$filepath"
            echo -e "${RED}    ✗ Invalid content${NC}"
            ((FAILED++))
            echo ""
        fi
    else
        echo -e "${RED}    ✗ Download failed${NC}"
        ((FAILED++))
        echo ""
    fi
}

# Main processing
echo -e "${BLUE}Loading plugins.json...${NC}"

# Get all groups
GROUPS=$(jq -r '.groups | length' "$PLUGINS_JSON")

echo -e "${GREEN}Found $GROUPS groups${NC}"
echo ""

# Process each group
for ((g=0; g<GROUPS; g++)); do
    GROUP_TITLE=$(jq -r ".groups[$g].title" "$PLUGINS_JSON")
    PLUGINS=$(jq -r ".groups[$g].plugins | length" "$PLUGINS_JSON")
    
    echo -e "${YELLOW}━━━ $GROUP_TITLE ($PLUGINS plugins) ━━━${NC}"
    
    for ((p=0; p<PLUGINS; p++)); do
        URL=$(jq -r ".groups[$g].plugins[$p].url" "$PLUGINS_JSON")
        NAME=$(jq -r ".groups[$g].plugins[$p].name" "$PLUGINS_JSON")
        
        ((TOTAL++))
        
        download_plugin "$URL" "$NAME" "$GROUP_TITLE" > /dev/null
    done
    
    echo ""
done

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                 Summary                    ║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║ Total:    ${NC}$TOTAL"
echo -e "${BLUE}║ Success:  ${GREEN}$SUCCESS${NC}"
echo -e "${BLUE}║ Failed:   ${RED}$FAILED${NC}"
echo -e "${BLUE}║ Skipped:  ${YELLOW}$SKIPPED${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"

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
echo -e "${BLUE}Downloaded plugins:${NC}"
find "$LOCAL_DIR" -name "*.js" -type f | head -20

echo ""
echo -e "${GREEN}Done! Plugins saved to: $LOCAL_DIR${NC}"
echo -e "${GREEN}Updated date in plugins.json: $TODAY${NC}"

