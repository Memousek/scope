/**
 * Plan model representing subscription plans in the application
 * Contains plan information, pricing, and feature limits
 */

export interface Plan {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  priceMonthly?: number;
  priceYearly?: number;
  features: string[];
  maxProjects: number;
  maxTeamMembers: number;
  maxScopes: number;
  hasExport: boolean;
  hasApiAccess: boolean;
  hasAdvancedAnalytics: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanFeature {
  name: string;
  description: string;
  isAvailable: boolean;
}

export interface PlanComparison {
  plan: Plan;
  features: PlanFeature[];
  isCurrentPlan: boolean;
  isRecommended: boolean;
}
