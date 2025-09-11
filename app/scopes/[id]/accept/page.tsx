"use client";
/**
 * Stránka pro přijetí pozvánky do scope přes magický link
 * - Pokud je token platný, nastaví accepted_at a user_id na aktuálního uživatele
 * - Přesměruje na detail scope
 */
import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ContainerService } from "@/lib/container.service";
import { ScopeEditorRepository } from "@/lib/domain/repositories/scope-editor.repository";
import { ScopeRepository } from "@/lib/domain/repositories/scope.repository";

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
        const scopeRepository = ContainerService.getInstance().get(ScopeRepository);
        const scope = await scopeRepository.findById(scopeId);
        
        if (scope?.ownerId === user.id) {
          setStatus('error');
          setMessage('Nemůžete se přidat jako editor k vlastnímu scope.');
          return;
        }
        
        // Zjisti, jestli už je editor
        const scopeEditorRepository = ContainerService.getInstance().get(ScopeEditorRepository);
        const existing = await scopeEditorRepository.findByScopeIdAndUserId(scopeId, user.id);
        if (existing && existing.length > 0) {
          setStatus('success');
          setMessage('Již jste editor tohoto scope.');
          setTimeout(() => router.push(`/scopes/${scopeId}`), 1500);
          return;
        }
        // Přidej uživatele jako editora
        await scopeEditorRepository.create({
          scopeId,
          userId: user.id,
          acceptedAt: new Date()
        });
        setStatus('success');
        setMessage('Scope byl přidán do vašeho účtu. Přesměrovávám...');
        setTimeout(() => router.push(`/scopes/${scopeId}`), 1500);
        return;
      }
      // Najdi pozvánku podle tokenu a scope
      const scopeEditorRepository = ContainerService.getInstance().get(ScopeEditorRepository);
      const editors = await scopeEditorRepository.findByScopeIdAndToken(scopeId, token);
      if (!editors || editors.length === 0) {
        setStatus('error');
        setMessage('Pozvánka nenalezena nebo je neplatná.');
        return;
      }
      const editor = editors[0];
      
      // Zkontroluj, zda je uživatel vlastníkem scope
      const scopeRepository = ContainerService.getInstance().get(ScopeRepository);
      const scope = await scopeRepository.findById(scopeId);
      
      if (scope?.ownerId === user.id) {
        setStatus('error');
        setMessage('Nemůžete se přidat jako editor k vlastnímu scope.');
        return;
      }
      
      // Pokud už je accepted, jen přesměruj
      if (editor.acceptedAt && editor.userId === user.id) {
        setStatus('success');
        setMessage('Již jste editor tohoto scope.');
        setTimeout(() => router.push(`/scopes/${scopeId}`), 1500);
        return;
      }
      // Nastav user_id a accepted_at
      await scopeEditorRepository.update(editor.id, { 
        userId: user.id, 
        acceptedAt: new Date() 
      });
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