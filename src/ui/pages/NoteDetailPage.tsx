import { useState } from "react";
import { extractUrls } from "../../domain/models/note.js";

interface NoteDetailPageProps {
  noteId: string;
  initialContent: string;
  initialCreatedAt: string;
  initialUpdatedAt: string;
  onSave: (content: string) => void;
  onArchive: () => void;
  onDelete: () => void;
  onBack: () => void;
}

export function NoteDetailPage({
  initialContent,
  initialCreatedAt,
  initialUpdatedAt,
  onSave,
  onArchive,
  onDelete,
  onBack,
}: NoteDetailPageProps) {
  const [content, setContent] = useState(initialContent);
  const hasChanges = content !== initialContent;
  const urls = extractUrls(content);

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <header className="bg-amber-600 text-white px-4 py-3 shadow-md flex items-center gap-3">
        <button onClick={onBack} className="text-white text-lg" data-testid="back-button">
          ←
        </button>
        <h1 className="text-lg font-bold flex-1">Detalle</h1>
        <button
          onClick={() => onSave(content)}
          disabled={!hasChanges}
          className="text-sm bg-amber-700 px-3 py-1 rounded disabled:opacity-40"
          data-testid="save-button"
        >
          Guardar
        </button>
      </header>

      <div className="flex-1 p-3 flex flex-col gap-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 min-h-[200px] rounded-lg border border-amber-200 bg-white p-3 text-sm text-gray-900
                     resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
          data-testid="note-editor"
        />

        {urls.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {urls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs bg-blue-50 text-blue-600 rounded px-2 py-1
                           hover:bg-blue-100 truncate max-w-[250px]"
              >
                🔗 {new URL(url).hostname}
              </a>
            ))}
          </div>
        )}

        <div className="text-xs text-amber-700 space-y-0.5">
          <p>Creado: {new Date(initialCreatedAt).toLocaleString("es")}</p>
          <p>Actualizado: {new Date(initialUpdatedAt).toLocaleString("es")}</p>
        </div>

        <div className="flex gap-2 mt-2">
          <button
            onClick={onArchive}
            className="flex-1 rounded-lg border border-amber-300 py-2 text-sm text-amber-700
                       hover:bg-amber-100"
            data-testid="archive-button"
          >
            📦 Archivar
          </button>
          <button
            onClick={onDelete}
            className="flex-1 rounded-lg border border-red-300 py-2 text-sm text-red-600
                       hover:bg-red-50"
            data-testid="delete-button"
          >
            🗑️ Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
