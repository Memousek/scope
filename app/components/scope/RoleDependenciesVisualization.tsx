/**
 * Vylepšená vizualizace závislostí rolí
 * Moderní design s animacemi a lepším UX
 */

import React from 'react';


interface RoleDependency {
  fromRole: string;
  toRole: string;
  type: 'blocking' | 'parallel' | 'sequential';
}

interface RoleDependenciesVisualizationProps {
  dependencies: RoleDependency[];
  roles: Array<{ key: string; label: string; color: string }>;
}

export const RoleDependenciesVisualization: React.FC<RoleDependenciesVisualizationProps> = ({
}) => {

  return (
    <div className="bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-800/90 dark:via-gray-800/70 dark:to-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-white/30 dark:border-gray-600/30 shadow-2xl">
      {/* Dekorativní pozadí */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>
      
      <div className="relative z-10">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          Role Dependencies - Flow vizualizace
        </h3>
        
        {/* Flow diagram */}
        <div className="space-y-8">
          {/* Hlavní flow */}
          <div className="relative">
            <div className="flex items-center justify-center space-x-6">
              {/* FE Role */}
              <div className="group relative">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl">
                  FE
                </div>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Frontend
                </div>
                {/* Hover efekt */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </div>
              
              {/* Arrow */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <div className="absolute inset-0 bg-red-500 rounded-full blur-sm opacity-30"></div>
                </div>
                <span className="text-xs text-gray-500 mt-2 font-medium">blokuje</span>
              </div>
              
              {/* BE Role */}
              <div className="group relative">
                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl">
                  BE
                </div>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Backend
                </div>
                {/* Hover efekt */}
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-500 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </div>
              
              {/* Arrow */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <div className="absolute inset-0 bg-red-500 rounded-full blur-sm opacity-30"></div>
                </div>
                <span className="text-xs text-gray-500 mt-2 font-medium">blokuje</span>
              </div>
              
              {/* QA Role */}
              <div className="group relative">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl">
                  QA
                </div>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Testing
                </div>
                {/* Hover efekt */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </div>
            </div>
          </div>

          {/* Alternativní paralelní flow */}
          <div className="relative border-t border-gray-200 dark:border-gray-600 pt-8">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-emerald-500/5 to-teal-500/5 rounded-xl"></div>
            <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-green-400/10 to-emerald-400/10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
              <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-6 flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                Alternativní paralelní flow
              </h4>
              
              <div className="flex items-center justify-center space-x-8">
                {/* FE Role */}
                <div className="group relative">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg transition-all duration-300 group-hover:scale-110">
                    FE
                  </div>
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 dark:text-gray-400">
                    Frontend
                  </div>
                </div>
                
                {/* Parallel arrow */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <div className="absolute inset-0 bg-green-500 rounded-full blur-sm opacity-30"></div>
                  </div>
                  <span className="text-xs text-gray-500 mt-1">paralelně</span>
                </div>
                
                {/* BE Role */}
                <div className="group relative">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg transition-all duration-300 group-hover:scale-110">
                    BE
                  </div>
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 dark:text-gray-400">
                    Backend
                  </div>
                </div>
                
                {/* Both arrows to QA */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <div className="absolute inset-0 bg-red-500 rounded-full blur-sm opacity-30"></div>
                  </div>
                  <span className="text-xs text-gray-500 mt-1">blokují</span>
                </div>
                
                {/* QA Role */}
                <div className="group relative">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg transition-all duration-300 group-hover:scale-110">
                    QA
                  </div>
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 dark:text-gray-400">
                    Testing
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dependency matrix */}
          <div className="relative border-t border-gray-200 dark:border-gray-600 pt-8">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-red-500/5 to-pink-500/5 rounded-xl"></div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-400/10 to-red-400/10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
              <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                Matice závislostí
              </h4>
              
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold">Role</th>
                      <th className="text-center py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold">FE</th>
                      <th className="text-center py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold">BE</th>
                      <th className="text-center py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold">QA</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-200">FE</td>
                      <td className="py-3 px-4 text-center">-</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg">
                          🚫 Blokuje
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">-</td>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-200">BE</td>
                      <td className="py-3 px-4 text-center">-</td>
                      <td className="py-3 px-4 text-center">-</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg">
                          🚫 Blokuje
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-200">QA</td>
                      <td className="py-3 px-4 text-center">-</td>
                      <td className="py-3 px-4 text-center">-</td>
                      <td className="py-3 px-4 text-center">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Timeline visualization */}
          <div className="relative border-t border-gray-200 dark:border-gray-600 pt-8">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-xl"></div>
            <div className="absolute bottom-0 left-0 w-28 h-28 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
              <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-6 flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Časová osa s závislostmi
              </h4>
              
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                
                {/* Timeline items */}
                <div className="space-y-6">
                  {[
                    { title: 'FE Development', period: 'Týden 1-2', desc: 'Frontend práce probíhá paralelně s BE', color: 'from-blue-500 to-blue-600' },
                    { title: 'BE Development', period: 'Týden 1-3', desc: 'Backend práce, QA čeká na dokončení', color: 'from-green-500 to-green-600' },
                    { title: 'QA Testing', period: 'Týden 4-5', desc: 'QA může začít až po dokončení FE a BE', color: 'from-purple-500 to-purple-600' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center group">
                      <div className={`w-4 h-4 bg-gradient-to-r ${item.color} rounded-full border-2 border-white dark:border-gray-800 relative z-10 shadow-lg group-hover:scale-125 transition-transform duration-300`}></div>
                      <div className="ml-8 flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.title}</span>
                          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">{item.period}</span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 italic">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Vizualizace "kostry" - NOVÉ */}
          <div className="relative border-t border-gray-200 dark:border-gray-600 pt-8">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-xl"></div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
              <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-6 flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                Projektová kostra
              </h4>
              
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* FE Skeleton */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                      <h5 className="font-semibold text-gray-800 dark:text-gray-200">Frontend</h5>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Aktivní</span>
                    </div>
                  </div>

                  {/* BE Skeleton */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                      <h5 className="font-semibold text-gray-800 dark:text-gray-200">Backend</h5>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Čeká</span>
                    </div>
                  </div>

                  {/* QA Skeleton */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                      <h5 className="font-semibold text-gray-800 dark:text-gray-200">QA</h5>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/6 animate-pulse"></div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Blokován</span>
                    </div>
                  </div>
                </div>

                {/* Dependency lines */}
                <div className="relative mt-6">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-full h-8" viewBox="0 0 100 32">
                      {/* FE to BE */}
                      <path d="M25 16 L45 16" stroke="#ef4444" strokeWidth="2" strokeDasharray="4" className="animate-pulse"/>
                      <polygon points="40,12 45,16 40,20" fill="#ef4444"/>
                      
                      {/* BE to QA */}
                      <path d="M55 16 L75 16" stroke="#ef4444" strokeWidth="2" strokeDasharray="4" className="animate-pulse"/>
                      <polygon points="70,12 75,16 70,20" fill="#ef4444"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 