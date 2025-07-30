"use client";
/**
 * Stránka pro přijetí pozvánky do scope přes magický link
 * - Pokud je token platný, nastaví accepted_at a user_id na aktuálního uživatele
 * - Přesměruje na detail scope
 */
import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AcceptScopePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading'|'success'|'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const run = async () => {
      const token = searchParams.get('token');
      const scopeId = params.id as string;
      if (!scopeId) {
        setStatus('error');
        setMessage('Chybí scope.');
        return;
      }
      const supabase = createClient();
      // Zjisti aktuálního uživatele
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setStatus('error');
        setMessage('Musíte být přihlášeni.');
        return;
      }
      // Pokud není token, použij univerzální link
      if (!token) {
        // Zkontroluj, zda je uživatel vlastníkem scope
        const { data: scopeData } = await supabase
          .from('scopes')
          .select('owner_id')
          .eq('id', scopeId)
          .single();
        
        if (scopeData?.owner_id === user.id) {
          setStatus('error');
          setMessage('Nemůžete se přidat jako editor k vlastnímu scope.');
          return;
        }
        
        // Zjisti, jestli už je editor
        const { data: existing } = await supabase
          .from('scope_editors')
          .select('*')
          .eq('scope_id', scopeId)
          .eq('user_id', user.id);
        if (existing && existing.length > 0) {
          setStatus('success');
          setMessage('Již jste editor tohoto scope.');
          setTimeout(() => router.push(`/scopes/${scopeId}`), 1500);
          return;
        }
        // Přidej uživatele jako editora
        const { error: insertError } = await supabase.from('scope_editors').insert([
          { scope_id: scopeId, user_id: user.id, accepted_at: new Date().toISOString() }
        ]);
        if (insertError) {
          setStatus('error');
          setMessage('Chyba při přidávání do scope.');
          return;
        }
        setStatus('success');
        setMessage('Scope byl přidán do vašeho účtu. Přesměrovávám...');
        setTimeout(() => router.push(`/scopes/${scopeId}`), 1500);
        return;
      }
      // Najdi pozvánku podle tokenu a scope
      const { data: editors, error } = await supabase
        .from('scope_editors')
        .select('*')
        .eq('scope_id', scopeId)
        .eq('invite_token', token);
      if (error || !editors || editors.length === 0) {
        setStatus('error');
        setMessage('Pozvánka nenalezena nebo je neplatná.');
        return;
      }
      const editor = editors[0];
      
      // Zkontroluj, zda je uživatel vlastníkem scope
      const { data: scopeData } = await supabase
        .from('scopes')
        .select('owner_id')
        .eq('id', scopeId)
        .single();
      
      if (scopeData?.owner_id === user.id) {
        setStatus('error');
        setMessage('Nemůžete se přidat jako editor k vlastnímu scope.');
        return;
      }
      
      // Pokud už je accepted, jen přesměruj
      if (editor.accepted_at && editor.user_id === user.id) {
        setStatus('success');
        setMessage('Již jste editor tohoto scope.');
        setTimeout(() => router.push(`/scopes/${scopeId}`), 1500);
        return;
      }
      // Nastav user_id a accepted_at
      const { error: updateError } = await supabase
        .from('scope_editors')
        .update({ user_id: user.id, accepted_at: new Date().toISOString() })
        .eq('id', editor.id);
      if (updateError) {
        setStatus('error');
        setMessage('Chyba při přijímání pozvánky.');
        return;
      }
      setStatus('success');
      setMessage('Scope byl přidán do vašeho účtu. Přesměrovávám...');
      setTimeout(() => router.push(`/scopes/${scopeId}`), 1500);
    };
    run();
  }, [router, searchParams, params]);

  return (
    <div className="max-w-lg mx-auto p-8 mt-16 rounded-lg shadow text-center">
      {status === 'loading' && <div>Ověřuji pozvánku…</div>}
      {status === 'success' && <div className="text-green-700 font-semibold">{message}</div>}
      {status === 'error' && <div className="text-red-600 font-semibold">{message}</div>}
    </div>
  );
} 