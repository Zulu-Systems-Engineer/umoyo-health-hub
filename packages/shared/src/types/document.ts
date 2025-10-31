export type DocumentCategory =
  | "clinical-guideline"
  | "drug-info"
  | "disease-reference"
  | "patient-education";

export type DocumentLanguage = "en" | "ny" | "bem";

export type DocumentAudience = "healthcare-professional" | "patient" | "both";

export type DocumentRegion = "zambia" | "southern-africa" | "global";

export interface DocumentMetadata {
  documentId: string;
  title: string;
  category: DocumentCategory;
  language: DocumentLanguage;
  audience: DocumentAudience;
  region: DocumentRegion;
  lastUpdated: string; // ISO date string
  sourceUrl?: string;
  tags?: string[];
}

