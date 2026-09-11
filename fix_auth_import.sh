#!/bin/bash

# Quick fix for AuthPage import issue

echo "🔧 Fixing AuthPage import issue..."

# Read the current file
FILE="src/pages/AuthPage.tsx"

# Check if the file exists and has the lovable import
if grep -q "import.*lovable from '@/integrations/lovable/index'" "$FILE"; then
    echo "✅ Found lovable import in AuthPage.tsx"

    # Create backup
    cp "$FILE" "backup_authpage_$(date +%Y%m%d_%H%M%S).tsx"

    # Replace the lovable import with supabase
    sed -i 's/import { lovable } from \x27@\/integrations\/lovable\/index\x27;/import { supabase } from \x27@l\\/integrations\/supabase\/client\x27;/' "$FILE"

    # Replace lovable.auth.signInWithOAuth with supabase.auth.signInWithOAuth
    sed -i 's/lovable\.auth\.signInWithOAuth/supabase.auth.signInWithOAuth/g' "$FILE"

    echo "✅ Fixed AuthPage.tsx imports and Google sign-in implementation"

    # Also need to update the handleGoogleSignIn function
    sed -i '/const handleGoogleSignIn = async () => {/,/^[[:space:]]*};/c\const handleGoogleSignIn = async () => {\n    setGoogleLoading(true);\n    try {\n      const { error } = await supabase.auth.signInWithOAuth({\n        provider: \'google\',\n        options: { redirectTo: window.location.origin },\n      });\n      if (error) {\n        toast({ title: \'Google sign-in failed\', description: String(error), variant: \'destructive\' });\n      }\n      if (error) return;\n    } catch (e: any) {\n      toast({ title: \'Google sign-in failed\', description: e.message || \'Something went wrong\', variant: \'destructive\' });\n    } finally {\n      setGoogleLoading(false);\n    }\n  };' "$FILE"

    echo "✅ Updated Google sign-in function to use standard Supabase OAuth"

else
    echo "⚠️  No lovable import found in AuthPage.tsx - it may have already been fixed"
fi

echo "\n🎉 AuthPage fix completed!"
echo "\nNext steps:"
echo "1. Run 'npm run build' to verify the fix"
echo "2. Run 'npm start' to launch the development server"
echo "3. Visit http://localhost:5173 to access the application"