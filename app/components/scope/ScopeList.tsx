import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export type ScopeListItem = {
  id: string;
  name: string;
  owner_id: string;
  type: "owned" | "shared";
};

interface ScopeListProps {
  scopes: ScopeListItem[];
  loading?: boolean;
  error?: string | null;
  onDelete?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export const ScopeList: React.FC<ScopeListProps> = ({
  scopes,
  loading = false,
  error,
  onDelete,
  onRemove,
}) => {
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
          scopes.map((scope, idx) => (
            <motion.div
              key={scope.id}
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ duration: 0.3, delay: idx * 0.07 }}
              className="shadow hover:shadow-2xl rounded-2xl p-8 flex flex-col min-h-[200px] justify-between transition-shadow bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex-1">
                <Link
                  href={`/scopes/${scope.id}`}
                  className="text-2xl font-semibold mb-2 block hover:text-blue-600 transition-colors"
                >
                  {scope.name}
                </Link>
                <span className="text-base text-gray-500 block mb-6">
                  {scope.type === "owned" ? "Vlastní scope" : "Sdílený scope"}
                </span>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                {scope.type === "owned" && onDelete ? (
                  <button
                    onClick={() => onDelete(scope.id)}
                    className="text-red-600 hover:text-red-700 text-base px-4 py-2 rounded border border-red-600 hover:border-red-700 transition-colors"
                  >
                    Smazat
                  </button>
                ) : null}
                {scope.type === "shared" && onRemove ? (
                  <button
                    onClick={() => onRemove(scope.id)}
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