'use client';

import { Header } from "@/components/header";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ScopeList } from "@/app/components/scope/ScopeList";
import {User} from "@/lib/domain/models/user.model";
import {ContainerService} from "@/lib/container.service";
import {UserRepository} from "@/lib/domain/repositories/user.repository";
import {GetAccessibleScopesService} from "@/lib/domain/services/get-accessible-scopes.service";
import {Scope} from "@/lib/domain/models/scope.model";
import {RemoveScopeService} from "@/lib/domain/services/remove-scope.service";
import {handleErrorMessage} from "@/lib/utils";
import {DeleteScopeService} from "@/lib/domain/services/delete-scope.service";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userRepository = ContainerService.getInstance().get(UserRepository);
    userRepository.getLoggedInUser().then((user) => {
        setUser(user);
        setLoading(false);
    });
  }, []);

  const fetchScopes = useCallback(async () => {
    if (user === null) {
        return;
    }

    const scopes = await ContainerService.getInstance()
        .get(GetAccessibleScopesService, { autobind: true })
        .getAccessibleScopes(user);

    setScopes(scopes);
  }, [user]);

  useEffect(() => {
    if (user !== null) {
      fetchScopes();
    }
  }, [user, fetchScopes]);

  const handleDeleteScope = async (scopeId: string) => {
    setError(null);
    if (!confirm('Opravdu chcete tento scope nenávratně smazat včetně všech dat?')) return;

    try {
      await ContainerService.getInstance()
        .get(DeleteScopeService, { autobind: true } )
        .deleteScope(scopeId);

      await fetchScopes();
    } catch (err: unknown) {
      const message = handleErrorMessage(err);
      setError('Chyba při mazání scope: ' + message);
      console.error('Mazání scope selhalo:', err);
    }
  };

  const handleRemoveScope = async (scopeId: string) => {
    setError(null);

    try {
      await ContainerService.getInstance()
          .get(RemoveScopeService, { autobind: true })
          .removeScope(user!, scopeId)

      await fetchScopes();
    } catch (err: unknown) {
      const message = handleErrorMessage(err);
      setError('Chyba při odebírání scope: ' + message);
      console.error('Odebírání scope selhalo:', err);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Načítání...</div>;
  }

  if (user) {
    return (
      <main className="min-h-screen flex flex-col items-center">
        <div className="flex-1 w-full flex flex-col gap-20 items-center">
          <Header />
          <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Vaše scopy</h1>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                onClick={() => router.push('/scopes/new')}
              >
                Vytvořit nový scope
              </button>
            </div>
            <ScopeList
              scopes={scopes}
              user={user}
              loading={loading}
              error={error}
              onDelete={handleDeleteScope}
              onRemove={handleRemoveScope}
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center">
      <Header />
      <div className="flex-1 w-full flex flex-col items-center">
        <section className="w-full max-w-7xl px-4 py-20 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-6xl font-bold mb-6"
          >
            Scope Burndown
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto"
          >
            Sledujte průběh vašich projektů a efektivně spravujte zdroje týmu
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link
              href="/auth/login"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition"
            >
              Přihlásit se
            </Link>
          </motion.div>
        </section>

        <section className="w-full bg-gray-50 py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-lg shadow-lg"
              >
                <h3 className="text-xl font-semibold mb-4">Sledování průběhu</h3>
                <p className="text-gray-600">
                  Vizuální přehled o průběhu projektů a využití zdrojů týmu
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-lg shadow-lg"
              >
                <h3 className="text-xl font-semibold mb-4">Sdílení s týmem</h3>
                <p className="text-gray-600">
                  Spolupracujte s kolegy a sdílejte přehledy o projektech
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-lg shadow-lg"
              >
                <h3 className="text-xl font-semibold mb-4">Export dat</h3>
                <p className="text-gray-600">
                  Exportujte data do CSV pro další analýzu a reporting
                </p>
              </motion.div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
