/**
 * Configuration Management
 * Centralized configuration for the backend services
 */

export interface BackendConfig {
  gcp: {
    projectId: string;
    location: string;
    region: string;
  };
  rag: {
    corpusName: string;
    corpusId?: string;
    maxResults: number;
    minRelevanceScore: number;
  };
  gemini: {
    modelName: string;
    temperature: number;
    maxTokens: number;
    topK: number;
    topP: number;
  };
  firebase: {
    projectId: string;
  };
}

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  return value || defaultValue!;
}

export function getConfig(): BackendConfig {
  return {
    gcp: {
      projectId: getEnvVar('GCP_PROJECT_ID', 'umoyo-health-hub'),
      location: getEnvVar('GCP_LOCATION', 'us-central1'),
      region: getEnvVar('GCP_REGION', 'us-central1'),
    },
    rag: {
      corpusName: getEnvVar('RAG_CORPUS_NAME', 'umoyo-medical-knowledge'),
      corpusId: process.env.RAG_CORPUS_ID,
      maxResults: parseInt(getEnvVar('RAG_MAX_RESULTS', '10'), 10),
      minRelevanceScore: parseFloat(getEnvVar('RAG_MIN_RELEVANCE', '0.5')),
    },
    gemini: {
      modelName: getEnvVar('GEMINI_MODEL', 'gemini-2.0-flash-exp'),
      temperature: parseFloat(getEnvVar('GEMINI_TEMPERATURE', '0.7')),
      maxTokens: parseInt(getEnvVar('GEMINI_MAX_TOKENS', '8192'), 10),
      topK: parseInt(getEnvVar('GEMINI_TOP_K', '40'), 10),
      topP: parseFloat(getEnvVar('GEMINI_TOP_P', '0.95')),
    },
    firebase: {
      projectId: getEnvVar('FIREBASE_PROJECT_ID', process.env.GCP_PROJECT_ID || 'umoyo-health-hub'),
    },
  };
}

export const config = getConfig();

