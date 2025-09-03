import { VacationRange } from "@/app/components/scope/types";

export interface TeamMember {
  id: string;
  scopeId: string;
  name: string;
  role: string;
  fte: number;
  mdRate?: number;
  vacations?: VacationRange[];
  createdAt: Date;
}