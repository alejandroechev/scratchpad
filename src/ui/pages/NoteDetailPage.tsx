import { useRef, useState } from "react";
import { extractUrls } from "../../domain/models/note.js";
import type { NoteImage } from "../../domain/models/note.js";
import { ImageThumbnail } from "../components/ImageThumbnail.js";

interface NoteDetailPageProps {
  noteId: string;
  initialContent: string;
  initialCreatedAt: string;
  initialUpdatedAt: string;
  images?: NoteImage[];
  onSave: (content: string) => void;
  onArchive: () => void;
  onBack: () => void;
  onRemoveImage?: (blobId: string) => void;
  onAddImage?: (file: File) => void;
}

export function NoteDetailPage({
  initialContent,
  initialCreatedAt,
  initialUpdatedAt,
  images,
  onSave,
  onArchive,
  onBack,
  onRemoveImage,
  onAddImage,
}: NoteDetailPageProps) {
  const [content, setContent] = useState(initialContent);
  const hasChanges = content !== initialContent;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAddImage) onAddImage(file);
    e.target.value = "";
  };
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

        {images && images.length > 0 && (
          <div data-testid="image-gallery">
            <p className="text-xs font-semibold text-amber-700 mb-1">Imágenes</p>
            <div className="grid grid-cols-2 gap-2">
              {images.map((img) => (
                <div key={img.blobId} className="relative" data-testid={`gallery-item-${img.blobId}`}>
                  <ImageThumbnail blobId={img.blobId} className="w-full h-32" />
                  {onRemoveImage && (
                    <button
                      onClick={() => onRemoveImage(img.blobId)}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6
                                 flex items-center justify-center text-xs hover:bg-black/70"
                      data-testid={`remove-image-${img.blobId}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {onAddImage && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              data-testid="detail-file-input"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-700
                         hover:bg-amber-100"
              data-testid="detail-add-image-button"
            >
              📷 Adjuntar imagen
            </button>
          </div>
        )}

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

        <button
          onClick={onArchive}
          className="w-full rounded-lg border border-amber-300 py-2 text-sm text-amber-700
                     hover:bg-amber-100"
          data-testid="archive-button"
        >
          📦 Archivar
        </button>
      </div>
    </div>
  );
}
