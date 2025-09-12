/**
 * Allocation Calculation Service
 * Komplexní výpočty s podporou alokační tabulky
 */

import { injectable, inject } from 'inversify';
import { PlannedAllocationRepository, PlannedAllocationRepositorySymbol } from '../repositories/planned-allocation.repository';
import { PlannedAllocation, PlannedAllocationFilter } from '../models/planned-allocation.model';
import { TeamMember } from '../models/team-member.model';
import { Project } from '../models/project.model';
import { ScopeSettings } from '@/app/services/scopeSettingsService';

export interface AllocationCalculationResult {
  calculatedDeliveryDate: Date;
  diffWorkdays: number | null;
  deliveryDate: Date | null;
  allocationDetails: AllocationDetails;
}

export interface AllocationDetails {
  roleBreakdown: Array<{
    role: string;
    mandays: number;
    done: number;
    remainingMandays: number;
    availableFte: number;
    calculatedDays: number;
    allocationData: Array<{
      date: Date;
      fte: number;
      projectId: string | null;
    }>;
  }>;
  totalMaxDays: number;
  calculationMode: 'allocation' | 'fte' | 'hybrid';
  allocationEnabled: boolean;
}

export interface ProjectCapacityInfo {
  projectId: string;
  teamMemberId: string;
  role: string;
  availableFte: number;
  dateRange: {
    from: Date;
    to: Date;
  };
  dailyAllocations: Array<{
    date: Date;
    fte: number;
    projectId: string | null;
  }>;
}

@injectable()
export class AllocationCalculationService {
  constructor(
    @inject(PlannedAllocationRepositorySymbol) private plannedAllocationRepository: PlannedAllocationRepository
  ) {}

