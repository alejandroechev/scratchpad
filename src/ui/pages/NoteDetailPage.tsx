import { useRef, useState, useEffect } from "react";
import { ArrowLeftIcon, ArrowUturnLeftIcon, ArrowUturnRightIcon } from "@heroicons/react/24/outline";
import { extractUrls } from "../../domain/models/note.js";
import type { NoteImage } from "../../domain/models/note.js";
import { ImageThumbnail } from "../components/ImageThumbnail.js";
import { ImageViewerOverlay } from "../components/ImageViewerOverlay.js";

interface NoteDetailPageProps {
  noteId: string;
  initialContent: string;
  initialCreatedAt: string;
  initialUpdatedAt: string;
  images?: NoteImage[];
  onSave: (content: string) => void;
  onBack: () => void;
}

export function NoteDetailPage({
  initialContent,
  initialCreatedAt,
  initialUpdatedAt,
  images,
  onSave,
  onBack,
}: NoteDetailPageProps) {
  const [content, setContent] = useState(initialContent);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  const urls = extractUrls(content);

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col pb-[env(safe-area-inset-bottom,20px)]">
      <header className="bg-amber-600 text-white px-4 py-3 shadow-md flex items-center gap-3 pt-[env(safe-area-inset-top)]">
        <button onClick={() => {
          if (contentRef.current !== initialContent) {
            onSave(contentRef.current);
          }
          onBack();
        }} className="text-white text-lg" data-testid="back-button">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            textareaRef.current?.focus();
            document.execCommand('undo');
          }}
          className="text-white text-sm px-1 hover:text-amber-200"
          data-testid="undo-button"
        ><ArrowUturnLeftIcon className="w-5 h-5" /></button>
        <button
          onClick={() => {
            textareaRef.current?.focus();
            document.execCommand('redo');
          }}
          className="text-white text-sm px-1 hover:text-amber-200"
          data-testid="redo-button"
        ><ArrowUturnRightIcon className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold flex-1">Detalle</h1>
      </header>

      <div className="flex-1 p-3 flex flex-col gap-3">
        <textarea
          ref={textareaRef}
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
                  <div onClick={() => setViewingImage(img.blobId)} className="cursor-pointer">
                    <ImageThumbnail blobId={img.blobId} className="w-full h-32" />
                  </div>
                </div>
              ))}
            </div>
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

      </div>

      {viewingImage && (
        <ImageViewerOverlay blobId={viewingImage} onClose={() => setViewingImage(null)} />
      )}
    </div>
  );
}
