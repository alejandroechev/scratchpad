import { useRef, useState } from "react";
import { NoteCard } from "./NoteCard.js";
import type { Note } from "../../domain/models/note.js";

interface SwipeableNoteCardProps {
  note: Note;
  onClick: (id: string) => void;
  onArchive: (id: string) => void;
}

const SWIPE_THRESHOLD = 80;

export function SwipeableNoteCard({ note, onClick, onArchive }: SwipeableNoteCardProps) {
  const startX = useRef(0);
  const currentX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    currentX.current = e.touches[0].clientX;
    const dx = currentX.current - startX.current;
    setOffset(dx);
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    if (Math.abs(offset) > SWIPE_THRESHOLD) {
      // Any swipe beyond threshold → archive
      setDismissed(true);
      setTimeout(() => onArchive(note.id), 300);
    } else {
      setOffset(0);
    }
  };

  const bgColor = Math.abs(offset) > SWIPE_THRESHOLD / 2
    ? "bg-amber-500"
    : "bg-gray-200";

  const label = Math.abs(offset) > SWIPE_THRESHOLD / 2
    ? "📦 Archivar"
    : "";

  return (
    <div
      className={`relative overflow-hidden rounded-lg ${dismissed ? "opacity-0 max-h-0 transition-all duration-300" : ""}`}
    >
      {/* Background action indicator */}
      <div className={`absolute inset-0 ${bgColor} rounded-lg flex items-center justify-center`}>
        <span className="text-white text-sm font-medium">{label}</span>
      </div>

      {/* Swipeable card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? "none" : "transform 0.3s ease-out",
        }}
      >
        <NoteCard note={note} onClick={onClick} />
      </div>
    </div>
  );
}
