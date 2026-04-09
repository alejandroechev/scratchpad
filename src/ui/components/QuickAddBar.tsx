import { useState } from "react";

interface QuickAddBarProps {
  onAdd: (content: string) => void;
}

export function QuickAddBar({ onAdd }: QuickAddBarProps) {
  const [text, setText] = useState("");

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
                     placeholder:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          data-testid="quick-add-input"
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid="quick-add-button"
        >
          +
        </button>
      </div>
    </div>
  );
}
