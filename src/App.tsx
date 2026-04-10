import { useState, useMemo } from "react";
import { useNotes } from "./ui/hooks/useNotes";
import { QuickAddBar } from "./ui/components/QuickAddBar";
import { NoteList } from "./ui/components/NoteList";
import { NoteDetailPage } from "./ui/pages/NoteDetailPage";
import { SearchBar } from "./ui/components/SearchBar";
import { SyncInfo } from "./ui/components/SyncInfo";
import { SyncStatus } from "./ui/components/SyncStatus";
import { SyncAuthGate } from "./ui/components/SyncAuthGate";
import { removeImage, addImage, createNote } from "./infra/store-provider.js";
import { storeAndSyncBlob } from "./infra/automerge/blob-sync.js";

function AppContent() {
  const [search, setSearch] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
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
        images={note?.images}
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
        onRemoveImage={async (blobId) => {
          await removeImage(selectedNoteId, blobId);
        }}
        onAddImage={async (file) => {
          const { blobId, sizeBytes } = await storeAndSyncBlob(file);
          await addImage(selectedNoteId, {
            blobId,
            fileName: file.name,
            sizeBytes,
            createdAt: new Date().toISOString(),
          });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <header className="bg-amber-600 text-white px-4 py-3 shadow-md flex items-center justify-between">
        <h1 className="text-lg font-bold">ScratchPad</h1>
        <SyncStatus />
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="text-amber-200 text-sm hover:text-white"
          data-testid="info-button"
        >
          ⓘ
        </button>
      </header>

      {showInfo && <SyncInfo />}

      <QuickAddBar
        onAdd={addNote}
        onAddImage={async (file) => {
          const { blobId, sizeBytes } = await storeAndSyncBlob(file);
          const note = await createNote("");
          await addImage(note.id, {
            blobId,
            fileName: file.name,
            sizeBytes,
            createdAt: new Date().toISOString(),
          });
        }}
      />
      <SearchBar value={search} onChange={setSearch} />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-amber-600">Cargando...</p>
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

function App() {
  return (
    <SyncAuthGate>
      <AppContent />
    </SyncAuthGate>
  );
}

export default App;
