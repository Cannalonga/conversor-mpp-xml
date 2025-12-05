#!/bin/bash
set -euo pipefail

input="$1"
output="$2"

# Remove CRLF
tr -d '\r' < "$input" > "$output"

# Remove UTF-8 BOM
sed -i '1s/^\xEF\xBB\xBF//' "$output"

# Remove trailing whitespace from all lines
sed -i 's/[[:space:]]*$//' "$output"

# Ensure newline at EOF
printf "\n" >> "$output"
