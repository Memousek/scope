/**
 * Repository interface for domain plan assignment operations
 * Defines the contract for domain plan assignment data access
 */

export interface DomainPlanAssignment {
  id?: string;
  domain: string;
  plan_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateDomainPlanAssignmentData {
  domain: string;
  plan_id: string;
}

export interface UpdateDomainPlanAssignmentData {
  plan_id: string;
}

export abstract class DomainPlanAssignmentRepository {
  abstract findAll(): Promise<DomainPlanAssignment[]>;
  abstract findByDomain(domain: string): Promise<DomainPlanAssignment | null>;
  abstract create(data: CreateDomainPlanAssignmentData): Promise<DomainPlanAssignment>;
  abstract update(domain: string, data: UpdateDomainPlanAssignmentData): Promise<DomainPlanAssignment>;
  abstract delete(domain: string): Promise<void>;
  abstract upsert(data: CreateDomainPlanAssignmentData): Promise<DomainPlanAssignment>;
}
