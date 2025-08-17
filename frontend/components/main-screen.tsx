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
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "../lib/supabaseClient";
import { auth as firebaseAuth } from "../lib/firebase/firebase";
import History from "../components/history";

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
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [fullTranscription, setFullTranscription] = useState("");
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [showTagInput, setShowTagInput] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState("");

  let mediaRecorder: MediaRecorder;
  let audioChunks: Blob[] = [];

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [speakerName, setSpeakerName] = useState<string>("");

  const [bookmarkedNotes, setBookmarkedNotes] = useState<Set<string>>(
    new Set()
  );

  const [notes, setNotes] = useState<Note[]>([]);
  console.log(
    "🔍 Current notes and their IDs:",
    notes.map((note) => ({ id: note.id, title: note.title }))
  );

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

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/mp3" });
        setAudioBlob(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
    }
  };

  const stopRecording = (): Promise<Blob> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: "audio/mp3" });
          setAudioBlob(blob);
          resolve(blob);
        };
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    });
  };

  // Key changes to make in your handleStopRecording function in MainScreen

  const handleStopRecording = async () => {
    setIsProcessing(true);

    try {
      const blob = await stopRecording();

      // Capture the recording time before resetting it
      const recordingDuration = recordingTime;
      setRecordingTime(0);

      if (!blob || blob.size === 0) {
        console.error("No audio captured");
        setIsProcessing(false);
        return;
      }

      const uniqueName = `recording_${Date.now()}.webm`;

      const { data: audioUpload, error: audioError } = await supabase.storage
        .from("uploads")
        .upload(uniqueName, blob);

      if (audioError) throw audioError;

      const { data: publicUrlData } = supabase.storage
        .from("uploads")
        .getPublicUrl(uniqueName);

      const audioUrl = publicUrlData.publicUrl;

      const formData = new FormData();
      formData.append("audio", blob, uniqueName);

      const response = await fetch("http://127.0.0.1:5000/transcribe", {
        method: "POST",
        body: formData,
      });

      console.log("Transcription response status:", response.status);

      const data = await response.json();
      console.log("Transcription response body:", data);

      if (!response.ok) throw new Error("Failed to transcribe audio");

      const firebaseUser = firebaseAuth.currentUser;
      if (!firebaseUser) {
        throw new Error("User is not logged in");
      }

      // Format duration
      const formattedDuration = formatTime(recordingDuration);

      // Get current date for local note creation
      const currentDate = new Date();
      const dateOnly = currentDate.toISOString().split("T")[0];

      // Use custom speaker name if provided, otherwise fallback to user's display name
      const finalSpeakerName =
        speakerName.trim() || firebaseUser.displayName || "Unknown Speaker";

      // Use the actual summary from Flask response
      const actualSummary = data.summary || "Summary generation failed";

      // Single insert operation that returns the inserted record
      const { data: insertedRecord, error: insertRecordError } = await supabase
        .from("recordings")
        .insert([
          {
            firebase_uid: firebaseUser.uid,
            audio_url: audioUrl,
            text_url: null,
            transcription: data.transcription,
            summary: actualSummary,
            duration: formattedDuration,
            speaker: finalSpeakerName,
            tags: [],
          },
        ])
        .select()
        .single();

      if (insertRecordError) throw insertRecordError;

      // Create note for local state with real summary
      const newNote: Note = {
        id: insertedRecord.id, // Real UUID from database
        title: "New Recording",
        content: data.transcription,
        summary: actualSummary,
        duration: formattedDuration,
        createdAt: dateOnly,
        tags: [],
        speaker: finalSpeakerName,
      };

      setNotes((prev) => [newNote, ...prev]);
      setFullTranscription(data.transcription);

      // Reset speaker name after successful recording
      setSpeakerName("");

      console.log(
        "✅ Successfully saved recording with AI summary:",
        actualSummary?.substring(0, 100) + "..."
      );
    } catch (err) {
      console.error("❌ Error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const [regeneratingSummary, setRegeneratingSummary] = useState<string | null>(
    null
  );

  const handleRegenerateSummary = async (noteId: string) => {
    setRegeneratingSummary(noteId);

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/regenerate-summary/${noteId}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (data.success && data.summary) {
        // Update local state
        setNotes((prev) =>
          prev.map((note) =>
            note.id === noteId ? { ...note, summary: data.summary } : note
          )
        );

        // Update database
        await supabase
          .from("recordings")
          .update({
            summary: data.summary,
          })
          .eq("id", noteId);

        console.log("✅ Summary regenerated successfully");
      } else {
        console.error("❌ Failed to regenerate summary:", data.error);
        alert("Failed to regenerate summary. Please try again.");
      }
    } catch (error) {
      console.error("❌ Error regenerating summary:", error);
      alert("Error regenerating summary. Please try again.");
    } finally {
      setRegeneratingSummary(null);
    }
  };

  const toggleBookmark = (noteId: string) => {
    console.log("🔖 toggleBookmark called with noteId:", noteId);
    console.log(
      "🔖 Current bookmarkedNotes before:",
      Array.from(bookmarkedNotes)
    );
    console.log("🔖 bookmarkedNotes.size before:", bookmarkedNotes.size);

    setBookmarkedNotes((prev) => {
      console.log("🔖 Inside setBookmarkedNotes, prev:", Array.from(prev));
      const newBookmarks = new Set(prev);
      const isCurrentlyBookmarked = newBookmarks.has(noteId);

      console.log("🔖 isCurrentlyBookmarked:", isCurrentlyBookmarked);

      if (isCurrentlyBookmarked) {
        newBookmarks.delete(noteId);
        console.log("🔖 Removed bookmark, new size:", newBookmarks.size);
      } else {
        newBookmarks.add(noteId);
        console.log("🔖 Added bookmark, new size:", newBookmarks.size);
      }

      console.log("🔖 Final newBookmarks:", Array.from(newBookmarks));

      // Update notes with the correct bookmark status
      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note.id === noteId
            ? { ...note, isBookmarked: !isCurrentlyBookmarked }
            : note
        )
      );

      return newBookmarks;
    });
  };

  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  const handleDeleteNote = async (noteId: string) => {
    console.log("🗑️ Delete button clicked for note:", noteId);

    try {
      // Find the note to get additional info if needed
      const noteToDelete = notes.find((note) => note.id === noteId);
      if (!noteToDelete) {
        console.error("Note not found");
        return;
      }

      console.log("📝 Note found:", noteToDelete);

      // Delete from Supabase database
      console.log("🔄 Attempting to delete from database...");
      const { error } = await supabase
        .from("recordings")
        .delete()
        .eq("id", noteId);

      if (error) {
        console.error("❌ Error deleting from database:", error);
        return;
      }

      console.log("✅ Successfully deleted from database");

      // Remove from local state
      setNotes((prev) => prev.filter((note) => note.id !== noteId));

      // Remove from bookmarks if it was bookmarked
      setBookmarkedNotes((prev) => {
        const newBookmarks = new Set(prev);
        newBookmarks.delete(noteId);
        return newBookmarks;
      });

      // Clear selection if this note was selected
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }

      // Clear zoom if this note was zoomed
      if (zoomedNote === noteId) {
        setZoomedNote(null);
      }

      // ✅ Trigger History component refresh
      setHistoryRefreshTrigger((prev) => prev + 1);

      console.log("✅ Note deleted successfully from local state");
    } catch (err) {
      console.error("❌ Error deleting note:", err);
    }
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (
        selectedNote &&
        notesContainerRef.current &&
        !notesContainerRef.current.contains(target)
      ) {
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

  console.log("🔍 Notes count:", notes.length);
  console.log("🔍 Filtered notes count:", filteredNotes.length);
  console.log("🔍 All notes:", notes);
  console.log("🔍 Bookmarked notes:", Array.from(bookmarkedNotes));

  // Add this useEffect after your other state declarations
  useEffect(() => {
    const fetchRecordings = async () => {
      const firebaseUser = firebaseAuth.currentUser;
      if (!firebaseUser) {
        console.log("❌ No Firebase user found");
        return;
      }

      console.log("🔄 Fetching recordings for user:", firebaseUser.uid);

      try {
        const { data, error } = await supabase
          .from("recordings")
          .select("*")
          .eq("firebase_uid", firebaseUser.uid)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("❌ Error fetching recordings:", error);
          return;
        }

        console.log("✅ Fetched recordings:", data);

        if (data && data.length > 0) {
          const formattedNotes = data.map((record) => ({
            id: record.id, // This will be the UUID from database
            title: record.title || "Recording",
            content: record.transcription || "",
            summary: record.summary || "No summary available",
            duration: record.duration || "0:00",
            createdAt: new Date(record.created_at).toISOString().split("T")[0],
            tags: record.tags || [],
            speaker: record.speaker || "Unknown",
          }));

          setNotes(formattedNotes);
          console.log("✅ Notes loaded:", formattedNotes.length);
        } else {
          console.log("ℹ️ No recordings found in database");
        }
      } catch (err) {
        console.error("❌ Error in fetchRecordings:", err);
      }
    };

    fetchRecordings();
  }, []);

  // Helper function to convert duration string to seconds
  const parseDuration = (duration: string): number => {
    if (!duration) return 0;

    const parts = duration.split(":");
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes * 60 + seconds;
    }
    return 0;
  };

  // Helper function to format total seconds back to duration string
  const formatTotalDuration = (totalSeconds: number): string => {
    if (totalSeconds === 0) return "0m";

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let result = "";
    if (hours > 0) {
      result += `${hours}h `;
    }
    if (minutes > 0) {
      result += `${minutes}m`;
    }
    if (seconds > 0 && hours === 0) {
      result += ` ${seconds}s`;
    }

    return result.trim() || "0m";
  };

  // Calculate total duration
  const totalDurationSeconds = notes.reduce((total, note) => {
    return total + parseDuration(note.duration);
  }, 0);

  const totalDurationFormatted = formatTotalDuration(totalDurationSeconds);

  const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  // Helper function to check if a date is within the current week
  const isWithinCurrentWeek = (dateString: string): boolean => {
    const noteDate = new Date(dateString);
    const today = new Date();
    const startOfWeek = getStartOfWeek(today);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    // Set time to end of day for endOfWeek
    endOfWeek.setHours(23, 59, 59, 999);

    return noteDate >= startOfWeek && noteDate <= endOfWeek;
  };

  // Add this calculation in your MainScreen component, after the totalDurationFormatted calculation:

  // Calculate notes from this week
  const thisWeekNotes = notes.filter((note) =>
    isWithinCurrentWeek(note.createdAt)
  );

  const handleAddCustomTag = async (noteId: string) => {
    if (!newTagInput.trim()) return;

    const newTag = newTagInput.trim().toLowerCase();

    // Find the current note BEFORE updating
    const currentNote = notes.find((note) => note.id === noteId);
    if (!currentNote) {
      console.error("❌ Note not found:", noteId);
      return;
    }

    // Check if tag already exists
    if (currentNote.tags.includes(newTag)) {
      console.log("ℹ️ Tag already exists:", newTag);
      setNewTagInput("");
      setShowTagInput(null);
      return;
    }

    const updatedTags = [...currentNote.tags, newTag];
    console.log("🏷️ Adding tag:", newTag, "to note:", noteId);
    console.log("🏷️ Updated tags array:", updatedTags);

    try {
      // ✅ UPDATE DATABASE FIRST
      const { error } = await supabase
        .from("recordings")
        .update({ tags: updatedTags })
        .eq("id", noteId);

      if (error) {
        console.error("❌ Error updating tags in database:", error);
        alert("Failed to add tag. Please try again.");
        return;
      }

      console.log("✅ Successfully added tag to database");

      // ✅ UPDATE LOCAL STATE AFTER DATABASE SUCCESS
      setNotes((prev) =>
        prev.map((note) =>
          note.id === noteId ? { ...note, tags: updatedTags } : note
        )
      );

      // Reset input
      setNewTagInput("");
      setShowTagInput(null);
    } catch (err) {
      console.error("❌ Error adding tag:", err);
      alert("Failed to add tag. Please try again.");
    }
  };



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
                      "flex items-center space-x-3 h-10 px-3 overflow-hidden transition-all duration-300",
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
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate ">
                        {user.displayName}
                      </p>
                      <p className="text-xs opacity-70 truncate ">
                        {user.email}
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
                {/* Speaker Name Input */}
                <div className="space-y-2">
                  <label
                    className={cn(
                      "text-sm font-medium",
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    )}
                  >
                    Speaker Name (Optional)
                  </label>
                  <Input
                    placeholder="Enter speaker name..."
                    value={speakerName}
                    onChange={(e) => setSpeakerName(e.target.value)}
                    disabled={isRecording || isProcessing}
                    className={cn(
                      "transition-all duration-300",
                      isDarkMode
                        ? "border-gray-700 bg-gray-800/70 text-white placeholder:text-gray-500"
                        : "border-gray-300 bg-white/70 text-gray-900 placeholder:text-gray-500"
                    )}
                  />
                  <p
                    className={cn(
                      "text-xs",
                      isDarkMode ? "text-gray-500" : "text-gray-600"
                    )}
                  >
                    {speakerName.trim()
                      ? `Will be saved as: ${speakerName.trim()}`
                      : `Will use your name: ${
                          user?.displayName || "Unknown Speaker"
                        }`}
                  </p>
                </div>

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
                    Today
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
                    {thisWeekNotes.length}
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
                    {totalDurationFormatted}
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
                            console.log("🎯 BOOKMARK BUTTON CLICKED!", note.id);
                            const isCurrentlyBookmarked = bookmarkedNotes.has(
                              note.id
                            );

                            if (isCurrentlyBookmarked) {
                              alert("Selected Note De-Bookmarked"); // ← This line
                            } else {
                              alert("Selected Note Bookmarked"); // ← This line
                            }

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
                          onClick={() => handleDeleteNote(note.id)}
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

                    <div className="flex flex-wrap gap-2 items-center">
                      {note.tags.map((tag) => (
                        <div key={tag} className="relative group">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs transition-all duration-300 pr-6",
                              isDarkMode
                                ? "border-gray-700 text-gray-400 hover:bg-gray-800"
                                : "border-gray-400 text-gray-600 hover:bg-gray-200",
                              selectedNote?.id === note.id &&
                                "text-sm px-3 py-1",
                              zoomedNote === note.id && "text-base px-4 py-2"
                            )}
                          >
                            {tag}
                            
                          </Badge>
                        </div>
                      ))}

                      {/* Add Tag Button */}
                      {showTagInput === note.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            placeholder="Enter tag..."
                            className={cn(
                              "h-6 text-xs w-24 transition-all duration-300",
                              isDarkMode
                                ? "border-gray-700 bg-gray-800 text-white"
                                : "border-gray-300 bg-white text-gray-900",
                              selectedNote?.id === note.id &&
                                "h-8 text-sm w-32",
                              zoomedNote === note.id && "h-10 text-base w-40"
                            )}
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                handleAddCustomTag(note.id);
                              }
                              if (e.key === "Escape") {
                                setShowTagInput(null);
                                setNewTagInput("");
                              }
                            }}
                            onBlur={() => {
                              if (newTagInput.trim()) {
                                handleAddCustomTag(note.id);
                              } else {
                                setShowTagInput(null);
                              }
                            }}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          data-note-control="true"
                          className={cn(
                            "w-6 h-6 p-0 rounded-full transition-all duration-300",
                            isDarkMode
                              ? "text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-300",
                            selectedNote?.id === note.id && "w-8 h-8",
                            zoomedNote === note.id && "w-10 h-10"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTagInput(note.id);
                          }}
                          title="Add custom tag"
                        >
                          <Plus
                            className={cn(
                              "w-3 h-3 transition-all duration-300",
                              selectedNote?.id === note.id && "w-4 h-4",
                              zoomedNote === note.id && "w-5 h-5"
                            )}
                          />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Badge
              key={"HISTORY"}
              variant="outline"
              className={cn(
                "px-4 py-2 text-lg transition-all duration-900 mb-4 mt-4",
                isDarkMode
                  ? "border-gray-700 text-gray-400 hover:bg-gray-800"
                  : "border-gray-400 text-gray-600 hover:bg-gray-200"
              )}
            >
              History
            </Badge>
            <History
              key={historyRefreshTrigger}
              isDarkMode={isDarkMode}
              refreshTrigger={historyRefreshTrigger}
            />

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
