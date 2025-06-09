export interface TeamMember {
  id: string;
  name: string;
  role: string;
  fte: number;
}

export interface Project {
  id: string;
  name: string;
  priority: number;
  fe_mandays: number | null;
  be_mandays: number | null;
  qa_mandays: number | null;
  pm_mandays: number | null;
  dpl_mandays: number | null;
  fe_done: number;
  be_done: number;
  qa_done: number;
  pm_done: number;
  dpl_done: number;
  delivery_date: string | null;
  created_at: string;
  slip?: number | null;
}

export interface ProjectProgress {
  id?: string;
  project_id: string;
  date: string;
  fe_done?: number;
  be_done?: number;
  qa_done?: number;
  pm_done?: number;
  dpl_done?: number;
  fe_mandays?: number;
  be_mandays?: number;
  qa_mandays?: number;
  pm_mandays?: number;
  dpl_mandays?: number;
}

export interface ProjectDeliveryInfo {
  calculatedDeliveryDate: Date;
  slip: number | null;
  diffWorkdays: number | null;
  deliveryDate: Date | null;
}

export const ROLES = [
  { value: 'FE', label: 'FE' },
  { value: 'QA', label: 'QA' },
  { value: 'BE', label: 'BE' },
  { value: 'PM', label: 'PM' },
  { value: 'DPL', label: 'DPL' },
] as const; 