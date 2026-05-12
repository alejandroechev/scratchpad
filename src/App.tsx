import { useState, useMemo, useEffect } from "react";
import { isNoteEmpty } from "./domain/models/note.js";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { useNotes } from "./ui/hooks/useNotes";
import { QuickAddBar } from "./ui/components/QuickAddBar";
import { NoteList } from "./ui/components/NoteList";
import { NoteDetailPage } from "./ui/pages/NoteDetailPage";
import { ArchivePage } from "./ui/pages/ArchivePage";
import { FilterChipRow } from "./ui/components/FilterChipRow";
import { SyncInfo } from "./ui/components/SyncInfo";
import { SyncStatus } from "./ui/components/SyncStatus";
import { SyncAuthGate } from "./ui/components/SyncAuthGate";
import { addImage, createNote, unarchiveNote, addLabel, mergeNotes, storeImageBlob, resetBackend, convertToChecklist, convertToNote, toggleChecklistItem, addChecklistItem, removeChecklistItem, editChecklistItem, deleteNote, setHideCompleted } from "./infra/store-provider.js";
import { getActiveProfile, clearActiveProfile } from "./infra/profile-store.js";

function AppContent() {
  const [search, setSearch] = useState("");
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const activeProfile = getActiveProfile();
  const filters = useMemo(() => ({ search: search || undefined, label: activeLabel ?? undefined }), [search, activeLabel]);
  const { notes, loading, editNote, archiveNote, refresh } = useNotes(filters);

  const allLabels = useMemo(() => [...new Set(notes.flatMap(n => n.labels ?? []))].sort(), [notes]);

  // Auto-clear stale label filter (derived during render, not in an effect)
  const effectiveLabel = activeLabel && allLabels.includes(activeLabel) ? activeLabel : null;
  if (effectiveLabel !== activeLabel) {
    setActiveLabel(effectiveLabel);
  }

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
  }, [showArchive, refresh]);

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
        checklistItems={note?.checklistItems}
        hideCompleted={note?.hideCompleted}
        onSetHideCompleted={async (hide) => {
          await setHideCompleted(selectedNoteId, hide);
          await refresh();
        }}
        onToggleChecklistItem={async (i) => { await toggleChecklistItem(selectedNoteId, i); await refresh(); }}
        onAddChecklistItem={async (text) => { await addChecklistItem(selectedNoteId, text); await refresh(); }}
        onRemoveChecklistItem={async (i) => { await removeChecklistItem(selectedNoteId, i); await refresh(); }}
        onEditChecklistItem={async (i, text) => { await editChecklistItem(selectedNoteId, i, text); await refresh(); }}
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

        {showInfo && <SyncInfo />}

        <QuickAddBar
          onAddNote={async () => {
            const note = await createNote("");
            await refresh();
            setSelectedNoteId(note.id);
          }}
          onAddList={async () => {
            const note = await createNote("");
            await addChecklistItem(note.id, "");
            await refresh();
            setSelectedNoteId(note.id);
          }}
          onAddFromCamera={async (file) => {
            const { blobId, sizeBytes } = await storeImageBlob(file);
            const note = await createNote("");
            await addImage(note.id, {
              blobId,
              fileName: file.name,
              sizeBytes,
              createdAt: new Date().toISOString(),
            });
            await refresh();
          }}
          onAddFromGallery={async (file) => {
            const { blobId, sizeBytes } = await storeImageBlob(file);
            const note = await createNote("");
            await addImage(note.id, {
              blobId,
              fileName: file.name,
              sizeBytes,
              createdAt: new Date().toISOString(),
            });
            await refresh();
          }}
        />
        <FilterChipRow
          labels={allLabels}
          activeLabel={activeLabel}
          onLabelSelect={setActiveLabel}
          searchText={search}
          onSearchChange={setSearch}
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
          onArchive={async (id) => {
            const note = notes.find(n => n.id === id);
            if (note && isNoteEmpty(note)) {
              await deleteNote(id);
              await refresh();
            } else {
              await archiveNote(id);
            }
          }}
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
          onConvertToChecklist={async (id) => {
            await convertToChecklist(id);
            await refresh();
          }}
          onConvertToNote={async (id) => {
            await convertToNote(id);
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
