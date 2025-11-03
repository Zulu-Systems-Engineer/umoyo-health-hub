export interface MedicalDocument {
  id: string;
  title: string;
  source: 'WHO' | 'CDC' | 'PubMed' | 'Zambia-MoH' | 'StatPearls';
  category: 'clinical-guideline' | 'drug-info' | 'disease-reference' | 'patient-education';
  url: string;
  downloadUrl?: string;
  localPath?: string;
  gcsPath?: string;
  metadata: DocumentMetadata;
}

export interface DocumentMetadata {
  audience: 'healthcare-professional' | 'patient' | 'both';
  language: 'en' | 'ny' | 'bem';
  region: 'zambia' | 'southern-africa' | 'global';
  topics: string[];
  publicationDate?: string;
  lastUpdated: string;
  fileSize?: number;
  pageCount?: number;
}

export interface IngestionJob {
  jobId: string;
  status: 'pending' | 'downloading' | 'processing' | 'uploading' | 'completed' | 'failed';
  totalDocuments: number;
  processedDocuments: number;
  failedDocuments: number;
  startTime: Date;
  endTime?: Date;
  errors: Array<{ documentId: string; error: string }>;
}