  /**
   * Vypočítá delivery info s podporou alokační tabulky
   */
  async calculateProjectDeliveryInfoWithAllocation(
    project: Project,
    team: TeamMember[],
    projectAssignments: Array<{ teamMemberId: string; role: string }> = [],
    settings: ScopeSettings,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<AllocationCalculationResult> {
    // Suppress unused parameter warning - this is part of the interface
    void projectAssignments;
    const allocationSettings = settings.allocation || {};
    const allocationEnabled = allocationSettings.enabled ?? false;
    const calculationMode = allocationSettings.calculationMode ?? 'fte';
    const includeExternalProjects = allocationSettings.includeExternalProjects ?? false;
    const defaultAllocationFte = allocationSettings.defaultAllocationFte ?? 1.0;

    // Získáme všechny role podle klíčů v projektu
    const roleKeys = Object.keys(project)
      .filter(key => key.endsWith('_mandays'))
      .map(key => key.replace(/_mandays$/, ''));

    const roleBreakdown: AllocationDetails['roleBreakdown'] = [];
    let totalMaxDays = 0;

    for (const roleKey of roleKeys) {
      const mandays = Number(project[`${roleKey}_mandays`]) || 0;
      const done = Number(project[`${roleKey}_done`]) || 0;
      const remainingMandays = mandays * (1 - (done / 100));

      if (remainingMandays <= 0) continue;

      // Najdeme členy týmu s touto rolí
      const teamMembersWithRole = team.filter(m => 
        m.role === roleKey.toUpperCase() || m.role === roleKey
      );

      if (teamMembersWithRole.length === 0) continue;

      let availableFte = 0;
      let allocationData: Array<{ date: Date; fte: number; projectId: string | null }> = [];

      if (allocationEnabled && calculationMode !== 'fte') {
        // Použijeme alokační tabulku
        const allocations = await this.getTeamMemberAllocations(
          teamMembersWithRole.map(m => m.id),
          roleKey,
          dateFrom,
          dateTo
        );

        // Vypočítáme dostupnou kapacitu z alokací
        const capacityInfo = this.calculateCapacityFromAllocations(
          allocations,
          project.id,
          includeExternalProjects,
          defaultAllocationFte
        );

        availableFte = capacityInfo.availableFte;
        allocationData = capacityInfo.dailyAllocations;
      } else {
        // Použijeme standardní FTE
        availableFte = teamMembersWithRole.reduce((sum, m) => sum + (m.fte || 0), 0);
      }

      // Fallback na default FTE pokud není dostupná kapacita
      if (availableFte <= 0) {
        availableFte = defaultAllocationFte;
      }

      const calculatedDays = remainingMandays / availableFte;

      roleBreakdown.push({
        role: roleKey,
        mandays,
        done,
        remainingMandays,
        availableFte,
        calculatedDays,
        allocationData
      });

      if (calculatedDays > totalMaxDays) {
        totalMaxDays = calculatedDays;
      }
    }

    const remainingWorkdays = Math.ceil(totalMaxDays);
    
    // Use project start date if available, otherwise use today
    let startDate = new Date();
    if (project.start_date) {
      startDate = new Date(project.start_date);
    } else if (dateFrom) {
      startDate = dateFrom;
    }
    
    const calculatedDeliveryDate = this.addWorkdays(startDate, remainingWorkdays);
    
    const deliveryDate = project.delivery_date ? new Date(project.delivery_date) : null;
    
    let diffWorkdays: number | null = null;
    if (deliveryDate) {
      diffWorkdays = this.getWorkdaysDiff(calculatedDeliveryDate, deliveryDate);
    }

    return {
      calculatedDeliveryDate,
      diffWorkdays,
      deliveryDate,
      allocationDetails: {
        roleBreakdown,
        totalMaxDays,
        calculationMode,
        allocationEnabled
      }
    };
  }

  /**
   * Získá alokace pro členy týmu s konkrétní rolí
   */
  private async getTeamMemberAllocations(
    teamMemberIds: string[],
    role: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<PlannedAllocation[]> {
    const filter: PlannedAllocationFilter = {
      teamMemberId: teamMemberIds[0], // Pro jednoduchost vezmeme prvního, v reálné implementaci bychom potřebovali OR logiku
      role,
      dateFrom,
      dateTo
    };

    return await this.plannedAllocationRepository.findByFilter(filter);
  }

  /**
   * Vypočítá kapacitu z alokací
   */
  private calculateCapacityFromAllocations(
    allocations: PlannedAllocation[],
    projectId: string,
    includeExternalProjects: boolean,
    defaultAllocationFte: number
  ): {
    availableFte: number;
    dailyAllocations: Array<{ date: Date; fte: number; projectId: string | null }>;
  } {
    if (allocations.length === 0) {
      return {
        availableFte: defaultAllocationFte,
        dailyAllocations: []
      };
    }

    // Filtrujeme alokace podle projektu
    const relevantAllocations = allocations.filter(allocation => {
      if (allocation.projectId === projectId) return true;
      if (includeExternalProjects && allocation.projectId === null) return true;
      return false;
    });

    // Vypočítáme průměrnou dostupnou kapacitu
    const totalFte = relevantAllocations.reduce((sum, allocation) => sum + allocation.allocationFte, 0);
    const availableFte = relevantAllocations.length > 0 ? totalFte / relevantAllocations.length : defaultAllocationFte;

    const dailyAllocations = relevantAllocations.map(allocation => ({
      date: allocation.date,
      fte: allocation.allocationFte,
      projectId: allocation.projectId
    }));

    return {
      availableFte,
      dailyAllocations
    };
  }

  /**
   * Vypočítá kapacitu týmu pro konkrétní projekt v časovém rozmezí
   */
  async calculateProjectCapacity(
    projectId: string,
    team: TeamMember[],
    dateFrom: Date,
    dateTo: Date,
    settings: ScopeSettings
  ): Promise<ProjectCapacityInfo[]> {
    const allocationSettings = settings.allocation || {};
    const allocationEnabled = allocationSettings.enabled ?? false;
    const includeExternalProjects = allocationSettings.includeExternalProjects ?? false;

    const capacityInfo: ProjectCapacityInfo[] = [];

    for (const member of team) {
      if (allocationEnabled) {
        // Použijeme alokační tabulku
        const allocations = await this.plannedAllocationRepository.findByFilter({
          teamMemberId: member.id,
          projectId,
          dateFrom,
          dateTo
        });

        const relevantAllocations = allocations.filter(allocation => {
          if (allocation.projectId === projectId) return true;
          if (includeExternalProjects && allocation.projectId === null) return true;
          return false;
        });

        const availableFte = relevantAllocations.length > 0 
          ? relevantAllocations.reduce((sum, a) => sum + a.allocationFte, 0) / relevantAllocations.length
          : member.fte || 1.0;

        capacityInfo.push({
          projectId,
          teamMemberId: member.id,
          role: member.role,
          availableFte,
          dateRange: { from: dateFrom, to: dateTo },
          dailyAllocations: relevantAllocations.map(a => ({
            date: a.date,
            fte: a.allocationFte,
            projectId: a.projectId
          }))
        });
      } else {
        // Použijeme standardní FTE
        capacityInfo.push({
          projectId,
          teamMemberId: member.id,
          role: member.role,
          availableFte: member.fte || 1.0,
          dateRange: { from: dateFrom, to: dateTo },
          dailyAllocations: []
        });
      }
    }

    return capacityInfo;
  }

  /**
   * Vypočítá celkovou kapacitu týmu s ohledem na alokace
   */
  async calculateTeamCapacity(
    scopeId: string,
    team: TeamMember[],
    dateFrom: Date,
    dateTo: Date,
    settings: ScopeSettings
  ): Promise<{
    totalCapacity: number;
    memberBreakdown: Array<{
      memberId: string;
      memberName: string;
      role: string;
      baseFte: number;
      allocatedFte: number;
      availableFte: number;
    }>;
  }> {
    const allocationSettings = settings.allocation || {};
    const allocationEnabled = allocationSettings.enabled ?? false;

    const memberBreakdown = [];

    for (const member of team) {
      let allocatedFte = member.fte || 1.0;
      let availableFte = member.fte || 1.0;

      if (allocationEnabled) {
        // Získáme všechny alokace pro člena týmu v daném období
        const allocations = await this.plannedAllocationRepository.findByFilter({
          scopeId,
          teamMemberId: member.id,
          dateFrom,
          dateTo
        });

        if (allocations.length > 0) {
          // Vypočítáme průměrnou alokovanou kapacitu
          allocatedFte = allocations.reduce((sum, a) => sum + a.allocationFte, 0) / allocations.length;
          availableFte = allocatedFte;
        }
      }

      memberBreakdown.push({
        memberId: member.id,
        memberName: member.name,
        role: member.role,
        baseFte: member.fte || 1.0,
        allocatedFte,
        availableFte
      });
    }

    const totalCapacity = memberBreakdown.reduce((sum, member) => sum + member.availableFte, 0);

    return {
      totalCapacity,
      memberBreakdown
    };
  }

  /**
   * Pomocné funkce pro práci s daty
   */
  private addWorkdays(startDate: Date, workdays: number): Date {
    const result = new Date(startDate);
    let addedDays = 0;
    
    while (addedDays < workdays) {
      result.setDate(result.getDate() + 1);
      // Předpokládáme, že víkendy jsou so-ne (0,6)
      if (result.getDay() !== 0 && result.getDay() !== 6) {
        addedDays++;
      }
    }
    
    return result;
  }

  private getWorkdaysDiff(date1: Date, date2: Date): number {
    const start = date1 < date2 ? date1 : date2;
    const end = date1 < date2 ? date2 : date1;
    
    let workdays = 0;
    const current = new Date(start);
    
    while (current < end) {
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        workdays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return date1 < date2 ? workdays : -workdays;
  }
}
