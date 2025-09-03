/**
 * Billing Section Component
 * - Modern billing overview with glass-like design
 * - Project cost calculations based on MD rates and progress
 * - Team member rate management
 * - Invoice generation capabilities
 * - Responsive design with animations
 */

import React, { useState, useMemo, useEffect } from "react";
import { TeamMember, Project } from "./types";
import { useTranslation } from "@/lib/translation";
import { useToastFunctions } from '@/app/components/ui/Toast';
import { ScopeSettingsService } from "@/app/services/scopeSettingsService";
import { getDefaultCurrencyForLocation, getAvailableCurrenciesForLocation, convertCurrency } from "@/app/utils/currencyUtils";
import { TimesheetService } from "@/lib/domain/services/timesheet-service";
import { 
  FiDollarSign, 
  FiFileText, 
  FiTrendingUp,
  FiUsers,
  FiCreditCard
} from "react-icons/fi";

interface BillingSectionProps {
  scopeId: string;
  team: TeamMember[];
  projects: Project[];
  readOnlyMode?: boolean;
}

interface ProjectCost {
  projectId: string;
  projectName: string;
  estimatedCost: number;      // Odhadované náklady (role-based × průměrný MD Rate)
  actualCost: number;         // Reálné náklady (podle výkazů práce)
  progress: number;           // Procento dokončení
  remainingCost: number;      // Zbývající rozpočet
  teamMembers: Array<{
    memberId: string;
    memberName: string;
    role: string;
    mdRate: number;
    estimatedAllocation: number;  // Odhadované mandays pro roli
    actualAllocation: number;     // Skutečně odpracované hodiny
    estimatedCost: number;        // Odhadované náklady
    actualCost: number;           // Skutečné náklady
  }>;
}

