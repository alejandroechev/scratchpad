import { useState, useMemo, useEffect } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { useNotes } from "./ui/hooks/useNotes";
import { QuickAddBar } from "./ui/components/QuickAddBar";
import { NoteList } from "./ui/components/NoteList";
import { NoteDetailPage } from "./ui/pages/NoteDetailPage";
import { ArchivePage } from "./ui/pages/ArchivePage";
import { MigrationPage } from "./ui/pages/MigrationPage";
import { FilterChipRow } from "./ui/components/FilterChipRow";
import { SyncInfo } from "./ui/components/SyncInfo";
import { SyncStatus } from "./ui/components/SyncStatus";
import { SyncAuthGate } from "./ui/components/SyncAuthGate";
import { addImage, createNote, unarchiveNote, addLabel, toggleTask, toggleTaskDone, mergeNotes, storeImageBlob, resetBackend } from "./infra/store-provider.js";
import { getActiveProfile, clearActiveProfile } from "./infra/profile-store.js";

function AppContent() {
  const [search, setSearch] = useState("");
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showMigration, setShowMigration] = useState(false);
  const [tasksOnly, setTasksOnly] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const activeProfile = getActiveProfile();
  const filters = useMemo(() => ({ search: search || undefined, label: activeLabel || undefined, tasksOnly: tasksOnly || undefined }), [search, activeLabel, tasksOnly]);
  const { notes, loading, addNote, editNote, archiveNote, refresh } = useNotes(filters);

  const allLabels = useMemo(() => [...new Set(notes.flatMap(n => n.labels ?? []))].sort(), [notes]);

  const toggleSelect = (id: string) => {
    setSelectedNoteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedNoteIds(new Set());

  const handleMerge = async () => {
    if (selectedNoteIds.size < 2) return;
    const selectedNotes = notes.filter(n => selectedNoteIds.has(n.id));
    const sorted = [...selectedNotes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const targetId = sorted[0].id;
    const sourceIds = sorted.slice(1).map(n => n.id);
    await mergeNotes(targetId, sourceIds);
    clearSelection();
    await refresh();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearSelection();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (activeLabel && !allLabels.includes(activeLabel)) {
      setActiveLabel(null);
    }
  }, [allLabels, activeLabel]);

  // Handle Android back button for detail view
  useEffect(() => {
    if (!selectedNoteId) return;
    
    // Push a history entry so back button navigates to list instead of exiting
    window.history.pushState({ view: 'detail' }, '');
    
    const handlePopState = () => {
      setSelectedNoteId(null);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedNoteId]);

  // Handle Android back button for archive view
  useEffect(() => {
    if (!showArchive) return;
    window.history.pushState({ view: 'archive' }, '');
    const handlePopState = () => {
      setShowArchive(false);
      refresh();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showArchive]);

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

  if (showMigration) {
    return <MigrationPage onClose={() => { setShowMigration(false); refresh(); }} />;
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
        }}
        onBack={() => setSelectedNoteId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col pb-[env(safe-area-inset-bottom,20px)]">
      <div className="sticky top-0 z-20 pt-[env(safe-area-inset-top)] bg-amber-600">
        <header className="bg-amber-600 text-white px-4 py-3 shadow-md flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-lg font-bold">ScratchPad</h1>
            {activeProfile && (
              <button
                onClick={() => {
                  clearActiveProfile();
                  resetBackend();
                  window.location.reload();
                }}
                className="text-xs bg-amber-700 px-2 py-0.5 rounded ml-2 hover:bg-amber-800"
                data-testid="profile-badge"
              >
                {activeProfile.name}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <SyncStatus />
            <button onClick={() => setShowArchive(true)} className="text-amber-200 text-sm hover:text-white" data-testid="archive-nav-button">Archivo</button>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="text-amber-200 text-sm hover:text-white"
              data-testid="info-button"
            >
              <InformationCircleIcon className="w-5 h-5" />
            </button>
          </div>
        </header>

        {showInfo && (
          <>
            <SyncInfo />
            <div className="mx-3 mb-2">
              <button
                onClick={() => setShowMigration(true)}
                className="w-full py-1.5 px-3 bg-amber-700 text-white text-xs rounded-lg hover:bg-amber-800"
              >
                Migrar datos desde Automerge
              </button>
            </div>
          </>
        )}

        <QuickAddBar
          onAdd={addNote}
          onAddAndOpen={async (content) => {
            const note = await createNote(content);
            await refresh();
            setSelectedNoteId(note.id);
          }}
          onAddImage={async (file) => {
            const { blobId, sizeBytes } = await storeImageBlob(file);
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
          tasksOnly={tasksOnly}
          onTasksOnlyToggle={() => setTasksOnly(!tasksOnly)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-amber-600">Cargando...</p>
        </div>
      ) : (
        <NoteList
          notes={notes}
          onNoteClick={setSelectedNoteId}
          onArchive={archiveNote}
          onAddImage={async (id, file) => {
            const { blobId, sizeBytes } = await storeImageBlob(file);
            await addImage(id, {
              blobId,
              fileName: file.name,
              sizeBytes,
              createdAt: new Date().toISOString(),
            });
            await refresh();
          }}
          onAddLabel={async (id, label) => {
            await addLabel(id, label);
            await refresh();
          }}
          onToggleTask={async (id) => {
            await toggleTask(id);
            await refresh();
          }}
          onToggleDone={async (id) => {
            await toggleTaskDone(id);
            await refresh();
          }}
          allLabels={allLabels}
          selectedNoteIds={selectedNoteIds}
          onToggleSelect={toggleSelect}
        />
      )}

      {selectedNoteIds.size >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-amber-200 shadow-lg px-4 py-3 flex items-center justify-between pb-[env(safe-area-inset-bottom,12px)]"
             data-testid="merge-bar">
          <span className="text-sm text-gray-600">{selectedNoteIds.size} notas seleccionadas</span>
          <div className="flex gap-2">
            <button
              onClick={clearSelection}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
              data-testid="merge-cancel-button"
            >
              Cancelar
            </button>
            <button
              onClick={handleMerge}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700"
              data-testid="merge-button"
            >
              Combinar ({selectedNoteIds.size})
            </button>
          </div>
        </div>
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
