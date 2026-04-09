import { useState, useMemo } from "react";
import { useNotes } from "./ui/hooks/useNotes";
import { QuickAddBar } from "./ui/components/QuickAddBar";
import { NoteList } from "./ui/components/NoteList";
import { NoteDetailPage } from "./ui/pages/NoteDetailPage";
import { SearchBar } from "./ui/components/SearchBar";

function App() {
  const [search, setSearch] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const filters = useMemo(() => ({ search: search || undefined }), [search]);
  const { notes, loading, addNote, editNote, archiveNote, removeNote } = useNotes(filters);

  if (selectedNoteId) {
    const note = notes.find((n) => n.id === selectedNoteId);
    return (
      <NoteDetailPage
        noteId={selectedNoteId}
        initialContent={note?.content ?? ""}
        initialCreatedAt={note?.createdAt ?? ""}
        initialUpdatedAt={note?.updatedAt ?? ""}
        onSave={async (content) => {
          await editNote(selectedNoteId, content);
          setSelectedNoteId(null);
        }}
        onArchive={async () => {
          await archiveNote(selectedNoteId);
          setSelectedNoteId(null);
        }}
        onDelete={async () => {
          await removeNote(selectedNoteId);
          setSelectedNoteId(null);
        }}
        onBack={() => setSelectedNoteId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <header className="bg-amber-600 text-white px-4 py-3 shadow-md">
        <h1 className="text-lg font-bold">ScratchPad</h1>
      </header>

      <QuickAddBar onAdd={addNote} />
      <SearchBar value={search} onChange={setSearch} />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-amber-400">Cargando...</p>
        </div>
      ) : (
        <NoteList
          notes={notes}
          onNoteClick={setSelectedNoteId}
          onArchive={archiveNote}
          onDelete={removeNote}
        />
      )}
    </div>
  );
}

export default App;
