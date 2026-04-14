import { useRef, useState } from "react";
import { NoteCard } from "./NoteCard.js";
import type { Note } from "../../domain/models/note.js";

interface SwipeableNoteCardProps {
  note: Note;
  onClick: (id: string) => void;
  onArchive: (id: string) => void;
  onAddImage: (id: string, file: File) => void;
  onAddLabel: (id: string, label: string) => void;
  allLabels: string[];
}

const ACTION_PANEL_WIDTH = 180;
const SWIPE_THRESHOLD = 60;

export function SwipeableNoteCard({
  note,
  onClick,
  onArchive,
  onAddImage,
  onAddLabel,
  allLabels,
}: SwipeableNoteCardProps) {
  const startX = useRef(0);
  const currentX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showLabelPopup, setShowLabelPopup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (showLabelPopup) return;
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    currentX.current = e.touches[0].clientX;
    const dx = currentX.current - startX.current;
    // Only allow left swipe (negative), or dragging back if already revealed
    const base = revealed ? -ACTION_PANEL_WIDTH : 0;
    setOffset(Math.min(0, base + dx));
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    if (offset < -SWIPE_THRESHOLD) {
      setOffset(-ACTION_PANEL_WIDTH);
      setRevealed(true);
    } else {
      setOffset(0);
      setRevealed(false);
      setShowLabelPopup(false);
    }
  };

  const closePanel = () => {
    setOffset(0);
    setRevealed(false);
    setShowLabelPopup(false);
  };

  return (
    <div className="relative overflow-visible rounded-lg" data-testid={`swipeable-card-${note.id}`}>
      {/* Action panel behind the card */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-stretch rounded-r-lg overflow-hidden"
        style={{ width: ACTION_PANEL_WIDTH }}
      >
        <button
          onClick={() => { onArchive(note.id); closePanel(); }}
          className="flex-1 bg-amber-600 text-white flex flex-col items-center justify-center text-xs gap-1"
          data-testid={`swipe-archive-${note.id}`}
        >
          <span>📦</span><span>Archivar</span>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 bg-blue-500 text-white flex flex-col items-center justify-center text-xs gap-1"
          data-testid={`swipe-image-${note.id}`}
        >
          <span>📷</span><span>Imagen</span>
        </button>
        <button
          onClick={() => setShowLabelPopup(true)}
          className="flex-1 bg-green-500 text-white flex flex-col items-center justify-center text-xs gap-1"
          data-testid={`swipe-label-${note.id}`}
        >
          <span>🏷</span><span>Etiqueta</span>
        </button>
      </div>

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        data-testid={`swipe-file-input-${note.id}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onAddImage(note.id, file);
          e.target.value = "";
          closePanel();
        }}
      />

      {/* Swipeable card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={revealed && !showLabelPopup ? closePanel : undefined}
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? "none" : "transform 0.3s ease-out",
          position: "relative",
          zIndex: 10,
        }}
      >
        <NoteCard note={note} onClick={revealed ? () => closePanel() : onClick} />
      </div>

      {/* Label popup */}
      {showLabelPopup && (
        <div
          className="absolute right-0 top-full mt-1 z-30 bg-white rounded-lg shadow-lg border border-amber-200 p-2 w-56"
          data-testid={`swipe-label-popup-${note.id}`}
        >
          <div className="flex flex-wrap gap-1 mb-2">
            {allLabels
              .filter((l) => !note.labels?.includes(l))
              .map((l) => (
                <button
                  key={l}
                  onClick={() => { onAddLabel(note.id, l); closePanel(); }}
                  className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs hover:bg-amber-200"
                >
                  + {l}
                </button>
              ))}
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Nueva etiqueta..."
              className="flex-1 border border-amber-300 rounded-full px-2 py-1 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                  onAddLabel(note.id, e.currentTarget.value.trim());
                  closePanel();
                }
              }}
              data-testid={`swipe-label-input-${note.id}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
