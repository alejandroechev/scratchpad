import type { Note } from "../../domain/models/note.js";
import { SwipeableNoteCard } from "./SwipeableNoteCard.js";

interface NoteListProps {
  notes: Note[];
  onNoteClick: (id: string) => void;
  onArchive: (id: string) => void;
  onAddImage: (id: string, file: File) => void;
  onAddLabel: (id: string, label: string) => void;
  allLabels: string[];
}

export function NoteList({ notes, onNoteClick, onArchive, onAddImage, onAddLabel, allLabels }: NoteListProps) {
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
          allLabels={allLabels}
        />
      ))}
    </div>
  );
}
