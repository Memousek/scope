/**
 * PM Document Repository
 * - Handles database operations for PM documents
 * - Implements CRUD operations with proper error handling
 */

import { injectable } from 'inversify';
import { createClient } from '@/lib/supabase/client';
import { PmDocument, CreatePmDocumentRequest, UpdatePmDocumentRequest } from '@/lib/domain/models/pm-document.model';

@injectable()
export class PmDocumentRepository {
  private supabase = createClient();

  /**
   * Find PM document by ID
   */
  async findById(id: string): Promise<PmDocument | null> {
    try {
      const { data, error } = await this.supabase
        .from('pm_documents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data ? this.mapToModel(data) : null;
    } catch (error) {
      console.error('Error finding PM document by ID:', error);
      return null;
    }
  }

  /**
   * Find PM documents by scope ID
   */
  async findByScopeId(scopeId: string): Promise<PmDocument[]> {
    try {
      const { data, error } = await this.supabase
        .from('pm_documents')
        .select('*')
        .eq('scope_id', scopeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ? data.map(this.mapToModel) : [];
    } catch (error) {
      console.error('Error finding PM documents by scope ID:', error);
      return [];
    }
  }

  /**
   * Find PM documents by project ID
   */
  async findByProjectId(projectId: string): Promise<PmDocument[]> {
    try {
      const { data, error } = await this.supabase
        .from('pm_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ? data.map(this.mapToModel) : [];
    } catch (error) {
      console.error('Error finding PM documents by project ID:', error);
      return [];
    }
  }

  /**
   * Create new PM document
   */
  async create(request: CreatePmDocumentRequest): Promise<PmDocument | null> {
    try {
      const { data, error } = await this.supabase
        .from('pm_documents')
        .insert({
          name: request.name,
          description: request.description,
          file_url: request.fileUrl,
          project_id: request.projectId,
          scope_id: request.scopeId,
          file_size: request.fileSize,
          file_type: request.fileType
        })
        .select()
        .single();

      if (error) throw error;
      return data ? this.mapToModel(data) : null;
    } catch (error) {
      console.error('Error creating PM document:', error);
      return null;
    }
  }

  /**
   * Update PM document
   */
  async update(request: UpdatePmDocumentRequest): Promise<PmDocument | null> {
    try {
      const updateData: any = {};
      if (request.name !== undefined) updateData.name = request.name;
      if (request.description !== undefined) updateData.description = request.description;
      if (request.fileUrl !== undefined) updateData.file_url = request.fileUrl;
      if (request.projectId !== undefined) updateData.project_id = request.projectId;
      if (request.fileSize !== undefined) updateData.file_size = request.fileSize;
      if (request.fileType !== undefined) updateData.file_type = request.fileType;

      const { data, error } = await this.supabase
        .from('pm_documents')
        .update(updateData)
        .eq('id', request.id)
        .select()
        .single();

      if (error) throw error;
      return data ? this.mapToModel(data) : null;
    } catch (error) {
      console.error('Error updating PM document:', error);
      return null;
    }
  }

  /**
   * Delete PM document
   */
  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('pm_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting PM document:', error);
      return false;
    }
  }

  /**
   * Map database record to model
   */
  private mapToModel(data: any): PmDocument {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      fileUrl: data.file_url,
      projectId: data.project_id,
      scopeId: data.scope_id,
      fileSize: data.file_size,
      fileType: data.file_type,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}
