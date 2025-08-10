import { inject, injectable } from 'inversify';
import { ScopeRepository } from '@/lib/domain/repositories/scope.repository';
import { createClient } from '@/lib/supabase/client';

export interface ScopeWithAuthor {
  id: string;
  name: string;
  description?: string;
  authorEmail?: string;
  createdAt: Date;
}

@injectable()
export class GetScopeWithAuthorService {
  constructor(
    @inject(ScopeRepository) private scopeRepository: ScopeRepository
  ) {}

  async execute(scopeId: string): Promise<ScopeWithAuthor | null> {
    const scope = await this.scopeRepository.findById(scopeId);
    
    if (!scope) {
      return null;
    }

    // Získat autora (vlastníka) přímo z Supabase
    const supabase = createClient();
    const { data: author } = await supabase
  .from('user_meta')
      .select('email')
      .eq('id', scope.ownerId)
      .single();
    
    return {
      id: scope.id,
      name: scope.name,
      description: scope.description,
      authorEmail: author?.email,
      createdAt: scope.createdAt
    };
  }
} 