import { useRef, useState, useEffect } from "react";
import { ArrowLeftIcon, ArrowUturnLeftIcon, ArrowUturnRightIcon, ClipboardDocumentIcon, PencilIcon, EyeIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { extractUrls } from "../../domain/models/note.js";
import type { NoteImage, ChecklistItem } from "../../domain/models/note.js";
import { ImageThumbnail } from "../components/ImageThumbnail.js";
import { ImageViewerOverlay } from "../components/ImageViewerOverlay.js";
import { MarkdownRenderer } from "../components/MarkdownRenderer.js";
import { toggleCheckbox } from "../../domain/services/markdown-checkbox.js";
import { readClipboard, openUrl } from "../../infra/platform.js";

interface NoteDetailPageProps {
  noteId: string;
  initialContent: string;
  initialCreatedAt: string;
  initialUpdatedAt: string;
  images?: NoteImage[];
  checklistItems?: ChecklistItem[];
  onToggleChecklistItem?: (itemIndex: number) => void;
  onAddChecklistItem?: (text: string) => void;
  onRemoveChecklistItem?: (itemIndex: number) => void;
  onEditChecklistItem?: (itemIndex: number, newText: string) => void;
  onSave: (content: string) => void;
  onBack: () => void;
}

export function NoteDetailPage({
  initialContent,
  initialUpdatedAt,
  images,
  checklistItems,
  onToggleChecklistItem,
  onAddChecklistItem,
  onRemoveChecklistItem,
  onEditChecklistItem,
  onSave,
  onBack,
}: NoteDetailPageProps) {
  const [content, setContent] = useState(initialContent);
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef(content);

  const isChecklist = (checklistItems ?? []).length > 0;

  // Keep ref in sync for cleanup effect
  useEffect(() => {
    contentRef.current = content;
  });

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
    <div className="h-[100dvh] bg-amber-50 flex flex-col overflow-hidden">
      <header className="shrink-0 bg-amber-600 text-white px-4 py-3 shadow-md flex items-center gap-3 pt-[env(safe-area-inset-top)]">
        <button onClick={() => {
          if (contentRef.current !== initialContent) {
            onSave(contentRef.current);
          }
          onBack();
        }} className="text-white text-lg" data-testid="back-button">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold flex-1">{isChecklist ? "Lista" : "Nota"}</h1>
        {!isChecklist && (
          <button
            onClick={() => setShowMarkdown(!showMarkdown)}
            className="text-white text-sm px-1 hover:text-amber-200"
            data-testid="toggle-mode-button"
            title={showMarkdown ? "Editar" : "Ver Markdown"}
          >
            {showMarkdown ? <PencilIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
          </button>
        )}
        {!isChecklist && !showMarkdown && (
          <>
            <button
              onClick={async () => {
                try {
                  const text = await readClipboard();
                  if (text && textareaRef.current) {
                    const ta = textareaRef.current;
                    const start = ta.selectionStart;
                    const end = ta.selectionEnd;
                    const before = content.substring(0, start);
                    const after = content.substring(end);
                    const newContent = before + text + after;
                    setContent(newContent);
                    requestAnimationFrame(() => {
                      ta.selectionStart = ta.selectionEnd = start + text.length;
                      ta.focus();
                    });
                  }
                } catch (err) {
                  console.warn('Clipboard read failed:', err);
                }
              }}
              className="text-white text-sm px-1 hover:text-amber-200"
              data-testid="paste-button"
              title="Pegar"
            >
              <ClipboardDocumentIcon className="w-5 h-5" />
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
          </>
        )}
      </header>

      <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden min-h-0">
        {isChecklist ? (
          <div className="flex-1 min-h-0 rounded-lg border border-amber-200 bg-white p-3 overflow-y-auto" data-testid="checklist-view">
            {(content || (checklistItems ?? []).length > 0) && (
              <input
                type="text"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  onSave(e.target.value);
                }}
                placeholder="Título de la lista..."
                className="w-full text-base font-bold text-gray-900 border-0 border-b border-amber-200 pb-2 mb-2 focus:outline-none focus:border-amber-400 bg-transparent"
                data-testid="checklist-title-input"
              />
            )}
            <div className="space-y-1">
              {(checklistItems ?? []).map((item, index) => (
                <div key={index} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => onToggleChecklistItem?.(index)}
                    className="w-5 h-5 accent-amber-600 cursor-pointer flex-shrink-0"
                    data-testid={`checklist-item-${index}`}
                  />
                  <input
                    type="text"
                    defaultValue={item.text}
                    key={`${index}-${item.text}`}
                    onBlur={(e) => {
                      const newText = e.target.value.trim();
                      if (newText && newText !== item.text) {
                        onEditChecklistItem?.(index, newText);
                      }
                    }}
                    className={`flex-1 text-sm border-0 bg-transparent focus:outline-none focus:ring-0 ${item.done ? "line-through text-gray-400" : "text-gray-900"}`}
                    data-testid={`checklist-item-text-${index}`}
                  />
                  <button
                    onClick={() => onRemoveChecklistItem?.(index)}
                    className="text-gray-300 hover:text-red-500 flex-shrink-0"
                    data-testid={`checklist-remove-${index}`}
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Agregar elemento..."
                className="flex-1 border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                data-testid="checklist-add-input"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    onAddChecklistItem?.(e.currentTarget.value.trim());
                    e.currentTarget.value = "";
                  }
                }}
              />
            </div>
            <p className="mt-2 text-xs text-amber-700">
              {(checklistItems ?? []).filter(i => i.done).length}/{(checklistItems ?? []).length} completados
            </p>
          </div>
        ) : showMarkdown ? (
          <div
            className="flex-1 min-h-0 rounded-lg border border-amber-200 bg-white p-3 overflow-y-auto"
            data-testid="markdown-view"
          >
            <MarkdownRenderer
              content={content}
              mode="full"
              onCheckboxToggle={(index) => {
                const updated = toggleCheckbox(content, index);
                setContent(updated);
              }}
            />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 min-h-0 rounded-lg border border-amber-200 bg-white p-3 text-sm text-gray-900
                       resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 overflow-y-auto"
            data-testid="note-editor"
          />
        )}

        {images && images.length > 0 && (
          <div className="shrink-0" data-testid="image-gallery">
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img) => (
                <div key={img.blobId} className="shrink-0" data-testid={`gallery-item-${img.blobId}`}>
                  <div onClick={() => setViewingImage(img.blobId)} className="cursor-pointer">
                    <ImageThumbnail blobId={img.blobId} className="w-16 h-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="shrink-0 flex flex-wrap items-center gap-2 text-xs text-amber-700 pb-[env(safe-area-inset-bottom,4px)]">
          {urls.map((url, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); openUrl(url); }}
              className="inline-block bg-blue-50 text-blue-600 rounded px-2 py-0.5
                         hover:bg-blue-100 truncate max-w-[180px] cursor-pointer"
            >
              {new URL(url).hostname}
            </button>
          ))}
          <span className="ml-auto">{new Date(initialUpdatedAt).toLocaleDateString("es")}</span>
        </div>
      </div>

      {viewingImage && (
        <ImageViewerOverlay blobId={viewingImage} onClose={() => setViewingImage(null)} />
      )}
    </div>
  );
}
