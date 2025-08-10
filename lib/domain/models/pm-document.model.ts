/**
 * PM Document model representing project management documents
 * Contains document metadata, file information, and relationships
 */

export interface PmDocument {
  id: string;
  name: string;
  description?: string;
  fileUrl?: string;
  projectId?: string;
  scopeId: string;
  fileSize?: number;
  fileType?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePmDocumentRequest {
  name: string;
  description?: string;
  fileUrl?: string;
  projectId?: string;
  scopeId: string;
  fileSize?: number;
  fileType?: string;
}

export interface UpdatePmDocumentRequest {
  id: string;
  name?: string;
  description?: string;
  fileUrl?: string;
  projectId?: string;
  fileSize?: number;
  fileType?: string;
}
