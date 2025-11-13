import { useEffect, useState, useCallback } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  AuthError,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      setError(null);
    });

    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!auth) {
      throw new Error("Firebase Auth is not initialized");
    }

    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (err) {
      const authError = err as AuthError;
      const errorMessage = getAuthErrorMessage(authError.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      if (!auth) {
        throw new Error("Firebase Auth is not initialized");
      }

      try {
        setError(null);
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        // Update display name if provided
        if (displayName && userCredential.user) {
          await updateProfile(userCredential.user, {
            displayName,
          });
        }

        return userCredential.user;
      } catch (err) {
        const authError = err as AuthError;
        const errorMessage = getAuthErrorMessage(authError.code);
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    if (!auth) {
      throw new Error("Firebase Auth is not initialized");
    }

    try {
      setError(null);
      await firebaseSignOut(auth);
    } catch (err) {
      const authError = err as AuthError;
      const errorMessage = getAuthErrorMessage(authError.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!auth) {
      throw new Error("Firebase Auth is not initialized");
    }

    try {
      setError(null);
      const { sendPasswordResetEmail } = await import("firebase/auth");
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      const authError = err as AuthError;
      const errorMessage = getAuthErrorMessage(authError.code);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };
}

function getAuthErrorMessage(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Please sign in instead.";
    case "auth/invalid-email":
      return "Invalid email address.";
    case "auth/operation-not-allowed":
      return "Email/password accounts are not enabled.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/wrong-password":
      return "Incorrect password.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection.";
    default:
      return "An error occurred. Please try again.";
  }
}

