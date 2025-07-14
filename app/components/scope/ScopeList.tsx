import React from "react";
import Link from "next/link";
import {AnimatePresence, motion} from "framer-motion";
import { useTranslation } from "@/lib/translation";
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
  const { t } = useTranslation();
  return (
    <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 min-h-[250px]">
      <AnimatePresence>
        {loading ? (
          <div className="col-span-full text-center text-gray-500 py-8">
            <span className="text-base">{t("loading_scopes")}</span>
          </div>
        ) : scopes.length === 0 ? (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <span className="text-base text-gray-500 dark:text-gray-400 px-4 py-2">
              {t("no_scopes")}
            </span>
          </motion.div>
        ) : (
          scopeItems.map((scopeItem, idx) => (
            <motion.div
              key={scopeItem.scope.id}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, delay: idx * 0.02 }}
              className="shadow hover:shadow-2xl rounded-2xl p-8 flex flex-col min-h-[200px] justify-between transition-shadow bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
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
                    className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors font-semibold"
                  >
                    {t("delete")}
                  </button>
                ) : null}
                {scopeItem.type === ScopeType.SHARED && onRemove ? (
                  <button
                    onClick={() => onRemove(scopeItem.scope.id)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors font-semibold"
                  >
                    {t("remove")}
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