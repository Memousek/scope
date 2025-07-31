import { inject, injectable } from 'inversify';
import { ProjectRepository } from '@/lib/domain/repositories/project.repository';
import { Project } from '@/lib/domain/models/project.model';

@injectable()
export class AddProjectService {
  constructor(
    @inject(ProjectRepository) private projectRepository: ProjectRepository
  ) {}

  async execute(scopeId: string, projectData: Omit<Project, 'id' | 'scopeId' | 'createdAt'>): Promise<Project> {
    const project: Omit<Project, 'id' | 'createdAt'> = {
      scopeId,
      name: projectData.name,
      priority: projectData.priority,
      feMandays: projectData.feMandays,
      beMandays: projectData.beMandays,
      qaMandays: projectData.qaMandays,
      pmMandays: projectData.pmMandays,
      dplMandays: projectData.dplMandays,
      feDone: projectData.feDone,
      beDone: projectData.beDone,
      qaDone: projectData.qaDone,
      pmDone: projectData.pmDone,
      dplDone: projectData.dplDone,
      deliveryDate: projectData.deliveryDate
    };

    return await this.projectRepository.create(project);
  }
} 