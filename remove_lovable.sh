#!/bin/bash

# Remove Lovable proprietary packages and files

echo "Removing Lovable integration files..."

# Remove the lovable index file
if [ -f "src/integrations/lovable/index.ts" ]; then
    rm src/integrations/lovable/index.ts
    echo "✓ Removed src/integrations/lovable/index.ts"
fi

# Remove lovable package.json entry
if [ -f "package.json" ]; then
    # Use node to remove @lovable.dev/cloud-auth-js and lovable-tagger from dependencies
    node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    // Remove from dependencies
    if (pkg.dependencies) {
        delete pkg.dependencies['@lovable.dev/cloud-auth-js'];
        delete pkg.dependencies['lovable-tagger'];
    }

    // Remove from devDependencies
    if (pkg.devDependencies) {
        delete pkg.devDependencies['@lovable.dev/cloud-auth-js'];
        delete pkg.devDependencies['lovable-tagger'];
    }

    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    console.log('✓ Updated package.json');
    "
fi

# Remove vite.config.ts componentTagger
if [ -f "vite.config.ts" ]; then
    node -e "
    const fs = require('fs');
    let content = fs.readFileSync('vite.config.ts', 'utf8');

    // Remove componentTagger from plugins
    content = content.replace(/\s*componentTagger:.*?,/g, '');
    content = content.replace(/\s*componentTagger,/g, '');

    // Clean up any remaining commas or lines
    content = content.replace(/,\s*plugins:\s*\[/g, '\\n  plugins: [');

    fs.writeFileSync('vite.config.ts', content);
    console.log('✓ Updated vite.config.ts');
    "
fi

# Remove @lovable.dev/cloud-auth-js from imports in AuthPage.tsx
if [ -f "src/pages/AuthPage.tsx" ]; then
    sed -i 's/from.*@lovable.dev.cloud-auth-js.*//g' src/pages/AuthPage.tsx
    echo "✓ Cleaned up imports in AuthPage.tsx"
fi

# Remove lovable imports from other files
find src -name "*.tsx" -o -name "*.ts" | xargs grep -l "@lovable.dev" 2>/dev/null | while read file; do
    sed -i '/@lovable.dev/d' "$file"
    echo "✓ Cleaned up @lovable.dev imports in $file"
done

echo "\n✅ Lovable cleanup completed!"
echo "\nNext steps:"
echo "1. Run 'npm install' to install new dependencies"
echo "2. Update your .env with real Supabase credentials"
echo "3. Update package.json with new Supabase client version if needed"