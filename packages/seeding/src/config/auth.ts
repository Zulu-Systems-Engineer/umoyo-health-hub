/**
 * Authentication Configuration
 * Handles Google Cloud authentication setup
 */

import * as path from 'path';
import * as fs from 'fs';

/**
 * Get the service account key path from environment or config
 */
export function getServiceAccountKeyPath(): string | undefined {
  // Method 1: Check GOOGLE_APPLICATION_CREDENTIALS environment variable
  const envKeyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envKeyPath) {
    const resolvedPath = path.resolve(envKeyPath);
    if (fs.existsSync(resolvedPath)) {
      console.log(`[Auth] Using service account key from GOOGLE_APPLICATION_CREDENTIALS: ${resolvedPath}`);
      return resolvedPath;
    } else {
      console.warn(`[Auth] Warning: GOOGLE_APPLICATION_CREDENTIALS points to non-existent file: ${resolvedPath}`);
    }
  }

  // Method 2: Try default key location (relative to project root)
  const defaultKeyPath = path.resolve(__dirname, '../../../.keys/umoyo-rag-ingestion-key.json');
  if (fs.existsSync(defaultKeyPath)) {
    console.log(`[Auth] Using default service account key: ${defaultKeyPath}`);
    return defaultKeyPath;
  }

  // Method 3: Try alternative locations
  const alternativePaths = [
    path.resolve(process.cwd(), '.keys/umoyo-rag-ingestion-key.json'),
    path.resolve(process.cwd(), '../../.keys/umoyo-rag-ingestion-key.json'),
    path.resolve(process.cwd(), '../../../.keys/umoyo-rag-ingestion-key.json'),
  ];

  for (const keyPath of alternativePaths) {
    if (fs.existsSync(keyPath)) {
      console.log(`[Auth] Using service account key: ${keyPath}`);
      return keyPath;
    }
  }

  console.log('[Auth] No service account key file found. Will use default credentials (ADC or gcloud auth).');
  return undefined;
}

// [removed duplicate getStorageConfig]

/**
 * Get Storage client configuration
 */
export function getStorageConfig(): { keyFilename?: string; projectId?: string } {
  const keyPath = getServiceAccountKeyPath();
  const config: { keyFilename?: string; projectId?: string } = {};

  if (keyPath) {
    config.keyFilename = keyPath;
  }

  // Always include project ID (required for Storage client). Use common env fallbacks.
  const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'umoyo-health-hub';
  config.projectId = projectId;

  // If no key file found, provide helpful error message
  if (!keyPath) {
    console.warn('[Auth] No service account key found. Attempting to use Application Default Credentials (ADC).');
    console.warn('[Auth] To use ADC, run: gcloud auth application-default login');
    console.warn('[Auth] Or set GOOGLE_APPLICATION_CREDENTIALS environment variable to your service account key path.');
  }

  return config;
}

/**
 * Get Firestore client configuration
 */
export function getFirestoreConfig(): { keyFilename?: string; projectId?: string; preferRest?: boolean; ignoreUndefinedProperties?: boolean } {
  const keyPath = getServiceAccountKeyPath();
  const config: { keyFilename?: string; projectId?: string; preferRest?: boolean; ignoreUndefinedProperties?: boolean } = {};

  if (keyPath) {
    config.keyFilename = keyPath;
  }

  const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'umoyo-health-hub';
  config.projectId = projectId;
  config.preferRest = true;
  config.ignoreUndefinedProperties = true;

  return config;
}

/**
 * Get Vertex AI client configuration
 */
export function getVertexAIConfig(): { keyFilename?: string; project?: string; location?: string } {
  const keyPath = getServiceAccountKeyPath();
  const config: { keyFilename?: string; project?: string; location?: string } = {};

  if (keyPath) {
    config.keyFilename = keyPath;
  }

  const projectId = process.env.GCP_PROJECT_ID || 'umoyo-health-hub';
  const location = process.env.GCP_LOCATION || process.env.RAG_LOCATION || 'us-central1';

  config.project = projectId;
  config.location = location;

  return config;
}

