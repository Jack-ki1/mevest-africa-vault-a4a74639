const fs = require('fs');

const filePath = 'src/pages/AuthPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Step 1: Replace the lovable import with supabase import
const newContent = content
  .replace(
    "import { lovable } from '@/integrations/lovable/index';",
    "import { supabase } from '@/integrations/supabase/client';"
  )
  .replace(
    /const handleGoogleSignIn = async () => {\s*\n\s*setGoogleLoading\(true\);\s*\n\s*try {\s*\n\s*const result = await lovable\.auth\.signInWithOAuth\("google", {\s+redirect_uri: window\.location\.origin,\s*});\s*\n\s*if \(result\.error\) {\s+toast\({ title: 'Google sign-in failed', description: String\(result\.error\), variant: 'destructive' \);\s*}\s*\n\s*if \(result\.redirected\) return;\s*}\s*\n\s*catch \(e: any\) {\s+toast\({ title: 'Google sign-in failed', description: e\.message || 'Something went wrong', variant: 'destructive' \);\s*}\s*\n\s*finally {\s+setGoogleLoading\(false\);\s*}/,
    'const handleGoogleSignIn = async () => {\n    setGoogleLoading(true);\n    try {\n      const { error } = await supabase.auth.signInWithOAuth({\n        provider: "google",\n        options: { redirectTo: window.location.origin },\n      });\n      if (error) {\n        toast({ title: "Google sign-in failed", description: String(error), variant: "destructive" });\n      }\n      if (error) return;\n    } catch (e: any) {\n      toast({ title: "Google sign-in failed", description: e.message || "Something went wrong", variant: "destructive" });\n    } finally {\n      setGoogleLoading(false);\n    }\n  }'
  )
  .replace(
    /const result = await lovable\.auth\.signInWithOAuth\("google", {\s+redirect_uri: window\.location\.origin,\s*});\s*\n\s*if \(result\.error\) {\s+toast\({ title: 'Google sign-in failed', description: String\(result\.error\), variant: 'destructive' \);\s*}\s*\n\s*if \(result\.redirected\) return;\s*}/,
    'const { error } = await supabase.auth.signInWithOAuth({\n        provider: "google",\n        options: { redirectTo: window.location.origin },\n      });\n      if (error) {\n        toast({ title: "Google sign-in failed", description: String(error), variant: "destructive" });\n      }\n      if (error) return;'
  );

fs.writeFileSync(filePath, newContent);

console.log('✅ Fixed AuthPage.tsx:');
console.log('- Replaced lovable import with supabase');
console.log('- Updated Google sign-in to use standard Supabase OAuth');