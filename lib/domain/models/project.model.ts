export interface Project {
    id: string;
    scopeId: string;
    name: string;
    priority: number;
    feMandays?: number;
    beMandays?: number;
    qaMandays?: number;
    pmMandays?: number;
    dplMandays?: number;
    feDone: number;
    beDone: number;
    qaDone: number;
    pmDone: number;
    dplDone: number;
    deliveryDate?: Date;
    createdAt: Date;
    slip?: number;
}