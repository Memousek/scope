/**
 * Read-only Project Section Component
 * - Používá se pro veřejný náhled scopu
 * - Neumožňuje editaci, mazání ani přidávání projektů
 * - Zobrazuje projekty a burndown grafy
 * - Moderní glass-like design
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/translation';
import { Project, TeamMember } from './types';
import { calculateProjectDeliveryInfo, calculatePriorityDates } from '@/app/utils/dateUtils';
import { BurndownChart } from './BurndownChart';
import { ProjectProgressChart } from './ProjectProgressChart';

interface ProjectSectionRefactoredProps {
  scopeId: string;
  readOnly?: boolean;
  team: TeamMember[];
}

export function ProjectSectionRefactored({ 
  scopeId, 
  readOnly = true,
  team 
}: ProjectSectionRefactoredProps) {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Load projects on component mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('scope_id', scopeId)
          .order('priority', { ascending: true });

        if (!error && data) {
          setProjects(data);
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [scopeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <>
      {/* Projekty (read-only) */}
      <section className="mb-8">
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              📋 {t('projects')}
            </h2>
            {readOnly && (
              <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-medium">
                {t('readOnly') || 'Pouze pro čtení'}
              </span>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-3 text-left">{t('projectName')}</th>
                  <th className="px-3 py-3 text-right">{t('priority')}</th>
                  <th className="px-3 py-3 text-right">{t('fe_mandays')}</th>
                  <th className="px-3 py-3 text-right">% FE {t('done')}</th>
                  <th className="px-3 py-3 text-right">{t('be_mandays')}</th>
                  <th className="px-3 py-3 text-right">% BE {t('done')}</th>
                  <th className="px-3 py-3 text-right">{t('qa_mandays')}</th>
                  <th className="px-3 py-3 text-right">% QA {t('done')}</th>
                  <th className="px-3 py-3 text-right">{t('pm_mandays')}</th>
                  <th className="px-3 py-3 text-right">% PM {t('done')}</th>
                  <th className="px-3 py-3 text-right">{t('dpl_mandays')}</th>
                  <th className="px-3 py-3 text-right">% DPL {t('done')}</th>
                  <th className="px-3 py-3 text-center">{t('deliveryDate')}</th>
                  <th className="px-3 py-3 text-center">{t('calculatedDelivery')}</th>
                  <th className="px-3 py-3 text-center">{t('delay')}</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="text-gray-400 dark:text-gray-500 text-center py-8">
                      {t('noProjects')}
                    </td>
                  </tr>
                ) : (
                  projects.map(project => {
                    const info = calculateProjectDeliveryInfo(project, team);
                    return (
                      <tr key={project.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-3 py-3 align-middle font-medium text-gray-900 dark:text-gray-100">
                          {project.name}
                        </td>
                        <td className="px-3 py-3 align-middle text-right">
                          {project.priority}
                        </td>
                        {/* FE */}
                        <td className="px-3 py-3 align-middle text-right">
                          {Number(project.fe_mandays) > 0 ? Number(project.fe_mandays) : '-'}
                        </td>
                        <td className="px-3 py-3 align-middle text-right">
                          {Number(project.fe_mandays) > 0 ? (Number(project.fe_done) || 0) + ' %' : '-'}
                        </td>
                        {/* BE */}
                        <td className="px-3 py-3 align-middle text-right">
                          {Number(project.be_mandays) > 0 ? Number(project.be_mandays) : '-'}
                        </td>
                        <td className="px-3 py-3 align-middle text-right">
                          {Number(project.be_mandays) > 0 ? (Number(project.be_done) || 0) + ' %' : '-'}
                        </td>
                        {/* QA */}
                        <td className="px-3 py-3 align-middle text-right">
                          {Number(project.qa_mandays) > 0 ? Number(project.qa_mandays) : '-'}
                        </td>
                        <td className="px-3 py-3 align-middle text-right">
                          {Number(project.qa_mandays) > 0 ? (Number(project.qa_done) || 0) + ' %' : '-'}
                        </td>
                        {/* PM */}
                        <td className="px-3 py-3 align-middle text-right">
                          {Number(project.pm_mandays) > 0 ? Number(project.pm_mandays) : '-'}
                        </td>
                        <td className="px-3 py-3 align-middle text-right">
                          {Number(project.pm_mandays) > 0 ? (Number(project.pm_done) || 0) + ' %' : '-'}
                        </td>
                        {/* DPL */}
                        <td className="px-3 py-3 align-middle text-right">
                          {Number(project.dpl_mandays) > 0 ? Number(project.dpl_mandays) : '-'}
                        </td>
                        <td className="px-3 py-3 align-middle text-right">
                          {Number(project.dpl_mandays) > 0 ? (Number(project.dpl_done) || 0) + ' %' : '-'}
                        </td>
                        <td className="px-3 py-3 align-middle text-center">
                          {project.delivery_date ? new Date(project.delivery_date).toISOString().slice(0, 10) : ''}
                        </td>
                        <td className="px-3 py-3 align-middle text-center">
                          {info.calculatedDeliveryDate.toLocaleDateString()}
                        </td>
                        <td className={`px-3 py-3 align-middle text-center font-semibold ${
                          info.diffWorkdays === null ? '' : 
                          info.diffWorkdays >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {info.diffWorkdays === null ? '' : 
                           info.diffWorkdays >= 0 ? `+${info.diffWorkdays} ${t('days')}` : 
                           `${info.diffWorkdays} ${t('days')}`}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Burndown Chart */}
      {projects.length > 0 && (
        <section className="mb-8">
          <BurndownChart projects={projects} team={team} />
        </section>
      )}

      {/* Individual Project Progress Charts */}
      {projects.length > 0 && (
        <section className="mb-8">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                📊 {t('projectProgressCharts') || 'Progress grafy projektů'}
              </h2>
              {readOnly && (
                <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-medium">
                  {t('readOnly') || 'Pouze pro čtení'}
                </span>
              )}
            </div>
            
            <div className="space-y-6">
              {projects.map(project => {
                const deliveryInfo = calculateProjectDeliveryInfo(project, team);
                const priorityDates = calculatePriorityDates(projects, team)[project.id];
                return (
                  <div key={project.id} className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-white/20 dark:border-gray-700 rounded-xl p-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {project.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>Priorita: {project.priority}</span>
                        <span>Termín: {project.delivery_date ? new Date(project.delivery_date).toLocaleDateString() : 'N/A'}</span>
                        {priorityDates && (
                          <span className="text-blue-600 dark:text-blue-400">
                            Priority termín: Od {priorityDates.priorityStartDate.toLocaleDateString()} Do {priorityDates.priorityEndDate.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="max-w-4xl mx-auto">
                      <ProjectProgressChart 
                        project={project} 
                        deliveryInfo={deliveryInfo}
                        priorityDates={priorityDates}
                        className="h-48"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </>
  );
} 