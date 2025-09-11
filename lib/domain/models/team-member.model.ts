import { VacationRange } from "@/app/components/scope/types";

export interface TeamMember {
  id: string;
  scopeId: string;
  name: string;
  role: string;
  fte: number;
  mdRate?: number; // Prodejní MD Rate (co se prodává klientu)
  costMdRate?: number; // Nákladový MD Rate (reálné náklady včetně osobních financí)
  vacations?: VacationRange[];
  createdAt: Date;
}