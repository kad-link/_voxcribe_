import { useState, useEffect } from "react";
import { auth } from "../firebase/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

export const useFirebaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth, 
      (firebaseUser) => {
        console.log("Auth state changed:", firebaseUser ? "User logged in" : "User logged out");
       
        setUser(firebaseUser);

        setLoading(false);
        setFirebaseReady(true);
      }, 
      (err) => {
        console.error("Auth state change error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log("Google sign-in successful:", result.user.displayName);

      return result.user;
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      setError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error("Logout error:", error);
      setError(error.message);
      throw error;
    }
  };

  return { user, loading, signInWithGoogle, logout, firebaseReady, error };
};