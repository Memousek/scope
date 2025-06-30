/**
 * ProjectList component for displaying list of projects
 * Extracted from ProjectSection for better component separation
 */

import { Project, TeamMember } from '../types';
import { ProjectCard } from './ProjectCard';
import { calculatePriorityDates, formatDate } from '@/app/utils/dateUtils';

interface ProjectListProps {
  projects: Project[];
  team: TeamMember[];
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
  onViewHistory: (project: Project) => void;
  hasFE: boolean;
  hasBE: boolean;
  hasQA: boolean;
  hasPM: boolean;
  hasDPL: boolean;
}

export function ProjectList({
  projects,
  team,
  onEdit,
  onDelete,
  onViewHistory,
  hasFE,
  hasBE,
  hasQA,
  hasPM,
  hasDPL,
}: ProjectListProps) {
  const priorityDates = calculatePriorityDates(projects, team);

  if (projects.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>Žádné projekty nebyly nalezeny.</p>
        <p className="text-sm">Přidejte první projekt pomocí tlačítka výše.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => {
        const priorityInfo = priorityDates[project.id];
        
        return (
          <div key={project.id}>
            <ProjectCard
              project={project}
              team={team}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewHistory={onViewHistory}
              hasFE={hasFE}
              hasBE={hasBE}
              hasQA={hasQA}
              hasPM={hasPM}
              hasDPL={hasDPL}
            />
            
            {/* Priority timeline information */}
            {priorityInfo && (
              <div className="ml-4 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                <div className="text-sm">
                  <div className="font-medium text-blue-800 dark:text-blue-200">
                    Harmonogram dle priority:
                  </div>
                  <div className="text-blue-600 dark:text-blue-300">
                    Začátek: {formatDate(priorityInfo.priorityStartDate)} | 
                    Konec: {formatDate(priorityInfo.priorityEndDate)}
                  </div>
                  {priorityInfo.blockingProjectName && (
                    <div className="text-blue-600 dark:text-blue-300 text-xs mt-1">
                      Blokuje: {priorityInfo.blockingProjectName}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
} 