/**
 * Service layer for scope editor-related API operations
 * Centralizes all operations for scope editors and invitations
 */

import { v4 as uuidv4 } from 'uuid';
import { ContainerService } from '@/lib/container.service';
import { ScopeEditorRepository } from '@/lib/domain/repositories/scope-editor.repository';
import { ScopeRepository } from '@/lib/domain/repositories/scope.repository';
import { UserRepository } from '@/lib/domain/repositories/user.repository';
import { ScopeEditor } from '@/lib/domain/models/scope-editor.model';

export interface InviteEditorData {
  scopeId: string;
  email: string;
}

export interface CreateInviteLinkData {
  scopeId: string;
}

export class ScopeEditorService {
  /**
   * Check if editor already exists for scope and email
   */
  static async checkExistingEditor(scopeId: string, email: string): Promise<boolean> {
    const scopeEditorRepository = ContainerService.getInstance().get(ScopeEditorRepository);
    const editors = await scopeEditorRepository.findByScopeIdAndEmail(scopeId, email);
    return editors.length > 0;
  }

  /**
   * Check if user exists in auth.users
   */
  static async findUserByEmail(email: string): Promise<string | null> {
    const userRepository = ContainerService.getInstance().get(UserRepository);
    const user = await userRepository.findByEmail(email);
    return user?.id || null;
  }

  /**
   * Create an invite link for scope sharing (without email)
   */
  static async createInviteLink(createData: CreateInviteLinkData): Promise<string> {
    const { scopeId } = createData;
    
    const token = uuidv4();
    const scopeEditorRepository = ContainerService.getInstance().get(ScopeEditorRepository);
    
    await scopeEditorRepository.create({
      scopeId,
      inviteToken: token
    });

    return token;
  }

  /**
   * Check if user is the owner of the scope
   */
  static async checkScopeOwnership(scopeId: string, userId: string): Promise<boolean> {
    const scopeRepository = ContainerService.getInstance().get(ScopeRepository);
    const scope = await scopeRepository.findById(scopeId);
    return scope?.ownerId === userId;
  }

  /**
   * Check if user is an editor of the scope
   */
  static async checkScopeEditor(scopeId: string, userId: string): Promise<boolean> {
    const scopeEditorRepository = ContainerService.getInstance().get(ScopeEditorRepository);
    const editors = await scopeEditorRepository.findByScopeIdAndUserId(scopeId, userId);
    return editors.some(editor => editor.acceptedAt !== null);
  }

  /**
   * Invite a new editor to scope
   */
  static async inviteEditor(inviteData: InviteEditorData): Promise<void> {
    const { scopeId, email } = inviteData;
    
    // Check if editor already exists
    const exists = await this.checkExistingEditor(scopeId, email);
    if (exists) {
      throw new Error('EDITOR_ALREADY_EXISTS');
    }

    // Check if user exists
    const userId = await this.findUserByEmail(email);
    
    // Check if the user is trying to invite themselves (owner)
    if (userId) {
      const isOwner = await this.checkScopeOwnership(scopeId, userId);
      if (isOwner) {
        throw new Error('CANNOT_INVITE_OWNER');
      }
    }
    
    const token = uuidv4();
    const scopeEditorRepository = ContainerService.getInstance().get(ScopeEditorRepository);
    
    const createData: Partial<ScopeEditor> = {
      scopeId,
      email,
      inviteToken: token
    };
    
    if (userId) {
      createData.userId = userId;
      createData.acceptedAt = new Date();
    }

    await scopeEditorRepository.create(createData);
  }

  /**
   * Remove editor from scope
   */
  static async removeEditor(editorId: string): Promise<void> {
    const scopeEditorRepository = ContainerService.getInstance().get(ScopeEditorRepository);
    await scopeEditorRepository.delete(editorId);
  }
}
