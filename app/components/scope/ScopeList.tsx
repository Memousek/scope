/**
 * ScopeList komponenta
 * - Moderní glass-like design s animacemi
 * - Responzivní grid layout
 * - Hover efekty a transitions
 * - Dark mode podpora
 */

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
  deletingScope?: string | null;
  error?: string | null;
  onDelete?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export const ScopeList: React.FC<ScopeListProps> = ({
  scopes,
  user,
  loading = false,
  deletingScope = null,
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
    <div className="relative">
      <AnimatePresence>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-8 shadow-xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-center mt-4 text-gray-600 dark:text-gray-400">{t("loading_scopes")}</p>
            </div>
          </div>
        ) : scopes.length === 0 ? (
          <motion.div
            className="flex items-center justify-center py-12"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-8 shadow-xl text-center">
              <div className="text-4xl mb-4">📋</div>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                {t("no_scopes")}
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                Vytvořte svůj první scope pro začátek práce
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scopeItems.map((scopeItem, idx) => (
              <motion.div
                key={scopeItem.scope.id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
              >
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <Link
                      href={`/scopes/${scopeItem.scope.id}`}
                      className="block group-hover:scale-105 transition-transform duration-200"
                    >
                      <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-purple-700 transition-all duration-200">
                        {scopeItem.scope.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        scopeItem.type === ScopeType.OWNED 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {scopeItem.type === ScopeType.OWNED ? "Vlastní scope" : "Sdílený scope"}
                      </span>
                    </div>
                    {scopeItem.scope.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                        {scopeItem.scope.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {scopeItem.type === ScopeType.OWNED && onDelete ? (
                      <button
                        onClick={() => {
                          console.log('Kliknuto na smazat scope:', scopeItem.scope.id);
                          onDelete(scopeItem.scope.id);
                        }}
                        disabled={deletingScope === scopeItem.scope.id}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg ${
                          deletingScope === scopeItem.scope.id
                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                            : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 hover:scale-105'
                        }`}
                      >
                        {deletingScope === scopeItem.scope.id ? 'Mažu...' : t("delete")}
                      </button>
                    ) : null}
                    {scopeItem.type === ScopeType.SHARED && onRemove ? (
                      <button
                        onClick={() => onRemove(scopeItem.scope.id)}
                        className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-4 py-2 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 hover:scale-105 shadow-lg text-sm font-medium"
                      >
                        {t("remove")}
                      </button>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
      
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
        >
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </motion.div>
      )}
    </div>
  );
}; 