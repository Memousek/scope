import { inject, injectable } from 'inversify';
import { ScopeRepository } from '@/lib/domain/repositories/scope.repository';

@injectable()
export class CheckScopeOwnershipService {
  constructor(
    @inject(ScopeRepository) private scopeRepository: ScopeRepository
  ) {}

  async execute(scopeId: string, userId: string): Promise<boolean> {
    const scope = await this.scopeRepository.findById(scopeId);
    
    if (!scope) {
      return false;
    }

    return scope.ownerId === userId;
  }
} 