import { useState, useEffect, useCallback } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { getBlobUrl } from "../../infra/store-provider.js";

interface ImageViewerOverlayProps {
  blobId: string;
  onClose: () => void;
}

export function ImageViewerOverlay({ blobId, onClose }: ImageViewerOverlayProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let revoked = false;
    getBlobUrl(blobId).then((result) => {
      if (!revoked && result) setUrl(result);
    });
    return () => {
      revoked = true;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blobId]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.min(5, Math.max(0.5, prev - e.deltaY * 0.001)));
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
      data-testid="image-viewer-overlay"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 text-white text-2xl z-10 w-10 h-10 flex items-center justify-center
                   rounded-full bg-black/50 hover:bg-black/70"
        data-testid="image-viewer-close"
        aria-label="Cerrar"
      >
        <XMarkIcon className="w-6 h-6" />
      </button>

      {url && (
        <img
          src={url}
          alt=""
          className="max-w-[90vw] max-h-[90vh] object-contain select-none"
          style={{
            touchAction: "pinch-zoom",
            transform: `scale(${scale})`,
            transition: "transform 0.1s ease-out",
          }}
          onClick={(e) => e.stopPropagation()}
          onWheel={handleWheel}
          data-testid="image-viewer-img"
        />
      )}
    </div>
  );
}
