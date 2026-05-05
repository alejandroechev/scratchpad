import { useState, useEffect } from "react";
import { getBlobUrl } from "../../infra/store-provider.js";

interface ImageThumbnailProps {
  blobId: string;
  className?: string;
}

export function ImageThumbnail({ blobId, className = "" }: ImageThumbnailProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    let revoked = false;
    setStatus("loading");
    getBlobUrl(blobId).then((result) => {
      if (revoked) return;
      if (result) {
        setUrl(result);
        setStatus("loaded");
      } else {
        setStatus("error");
      }
    });
    return () => {
      revoked = true;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blobId]);

  if (status === "loading") {
    return (
      <div
        className={`bg-gray-200 animate-pulse rounded-lg ${className}`}
        data-testid={`img-loading-${blobId}`}
      />
    );
  }

  if (status === "error" || !url) {
    return (
      <div
        className={`bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 ${className}`}
        data-testid={`img-error-${blobId}`}
      >
        🖼️
      </div>
    );
  }

  return (
    <img
      src={url}
      alt=""
      className={`object-cover rounded-lg ${className}`}
      data-testid={`img-thumb-${blobId}`}
    />
  );
}
