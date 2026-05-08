import { useRef, useState } from "react";
import { CameraIcon, PhotoIcon } from "@heroicons/react/24/outline";

interface QuickAddBarProps {
  onAdd: (content: string) => void;
  onAddAndOpen?: (content: string) => void;
  onAddImage?: (file: File) => void;
}

export function QuickAddBar({ onAdd, onAddAndOpen, onAddImage }: QuickAddBarProps) {
  const [text, setText] = useState("");
  const [showImageMenu, setShowImageMenu] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      onAddAndOpen?.("");
      return;
    }
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
    setShowImageMenu(false);
  };

  return (
    <div className="bg-amber-600 p-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe una nota..."
          className="flex-1 rounded-lg border border-amber-400 bg-white px-3 py-2 text-sm text-gray-900
                     placeholder:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
          data-testid="quick-add-input"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          data-testid="quick-add-file-input"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          data-testid="quick-add-gallery-input"
        />
        <button
          onClick={handleSubmit}
          className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-medium text-white
                     hover:bg-amber-900"
          data-testid="quick-add-button"
        >
          Agregar
        </button>
        <div className="relative">
          <button
            onClick={() => setShowImageMenu(!showImageMenu)}
            className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white
                       hover:bg-amber-800"
            data-testid="quick-add-image-button"
          >
            <CameraIcon className="w-5 h-5" />
          </button>
          {showImageMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowImageMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-lg border border-amber-200 py-1 min-w-[140px]">
                <button
                  onClick={() => { cameraInputRef.current?.click(); setShowImageMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 flex items-center gap-2"
                  data-testid="quick-add-camera-option"
                >
                  <CameraIcon className="w-4 h-4 text-amber-600" /> Cámara
                </button>
                <button
                  onClick={() => { galleryInputRef.current?.click(); setShowImageMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 flex items-center gap-2"
                  data-testid="quick-add-gallery-option"
                >
                  <PhotoIcon className="w-4 h-4 text-blue-500" /> Galería
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
