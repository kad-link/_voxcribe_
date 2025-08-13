"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Volume2, Sun, Moon,  } from "lucide-react"
import { cn } from "@/lib/utils"



interface WelcomePageProps {
  isDarkMode: boolean
  toggleTheme: () => void
  onGoogleLogin: () => Promise<void>  
  isGoogleLoading: boolean
  firebaseReady: boolean
  


}

export default function WelcomePage({
  isDarkMode,
  toggleTheme,
  onGoogleLogin,
  isGoogleLoading,
  firebaseReady
}: WelcomePageProps) {
  
  

  

  

  

  

  return (
    <div
      className={cn(
        "min-h-screen flex items-center justify-center transition-all duration-500",
        isDarkMode
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-black"
          : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100",
      )}
    >
      {/* Toggle Theme button */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className={cn(
            "transition-all duration-300",
            isDarkMode
              ? "border-gray-600 bg-gray-800/70 text-gray-200 hover:bg-gray-700 hover:text-white hover:border-gray-500"
              : "border-gray-400 bg-gray-200/70 text-gray-800 hover:bg-gray-300 hover:border-gray-500",
          )}
        >
          {isDarkMode ? (
            <>
              <Sun className="w-4 h-4 mr-2" />
              Light
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 mr-2" />
              Dark
            </>
          )}
        </Button>
      </div>

      <div className="w-full max-w-4xl mx-auto px-4 grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Welcome Content */}
        <div className="text-center lg:text-left space-y-6">
          {/* Logo */}
          <div className="flex justify-center lg:justify-start mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <Volume2 className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Welcome Title */}
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
              WELCOME TO
            </h1>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              VOXCRIBE :)
            </h2>
          </div>

          {/* Caption */}
          <p
            className={cn(
              "text-xl md:text-2xl lg:text-3xl font-light tracking-wide",
              isDarkMode ? "text-gray-300" : "text-gray-700",
            )}
          >
            Transcription made easy
          </p>

          {/* Features List */}
          <div className="space-y-3 text-left max-w-md mx-auto lg:mx-0">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
              <span className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                AI-powered voice transcription
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
              <span className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                Smart note organization
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
              <span className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                Real-time processing
              </span>
            </div>
          </div>

          {/* Powered by Badge */}
          <div className="pt-4">
            <div
              className={cn(
                "inline-flex items-center space-x-2 px-4 py-2 rounded-full backdrop-blur-sm border text-sm",
                isDarkMode
                  ? "bg-gray-900/50 border-gray-800 text-gray-400"
                  : "bg-white/50 border-gray-200 text-gray-600",
              )}
            >
              <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse"></div>
              <span>Powered by VOXCRIBE</span>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Card */}
        <div className="w-full max-w-md mx-auto">
          
            
            <Card
              className={cn(
                "shadow-2xl backdrop-blur-sm border transition-all duration-300",
                isDarkMode ? "bg-gray-900/80 border-gray-800" : "bg-white/80 border-gray-200",
              )}
            >
              <CardHeader className="text-center pb-6">
                <CardTitle
                  className={cn(
                    "text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent",
                  )}
                >
                  Get Started
                </CardTitle>
                <CardDescription className={cn(isDarkMode ? "text-gray-400" : "text-gray-600")}>
                  Choose your preferred way to continue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">


                {/* Google Login */}

                <Button
                  onClick={onGoogleLogin}
                  disabled={isGoogleLoading || !firebaseReady}
                  variant="outline"
                  className={cn(
                    "w-full h-12 text-left justify-start space-x-3 transition-all duration-200 hover:scale-[1.02]",
                    isDarkMode
                      ? "border-gray-600 bg-gray-800/50 text-gray-200 hover:bg-gray-700 hover:text-white hover:border-gray-500"
                      : "border-gray-400 bg-gray-100/50 text-gray-800 hover:bg-gray-200 hover:border-gray-500",
                    (!firebaseReady || isGoogleLoading) && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <div className="w-5 h-5 bg-white rounded-sm flex items-center justify-center">
                    {isGoogleLoading ? (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="flex-1">
                    {!firebaseReady ? "Initializing..." : isGoogleLoading ? "Signing in..." : "Continue with Google"}
                  </span>
                </Button>

                

        

                

                
                

                {/* Terms */}
                <p className={cn("text-xs text-center mt-4", isDarkMode ? "text-gray-500" : "text-gray-600")}>
                  By continuing, you agree to our{" "}
                  <span className="text-blue-500 hover:underline cursor-pointer">Terms of Service</span> and{" "}
                  <span className="text-blue-500 hover:underline cursor-pointer">Privacy Policy</span>
                </p>
              </CardContent>
            </Card>
          
            
            
          
                
      
    </div>
    </div>
    </div>
  )
}
