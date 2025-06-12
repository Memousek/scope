import { createClient } from '@/lib/supabase/client';
import { ProjectProgress } from "@/lib/domain/models/project_progress.model";
import { ProjectProgressRepository } from "@/lib/domain/repositories/project_progress.repository";

export class SupabaseProjectProgressRepository implements ProjectProgressRepository {
    async findById(id: string): Promise<ProjectProgress | null> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('project_progress')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) return null;

        return this.mapToModel(data);
    }

    async findByProjectId(projectId: string): Promise<ProjectProgress[]> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('project_progress')
            .select('*')
            .eq('project_id', projectId);

        if (error || !data) return [];

        return data.map(this.mapToModel);
    }

    async create(projectProgress: Omit<ProjectProgress, 'id' | 'createdAt'>): Promise<ProjectProgress> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('project_progress')
            .insert({
                project_id: projectProgress.projectId,
                date: projectProgress.date.toISOString(),
                fe_done: projectProgress.feDone,
                be_done: projectProgress.beDone,
                qa_done: projectProgress.qaDone,
                pm_done: projectProgress.pmDone,
                dpl_done: projectProgress.dplDone,
                fe_mandays: projectProgress.feMandays,
                be_mandays: projectProgress.beMandays,
                qa_mandays: projectProgress.qaMandays,
                pm_mandays: projectProgress.pmMandays,
                dpl_mandays: projectProgress.dplMandays
            })
            .select()
            .single();

        if (error || !data) {
            throw new Error(`Failed to create project progress: ${error?.message}`);
        }

        return this.mapToModel(data);
    }

    async update(id: string, projectProgress: Partial<ProjectProgress>): Promise<ProjectProgress> {
        const supabase = createClient();
        const updateData: Record<string, string | number | boolean | null | undefined> = {};
        
        if (projectProgress.projectId !== undefined) updateData.project_id = projectProgress.projectId;
        if (projectProgress.date !== undefined) updateData.date = projectProgress.date.toISOString();
        if (projectProgress.feDone !== undefined) updateData.fe_done = projectProgress.feDone;
        if (projectProgress.beDone !== undefined) updateData.be_done = projectProgress.beDone;
        if (projectProgress.qaDone !== undefined) updateData.qa_done = projectProgress.qaDone;
        if (projectProgress.pmDone !== undefined) updateData.pm_done = projectProgress.pmDone;
        if (projectProgress.dplDone !== undefined) updateData.dpl_done = projectProgress.dplDone;
        if (projectProgress.feMandays !== undefined) updateData.fe_mandays = projectProgress.feMandays;
        if (projectProgress.beMandays !== undefined) updateData.be_mandays = projectProgress.beMandays;
        if (projectProgress.qaMandays !== undefined) updateData.qa_mandays = projectProgress.qaMandays;
        if (projectProgress.pmMandays !== undefined) updateData.pm_mandays = projectProgress.pmMandays;
        if (projectProgress.dplMandays !== undefined) updateData.dpl_mandays = projectProgress.dplMandays;

        const { data, error } = await supabase
            .from('project_progress')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error || !data) {
            throw new Error(`Failed to update project progress: ${error?.message}`);
        }

        return this.mapToModel(data);
    }

    async delete(id: string): Promise<void> {
        const supabase = createClient();
        const { error } = await supabase
            .from('project_progress')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to delete project progress: ${error.message}`);
        }
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        const supabase = createClient();
        const { error } = await supabase
            .from('project_progress')
            .delete()
            .eq('project_id', projectId);

        if (error) {
            throw new Error(`Failed to delete project progress by project ID: ${error.message}`);
        }
    }

    // eslint-disable-next-line
    private mapToModel(data: any): ProjectProgress {
        return {
            id: data.id,
            projectId: data.project_id,
            date: new Date(data.date),
            feDone: data.fe_done,
            beDone: data.be_done,
            qaDone: data.qa_done,
            pmDone: data.pm_done,
            dplDone: data.dpl_done,
            feMandays: data.fe_mandays,
            beMandays: data.be_mandays,
            qaMandays: data.qa_mandays,
            pmMandays: data.pm_mandays,
            dplMandays: data.dpl_mandays,
            createdAt: new Date(data.created_at)
        };
    }
}