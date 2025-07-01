export interface ProjectProgress {
  id: string;
  projectId: string;
  date: Date;
  feDone?: number;
  beDone?: number;
  qaDone?: number;
  pmDone?: number;
  dplDone?: number;
  feMandays?: number;
  beMandays?: number;
  qaMandays?: number;
  pmMandays?: number;
  dplMandays?: number;
  createdAt: Date;
}