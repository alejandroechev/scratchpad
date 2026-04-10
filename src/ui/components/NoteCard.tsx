import { extractUrls } from "../../domain/models/note.js";
import type { Note } from "../../domain/models/note.js";
import { ImageThumbnail } from "./ImageThumbnail.js";

interface NoteCardProps {
  note: Note;
  onClick: (id: string) => void;
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

export function NoteCard({ note, onClick }: NoteCardProps) {
  const urls = extractUrls(note.content);
  const preview = note.content.length > 120 ? note.content.slice(0, 120) + "..." : note.content;
  const images = note.images ?? [];

  return (
    <div
      onClick={() => onClick(note.id)}
      className="bg-white rounded-lg p-3 shadow-sm border border-amber-100 cursor-pointer
                 hover:border-amber-300 transition-colors"
      data-testid={`note-card-${note.id}`}
    >
      <div className="flex gap-2">
        {images.length > 0 && (
          <div className="flex-shrink-0 relative">
            <ImageThumbnail blobId={images[0].blobId} className="w-12 h-12" />
            {images.length > 1 && (
              <span
                className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold
                           rounded-full w-5 h-5 flex items-center justify-center"
                data-testid="image-count-badge"
              >
                📷 {images.length}
              </span>
            )}
          </div>
        )}
        <p className="text-sm text-gray-900 whitespace-pre-wrap break-words flex-1">{preview}</p>
      </div>

      {urls.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {urls.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-block text-xs bg-blue-50 text-blue-600 rounded px-2 py-0.5
                         hover:bg-blue-100 truncate max-w-[200px]"
            >
              {new URL(url).hostname}
            </a>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs text-amber-700">{formatRelativeTime(note.createdAt)}</p>
    </div>
  );
}
