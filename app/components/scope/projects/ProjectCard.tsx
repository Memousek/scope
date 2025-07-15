/**
 * ProjectCard component for displaying individual project information
 * Extracted from ProjectSection for better component separation
 */

import { Project, TeamMember } from '../types';
import { calculateProjectDeliveryInfo, formatDate } from '@/app/utils/dateUtils';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, History } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  team: TeamMember[];
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
  onViewHistory: (project: Project) => void;
  hasFE: boolean;
  hasBE: boolean;
  hasQA: boolean;
  hasPM: boolean;
  hasDPL: boolean;
  readOnly?: boolean;
}

export function ProjectCard({
  project,
  team,
  onEdit,
  onDelete,
  onViewHistory,
  hasFE,
  hasBE,
  hasQA,
  hasPM,
  hasDPL,
  readOnly = false,
}: ProjectCardProps) {
  const deliveryInfo = calculateProjectDeliveryInfo(project, team);
  
  const projectRoles = [
    { key: 'fe', label: 'FE', mandays: 'fe_mandays', done: 'fe_done', color: '#2563eb', hasRole: hasFE },
    { key: 'be', label: 'BE', mandays: 'be_mandays', done: 'be_done', color: '#059669', hasRole: hasBE },
    { key: 'qa', label: 'QA', mandays: 'qa_mandays', done: 'qa_done', color: '#f59e42', hasRole: hasQA },
    { key: 'pm', label: 'PM', mandays: 'pm_mandays', done: 'pm_done', color: '#a21caf', hasRole: hasPM },
    { key: 'dpl', label: 'DPL', mandays: 'dpl_mandays', done: 'dpl_done', color: '#e11d48', hasRole: hasDPL },
  ];

  return (
    <div className="border rounded-lg p-4 mb-4 bg-white dark:bg-gray-800">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold">{project.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Priorita: {project.priority}
          </p>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewHistory(project)}
              title="Historie"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(project)}
              title="Upravit"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(project.id)}
              title="Smazat"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Progress bars for each role */}
      <div className="space-y-2 mb-4">
        {projectRoles.map(({ key, label, mandays, done, color, hasRole }) => {
          if (!hasRole) return null;
          
          const mandaysValue = project[mandays as keyof Project] as number;
          const doneValue = project[done as keyof Project] as number;
          
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-sm font-medium w-8">{label}:</span>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(doneValue, 100)}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400 w-24 text-right">
                {mandaysValue ? `${Math.round(doneValue)} % z ${mandaysValue} MD's` : `0 MD's z 0 MD's`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Delivery information */}
      <div className="border-t pt-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Vypočítaný termín:</span>
            <br />
            <span className="text-gray-600 dark:text-gray-400">
              {formatDate(deliveryInfo.calculatedDeliveryDate)}
            </span>
          </div>
          {deliveryInfo.deliveryDate && (
            <div>
              <span className="font-medium">Plánovaný termín:</span>
              <br />
              <span className="text-gray-600 dark:text-gray-400">
                {formatDate(deliveryInfo.deliveryDate)}
              </span>
            </div>
          )}
        </div>
        
        {deliveryInfo.slip !== null && (
          <div className="mt-2">
            <span className={`font-medium ${
              deliveryInfo.slip > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              Skluz: {deliveryInfo.slip > 0 ? '+' : ''}{deliveryInfo.slip} pracovních dnů
            </span>
          </div>
        )}
      </div>
    </div>
  );
} 