#!/usr/bin/env python3

import re

# Read the file
with open('src/pages/AuthPage.tsx', 'r') as f:
    content = f.read()

# Fix 1: Replace the lovable import with supabase import
content = content.replace(
    "import { lovable } from '@/integrations/lovable/index';",
    "import { supabase } from '@/integrations/supabase/client';"
)

# Fix 2: Replace the Google sign-in function
# Find the function and replace it entirely
old_function_pattern = r'const handleGoogleSignIn = async \(\) => {\s*\n\s*setGoogleLoading\(true\);\s*\n\s*try {\s*\n\s*const result = await lovable\.auth\.signInWithOAuth\("google", {\s*\n\s*redirect_uri: window\.location\.origin,\s*\n\s*});\s*\n\s*if \(result\.error\) {\s*\n\s*toast\({ title: "Google sign-in failed", description: String\(result\.error\), variant: "destructive" \);\s*\n\s*}\s*\n\s*if \(result\.redirected\) return;\s*\n\s*}\s*\n\s*catch \(e: any\) {\s*\n\s*toast\({ title: "Google sign-in failed", description: e\.message || "Something went wrong", variant: "destructive" \);\s*\n\s*}\s*\n\s*finally {\s*\n\s*setGoogleLoading\(false\);\s*\n\s*}\s*\n\s*}'

new_function = '''const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) {
        toast({ title: "Google sign-in failed", description: String(error), variant: "destructive" });
      }
      if (error) return;
    } catch (e: any) {
      toast({ title: "Google sign-in failed", description: e.message || "Something went wrong", variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  }'''

content = content.replace(old_function_pattern, new_function, flags=re.MULTILINE | re.DOTALL)

# Fix 3: Also check for any remaining lovable references
content = content.replace(/lovable\.auth\./g, 'supabase.auth.');

# Write back to file
with open('src/pages/AuthPage.tsx', 'w') as f:
    f.write(content)

print('✅ Successfully fixed AuthPage.tsx:')
print('- Replaced lovable import with supabase import')
print('- Updated Google sign-in to use standard Supabase OAuth')
print('- Removed all remaining lovable.auth references')