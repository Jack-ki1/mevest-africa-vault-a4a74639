const fs = require('fs');

const filePath = 'src/pages/AuthPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the lovable import with supabase import
content = content.replace(
  "import { lovable } from '@/integrations/lovable/index';",
  "import { supabase } from '@/integrations/supabase/client';"
);

// Replace lovable.auth.signInWithOAuth with supabase.auth.signInWithOAuth
content = content.replace(/lovable\.auth\.signInWithOAuth/g, 'supabase.auth.signInWithOAuth');

// Fix the Google sign-in function
content = content.replace(
  /const handleGoogleSignIn = async () => {\n    setGoogleLoading\(true\);\n    try {\n      const result = await lovable\.auth\.signInWithOAuth\("google", {\s+redirect_uri: window\.location\.origin,\s*});\n      if \(result\.error\) {\s+toast\({ title: 'Google sign-in failed', description: String\(result\.error\), variant: 'destructive' \);\s+}\s+if \(result\.redirected\) return;\s+}\s+catch \(e: any\) {\s+toast\({ title: 'Google sign-in failed', description: e\.message || 'Something went wrong', variant: 'destructive' \);\s+}\s+finally {\s+setGoogleLoading\(false\);\s+}/,
  'const handleGoogleSignIn = async () => {\n    setGoogleLoading(true);\n    try {\n      const { error } = await supabase.auth.signInWithOAuth({\n        provider: \'google\',\n        options: { redirectTo: window.location.origin },\n      });\n      if (error) {\n        toast({ title: \'Google sign-in failed\', description: String(error), variant: \'destructive\' });\n      }\n      if (error) return;\n    } catch (e: any) {\n      toast({ title: \'Google sign-in failed\', description: e.message || \'Something went wrong\', variant: \'destructive\' });\n    } finally {\n      setGoogleLoading(false);\n    }\n  }'
);

// Write the fixed content back to the file
fs.writeFileSync(filePath, content);

console.log('✅ Fixed AuthPage.tsx - replaced lovable with supabase');
console.log('✅ Updated Google sign-in to use standard Supabase OAuth');