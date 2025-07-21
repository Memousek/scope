/**
 * ScopeList komponenta
 * - Moderní glass-like design s animacemi
 * - Responzivní grid layout
 * - Hover efekty a transitions
 * - Dark mode podpora
 */

import React, { useState, useEffect } from "react";
import {AnimatePresence, motion} from "framer-motion";
import { useTranslation } from "@/lib/translation";
import {Scope, ScopeType} from "@/lib/domain/models/scope.model";
import {User} from "@/lib/domain/models/user.model";
import {ScopeRepository} from "@/lib/domain/repositories/scope.repository";
import {TeamMemberRepository} from "@/lib/domain/repositories/team-member.repository";
import {ProjectRepository} from "@/lib/domain/repositories/project.repository";
import {ContainerService} from "@/lib/container.service";

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
  const [scopeStats, setScopeStats] = useState<{[key: string]: {teamCount: number, projectCount: number}}>({});
  const [loadingStats, setLoadingStats] = useState<{[key: string]: boolean}>({});
  
  const scopeItems: ScopeListItem[] = scopes.map(scope => ({
    scope: scope,
    type: ScopeRepository.getScopeType(scope, user),
  }));
  const { t } = useTranslation();

  // Načítání statistik pro každý scope
  useEffect(() => {
    const loadScopeStats = async () => {
      const teamMemberRepository = ContainerService.getInstance().get(TeamMemberRepository);
      const projectRepository = ContainerService.getInstance().get(ProjectRepository);
      
      for (const scope of scopes) {
        if (!scopeStats[scope.id] && !loadingStats[scope.id]) {
          setLoadingStats(prev => ({ ...prev, [scope.id]: true }));
          
          try {
            // Načtení členů týmu pro scope
            const teamMembers = await teamMemberRepository.findByScopeId(scope.id);
            
            // Načtení projektů pro scope
            const projects = await projectRepository.findByScopeId(scope.id);
            

            
            setScopeStats(prev => ({
              ...prev,
              [scope.id]: {
                teamCount: teamMembers.length,
                projectCount: projects.length
              }
            }));
          } catch (error) {
            console.error('Chyba při načítání statistik scope:', scope.id, error);
          } finally {
            setLoadingStats(prev => ({ ...prev, [scope.id]: false }));
          }
        }
      }
    };

    if (scopes.length > 0) {
      loadScopeStats();
    }
  }, [scopes, scopeStats, loadingStats]);
  
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
                className="flex flex-col justify-between group relative bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-700/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden"
              >
                {/* Decorative gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Header with icon and badge */}
                <div className="relative flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <span className="text-white text-lg font-bold">
                        {scopeItem.scope.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold mb-1 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {scopeItem.scope.name}
                      </h2>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          scopeItem.type === ScopeType.OWNED 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        }`}>
                          {scopeItem.type === ScopeType.OWNED ? "Vlastní scope" : "Sdílený scope"}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {scopeItem.scope.id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick stats */}
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="w-2 h-2 bg-emerald-600 rounded-full"></span>
                      <span>
                        {loadingStats[scopeItem.scope.id] ? (
                          <span className="animate-pulse">...</span>
                        ) : (
                          `${scopeStats[scopeItem.scope.id]?.teamCount || 0} členů`
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span>
                        {loadingStats[scopeItem.scope.id] ? (
                          <span className="animate-pulse">...</span>
                        ) : (
                          `${scopeStats[scopeItem.scope.id]?.projectCount || 0} projektů`
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {scopeItem.scope.description && (
                  <div className="relative mb-4">
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 leading-relaxed">
                      {scopeItem.scope.description}
                    </p>
                  </div>
                )}

                {/* Footer with actions */}
                <div className="relative flex items-center justify-between pt-4 border-t border-gray-200/50 dark:border-gray-600/50">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>Vytvořeno: {new Date(scopeItem.scope.createdAt).toLocaleDateString('cs-CZ')}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <a
                      href={`/scopes/${scopeItem.scope.id}`}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1.5 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 hover:scale-105 shadow-lg text-xs font-medium flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Otevřít
                    </a>
                    {scopeItem.type === ScopeType.OWNED && onDelete ? (
                      <button
                        onClick={() => {
                          console.log('Kliknuto na smazat scope:', scopeItem.scope.id);
                          onDelete(scopeItem.scope.id);
                        }}
                        disabled={deletingScope === scopeItem.scope.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 shadow-lg ${
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
                        className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-3 py-1.5 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 hover:scale-105 shadow-lg text-xs font-medium"
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