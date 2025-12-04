#!/bin/bash

set -e

input_key="$1"
output_key="$2"

# remove CRLF
tr -d '\r' < "$input_key" > "$output_key"

# remove UTF-8 BOM
sed -i '1s/^\xEF\xBB\xBF//' "$output_key"

# ensure newline at EOF
printf "\n" >> "$output_key"
