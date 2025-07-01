'use client';
/**
 * Stránka pro seznam scopů
 * - Přístupná pouze přihlášeným uživatelům
 * - Zobrazí seznam všech scopů z Supabase
 * - Odkaz na vytvoření nového scope
 */

import {useRouter} from 'next/navigation';
import {useEffect, useState, useCallback} from 'react';
import {ScopeList} from "@/app/components/scope/ScopeList";
import {ContainerService} from "@/lib/container.service";
import {DeleteScopeService} from "@/lib/domain/services/delete-scope.service";
import {GetAccessibleScopesService} from "@/lib/domain/services/get-accessible-scopes.service";
import {User} from "@/lib/domain/models/user.model";
import {UserRepository} from "@/lib/domain/repositories/user.repository";
import {ScopeEditorRepository} from "@/lib/domain/repositories/scope-editor.repository";
import {Scope} from "@/lib/domain/models/scope.model";
import {handleErrorMessage} from "@/lib/utils";

const useAuth = () => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const userRepository = ContainerService.getInstance().get(UserRepository)
        userRepository.getLoggedInUser().then((user) => {
            setUser(user);
        }).catch(() => {
            setUser(null);
        }).finally(() => {
            setLoading(false);
        })
    }, []);

    return {loading, user};
};

export default function ScopesListPage() {
    const {loading, user} = useAuth();
    const router = useRouter();
    const [scopes, setScopes] = useState<Scope[]>([]);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/login');
        }
    }, [loading, user, router]);

    const fetchScopes = useCallback(async () => {
        setFetching(true);

        const scopes = await ContainerService.getInstance()
            .get(GetAccessibleScopesService, {autobind: true})
            .getAccessibleScopes(user!);

        setScopes(scopes);
        setFetching(false);
    }, [user]);

    useEffect(() => {
        if (!loading && user) {
            fetchScopes();
        }
    }, [loading, user, fetchScopes]);

    const handleDeleteScope = async (scopeId: string) => {
        setError(null);
        if (!confirm('Opravdu chcete tento scope nenávratně smazat včetně všech dat?')) return;
        const deleteScopeService = ContainerService.getInstance().get(DeleteScopeService, {autobind: true});

        try {
            await deleteScopeService.deleteScope(scopeId);
            await fetchScopes();
        } catch (err: unknown) {
            const message = handleErrorMessage(err);
            setError('Chyba při mazání scope: ' + message);
            console.error('Mazání scope selhalo:', err);
        }
    };

    const handleRemoveScope = async (scopeId: string) => {
        setError(null);
        if (!user?.email) return;
        const scopeEditorRepository = ContainerService.getInstance().get(ScopeEditorRepository);
        try {
            await scopeEditorRepository.deleteByScopeId({scopeId: scopeId});
            await fetchScopes();
        } catch (err: unknown) {
            const message = handleErrorMessage(err);
            setError('Chyba při odebírání scope: ' + message);
            console.error('Odebírání scope selhalo:', err);
        }
    };

    if (loading || !user) {
        return <div className="min-h-screen flex items-center justify-center">Načítání…</div>;
    }
  
    return (
        <main className="min-h-screen flex flex-col items-center bg-gray-50 dark:bg-gray-900">
            <div className="flex-1 w-full flex flex-col gap-20 items-center">
                <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-3xl font-bold">Vaše scopy</h1>
                        <button
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg text-base font-semibold hover:bg-blue-700 transition"
                            onClick={() => router.push('/scopes/new')}
                        >
                            Vytvořit nový scope
                        </button>
                    </div>
                    <ScopeList
                        scopes={scopes}
                        user={user}
                        loading={fetching}
                        error={error}
                        onDelete={handleDeleteScope}
                        onRemove={handleRemoveScope}
                    />
                </div>
            </div>
        </main>
    );
} 