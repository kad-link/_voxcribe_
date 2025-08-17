import { useFirebaseAuth } from "../lib/firebase/useFirebaseAuth";
import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Bookmark,
  Clock,
  User,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

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

// Add isDarkMode prop to the interface
interface HistoryProps {
  isDarkMode: boolean;
  refreshTrigger?: number;
  onRefetch?: () => void; // Add refetch function prop
  currentSessionNoteIds?: string[]; // Add this to exclude current session notes
}

// Update the component to accept both isDarkMode and refreshTrigger as props
export default function History({ isDarkMode, refreshTrigger, onRefetch, currentSessionNoteIds = [] }: HistoryProps) {
  const { transcriptions } = useFirebaseAuth();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [zoomedNote, setZoomedNote] = useState<string | null>(null);
  const [bookmarkedNotes, setBookmarkedNotes] = useState<Set<string>>(
    new Set()
  );

  const notesContainerRef = useRef<HTMLDivElement>(null);

  const toggleBookmark = (id: string) => {
    setBookmarkedNotes((prev) => {
      const updated = new Set(prev);
      updated.has(id) ? updated.delete(id) : updated.add(id);
      return updated;
    });
  };

  const handleZoomIn = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomedNote(id);
  };

  const handleZoomOut = () => {
    setZoomedNote(null);
  };

  // Define fetchHistoryData function to refetch transcriptions
  const fetchHistoryData = () => {
    console.log("Refreshing history data...");
    // Call the refetch function if provided
    if (onRefetch) {
      onRefetch();
    }
  };

  const filteredNotes: Note[] = (transcriptions || [])
    .map((t: any) => ({
      id: t.id,
      title: t.title || "Untitled",
      content: t.transcription || "",
      summary: t.summary || "",
      duration: t.duration || "—",
      createdAt: t.created_at ? new Date(t.created_at).toLocaleDateString() : "—",
      tags: Array.isArray(t.tags) ? t.tags : t.tags ? [t.tags] : [], // Ensure tags is always an array
      speaker: t.speaker || "Unknown",
    }))
    .filter((note) => !currentSessionNoteIds.includes(note.id)); // Filter out current session notes

  useEffect(() => {
    // Refetch data when refreshTrigger changes
    if (refreshTrigger !== undefined) {
      fetchHistoryData();
    }
  }, [refreshTrigger]);

  return (
    <div ref={notesContainerRef} className="space-y-4">
      {filteredNotes.map((note) => (
        <Card
          key={note.id}
          className={cn(
            "shadow-2xl backdrop-blur-sm cursor-pointer transition-all duration-300 hover:shadow-3xl hover:border-blue-500/50",
            isDarkMode
              ? "border-gray-100 bg-[rgb(16,20,44)] hover:bg-[rgb(16,20,44)] text-white"
              : "border-gray-100 bg-[rgba(247, 247, 247, 1)] hover:bg-[rgba(255, 255, 255, 1)] text-black",
            selectedNote?.id === note.id && "ring-2 ring-blue-500 shadow-3xl",
            zoomedNote === note.id
              ? "fixed inset-4 z-50 scale-100 overflow-auto"
              : "hover:scale-[1.02]"
          )}
          onClick={() => {
            if (selectedNote?.id !== note.id) {
              setSelectedNote(note);
            } else {
              setSelectedNote(null);
            }
          }}
        >
          {zoomedNote === note.id && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={handleZoomOut}
            />
          )}

          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <CardTitle
                    className={cn(isDarkMode ? "text-white" : "text-gray-900")}
                  >
                    {note.title}
                  </CardTitle>
                  {bookmarkedNotes.has(note.id) && (
                    <Bookmark className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                <div
                  className={cn(
                    "flex items-center space-x-4 text-sm",
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  )}
                >
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{note.duration}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>{note.speaker || "Unknown"}</span>
                  </div>
                  <span>{note.createdAt}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    isDarkMode
                      ? "text-gray-400 hover:text-white hover:bg-gray-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookmark(note.id);
                  }}
                >
                  <Bookmark
                    className={cn(
                      "w-4 h-4",
                      bookmarkedNotes.has(note.id)
                        ? "text-yellow-500 fill-yellow-500"
                        : ""
                    )}
                  />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    isDarkMode
                      ? "text-gray-400 hover:text-red-400 hover:bg-gray-700"
                      : "text-gray-600 hover:text-red-500 hover:bg-gray-100"
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
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
                  zoomedNote === note.id && "text-lg p-6 leading-relaxed"
                )}
              >
                {note.summary}
              </p>
            </div>

            {(selectedNote?.id === note.id || zoomedNote === note.id) && (
              <div
                className={cn(
                  "p-4 border rounded-lg shadow-sm mt-6",
                  isDarkMode
                    ? "border-gray-600 bg-[#1e293b]/70 text-gray-200"
                    : "border-gray-300 bg-white text-gray-900"
                )}
              >
                <h4
                  className={cn(
                    "font-semibold mb-2",
                    isDarkMode ? "text-gray-100" : "text-gray-900"
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

            {/* Fixed Tags Section */}
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {note.tags.map((tag, index) => (
                  <Badge
                    key={`${tag}-${index}`}
                    variant="outline"
                    className={cn(
                      "px-3 py-1 text-sm transition-all duration-300",
                      isDarkMode
                        ? "border-gray-600 text-gray-300 bg-gray-800/50 hover:bg-gray-700/50"
                        : "border-gray-400 text-gray-700 bg-gray-100/50 hover:bg-gray-200/50",
                      selectedNote?.id === note.id && "text-base px-4 py-2",
                      zoomedNote === note.id && "text-lg px-5 py-3"
                    )}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}