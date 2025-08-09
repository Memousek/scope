export interface TeamMember {
  id: string;
  name: string;
  role: string;
  fte: number;
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

import { User } from "@/lib/domain/models/user.model";

export interface Project {
  id: string;
  name: string;
  priority: number;
  delivery_date: string | null;
  created_at: string;
  startedAt?: string | null;
  status?: 'not_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'archived' | 'suspended';
  custom_role_data?: Record<string, number> | null;
  notes?: ProjectNote[];
}

export interface ProjectNote {
  id?: string;
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