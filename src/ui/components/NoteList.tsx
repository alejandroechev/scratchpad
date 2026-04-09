import type { Note } from "../../domain/models/note.js";
import { SwipeableNoteCard } from "./SwipeableNoteCard.js";

interface NoteListProps {
  notes: Note[];
  onNoteClick: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NoteList({ notes, onNoteClick, onArchive, onDelete }: NoteListProps) {
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-amber-400">
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
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
