"use client"
import { useState, useEffect } from "react"
import { Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import WelcomePage from "@/components/welcome-page"
import MainScreen from "@/components/main-screen"
import { useFirebaseAuth } from "../lib/firebase/useFirebaseAuth"; 


export default function VoiceToNotesApp() {
  const { user, loading, signInWithGoogle, logout, firebaseReady, error  } = useFirebaseAuth();
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
   
  //toggle theme feature
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  


  //google login feature
  const handleGoogleLogin = async () => {
  setIsGoogleLoading(true);
  try {
    const user = await signInWithGoogle();
    console.log("Signed in user:", user);
  } catch (error) {
    console.error("Google sign-in failed:", error);
  } finally {
    setIsGoogleLoading(false);
  }
};


  

//logout call
const handleLogout = async () => {
  try {
    await logout(); 
  } catch (error) {
    console.error(" Logout failed :", error);
  }
}


  //loading page not a big deal
  if (loading) {
    return (
      <div
        className={cn(
          "min-h-screen flex items-center justify-center",
          isDarkMode
            ? "bg-gradient-to-br from-gray-900 via-slate-900 to-black"
            : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100",
        )}
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl mx-auto animate-pulse">
            <Volume2 className="w-8 h-8 text-white" />
          </div>
          {error ? (
            <div className="space-y-4 max-w-md mx-auto">
              <p className={cn("text-lg font-semibold", isDarkMode ? "text-red-400" : "text-red-600")}>
                Authentication Setup Required
              </p>
              <p className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                Firebase authentication is not properly configured. You can set up Firebase.
              </p>
              <div className="space-y-2">
                <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                  Retry Firebase
                </Button>
              </div>
              <details className="text-left">
                <summary className={cn("text-xs cursor-pointer", isDarkMode ? "text-gray-500" : "text-gray-600")}>
                  Technical Details
                </summary>
                <p className={cn("text-xs mt-2 font-mono", isDarkMode ? "text-gray-400" : "text-gray-600")}>{error}</p>
              </details>
            </div>
          ) : (
            <div className="space-y-2">
              <p className={cn("text-lg", isDarkMode ? "text-gray-300" : "text-gray-700")}>Loading VOXCRIBE...</p>
              <p className={cn("text-sm", isDarkMode ? "text-gray-500" : "text-gray-600")}>
                Initializing authentication
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // showing welcome page if user is not authenticated
  if (!user) {
    return (
      <WelcomePage
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        onGoogleLogin={handleGoogleLogin}
        isGoogleLoading={isGoogleLoading}
        firebaseReady={firebaseReady}
      />
    )
  }

  // Show main screen if user is authenticated
  return <MainScreen 
  user={user} 
  isDarkMode={isDarkMode} 
  toggleTheme={toggleTheme} 
  onLogout={handleLogout} />
}
