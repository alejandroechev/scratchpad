import { useRef, useState, useEffect } from "react";
import { ArchiveBoxIcon, CameraIcon, TagIcon, CheckIcon, ListBulletIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { NoteCard } from "./NoteCard.js";
import type { Note } from "../../domain/models/note.js";
import { getLabelColor } from "../../domain/services/label-color.js";

interface SwipeableNoteCardProps {
  note: Note;
  onClick: (id: string) => void;
  onArchive: (id: string) => void;
  onAddImage: (id: string, file: File) => void;
  onAddLabel: (id: string, label: string) => void;
  onConvertToChecklist: (id: string) => void;
  onConvertToNote?: (id: string) => void;
  allLabels: string[];
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  selectionMode?: boolean;
}

const ACTION_PANEL_WIDTH = 260;
const SWIPE_THRESHOLD = 60;

export function SwipeableNoteCard({
  note,
  onClick,
  onArchive,
  onAddImage,
  onAddLabel,
  onConvertToChecklist,
  onConvertToNote,
  allLabels,
  isSelected,
  onToggleSelect,
  selectionMode,
}: SwipeableNoteCardProps) {
  const startX = useRef(0);
  const currentX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showLabelPopup, setShowLabelPopup] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
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
    // Only allow right swipe (positive), or dragging back if already revealed
    const base = revealed ? ACTION_PANEL_WIDTH : 0;
    setOffset(Math.max(0, base + dx));
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    if (offset > SWIPE_THRESHOLD) {
      setOffset(ACTION_PANEL_WIDTH);
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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // Close context menu on click anywhere
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  return (
    <div className={`relative rounded-lg ${showLabelPopup ? "overflow-visible" : "overflow-hidden"}`} data-testid={`swipeable-card-${note.id}`}>
      {/* Action panel behind the card — only rendered when swiped */}
      {(revealed || offset > 0) && <div
        className="absolute left-0 top-0 bottom-0 flex items-stretch rounded-l-lg overflow-hidden"
        style={{ width: ACTION_PANEL_WIDTH }}
      >
        <button
          onClick={() => { onArchive(note.id); closePanel(); }}
          className="flex-1 bg-amber-600 text-white flex flex-col items-center justify-center text-[10px] gap-0.5 px-1"
          data-testid={`swipe-archive-${note.id}`}
        >
          <ArchiveBoxIcon className="w-4 h-4" /><span>Archivar</span>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 bg-blue-500 text-white flex flex-col items-center justify-center text-[10px] gap-0.5 px-1"
          data-testid={`swipe-image-${note.id}`}
        >
          <CameraIcon className="w-4 h-4" /><span>Imagen</span>
        </button>
        <button
          onClick={() => setShowLabelPopup(true)}
          className="flex-1 bg-green-500 text-white flex flex-col items-center justify-center text-[10px] gap-0.5 px-1"
          data-testid={`swipe-label-${note.id}`}
        >
          <TagIcon className="w-4 h-4" /><span>Etiqueta</span>
        </button>
        {(note.checklistItems ?? []).length === 0 ? (
          <button
            onClick={() => { onConvertToChecklist(note.id); closePanel(); }}
            className="flex-1 bg-indigo-500 text-white flex flex-col items-center justify-center text-[10px] gap-0.5 px-1"
            data-testid={`swipe-checklist-${note.id}`}
          >
            <ListBulletIcon className="w-4 h-4" /><span>Lista</span>
          </button>
        ) : (
          <button
            onClick={() => { onConvertToNote?.(note.id); closePanel(); }}
            className="flex-1 bg-amber-500 text-white flex flex-col items-center justify-center text-[10px] gap-0.5 px-1"
            data-testid={`swipe-to-note-${note.id}`}
          >
            <DocumentTextIcon className="w-4 h-4" /><span>Nota</span>
          </button>
        )}
        <button
          onClick={() => { onToggleSelect?.(note.id); closePanel(); }}
          className="flex-1 bg-cyan-500 text-white flex flex-col items-center justify-center text-[10px] gap-0.5 px-1"
          data-testid={`swipe-select-${note.id}`}
        >
          <CheckIcon className="w-4 h-4" />
          <span>Seleccionar</span>
        </button>
      </div>}

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
        onContextMenu={handleContextMenu}
        onClick={revealed && !showLabelPopup ? closePanel : undefined}
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? "none" : "transform 0.3s ease-out",
          position: "relative",
          zIndex: 10,
        }}
      >
        <NoteCard note={note} onClick={revealed ? () => closePanel() : onClick} isSelected={isSelected} onToggleSelect={onToggleSelect} selectionMode={selectionMode} />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-amber-200 py-1 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onArchive(note.id); setContextMenu(null); }}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 flex items-center gap-2"
          >
            <ArchiveBoxIcon className="w-4 h-4 text-amber-600" /> Archivar
          </button>
          <button
            onClick={() => { fileInputRef.current?.click(); setContextMenu(null); }}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 flex items-center gap-2"
          >
            <CameraIcon className="w-4 h-4 text-blue-500" /> Adjuntar imagen
          </button>
          <button
            onClick={() => { setShowLabelPopup(true); setContextMenu(null); }}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 flex items-center gap-2"
          >
            <TagIcon className="w-4 h-4 text-green-500" /> Agregar etiqueta
          </button>
          {(note.checklistItems ?? []).length === 0 ? (
            <button
              onClick={() => { onConvertToChecklist(note.id); setContextMenu(null); }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 flex items-center gap-2"
            >
              <ListBulletIcon className="w-4 h-4 text-indigo-500" /> Hacer lista
            </button>
          ) : (
            <button
              onClick={() => { onConvertToNote?.(note.id); setContextMenu(null); }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 flex items-center gap-2"
            >
              <DocumentTextIcon className="w-4 h-4 text-amber-500" /> Convertir a nota
            </button>
          )}
          <button
            onClick={() => { onToggleSelect?.(note.id); setContextMenu(null); }}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 flex items-center gap-2"
          >
            <CheckIcon className="w-4 h-4 text-cyan-500" />
            {isSelected ? "Deseleccionar" : "Seleccionar"}
          </button>
        </div>
      )}

      {/* Label popup */}
      {showLabelPopup && (
        <div
          className="absolute right-0 top-full mt-1 z-30 bg-white rounded-lg shadow-lg border border-amber-200 p-2 w-56"
          data-testid={`swipe-label-popup-${note.id}`}
        >
          <div className="flex flex-wrap gap-1 mb-2">
            {allLabels
              .filter((l) => !note.labels?.includes(l))
              .map((l) => {
                const color = getLabelColor(l);
                return (
                  <button
                    key={l}
                    onClick={() => { onAddLabel(note.id, l); closePanel(); }}
                    className="rounded-full px-2 py-0.5 text-xs hover:opacity-80"
                    style={{ backgroundColor: color.bg, color: color.text }}
                  >
                    + {l}
                  </button>
                );
              })}
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
