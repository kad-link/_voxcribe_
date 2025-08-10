"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Mic,
  Square,
  Search,
  FileText,
  Download,
  Trash2,
  Clock,
  User,
  Sparkles,
  Upload,
  Volume2,
  Sun,
  Moon,
  Bookmark,
  LogOut,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/firebase";

interface Note {
  id: string;
  title: string;
  content: string;
  summary: string;
  duration: string;
  createdAt: string;
  tags: string[];
  speaker?: string;
  isBookmarked?: boolean;
}

interface MainScreenProps {
  user: any;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onLogout: () => void;
}

export default function MainScreen({
  user,
  isDarkMode,
  toggleTheme,
  onLogout,
}: MainScreenProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [zoomedNote, setZoomedNote] = useState<string | null>(null);
  const [isZooming, setIsZooming] = useState(false);
  const [clickedOutside, setClickedOutside] = useState(false);
  const notesContainerRef = useRef<HTMLDivElement>(null);

  const intervalRef = useRef<NodeJS.Timeout>();

  // Add this after the isDarkMode state
  const [bookmarkedNotes, setBookmarkedNotes] = useState<Set<string>>(
    new Set(["1"])
  );

  // Mock notes data
  const [notes, setNotes] = useState<Note[]>([
    {
      id: "1",
      title: "Team Meeting - Project Planning",
      content:
        "Discussed the upcoming product launch timeline. Key points covered include market research findings, target demographics, and budget allocation. The team agreed on a phased approach to development.",
      summary:
        "Product launch planning meeting covering research, demographics, and phased development approach.",
      duration: "15:32",
      createdAt: new Date().toISOString().split("T")[0], // Today's date
      tags: ["meeting", "planning", "product"],
      speaker: "Sarah Johnson",
      isBookmarked: true,
    },
    {
      id: "2",
      title: "Lecture - Machine Learning Basics",
      content:
        "Introduction to supervised and unsupervised learning algorithms. Covered linear regression, decision trees, and clustering methods with practical examples.",
      summary:
        "ML fundamentals: supervised/unsupervised learning, regression, decision trees, clustering.",
      duration: "45:18",
      createdAt: "2024-01-14",
      tags: ["lecture", "AI", "education"],
      speaker: "Dr. Michael Chen",
      isBookmarked: false,
    },
  ]);

  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsProcessing(true);

    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      // Add new note (mock)
      const newNote: Note = {
        id: Date.now().toString(),
        title: "New Recording",
        content: "This is a sample transcription of your recording...",
        summary: "Sample summary of the recorded content.",
        duration: formatTime(recordingTime),
        createdAt: new Date().toISOString().split("T")[0],
        tags: ["recording", "new"],
        speaker: user?.displayName || "You",
      };
      setNotes((prev) => [newNote, ...prev]);
      setRecordingTime(0);
    }, 3000);
  };

  const toggleBookmark = (noteId: string) => {
    setBookmarkedNotes((prev) => {
      const newBookmarks = new Set(prev);
      if (newBookmarks.has(noteId)) {
        newBookmarks.delete(noteId);
      } else {
        newBookmarks.add(noteId);
      }
      return newBookmarks;
    });

    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? { ...note, isBookmarked: !bookmarkedNotes.has(noteId) }
          : note
      )
    );
  };

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const todayNotes = notes.filter(
    (note) => note.createdAt === new Date().toISOString().split("T")[0]
  );

  const handleZoomIn = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZooming(true);
    setTimeout(() => {
      setZoomedNote(noteId);
      setIsZooming(false);
    }, 150);
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZooming(true);
    setTimeout(() => {
      setZoomedNote(null);
      setIsZooming(false);
    }, 150);
  };

  // Add this useEffect after the other useEffects
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Handle user menu
      // if (showUserMenu) {
      //   setShowUserMenu(false);
      // }

      // Handle note selection - check if click is outside the notes container
      if (
        selectedNote &&
        notesContainerRef.current &&
        !notesContainerRef.current.contains(target)
      ) {
        // Don't close if clicking on zoom controls or other UI elements
        if (
          !target.closest("[data-note-control]") &&
          !target.closest(".fixed")
        ) {
          setSelectedNote(null);
          setClickedOutside(true);
          setTimeout(() => setClickedOutside(false), 300);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu, selectedNote]);

  // Handle ESC key to close zoom
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && zoomedNote) {
        setIsZooming(true);
        setTimeout(() => {
          setZoomedNote(null);
          setIsZooming(false);
        }, 150);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [zoomedNote]);

    console.log("User photo URL:", user?.photoURL);

  return (
      

    <div
      className={cn(
        "min-h-screen transition-all duration-500",
        isDarkMode
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-black"
          : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100"
      )}
    >
      {/* Header */}
      <header
        className={cn(
          "border-b backdrop-blur-sm sticky top-0 z-50 transition-all duration-300",
          isDarkMode
            ? "border-gray-800 bg-gray-900/80"
            : "border-gray-200 bg-white/80"
        )}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Volume2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  VOXCRIBE :)
                </h1>
                <p
                  className={cn(
                    "text-sm",
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  )}
                >
                  Transcription made easy
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge
                variant="secondary"
                className={cn(
                  isDarkMode
                    ? "bg-emerald-900/50 text-emerald-300 border-emerald-700"
                    : "bg-green-100 text-green-700 border-green-200"
                )}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                AI Powered
              </Badge>

              {/* Theme Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                className={cn(
                  "transition-all duration-300",
                  isDarkMode
                    ? "border-gray-600 bg-gray-800/70 text-gray-200 hover:bg-gray-700 hover:text-white hover:border-gray-500"
                    : "border-gray-400 bg-gray-200/70 text-gray-800 hover:bg-gray-300 hover:border-gray-500"
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

              {/* User Info with Dropdown */}
              {user && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex items-center space-x-3 h-10 px-3 transition-all duration-300",
                      isDarkMode
                        ? "text-gray-300 hover:text-white hover:bg-gray-800"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                    )}
                    onClick={() => setShowUserMenu(!showUserMenu)}
                  >

                    {user.photoURL && (
                     <img
  src={user.photoURL} 
  alt="Profile"
  style={{ width: "32px", height: "32px", borderRadius: "50%" }}
/>


                    )}
                    <div className="text-left max-w-[180px] min-w-0">
                      <p className="text-sm font-medium truncate " >
                        {user.displayName }
                      </p>
                      <p className="text-xs opacity-70 truncate ">
                        {user.email }
                      </p>
                    </div>
                    <User className="w-4 h-4" />
                  </Button>

                  {/* User Dropdown Menu */}
                  {showUserMenu && (
                    <div
                      data-user-dropdown="true"
                      className={cn(
                        "absolute right-0 top-12 w-64 rounded-lg shadow-2xl border backdrop-blur-sm z-50 transition-all duration-300",
                        isDarkMode
                          ? "bg-gray-900/95 border-gray-800"
                          : "bg-white/95 border-gray-200"
                      )}
                    >
                      <div className="p-4 border-b border-gray-800">
                        <div className="flex items-center space-x-3">
                          {user.photoURL && (
                            <img
                              src={
                                user.photoURL ||
                                "/placeholder.svg?height=40&width=40"
                              }
                              alt={user.displayName || "User"}
                              className="w-10 h-10 rounded-full border-2 border-blue-500"
                            />
                          )}
                          <div>
                            <p
                              className={cn(
                                "font-medium",
                                isDarkMode ? "text-white" : "text-gray-900"
                              )}
                            >
                              {user.displayName || "Guest User"}
                            </p>
                            <p
                              className={cn(
                                "text-sm",
                                isDarkMode ? "text-gray-400" : "text-gray-600"
                              )}
                            >
                              {user.email || "guest@voxcribe.com"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-2">
                        <Button
                          data-logout-button="true"
                          variant="ghost"
                          className={cn(
                            "w-full justify-start h-10 transition-all duration-200",
                            isDarkMode
                              ? "text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              : "text-red-600 hover:text-red-700 hover:bg-red-50"
                          )}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();                            
                            try {
                              await onLogout();
                              
                            } catch (error) {
                              console.error("❌ Logout failed:", error);
                              setShowUserMenu(false);
                            }
                          }}
                        >
                          
                          Sign Out
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
</div>
</div>
</div>
</header>


      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recording Panel */}
          <div className="lg:col-span-1">
            <Card
              className={cn(
                "mb-6 shadow-2xl backdrop-blur-sm transition-all duration-300",
                isDarkMode
                  ? "border-gray-800 bg-gray-900/70"
                  : "border-gray-200 bg-white/70"
              )}
            >
              <CardHeader className="text-center pb-4">
                <CardTitle
                  className={cn(
                    "flex items-center justify-center space-x-2",
                    isDarkMode ? "text-white" : "text-gray-900"
                  )}
                >
                  <Mic className="w-5 h-5" />
                  <span>Voice Recording</span>
                </CardTitle>
                <CardDescription
                  className={cn(isDarkMode ? "text-gray-400" : "text-gray-600")}
                >
                  Record your voice and get AI-powered transcription
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Recording Button */}
                <div className="flex flex-col items-center space-y-4">
                  <div
                    className={cn(
                      "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300",
                      isRecording
                        ? "bg-red-500 shadow-lg shadow-red-500/30 animate-pulse"
                        : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30"
                    )}
                  >
                    <Button
                      size="lg"
                      className={cn(
                        "w-full h-full rounded-full border-4",
                        isDarkMode ? "border-gray-800" : "border-white",
                        isRecording
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-blue-600 hover:bg-blue-700"
                      )}
                      onClick={
                        isRecording ? handleStopRecording : handleStartRecording
                      }
                      disabled={isProcessing}
                    >
                      {isRecording ? (
                        <Square className="w-8 h-8 text-white" />
                      ) : (
                        <Mic className="w-8 h-8 text-white" />
                      )}
                    </Button>
                  </div>
                  <div className="text-center">
                    {isRecording && (
                      <div className="text-2xl font-mono font-bold text-red-400">
                        {formatTime(recordingTime)}
                      </div>
                    )}
                    {isProcessing && (
                      <div className="text-blue-400 font-medium">
                        Processing... 🤖
                      </div>
                    )}
                    <p
                      className={cn(
                        "text-sm mt-1",
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      )}
                    >
                      {isRecording
                        ? "Recording in progress..."
                        : "Click to start recording"}
                    </p>
                  </div>
                </div>

                {/* Upload Option */}
                <div
                  className={cn(
                    "border-t pt-4",
                    isDarkMode ? "border-gray-800" : "border-gray-200"
                  )}
                >
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full transition-all duration-300",
                      isDarkMode
                        ? "border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white bg-transparent"
                        : "border-gray-400 text-gray-700 hover:bg-gray-100 hover:text-gray-900 bg-transparent"
                    )}
                    disabled={isRecording || isProcessing}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Audio File
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card
              className={cn(
                "shadow-2xl backdrop-blur-sm transition-all duration-300",
                isDarkMode
                  ? "border-gray-800 bg-gray-900/70"
                  : "border-gray-200 bg-white/70"
              )}
            >
              <CardHeader>
                <CardTitle
                  className={cn(
                    "text-lg",
                    isDarkMode ? "text-white" : "text-gray-900"
                  )}
                >
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span
                    className={cn(
                      "text-sm",
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    )}
                  >
                    Total Notes
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      isDarkMode
                        ? "bg-gray-800 text-gray-300"
                        : "bg-gray-200 text-gray-700"
                    )}
                  >
                    {notes.length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className={cn(
                      "text-sm",
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    )}
                  >
                    Bookmarked
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      isDarkMode
                        ? "bg-yellow-900/50 text-yellow-300"
                        : "bg-yellow-100 text-yellow-700"
                    )}
                  >
                    {bookmarkedNotes.size}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className={cn(
                      "text-sm",
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    )}
                  >
                    This Day
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      isDarkMode
                        ? "bg-blue-900/50 text-blue-300"
                        : "bg-blue-100 text-blue-700"
                    )}
                  >
                    {todayNotes.length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className={cn(
                      "text-sm",
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    )}
                  >
                    This Week
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      isDarkMode
                        ? "bg-gray-800 text-gray-300"
                        : "bg-gray-200 text-gray-700"
                    )}
                  >
                    2
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className={cn(
                      "text-sm",
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    )}
                  >
                    Total Duration
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      isDarkMode
                        ? "bg-gray-800 text-gray-300"
                        : "bg-gray-200 text-gray-700"
                    )}
                  >
                    1h 0m
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes List */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <Input
                    placeholder="Search notes, tags, or content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      "pl-10 shadow-2xl backdrop-blur-sm",
                      isDarkMode
                        ? "border-gray-800 bg-gray-900/70 text-white placeholder:text-gray-500"
                        : "border-gray-300 bg-white/70 text-gray-900 placeholder:text-gray-500"
                    )}
                  />
                </div>
              </div>
            </div>

            <div ref={notesContainerRef} className="space-y-4">
              {filteredNotes.map((note) => (
                <Card
                  key={note.id}
                  className={cn(
                    "shadow-2xl backdrop-blur-sm cursor-pointer transition-all duration-300 hover:shadow-3xl hover:border-blue-500/50",
                    isDarkMode
                      ? "border-gray-800 bg-gray-900/70 hover:bg-gray-800/70"
                      : "border-gray-300 bg-white/70 hover:bg-gray-100/70",
                    selectedNote?.id === note.id &&
                      "ring-2 ring-blue-500 shadow-3xl",
                    zoomedNote === note.id
                      ? "fixed inset-4 z-50 scale-100 overflow-auto"
                      : "hover:scale-[1.02]",
                    isZooming && "transition-transform duration-300",
                    clickedOutside &&
                      selectedNote?.id === note.id &&
                      "animate-pulse"
                  )}
                  onClick={(e) => {
                    // Only select if not already selected, or if clicking on the same note
                    if (selectedNote?.id !== note.id) {
                      setSelectedNote(note);
                    }
                  }}
                >
                  {/* Zoom overlay background */}
                  {zoomedNote === note.id && (
                    <div
                      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                      onClick={handleZoomOut}
                    />
                  )}

                  <CardHeader
                    className={cn(
                      "pb-3 transition-all duration-300",
                      selectedNote?.id === note.id && "pb-4 px-6",
                      zoomedNote === note.id && "pb-6 px-8"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <CardTitle
                            className={cn(
                              "text-lg transition-all duration-300",
                              isDarkMode ? "text-white" : "text-gray-900",
                              selectedNote?.id === note.id && "text-xl",
                              zoomedNote === note.id && "text-2xl",
                              "group-hover:text-blue-400"
                            )}
                          >
                            {note.title}
                          </CardTitle>
                          {bookmarkedNotes.has(note.id) && (
                            <Bookmark
                              className={cn(
                                "w-4 h-4 text-yellow-500 fill-yellow-500 transition-all duration-300",
                                selectedNote?.id === note.id && "w-5 h-5",
                                zoomedNote === note.id && "w-6 h-6"
                              )}
                            />
                          )}
                        </div>
                        <div
                          className={cn(
                            "flex items-center space-x-4 text-sm transition-all duration-300",
                            isDarkMode ? "text-gray-400" : "text-gray-600",
                            selectedNote?.id === note.id &&
                              "text-base space-x-6",
                            zoomedNote === note.id && "text-lg space-x-8"
                          )}
                        >
                          <div className="flex items-center space-x-1">
                            <Clock
                              className={cn(
                                "w-4 h-4 transition-all duration-300",
                                selectedNote?.id === note.id && "w-5 h-5",
                                zoomedNote === note.id && "w-6 h-6"
                              )}
                            />
                            <span>{note.duration}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <User
                              className={cn(
                                "w-4 h-4 transition-all duration-300",
                                selectedNote?.id === note.id && "w-5 h-5",
                                zoomedNote === note.id && "w-6 h-6"
                              )}
                            />
                            <span>{note.speaker}</span>
                          </div>
                          <span>{note.createdAt}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Zoom Controls */}
                        {zoomedNote !== note.id ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            data-note-control="true"
                            className={cn(
                              "transition-all duration-300 opacity-70 hover:opacity-100",
                              isDarkMode
                                ? "text-gray-400 hover:text-white hover:bg-gray-800"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                              selectedNote?.id === note.id &&
                                "w-10 h-10 opacity-100"
                            )}
                            onClick={(e) => handleZoomIn(note.id, e)}
                            title="Zoom In"
                          >
                            <ZoomIn
                              className={cn(
                                "w-4 h-4 transition-all duration-300",
                                selectedNote?.id === note.id && "w-5 h-5"
                              )}
                            />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            data-note-control="true"
                            className={cn(
                              "transition-all duration-300 opacity-100",
                              isDarkMode
                                ? "text-gray-400 hover:text-white hover:bg-gray-800"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                              "w-12 h-12"
                            )}
                            onClick={handleZoomOut}
                            title="Zoom Out"
                          >
                            <ZoomOut className="w-6 h-6" />
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          data-note-control="true"
                          className={cn(
                            "transition-all duration-300 opacity-70 hover:opacity-100",
                            isDarkMode
                              ? "text-gray-400 hover:text-white hover:bg-gray-800"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                            selectedNote?.id === note.id &&
                              "w-10 h-10 opacity-100",
                            zoomedNote === note.id && "w-12 h-12 opacity-100"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(note.id);
                          }}
                        >
                          <Bookmark
                            className={cn(
                              "w-4 h-4 transition-all duration-300",
                              bookmarkedNotes.has(note.id)
                                ? "text-yellow-500 fill-yellow-500"
                                : "",
                              selectedNote?.id === note.id && "w-5 h-5",
                              zoomedNote === note.id && "w-6 h-6"
                            )}
                          />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          data-note-control="true"
                          className={cn(
                            "transition-all duration-300 opacity-70 hover:opacity-100",
                            isDarkMode
                              ? "text-gray-400 hover:text-white hover:bg-gray-800"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                            selectedNote?.id === note.id &&
                              "w-10 h-10 opacity-100",
                            zoomedNote === note.id && "w-12 h-12 opacity-100"
                          )}
                        >
                          <Download
                            className={cn(
                              "w-4 h-4 transition-all duration-300",
                              selectedNote?.id === note.id && "w-5 h-5",
                              zoomedNote === note.id && "w-6 h-6"
                            )}
                          />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          data-note-control="true"
                          className={cn(
                            "transition-all duration-300 opacity-70 hover:opacity-100",
                            isDarkMode
                              ? "text-gray-400 hover:text-red-400 hover:bg-gray-800"
                              : "text-gray-600 hover:text-red-500 hover:bg-gray-100",
                            selectedNote?.id === note.id &&
                              "w-10 h-10 opacity-100",
                            zoomedNote === note.id && "w-12 h-12 opacity-100"
                          )}
                        >
                          <Trash2
                            className={cn(
                              "w-4 h-4 transition-all duration-300",
                              selectedNote?.id === note.id && "w-5 h-5",
                              zoomedNote === note.id && "w-6 h-6"
                            )}
                          />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent
                    className={cn(
                      "space-y-3 transition-all duration-300",
                      selectedNote?.id === note.id && "space-y-4 p-6",
                      zoomedNote === note.id && "space-y-6 p-8"
                    )}
                  >
                    <div>
                      <h4
                        className={cn(
                          "font-medium text-sm mb-1 transition-all duration-300",
                          isDarkMode ? "text-gray-300" : "text-gray-700",
                          selectedNote?.id === note.id && "text-base mb-2",
                          zoomedNote === note.id && "text-lg mb-3"
                        )}
                      >
                        AI Summary
                      </h4>
                      <p
                        className={cn(
                          "text-sm p-3 rounded-lg transition-all duration-300",
                          isDarkMode
                            ? "text-gray-300 bg-blue-900/30 border border-blue-800/50"
                            : "text-gray-700 bg-blue-100/50 border border-blue-300/50",
                          selectedNote?.id === note.id && "text-base p-4",
                          zoomedNote === note.id &&
                            "text-lg p-6 leading-relaxed"
                        )}
                      >
                        {note.summary}
                      </p>
                    </div>

                    {(selectedNote?.id === note.id ||
                      zoomedNote === note.id) && (
                      <div
                        className={cn(
                          "border-t pt-4 animate-in fade-in-0 slide-in-from-top-2 duration-300",
                          isDarkMode ? "border-gray-800" : "border-gray-200",
                          zoomedNote === note.id && "pt-6"
                        )}
                      >
                        <h4
                          className={cn(
                            "font-medium text-base mb-3",
                            isDarkMode ? "text-gray-300" : "text-gray-700",
                            zoomedNote === note.id && "text-lg mb-4"
                          )}
                        >
                          Full Transcription
                        </h4>
                        <Textarea
                          value={note.content}
                          readOnly
                          className={cn(
                            "min-h-[150px] resize-none text-base leading-relaxed p-4 transition-all duration-300",
                            isDarkMode
                              ? "bg-gray-800 border-gray-700 text-gray-300"
                              : "bg-gray-50 border-gray-300 text-gray-700",
                            zoomedNote === note.id &&
                              "min-h-[300px] text-lg p-6 leading-loose"
                          )}
                        />
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {note.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className={cn(
                            "text-xs transition-all duration-300",
                            isDarkMode
                              ? "border-gray-700 text-gray-400 hover:bg-gray-800"
                              : "border-gray-400 text-gray-600 hover:bg-gray-200",
                            selectedNote?.id === note.id && "text-sm px-3 py-1",
                            zoomedNote === note.id && "text-base px-4 py-2"
                          )}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredNotes.length === 0 && (
              <Card
                className={cn(
                  "shadow-2xl backdrop-blur-sm",
                  isDarkMode
                    ? "border-gray-800 bg-gray-900/70"
                    : "border-gray-300 bg-white/70"
                )}
              >
                <CardContent className="text-center py-12">
                  <FileText
                    className={cn(
                      "w-12 h-12 mx-auto mb-4",
                      isDarkMode ? "text-gray-600" : "text-gray-400"
                    )}
                  />
                  <h3
                    className={cn(
                      "text-lg font-medium mb-2",
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    )}
                  >
                    No notes found
                  </h3>
                  <p
                    className={cn(
                      isDarkMode ? "text-gray-500" : "text-gray-600"
                    )}
                  >
                    {searchQuery
                      ? "Try adjusting your search terms"
                      : "Start by recording your first note"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
