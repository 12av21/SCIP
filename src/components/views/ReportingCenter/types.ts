export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  format: string;
  frequency: string;
  recipients: string[];
  departmentId?: string;
  filters: any;
  schedule: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedReport {
  id: string;
  templateId: string;
  name: string;
  format: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  filePath?: string;
  fileSize?: number;
  generatedAt: string;
  completedAt?: string;
  error?: string;
  downloadUrl?: string;
  expiresAt?: string;
}