import { useRef, useState, useMemo, useEffect } from "react";
import { extractUrls } from "../../domain/models/note.js";
import type { NoteImage } from "../../domain/models/note.js";
import { ImageThumbnail } from "../components/ImageThumbnail.js";

interface NoteDetailPageProps {
  noteId: string;
  initialContent: string;
  initialCreatedAt: string;
  initialUpdatedAt: string;
  images?: NoteImage[];
  labels?: string[];
  allLabels?: string[];
  onSave: (content: string) => void;
  onArchive: () => void;
  onBack: () => void;
  onRemoveImage?: (blobId: string) => void;
  onAddImage?: (file: File) => void;
  onAddLabel?: (label: string) => void;
  onRemoveLabel?: (label: string) => void;
}

export function NoteDetailPage({
  initialContent,
  initialCreatedAt,
  initialUpdatedAt,
  images,
  labels,
  allLabels,
  onSave,
  onArchive,
  onBack,
  onRemoveImage,
  onAddImage,
  onAddLabel,
  onRemoveLabel,
}: NoteDetailPageProps) {
  const [content, setContent] = useState(initialContent);
  const [labelInput, setLabelInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  // Debounced auto-save
  useEffect(() => {
    if (content === initialContent) return;
    const timer = setTimeout(() => {
      onSave(content);
    }, 1000);
    return () => clearTimeout(timer);
  }, [content]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save on unmount
  useEffect(() => {
    return () => {
      if (contentRef.current !== initialContent) {
        onSave(contentRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const suggestions = useMemo(() => {
    if (!labelInput.trim() || !allLabels) return [];
    return allLabels
      .filter(label => 
        label.toLowerCase().includes(labelInput.toLowerCase()) &&
        !labels?.includes(label)
      )
      .slice(0, 5);
  }, [labelInput, allLabels, labels]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAddImage) onAddImage(file);
    e.target.value = "";
  };

  const handleLabelSubmit = () => {
    const trimmedLabel = labelInput.trim();
    if (trimmedLabel && onAddLabel && !labels?.includes(trimmedLabel)) {
      onAddLabel(trimmedLabel);
      setLabelInput("");
      setShowSuggestions(false);
    }
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLabelSubmit();
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };
  const urls = extractUrls(content);

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col pb-[env(safe-area-inset-bottom,20px)]">
      <header className="bg-amber-600 text-white px-4 py-3 shadow-md flex items-center gap-3">
        <button onClick={() => {
          if (contentRef.current !== initialContent) {
            onSave(contentRef.current);
          }
          onBack();
        }} className="text-white text-lg" data-testid="back-button">
          ←
        </button>
        <h1 className="text-lg font-bold flex-1">Detalle</h1>
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

        {/* Labels section */}
        <div data-testid="label-section">
          <p className="text-xs font-semibold text-amber-700 mb-1">Etiquetas</p>
          
          {/* Existing labels as removable chips */}
          <div className="flex flex-wrap gap-1 mb-2">
            {(labels ?? []).map((label) => (
              <span key={label} className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs">
                {label}
                {onRemoveLabel && (
                  <button 
                    onClick={() => onRemoveLabel(label)} 
                    className="text-amber-600 hover:text-amber-900" 
                    data-testid={`remove-label-${label}`}
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
          
          {/* Add label input */}
          {onAddLabel && (
            <div className="relative">
              <div className="flex gap-1">
                <input 
                  type="text" 
                  placeholder="Agregar etiqueta..." 
                  value={labelInput}
                  onChange={(e) => {
                    setLabelInput(e.target.value);
                    setShowSuggestions(e.target.value.trim().length > 0);
                  }}
                  onKeyDown={handleLabelKeyDown}
                  onBlur={() => {
                    // Small delay to allow clicking on suggestions
                    setTimeout(() => setShowSuggestions(false), 150);
                  }}
                  onFocus={() => {
                    if (labelInput.trim()) setShowSuggestions(true);
                  }}
                  className="flex-1 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs
                             focus:outline-none focus:ring-2 focus:ring-amber-400"
                  data-testid="add-label-input" 
                />
                <button
                  onClick={handleLabelSubmit}
                  className="rounded-full bg-amber-600 text-white px-3 py-1 text-xs hover:bg-amber-700
                             disabled:opacity-50"
                  disabled={!labelInput.trim()}
                  data-testid="add-label-button"
                >
                  +
                </button>
              </div>
              
              {/* Autocomplete suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-amber-300 rounded-lg 
                               shadow-lg z-10 mt-1 max-h-32 overflow-y-auto">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setLabelInput(suggestion);
                        handleLabelSubmit();
                      }}
                      className="w-full text-left px-3 py-1 text-xs hover:bg-amber-50 first:rounded-t-lg 
                                 last:rounded-b-lg"
                      data-testid={`suggestion-${suggestion}`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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
