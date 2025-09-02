import { User } from "./user.model";

// Note type for notes fetched from ProjectNoteService
export interface ProjectNote {
  id: string;
  text: string;
  author: User;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  scopeId: string;
  name: string;
  priority: number;
  feMandays?: number;
  beMandays?: number;
  qaMandays?: number;
  pmMandays?: number;
  dplMandays?: number;
  feDone: number;
  beDone: number;
  qaDone: number;
  pmDone: number;
  dplDone: number;
  deliveryDate?: Date;
  createdAt: Date;
  startedAt?: Date;
  startDay?: Date; // Vlastní startovní den projektu pro souběžnou práci
  customRoleData?: Record<string, number>;
  notes?: ProjectNote[];
  status?: 'not_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'archived' | 'suspended';
}