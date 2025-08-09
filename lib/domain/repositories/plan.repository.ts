import { Plan } from "@/lib/domain/models/plan.model";

export abstract class PlanRepository {
  abstract findById(id: string): Promise<Plan | null>;
  abstract findByName(name: string): Promise<Plan | null>;
  abstract findAll(): Promise<Plan[]>;
  abstract findActive(): Promise<Plan[]>;
  abstract create(plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>): Promise<Plan>;
  abstract update(id: string, plan: Partial<Plan>): Promise<Plan>;
  abstract delete(id: string): Promise<void>;
  abstract getUserPlan(userId: string): Promise<Plan | null>;
  abstract updateUserPlan(userId: string, planId: string): Promise<boolean>;
}
