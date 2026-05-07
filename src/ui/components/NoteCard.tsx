import { CameraIcon, CheckIcon } from "@heroicons/react/24/outline";
import type { Note } from "../../domain/models/note.js";
import { extractUrls } from "../../domain/models/note.js";
import { ImageThumbnail } from "./ImageThumbnail.js";
import { MarkdownRenderer } from "./MarkdownRenderer.js";
import { openUrl } from "../../infra/platform.js";
import { countCheckboxes, hasCheckboxes } from "../../domain/services/markdown-checkbox.js";

interface NoteCardProps {
  note: Note;
  onClick: (id: string) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  selectionMode?: boolean;
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "ahora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export function NoteCard({ note, onClick, isSelected, onToggleSelect, selectionMode }: NoteCardProps) {
  const urls = extractUrls(note.content);
  const images = note.images ?? [];
  const isTruncated = note.content.length > 80 || note.content.includes('\n');

  const handleClick = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(note.id);
    } else {
      onClick(note.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-lg p-3 shadow-sm cursor-pointer transition-colors relative ${
        isSelected ? "border-2 border-amber-500" : "border border-amber-100 hover:border-amber-300"
      }`}
      data-testid={`note-card-${note.id}`}
    >
      {isSelected && (
        <div className="absolute top-1 left-1 bg-amber-500 text-white rounded-full w-5 h-5 flex items-center justify-center z-10" data-testid={`note-selected-${note.id}`}>
          <CheckIcon className="w-3 h-3" />
        </div>
      )}
      <div className="flex gap-2 items-center">
        {images.length > 0 && (
          <div className="flex-shrink-0 relative">
            <ImageThumbnail blobId={images[0].blobId} className="w-12 h-12" />
            {images.length > 1 && (
              <span
                className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold
                           rounded-full w-5 h-5 flex items-center justify-center"
                data-testid="image-count-badge"
              >
                <CameraIcon className="w-3 h-3 inline" /> {images.length}
              </span>
            )}
          </div>
        )}
        <div className="text-sm break-words flex-1">
          <MarkdownRenderer content={note.content} mode="truncate" />
        </div>
      </div>

      {hasCheckboxes(note.content) && (() => {
        const { total, checked } = countCheckboxes(note.content);
        return (
          <span
            className="mt-1 inline-block text-[11px] font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5"
            data-testid="checklist-badge"
          >
            {checked}/{total} ✓
          </span>
        );
      })()}

      {isTruncated && (
        <p className="text-[11px] text-amber-400 -mt-0.5 ml-0.5" data-testid="more-indicator">más...</p>
      )}

      {(note.labels ?? []).length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {(note.labels ?? []).map((label) => (
            <span key={label} className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px]">
              {label}
            </span>
          ))}
        </div>
      )}

      {urls.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {urls.map((url, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); openUrl(url); }}
              className="inline-block text-xs bg-blue-50 text-blue-600 rounded px-2 py-0.5
                         hover:bg-blue-100 truncate max-w-[200px] cursor-pointer"
            >
              {new URL(url).hostname}
            </button>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs text-amber-700">{formatRelativeTime(note.updatedAt)}</p>
    </div>
  );
}
