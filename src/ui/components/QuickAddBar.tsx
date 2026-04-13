import { useRef, useState } from "react";

interface QuickAddBarProps {
  onAdd: (content: string) => void;
  onAddImage?: (file: File) => void;
}

export function QuickAddBar({ onAdd, onAddImage }: QuickAddBarProps) {
  const [text, setText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAddImage) onAddImage(file);
    e.target.value = "";
  };

  return (
    <div className="sticky top-0 z-10 bg-amber-50 p-3 border-b border-amber-200">
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe una nota..."
          className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-gray-900
                     placeholder:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
          data-testid="quick-add-input"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          data-testid="quick-add-file-input"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white
                     hover:bg-amber-600"
          data-testid="quick-add-image-button"
        >
          📷
        </button>
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid="quick-add-button"
        >
          ✏️
        </button>
      </div>
    </div>
  );
}
