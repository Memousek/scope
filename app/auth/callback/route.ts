import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      // Zkontrolujeme, zda uživatel už má záznam v user_meta
      const { data: existingMeta } = await supabase
        .from('user_meta')
        .select('user_id')
        .eq('user_id', data.user.id)
        .single();
      
      // Pokud neexistuje, vytvoříme záznam
      if (!existingMeta) {
        const { error: metaError } = await supabase
          .from('user_meta')
          .insert({
            user_id: data.user.id,
            email: data.user.email,
            full_name: data.user.user_metadata?.full_name || null,
            avatar_url: data.user.user_metadata?.avatar_url || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (metaError) {
          console.warn('Nepodařilo se vytvořit záznam v user_meta:', metaError);
        }
      }
      
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/error?error=OAuth callback failed`);
}
