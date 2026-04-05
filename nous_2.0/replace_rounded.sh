#!/bin/bash
find src/ -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) ! -path "src/components/home/*" ! -path "src/app/page.tsx" | while read -r file; do
    sed -i -E 's/rounded-\[28px\]/rounded-lg/g' "$file"
    sed -i -E 's/rounded-3xl/rounded-lg/g' "$file"
    sed -i -E 's/rounded-2xl/rounded-lg/g' "$file"
    sed -i -E 's/rounded-xl/rounded-md/g' "$file"
done
