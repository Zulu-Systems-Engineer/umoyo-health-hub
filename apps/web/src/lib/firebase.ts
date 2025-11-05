import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAnalytics, Analytics } from "firebase/analytics";

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC0S4eceTsTQI38gcNoBjdauuGOnhuqwrM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "umoyo-health-hub.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "umoyo-health-hub",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "umoyo-health-hub.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "443174804509",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:443174804509:web:8f4c2820e25b5fd31f7af4",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-TMQY3BEZ4Y",
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let analytics: Analytics | undefined;

if (typeof window !== "undefined") {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    
    // Initialize Analytics only in browser environment with measurementId
    if (firebaseConfig.measurementId) {
      try {
        analytics = getAnalytics(app);
      } catch (error) {
        console.warn("Firebase Analytics initialization failed:", error);
      }
    }
  } catch (error) {
    console.warn("Firebase initialization failed:", error);
  }
}

export { app, auth, db, analytics };

