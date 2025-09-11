export interface VacationRange {
  start: string; // ISO date (YYYY-MM-DD)
  end: string;   // ISO date (YYYY-MM-DD)
  note?: string;
}

export interface TeamMember {
  id: string;
  scopeId: string; // Scope ID for database operations
  name: string;
  role: string;
  fte: number;
  mdRate?: number; // Prodejní MD Rate (co se prodává klientu)
  costMdRate?: number; // Nákladový MD Rate (reálné náklady včetně osobních financí)
  vacations?: VacationRange[]; // optional UI-level metadata (persisted in localStorage)
  timesheets?: TimesheetEntry[]; // optional: stored per member as JSON
  createdAt: Date; // Creation date
}

// Dynamické typy pro role
export interface ScopeRole {
  id: string;
  scope_id: string;
  key: string;
  label: string;
  color: string;
  translation_key: string;
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// Timesheet entry stored per team member as JSON
export interface TimesheetEntry {
  date: string; // ISO YYYY-MM-DD
  project?: string;
  role?: string;
  hours: number;
  note?: string;
  externalId?: string;
}

import { User } from "@/lib/domain/models/user.model";

export interface Project {
  id: string;
  name: string;
  priority: number;
  delivery_date: string | null;
  created_at: string;
  startedAt?: string | null;
  start_day?: string | null; // Vlastní startovní den projektu pro souběžnou práci
  status?: 'not_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'archived' | 'suspended';
  custom_role_data?: Record<string, number> | null;
  notes?: ProjectNote[];
  integrations?: {
    jira?: {
      projectKey?: string;
      issueTypeId?: string;
      url?: string;
    }
  };
  [key: string]: string | number | null | undefined | ProjectNote[] | Record<string, number> | { [k: string]: unknown };
}

export interface ProjectNote {
  id: string;
  text: string;
  author: User;
  createdAt: string;
  updatedAt: string;
}

// Dynamický ProjectProgress interface
export interface ProjectProgress {
  id?: string;
  project_id: string;
  date: string;
  // Dynamické role data - klíče budou generovány z scope_roles
  [key: string]: string | number | null | undefined; // Pro role sloupce jako fe_done, be_mandays, atd.
}

export interface ProjectDeliveryInfo {
  calculatedDeliveryDate: Date;
  diffWorkdays: number | null;
  deliveryDate: Date | null;
}

// Odstraněno: ROLES constant - nyní se načítá dynamicky z databáze 