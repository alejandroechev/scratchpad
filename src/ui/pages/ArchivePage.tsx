import { useState, useEffect } from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { listNotes } from "../../infra/store-provider.js";
import type { Note } from "../../domain/models/note.js";

interface ArchivePageProps {
  onBack: () => void;
  onUnarchive: (id: string) => void;
}

export function ArchivePage({ onBack, onUnarchive }: ArchivePageProps) {
  const [archivedNotes, setArchivedNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
      <header className="bg-amber-600 text-white px-4 py-3 shadow-md flex items-center pt-[env(safe-area-inset-top)]">
        <button
          onClick={onBack}
          className="text-amber-200 hover:text-white mr-3"
          data-testid="archive-back-button"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Archivo</h1>
      </header>

      <div className="px-4 pt-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar en archivo..."
          className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-gray-900
                     placeholder:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          data-testid="archive-search-input"
        />
      </div>

      <div className="flex-1 p-4">
        {(() => {
          const filteredNotes = search.trim()
            ? archivedNotes.filter(n => n.content.toLowerCase().includes(search.toLowerCase()))
            : archivedNotes;

          if (loading) {
            return (
              <div className="flex items-center justify-center py-16">
                <p className="text-amber-600">Cargando...</p>
              </div>
            );
          }

          if (filteredNotes.length === 0) {
            return (
              <div className="flex items-center justify-center py-16">
                <p className="text-amber-600">
                  {search.trim() ? "No se encontraron notas" : "No hay notas archivadas"}
                </p>
              </div>
            );
          }

          return (
            <div className="space-y-3">
              {filteredNotes.map((note) => (
                <div key={note.id} className="bg-white rounded-lg p-4 shadow-sm border border-amber-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 line-clamp-3 whitespace-pre-wrap break-words">
                        {note.content || "Sin contenido"}
                      </p>
                      {(note.labels ?? []).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(note.labels ?? []).map((label) => (
                            <span key={label} className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px]">
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Creado: {new Date(note.createdAt).toLocaleDateString("es-ES")} · Actualizado: {new Date(note.updatedAt).toLocaleDateString("es-ES")}
                      </p>
                      {(note.images ?? []).length > 0 && (
                        <span className="text-xs text-blue-600">
                          📷 {(note.images ?? []).length} {(note.images ?? []).length === 1 ? "imagen" : "imágenes"}
                        </span>
                      )}
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
          );
        })()}
      </div>
    </div>
  );
}