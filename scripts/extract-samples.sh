#!/usr/bin/env bash
# Extract sample files from zips for testing
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

mkdir -p "$SCRIPT_DIR/samples"

echo "📂 Extracting sample files..."

# Extract from project root zips
if [ -f "$PROJECT_ROOT/samples_for_conversion.zip" ]; then 
    unzip -o "$PROJECT_ROOT/samples_for_conversion.zip" -d "$SCRIPT_DIR/samples"
    echo "✅ Extracted samples_for_conversion.zip"
fi

if [ -f "$PROJECT_ROOT/samples_realistic.zip" ]; then 
    unzip -o "$PROJECT_ROOT/samples_realistic.zip" -d "$SCRIPT_DIR/samples"
    echo "✅ Extracted samples_realistic.zip"
fi

# Also try to generate samples if script exists
if [ -f "$SCRIPT_DIR/generate-samples.js" ]; then
    echo "🔧 Generating additional samples..."
    node "$SCRIPT_DIR/generate-samples.js" || true
fi

echo ""
echo "📁 Samples directory: $SCRIPT_DIR/samples"
ls -la "$SCRIPT_DIR/samples" 2>/dev/null || echo "No samples found yet"
echo ""
echo "✅ Done! Samples extracted to scripts/samples"
