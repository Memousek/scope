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
            <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-8 shadow-2xl">
              {/* Decorative background elements */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>
              
              <div className="relative z-10 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-center mt-4 text-gray-600 dark:text-gray-400 font-medium">{t("loading_scopes")}</p>
              </div>
            </div>
          </div>
        ) : scopes.length === 0 ? (
          <motion.div
            className="flex items-center justify-center py-12"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-8 shadow-2xl text-center">
              {/* Decorative background elements */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>
              
              <div className="relative z-10">
                <div className="text-6xl mb-6">📋</div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                  {t("no_scopes")}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Vytvořte svůj první scope pro začátek práce
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {scopeItems.map((scopeItem, idx) => (
              <motion.div
                key={scopeItem.scope.id}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10"
              >
                {/* Priority indicator */}
                <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${scopeItem.type === ScopeType.OWNED ? 'from-blue-500 to-purple-500' : 'from-green-500 to-emerald-500'}`}></div>
                
                {/* Hover effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-300 rounded-2xl"></div>
                
                <div className="p-4 sm:p-6 relative">
                  {/* Header with icon and badge */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6 gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <span className="text-white text-lg sm:text-2xl font-bold">
                            {scopeItem.scope.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg sm:text-xl font-bold mb-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent truncate">
                          {scopeItem.scope.name}
                        </h2>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold shadow-lg ${
                            scopeItem.type === ScopeType.OWNED 
                              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                              : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                          }`}>
                            {scopeItem.type === ScopeType.OWNED ? t("owned_scope") : t("shared_scope")}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate" title={`${scopeItem.scope.id}`}>
                            ID: {scopeItem.scope.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick stats */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-3 border border-gray-200/50 dark:border-gray-600/50 shadow-lg">
                      <div className="flex items-center gap-1 sm:gap-2 mb-1">
                        <span className="w-2 h-2 sm:w-3 sm:h-3 bg-emerald-600 rounded-full"></span>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t("members")}</span>
                      </div>
                      <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                        {loadingStats[scopeItem.scope.id] ? (
                          <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-5 sm:h-6 w-8 sm:w-12 rounded"></div>
                        ) : (
                          scopeStats[scopeItem.scope.id]?.teamCount || 0
                        )}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-3 border border-gray-200/50 dark:border-gray-600/50 shadow-lg">
                      <div className="flex items-center gap-1 sm:gap-2 mb-1">
                        <span className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full"></span>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t("projects")}</span>
                      </div>
                      <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                        {loadingStats[scopeItem.scope.id] ? (
                          <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-5 sm:h-6 w-8 sm:w-12 rounded"></div>
                        ) : (
                          scopeStats[scopeItem.scope.id]?.projectCount || 0
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {scopeItem.scope.description && (
                    <div className="mb-4 sm:mb-6">
                      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-2">
                        {scopeItem.scope.description}
                      </p>
                    </div>
                  )}

                  {/* Footer with actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 pt-4 border-t border-gray-200/50 dark:border-gray-600/50">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{t("created")}: {new Date(scopeItem.scope.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <a
                        href={`/scopes/${scopeItem.scope.id}`}
                        className="relative group/btn bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/25 active:scale-95 shadow-lg text-xs sm:text-sm font-semibold flex items-center gap-1 sm:gap-2"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-lg sm:rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                        <svg className="relative z-10 w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span className="relative z-10">{t("open")}</span>
                      </a>
                      {scopeItem.type === ScopeType.OWNED && onDelete ? (
                        <button
                          onClick={() => {
                            console.log('Kliknuto na smazat scope:', scopeItem.scope.id);
                            onDelete(scopeItem.scope.id);
                          }}
                          disabled={deletingScope === scopeItem.scope.id}
                          className={`relative group/btn px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 shadow-lg ${
                            deletingScope === scopeItem.scope.id
                              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                              : 'bg-gradient-to-br from-red-500 via-pink-500 to-red-600 text-white hover:scale-105 hover:shadow-2xl hover:shadow-red-500/25 active:scale-95'
                          }`}
                        >
                          {deletingScope === scopeItem.scope.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mx-auto"></div>
                              <span>Mažu...</span>
                            </>
                          ) : (
                            <>
                              <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-pink-600 to-red-700 rounded-lg sm:rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                              <span className="relative z-10">{t("delete")}</span>
                            </>
                          )}
                        </button>
                      ) : null}
                      {scopeItem.type === ScopeType.SHARED && onRemove ? (
                        <button
                          onClick={() => onRemove(scopeItem.scope.id)}
                          className="relative group/btn bg-gradient-to-br from-gray-500 via-gray-600 to-gray-700 text-white px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-gray-500/25 active:scale-95 shadow-lg text-xs sm:text-sm font-semibold"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 rounded-lg sm:rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                          <span className="relative z-10">{t("remove")}</span>
                        </button>
                      ) : null}
                    </div>
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
          className="mt-6 relative bg-gradient-to-br from-red-50/80 via-red-50/60 to-red-50/40 dark:from-red-900/20 dark:via-red-900/15 dark:to-red-900/10 backdrop-blur-xl border border-red-200/50 dark:border-red-800/50 rounded-2xl p-6 shadow-xl"
        >
          {/* Decorative background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-pink-500/5 to-red-500/5 rounded-2xl"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-400/10 to-pink-400/10 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-red-800 dark:text-red-300">Chyba při načítání</h4>
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}; 