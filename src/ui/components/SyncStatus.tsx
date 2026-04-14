import { useState, useEffect } from "react";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { getStorageBackend } from "../../infra/store-provider";

export function SyncStatus() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (getStorageBackend() !== "automerge") return;

    let cancelled = false;

    async function poll() {
      const { getPendingCount } = await import("../../infra/automerge/blob-sync");
      if (cancelled) return;
      const n = await getPendingCount();
      setCount(n);
    }

    poll();
    const id = setInterval(poll, 5_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (count === 0) return null;

  return (
    <span
      className="bg-amber-800 text-amber-100 text-xs px-2 py-0.5 rounded-full"
      data-testid="sync-status"
      title={`${count} archivo(s) pendiente(s) de subir`}
    >
      <ArrowUpTrayIcon className="w-4 h-4 inline" /> {count}
    </span>
  );
}
