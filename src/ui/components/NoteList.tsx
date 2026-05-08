import type { Note } from "../../domain/models/note.js";
import { SwipeableNoteCard } from "./SwipeableNoteCard.js";

interface NoteListProps {
  notes: Note[];
  onNoteClick: (id: string) => void;
  onArchive: (id: string) => void;
  onAddImage: (id: string, file: File) => void;
  onAddLabel: (id: string, label: string) => void;
  onConvertToChecklist: (id: string) => void;
  onConvertToNote?: (id: string) => void;
  allLabels: string[];
  selectedNoteIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export function NoteList({ notes, onNoteClick, onArchive, onAddImage, onAddLabel, onConvertToChecklist, onConvertToNote, allLabels, selectedNoteIds, onToggleSelect }: NoteListProps) {
  const selectionMode = (selectedNoteIds?.size ?? 0) > 0;
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-amber-600">
        <p className="text-lg">Sin notas aún</p>
        <p className="text-sm mt-1">Escribe algo arriba para empezar</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3" data-testid="note-list">
      {notes.map((note) => (
        <SwipeableNoteCard
          key={note.id}
          note={note}
          onClick={onNoteClick}
          onArchive={onArchive}
          onAddImage={onAddImage}
          onAddLabel={onAddLabel}
          onConvertToChecklist={onConvertToChecklist}
          onConvertToNote={onConvertToNote}
          allLabels={allLabels}
          isSelected={selectedNoteIds?.has(note.id)}
          onToggleSelect={onToggleSelect}
          selectionMode={selectionMode}
        />
      ))}
    </div>
  );
}
