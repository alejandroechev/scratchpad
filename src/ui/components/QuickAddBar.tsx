import { useRef } from "react";
import { DocumentTextIcon, ListBulletIcon, CameraIcon, PhotoIcon } from "@heroicons/react/24/outline";

interface QuickAddBarProps {
  onAddNote: () => void;
  onAddList: () => void;
  onAddFromCamera: (file: File) => void;
  onAddFromGallery: (file: File) => void;
}

export function QuickAddBar({ onAddNote, onAddList, onAddFromCamera, onAddFromGallery }: QuickAddBarProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-amber-600 px-3 py-2">
      <div className="flex gap-2 justify-around">
        <button
          onClick={onAddNote}
          className="flex-1 flex flex-col items-center gap-0.5 rounded-lg bg-amber-700 px-2 py-2 text-white hover:bg-amber-800"
          data-testid="quick-add-note"
        >
          <DocumentTextIcon className="w-5 h-5" />
          <span className="text-[11px] font-medium">Nota</span>
        </button>
        <button
          onClick={onAddList}
          className="flex-1 flex flex-col items-center gap-0.5 rounded-lg bg-amber-700 px-2 py-2 text-white hover:bg-amber-800"
          data-testid="quick-add-list"
        >
          <ListBulletIcon className="w-5 h-5" />
          <span className="text-[11px] font-medium">Lista</span>
        </button>
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1 flex flex-col items-center gap-0.5 rounded-lg bg-amber-700 px-2 py-2 text-white hover:bg-amber-800"
          data-testid="quick-add-camera"
        >
          <CameraIcon className="w-5 h-5" />
          <span className="text-[11px] font-medium">Cámara</span>
        </button>
        <button
          onClick={() => galleryInputRef.current?.click()}
          className="flex-1 flex flex-col items-center gap-0.5 rounded-lg bg-amber-700 px-2 py-2 text-white hover:bg-amber-800"
          data-testid="quick-add-photo"
        >
          <PhotoIcon className="w-5 h-5" />
          <span className="text-[11px] font-medium">Foto</span>
        </button>
      </div>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onAddFromCamera(file);
          e.target.value = "";
        }}
        className="hidden"
        data-testid="quick-add-camera-input"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onAddFromGallery(file);
          e.target.value = "";
        }}
        className="hidden"
        data-testid="quick-add-gallery-input"
      />
    </div>
  );
}