export function BillingSection({ 
  scopeId,
  team, 
  projects, 
  readOnlyMode = false
}: BillingSectionProps) {
  const { t } = useTranslation();
  const { success, error } = useToastFunctions();
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | 'monthly' | 'quarterly'>('current');
  const [selectedCurrency, setSelectedCurrency] = useState<'CZK' | 'EUR' | 'USD'>('CZK');
  const [selectedExportFormat, setSelectedExportFormat] = useState<'JSON' | 'CSV' | ''>('');
  const [locationInfo, setLocationInfo] = useState<{ country: string; subdivision: string | null }>({ country: 'CZ', subdivision: null });
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(['CZK', 'EUR', 'USD']);
  const [timesheetData, setTimesheetData] = useState<import('@/lib/domain/models/timesheet').TimesheetEntry[]>([]);
  const [loadingTimesheets, setLoadingTimesheets] = useState(false);

  // Load timesheet data for real cost calculations
  useEffect(() => {
    const loadTimesheetData = async () => {
      setLoadingTimesheets(true);
      try {
        const timesheetService = new TimesheetService();
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        
        const data = await timesheetService.getTimesheetsByScope(scopeId, startOfYear, now);
        setTimesheetData(data);
      } catch (err) {
        console.error('Failed to load timesheet data:', err);
      } finally {
        setLoadingTimesheets(false);
      }
    };
    
    loadTimesheetData();
  }, [scopeId]);

  // Load location from scope settings and set default currency
  useEffect(() => {
    const loadLocationAndCurrency = async () => {
      try {
        const settings = await ScopeSettingsService.get(scopeId);
        if (settings?.calendar) {
          const country = settings.calendar.country || 'CZ';
          const subdivision = settings.calendar.subdivision || null;
          
          setLocationInfo({ country, subdivision });
          
          // Nastav default měnu podle lokace
          const defaultCurrency = getDefaultCurrencyForLocation(country, subdivision);
          setSelectedCurrency(defaultCurrency.code as 'CZK' | 'EUR' | 'USD');
          
          // Nastav dostupné měny pro danou lokaci
          const currencies = getAvailableCurrenciesForLocation(country);
          setAvailableCurrencies(currencies);
        }
      } catch (err) {
        console.error('Failed to load location settings:', err);
        // Fallback na CZ
        setLocationInfo({ country: 'CZ', subdivision: null });
        setSelectedCurrency('CZK');
        setAvailableCurrencies(['CZK', 'EUR', 'USD']);
      }
    };
    
    loadLocationAndCurrency();
  }, [scopeId]);

  // Calculate project costs based on team assignments and MD rates
  const projectCosts = useMemo((): ProjectCost[] => {
    return projects.map(project => {
      // Group team members by role to calculate average MD rates
      const roleGroups = team.reduce((groups, member) => {
        if (!groups[member.role]) {
          groups[member.role] = [];
        }
        groups[member.role].push(member);
        return groups;
      }, {} as Record<string, typeof team>);

      // Calculate estimated costs per role (not per member)
      const roleCosts = Object.entries(roleGroups)
        .filter(([role]) => {
          // Zobrazuj jen role, které mají nějaké mandays na projektu
          const roleKey = role.toLowerCase().replace(/\s+/g, '');
          const mandaysKey = `${roleKey}_mandays`;
          const estimatedMandays = Number(project[mandaysKey] || 0);
          return estimatedMandays > 0; // Filtruj jen role s mandays > 0
        })
        .map(([role, members]) => {
          // Get role-specific data for this project
          const roleKey = role.toLowerCase().replace(/\s+/g, '');
          const mandaysKey = `${roleKey}_mandays`;
          
          const estimatedMandays = Number(project[mandaysKey] || 0);
          
          // Calculate average MD rate for this role
          const totalMdRate = members.reduce((sum, m) => sum + (m.mdRate || 0), 0);
          const avgMdRate = members.length > 0 ? totalMdRate / members.length : 0;
          
          // Estimated cost based on role mandays and average MD rate (ONCE per role, not per member)
          const estimatedCost = estimatedMandays * avgMdRate;
          
          return {
            role,
            estimatedCost,
            estimatedMandays,
            avgMdRate,
            members
          };
        });

      // Calculate total estimated cost for the project (sum of role costs, not member costs)
      const totalEstimatedCost = roleCosts.reduce((sum, roleCost) => sum + roleCost.estimatedCost, 0);

      // Now create team member details for display
      const projectTeamMembers = roleCosts.flatMap(roleCost => {
        const { role, estimatedCost, estimatedMandays, avgMdRate, members } = roleCost;
        
        // Get actual hours from timesheets for each member
        const projectTimesheets = timesheetData.filter(ts => 
          ts.projectId === project.id && ts.role === role
        );
        
        // Calculate actual costs for each member based on their individual MD rates and actual hours
        return members.map(member => {
          // Get member's actual hours from timesheets
          const memberTimesheets = projectTimesheets.filter(ts => ts.memberId === member.id);
          const memberActualHours = memberTimesheets.reduce((sum, ts) => sum + ts.hours, 0);
          const memberActualMandays = memberActualHours / 8;
          
          // Calculate individual estimated cost for this member based on their MD rate and role allocation
          // Distribute mandays equally among team members with the same role
          const memberEstimatedMandays = estimatedMandays / members.length;
          const memberEstimatedCost = memberEstimatedMandays * (member.mdRate || 0);
          
          return {
            memberId: member.id,
            memberName: member.name,
            role: member.role,
            mdRate: member.mdRate || 0,
            estimatedAllocation: memberEstimatedMandays, // Individual mandays allocation
            actualAllocation: memberActualMandays,
            estimatedCost: memberEstimatedCost, // Individual cost for this member
            actualCost: memberActualMandays * (member.mdRate || 0)
          };
        });
      });

      const estimatedCost = totalEstimatedCost;
      const actualCost = projectTeamMembers.reduce((sum, member) => sum + member.actualCost, 0);
      
      // Calculate overall project progress based on COSTS, not mandays
      // This ensures consistency between progress % and actual vs estimated costs
      const progress = estimatedCost > 0 ? (actualCost / estimatedCost) * 100 : 0;
      
      // Apply period filtering
      let periodActualCost = actualCost;
      let periodEstimatedCost = estimatedCost;
      
      if (selectedPeriod === 'monthly') {
        // Monthly view - show 1/12 of costs
        periodActualCost = actualCost / 12;
        periodEstimatedCost = estimatedCost / 12;
      } else if (selectedPeriod === 'quarterly') {
        // Quarterly view - show 1/4 of costs
        periodActualCost = actualCost / 4;
        periodEstimatedCost = estimatedCost / 4;
      }
      // 'current' shows full costs

      const remainingCost = periodEstimatedCost - periodActualCost;

      return {
        projectId: project.id,
        projectName: project.name,
        estimatedCost: periodEstimatedCost,
        actualCost: periodActualCost,
        progress,
        remainingCost,
        teamMembers: projectTeamMembers
      };
    });
  }, [projects, team, selectedPeriod, timesheetData]);

  const totalStats = useMemo(() => {
    const totalEstimated = projectCosts.reduce((sum, p) => sum + p.estimatedCost, 0);
    const totalActual = projectCosts.reduce((sum, p) => sum + p.actualCost, 0);
    const totalRemaining = projectCosts.reduce((sum, p) => sum + p.remainingCost, 0);
    
    // Calculate overall progress based on costs, not individual project progress
    const overallProgress = totalEstimated > 0 ? (totalActual / totalEstimated) * 100 : 0;

    return {
      totalEstimated,
      totalActual,
      totalRemaining,
      avgProgress: overallProgress, // Use overall cost-based progress
      budgetUtilization: totalEstimated > 0 ? (totalActual / totalEstimated) * 100 : 0
    };
  }, [projectCosts]);

  const formatCurrency = (amount: number) => {
    // Převedeme částku do vybrané měny, pokud není v CZK
    const convertedAmount = selectedCurrency === 'CZK' ? amount : convertCurrency(amount, 'CZK', selectedCurrency);
    
    const formatter = new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: selectedCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    return formatter.format(convertedAmount);
  };

  

  const handleGenerateInvoice = (projectId?: string) => {
    if (!selectedExportFormat) {
      error('Vyber formát', 'Prosím vyber formát pro export dat.');
      return;
    }
    
    if (projectId) {
      // Generate invoice for specific project
      const project = projectCosts.find(p => p.projectId === projectId);
      if (project) {
        const invoiceData = {
          projectName: project.projectName,
          period: selectedPeriod,
          currency: selectedCurrency,
          estimatedCost: project.estimatedCost,
          actualCost: project.actualCost,
          remainingCost: project.remainingCost,
          progress: project.progress,
          teamMembers: project.teamMembers,
          generatedAt: new Date().toISOString()
        };
        
        // Generate based on selected format
        if (selectedExportFormat === 'JSON') {
          const blob = new Blob([JSON.stringify(invoiceData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `invoice-${project.projectName}-${selectedPeriod}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else if (selectedExportFormat === 'CSV') {
          const csvData = [
            ['Project Name', 'Period', 'Currency', 'Estimated Cost', 'Actual Cost', 'Remaining Budget', 'Progress %'],
            [project.projectName, selectedPeriod, selectedCurrency, project.estimatedCost.toString(), project.actualCost.toString(), project.remainingCost.toString(), project.progress.toFixed(1)]
          ];
          const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `invoice-${project.projectName}-${selectedPeriod}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        
        success('Data vygenerována', `Data pro projekt ${project.projectName} byla úspěšně vygenerována ve formátu ${selectedExportFormat}.`);
      }
    } else {
      // Generate invoice for all projects
      const invoiceData = {
        period: selectedPeriod,
        currency: selectedCurrency,
        totalEstimated: totalStats.totalEstimated,
        totalActual: totalStats.totalActual,
        totalRemaining: totalStats.totalRemaining,
        avgProgress: totalStats.avgProgress,
        projects: projectCosts,
        generatedAt: new Date().toISOString()
      };
      
      // Generate based on selected format
      if (selectedExportFormat === 'JSON') {
        const blob = new Blob([JSON.stringify(invoiceData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-all-projects-${selectedPeriod}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (selectedExportFormat === 'CSV') {
        const csvData = [
          ['Project Name', 'Period', 'Currency', 'Estimated Cost', 'Actual Cost', 'Remaining Budget', 'Progress %'],
          ...projectCosts.map(project => [
            project.projectName,
            selectedPeriod,
            selectedCurrency,
            project.estimatedCost.toString(),
            project.actualCost.toString(),
            project.remainingCost.toString(),
            project.progress.toFixed(1)
          ])
        ];
        const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-all-projects-${selectedPeriod}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      success('Data vygenerována', `Data pro všechny projekty byla úspěšně vygenerována ve formátu ${selectedExportFormat}.`);
    }
  };



  // Check if billing is configured (at least some team members have MD rates)
  const billingConfigured = team.some(member => member.mdRate && member.mdRate > 0);

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-8 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-blue-500/5 to-purple-500/5 rounded-2xl"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-2xl"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6 flex-col md:flex-row gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <h2 className="text-2xl font-bold dark:text-white text-gray-900">
                  <FiDollarSign className="inline mr-2" /> {t("billingOverview")}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 px-3 py-1 rounded-full backdrop-blur-sm">
                <span>{t("billingDescription")}</span>
                {locationInfo.country !== 'CZ' && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    • Lokace: {locationInfo.country}{locationInfo.subdivision ? `/${locationInfo.subdivision}` : ''}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-col md:flex-row">
              {/* Currency Selector */}
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value as 'CZK' | 'EUR' | 'USD')}
                className="bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all duration-200"
              >
                {availableCurrencies.map(currency => (
                  <option key={currency} value={currency}>
                    {currency === 'CZK' ? t("czk") : 
                     currency === 'EUR' ? t("eur") : 
                     currency === 'USD' ? t("usd") : 
                     currency === 'GBP' ? 'GBP (£)' :
                     currency === 'PLN' ? 'PLN (zł)' :
                     currency === 'HUF' ? 'HUF (Ft)' :
                     currency === 'SEK' ? 'SEK (kr)' :
                     currency === 'NOK' ? 'NOK (kr)' :
                     currency === 'DKK' ? 'DKK (kr)' :
                     currency === 'CAD' ? 'CAD (C$)' : currency}
                  </option>
                ))}
              </select>

              {/* Period Selector */}
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as 'current' | 'monthly' | 'quarterly')}
                className="bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all duration-200"
              >
                <option value="current">Celkový přehled</option>
                <option value="monthly">Měsíční náklady</option>
                <option value="quarterly">Čtvrtletní náklady</option>
              </select>



              {!readOnlyMode && billingConfigured && (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.preventDefault(); handleGenerateInvoice(); }}
                      disabled={!selectedExportFormat}
                      className="relative group bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white px-6 py-2 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <FiFileText className="w-4 h-4" />
                        {t("generateInvoice")}
                      </span>
                    </button>

                    <select
                      value={selectedExportFormat}
                      onChange={(e) => setSelectedExportFormat(e.target.value as 'JSON' | 'CSV')}
                      className="bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all duration-200 text-sm"
                    >
                      <option value="">Vyber formát</option>
                      <option value="JSON">JSON</option>
                      <option value="CSV">CSV</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {!billingConfigured ? (
            <div className="text-center py-16">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full blur-xl opacity-20"></div>
                <div className="relative text-8xl flex items-center justify-center">
                  <FiCreditCard />
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-xl font-medium mb-2">
                {t("billingNotConfigured")}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t("configureBilling")}
              </p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {/* Timesheet Loading Indicator */}
                {loadingTimesheets && (
                  <div className="col-span-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="text-blue-800 dark:text-blue-200 text-sm font-medium">
                        Načítání skutečných nákladů z timesheetů...
                      </span>
                    </div>
                  </div>
                )}
                <div className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/10">
                  <div className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center">
                        <FiTrendingUp className="text-white text-xl" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {t("estimatedCost")}
                        </p>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(totalStats.totalEstimated)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10">
                  <div className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                        <FiDollarSign className="text-white text-xl" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {t("actualCost")}
                        </p>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(totalStats.totalActual)}
                        </div>
                        {timesheetData.length > 0 && (
                          <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                            📊 Ze timesheetů
                          </div>
                        )}
                        {timesheetData.length === 0 && !loadingTimesheets && (
                          <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                            ⚠️ Pouze odhady
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10">
                  <div className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                        <FiTrendingUp className="text-white text-xl" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {t("remainingBudget")}
                        </p>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(totalStats.totalRemaining)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-orange-500/10">
                  <div className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                        <FiUsers className="text-white text-xl" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {t("budgetUtilization")}
                        </p>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {totalStats.budgetUtilization.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Project Costs */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FiFileText className="w-5 h-5" />
                  {t("projectCosts")}
                </h3>

                {projectCosts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
                      {t("noBillingData")}
                    </p>
                  </div>
                ) : (
                  projectCosts.map((project) => (
                    <div
                      key={project.projectId}
                      className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-xl"
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {project.projectName}
                          </h4>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {project.progress.toFixed(1)}% {t("done")}
                            </span>
                            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(project.estimatedCost)}
                            </div>
                            {!readOnlyMode && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => { e.preventDefault(); handleGenerateInvoice(project.projectId); }}
                                  disabled={!selectedExportFormat}
                                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <FiFileText className="w-3 h-3" />
                                  {t("generateInvoice")}
                                </button>
                                <select
                                  value={selectedExportFormat}
                                  onChange={(e) => setSelectedExportFormat(e.target.value as 'JSON' | 'CSV' | '')}
                                  className="bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all duration-200 text-xs"
                                >
                                  <option value="">Formát</option>
                                  <option value="JSON">JSON</option>
                                  <option value="CSV">CSV</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t("estimatedCost")}</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                              {formatCurrency(project.estimatedCost)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t("actualCost")}</p>
                            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                              {formatCurrency(project.actualCost)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t("remainingBudget")}</p>
                            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                              {formatCurrency(project.remainingCost)}
                            </p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                          <div 
                            className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(project.progress, 100)}%` }}
                          />
                        </div>

                        {/* Team member breakdown */}
                        {project.teamMembers.length > 0 && (
                          <div className="mt-4">
                            <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                              <FiUsers className="w-4 h-4" />
                              {t("teamCosts")}
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {project.teamMembers.map((member) => (
                                <div 
                                  key={member.memberId}
                                  className="bg-white/50 dark:bg-gray-600/50 rounded-lg p-3 text-sm"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {member.memberName}
                                    </span>
                                    <span className="text-gray-600 dark:text-gray-400">
                                      {member.role}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-gray-600 dark:text-gray-400">
                                      {member.estimatedAllocation.toFixed(1)} MD × {formatCurrency(member.mdRate)}
                                    </span>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                      {formatCurrency(member.estimatedCost)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between mt-1 text-xs">
                                    <span className="text-gray-500 dark:text-gray-400">
                                      Skutečné: {member.actualAllocation.toFixed(1)} MD
                                    </span>
                                    <span className="font-medium text-blue-600 dark:text-blue-400">
                                      {formatCurrency(member.actualCost)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
