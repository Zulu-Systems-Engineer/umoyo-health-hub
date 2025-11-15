/**
 * Application Initialization
 * Handles Firebase Admin and other service initialization
 */

import { initializeApp, getApps, AppOptions } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin if not already initialized
export function initializeServices() {
  if (getApps().length === 0) {
    const config: AppOptions = {};
    
    // Check if we're running in emulator
    const useEmulator = process.env.FIREBASE_USE_EMULATOR === 'true';
    
    if (useEmulator) {
      console.log('🔧 Initializing Firebase Admin with emulator settings');
      process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
      process.env.FIREBASE_STORAGE_EMULATOR_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'localhost:9199';
    }

    // Initialize app
    const app = initializeApp(config);
    
    // Initialize Firestore
    const db = getFirestore(app);
    // Note: Firebase Admin SDK automatically detects emulator via FIRESTORE_EMULATOR_HOST
    // No need to manually configure settings in newer versions

    // Initialize Storage
    const storage = getStorage(app);
    
    console.log('✅ Firebase Admin initialized successfully');
    return { app, db, storage };
  }
  
  return {
    app: getApps()[0],
    db: getFirestore(),
    storage: getStorage(),
  };
}