import React from "react";
import Link from "next/link";
import {AnimatePresence, motion} from "framer-motion";
import {Scope, ScopeType} from "@/lib/domain/models/scope.model";
import {User} from "@/lib/domain/models/user.model";
import {ScopeRepository} from "@/lib/domain/repositories/scope.repository";

export type ScopeListItem = {
  scope: Scope,
  type: ScopeType,
};

interface ScopeListProps {
  scopes: Scope[];
  user: User;
  loading?: boolean;
  error?: string | null;
  onDelete?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export const ScopeList: React.FC<ScopeListProps> = ({
  scopes,
  user,
  loading = false,
  error,
  onDelete,
  onRemove,
}) => {
  const scopeItems: ScopeListItem[] = scopes.map(scope => ({
    scope: scope,
    type: ScopeRepository.getScopeType(scope, user),
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
      <AnimatePresence>
        {loading ? (
          <div className="col-span-full text-center text-gray-500 py-8">Načítám scopy…</div>
        ) : scopes.length === 0 ? (
          <motion.div
            className="col-span-full text-center text-gray-500 py-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            Zatím nemáte žádné scopy. Vytvořte si nový scope pro sledování projektů.
          </motion.div>
        ) : (
          scopeItems.map((scopeItem, idx) => (
            <motion.div
              key={scopeItem.scope.id}
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ duration: 0.3, delay: idx * 0.07 }}
              className="bg-white rounded-2xl shadow-xl p-8 flex flex-col min-h-[200px] justify-between hover:shadow-2xl transition-shadow"
            >
              <div className="flex-1">
                <Link
                  href={`/scopes/${scopeItem.scope.id}`}
                  className="text-2xl font-semibold mb-2 block hover:text-blue-600 transition-colors"
                >
                  {scopeItem.scope.name}
                </Link>
                <span className="text-base text-gray-500 block mb-6">
                  {scopeItem.type === ScopeType.OWNED ? "Vlastní scope" : "Sdílený scope"}
                </span>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                {scopeItem.type === ScopeType.OWNED && onDelete ? (
                  <button
                    onClick={() => onDelete(scopeItem.scope.id)}
                    className="text-red-600 hover:text-red-700 text-base px-4 py-2 rounded border border-red-600 hover:border-red-700 transition-colors"
                  >
                    Smazat
                  </button>
                ) : null}
                {scopeItem.type === ScopeType.SHARED && onRemove ? (
                  <button
                    onClick={() => onRemove(scopeItem.scope.id)}
                    className="text-gray-600 hover:text-gray-700 text-base px-4 py-2 rounded border border-gray-600 hover:border-gray-700 transition-colors"
                  >
                    Odebrat
                  </button>
                ) : null}
              </div>
            </motion.div>
          ))
        )}
      </AnimatePresence>
      {error && <div className="col-span-full text-red-600 mb-4">{error}</div>}
    </div>
  );
}; 