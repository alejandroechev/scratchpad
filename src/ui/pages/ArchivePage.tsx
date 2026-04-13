import { useState, useEffect } from "react";
import { listNotes } from "../../infra/store-provider.js";
import type { Note } from "../../domain/models/note.js";

interface ArchivePageProps {
  onBack: () => void;
  onUnarchive: (id: string) => void;
}

export function ArchivePage({ onBack, onUnarchive }: ArchivePageProps) {
  const [archivedNotes, setArchivedNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadArchivedNotes() {
      try {
        const allNotes = await listNotes({ includeArchived: true });
        const archived = allNotes.filter(note => note.archived === true);
        setArchivedNotes(archived);
      } catch (error) {
        console.error("Error loading archived notes:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadArchivedNotes();
  }, []);

  const handleUnarchive = async (id: string) => {
    try {
      await onUnarchive(id);
      // Remove from local state
      setArchivedNotes(prev => prev.filter(note => note.id !== id));
    } catch (error) {
      console.error("Error unarchiving note:", error);
    }
  };

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col" data-testid="archive-page">
      <header className="bg-amber-600 text-white px-4 py-3 shadow-md flex items-center">
        <button
          onClick={onBack}
          className="text-amber-200 hover:text-white mr-3"
          data-testid="archive-back-button"
        >
          ←
        </button>
        <h1 className="text-lg font-bold">Archivo</h1>
      </header>

      <div className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-amber-600">Cargando...</p>
          </div>
        ) : archivedNotes.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-amber-600">No hay notas archivadas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {archivedNotes.map((note) => (
              <div key={note.id} className="bg-white rounded-lg p-4 shadow-sm border border-amber-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 line-clamp-3 whitespace-pre-wrap break-words">
                      {note.content || "Sin contenido"}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(note.createdAt).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUnarchive(note.id)}
                    className="ml-3 bg-amber-600 text-white px-3 py-1 rounded text-sm hover:bg-amber-700 flex-shrink-0"
                    data-testid={`unarchive-button-${note.id}`}
                  >
                    Desarchivar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}