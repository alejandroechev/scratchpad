import { useState, useMemo } from "react";
import { useNotes } from "./ui/hooks/useNotes";
import { QuickAddBar } from "./ui/components/QuickAddBar";
import { NoteList } from "./ui/components/NoteList";
import { NoteDetailPage } from "./ui/pages/NoteDetailPage";
import { ArchivePage } from "./ui/pages/ArchivePage";
import { FilterChipRow } from "./ui/components/FilterChipRow";
import { SyncInfo } from "./ui/components/SyncInfo";
import { SyncStatus } from "./ui/components/SyncStatus";
import { SyncAuthGate } from "./ui/components/SyncAuthGate";
import { removeImage, addImage, createNote, unarchiveNote, addLabel, removeLabel } from "./infra/store-provider.js";
import { storeAndSyncBlob } from "./infra/automerge/blob-sync.js";
import { getActiveProfile, clearActiveProfile } from "./infra/profile-store.js";
import { resetDocHandle } from "./infra/automerge/repo.js";

function AppContent() {
  const [search, setSearch] = useState("");
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const activeProfile = getActiveProfile();
  const filters = useMemo(() => ({ search: search || undefined, label: activeLabel || undefined }), [search, activeLabel]);
  const { notes, loading, addNote, editNote, archiveNote, refresh } = useNotes(filters);

  const allLabels = useMemo(() => [...new Set(notes.flatMap(n => n.labels ?? []))].sort(), [notes]);

  if (showArchive) {
    return (
      <ArchivePage 
        onBack={() => {
          setShowArchive(false);
          // Refresh notes when coming back from archive
          refresh();
        }} 
        onUnarchive={async (id) => { 
          await unarchiveNote(id); 
        }} 
      />
    );
  }

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
        labels={note?.labels}
        allLabels={allLabels}
        onAddLabel={async (label) => {
          await addLabel(selectedNoteId, label);
        }}
        onRemoveLabel={async (label) => {
          await removeLabel(selectedNoteId, label);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <header className="bg-amber-600 text-white px-4 py-3 shadow-md flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-lg font-bold">ScratchPad</h1>
          {activeProfile && (
            <button
              onClick={() => {
                clearActiveProfile();
                resetDocHandle();
                window.location.reload();
              }}
              className="text-xs bg-amber-700 px-2 py-0.5 rounded ml-2 hover:bg-amber-800"
              data-testid="profile-badge"
            >
              {activeProfile.name}
            </button>
          )}
        </div>
        <SyncStatus />
        <button onClick={() => setShowArchive(true)} className="text-amber-200 text-sm hover:text-white" data-testid="archive-nav-button">📦</button>
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
      <FilterChipRow
        labels={allLabels}
        activeLabel={activeLabel}
        onLabelSelect={setActiveLabel}
        searchText={search}
        onSearchChange={setSearch}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-amber-600">Cargando...</p>
        </div>
      ) : (
        <NoteList
          notes={notes}
          onNoteClick={setSelectedNoteId}
          onArchive={archiveNote}
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
