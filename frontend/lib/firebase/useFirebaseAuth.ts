import { useState, useEffect } from "react";
import { auth } from "../firebase/firebase";
import { onAuthStateChanged, signOut, User,RecaptchaVerifier,signInWithPhoneNumber,ConfirmationResult } from "firebase/auth";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { supabase } from "../supabaseClient"; 

export const useFirebaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);


  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [transcriptions, setTranscriptions] = useState<any[]>([]);

  

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth, 
      (firebaseUser) => {
        console.log("Auth state changed:", firebaseUser ? "User logged in" : "User logged out");
       
        setUser(firebaseUser);

        setLoading(false);
        setFirebaseReady(true);

        if (firebaseUser) {
        // ✅ Store Firebase UID in state
        setFirebaseUid(firebaseUser.uid);
        console.log("Firebase UID:", firebaseUser.uid);
      } else {
        setFirebaseUid(null);
      }
      }, 
      (err) => {
        console.error("Auth state change error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    console.log("firebaseUid in history effect:", firebaseUid);

  if (!firebaseUid) return;

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from("recordings")
      .select("*")
      .eq("firebase_uid", firebaseUid) // ✅ fetch by UID
      .order("created_at", { ascending: false });

      console.log("Supabase data:", data);
      console.log("Supabase error:", error);


    if (error) {
      console.error("Error fetching history:", error);
    } else {
      setTranscriptions(data || []);
      console.log("Updated transcriptions:", data);

    }
  };

  fetchHistory();
}, [firebaseUid]);


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

  return { user, loading, signInWithGoogle, logout, firebaseReady, error,firebaseUid, transcriptions };
};