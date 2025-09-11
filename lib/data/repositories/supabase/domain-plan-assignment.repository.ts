/**
 * Supabase Domain Plan Assignment Repository Implementation
 * Handles all domain plan assignment database operations with proper error handling
 */

import { createClient } from '@/lib/supabase/client';
import { 
  DomainPlanAssignmentRepository, 
  DomainPlanAssignment, 
  CreateDomainPlanAssignmentData, 
  UpdateDomainPlanAssignmentData 
} from '@/lib/domain/repositories/domain-plan-assignment.repository';

export class SupabaseDomainPlanAssignmentRepository implements DomainPlanAssignmentRepository {
  async findAll(): Promise<DomainPlanAssignment[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('domain_plan_assignments')
      .select('*')
      .order('domain');

    if (error) {
      console.error('Error fetching domain plan assignments:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to fetch domain plan assignments: ${errorMessage}`);
    }

    return data || [];
  }

  async findByDomain(domain: string): Promise<DomainPlanAssignment | null> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('domain_plan_assignments')
      .select('*')
      .eq('domain', domain.toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching domain plan assignment:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to fetch domain plan assignment: ${errorMessage}`);
    }

    return data;
  }

  async create(data: CreateDomainPlanAssignmentData): Promise<DomainPlanAssignment> {
    const supabase = createClient();
    
    const { data: assignment, error } = await supabase
      .from('domain_plan_assignments')
      .insert({
        domain: data.domain.toLowerCase(),
        plan_id: data.plan_id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating domain plan assignment:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to create domain plan assignment: ${errorMessage}`);
    }

    return assignment;
  }

  async update(domain: string, data: UpdateDomainPlanAssignmentData): Promise<DomainPlanAssignment> {
    const supabase = createClient();
    
    const { data: assignment, error } = await supabase
      .from('domain_plan_assignments')
      .update({ plan_id: data.plan_id })
      .eq('domain', domain.toLowerCase())
      .select()
      .single();

    if (error) {
      console.error('Error updating domain plan assignment:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to update domain plan assignment: ${errorMessage}`);
    }

    return assignment;
  }

  async delete(domain: string): Promise<void> {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('domain_plan_assignments')
      .delete()
      .eq('domain', domain.toLowerCase());

    if (error) {
      console.error('Error deleting domain plan assignment:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to delete domain plan assignment: ${errorMessage}`);
    }
  }

  async upsert(data: CreateDomainPlanAssignmentData): Promise<DomainPlanAssignment> {
    const supabase = createClient();
    
    const { data: assignment, error } = await supabase
      .from('domain_plan_assignments')
      .upsert(
        { domain: data.domain.toLowerCase(), plan_id: data.plan_id },
        { onConflict: 'domain' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting domain plan assignment:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to upsert domain plan assignment: ${errorMessage}`);
    }

    return assignment;
  }
}
