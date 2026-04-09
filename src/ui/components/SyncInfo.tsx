import { useEffect, useState } from "react";
import { getStorageBackend } from "../../infra/store-provider.js";

export function SyncInfo() {
  const [docUrl, setDocUrl] = useState<string>("");
  const backend = getStorageBackend();

  useEffect(() => {
    // Poll for doc URL — it may be set after initial doc creation
    const check = () => {
      const saved = localStorage.getItem("scratchpad-automerge-doc-url") || "";
      setDocUrl(saved);
    };
    check();
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-3 mt-2 p-3 bg-amber-100 rounded-lg text-xs text-amber-800 space-y-1">
      <p><span className="font-semibold">Versión:</span> {__APP_VERSION__}</p>
      <p><span className="font-semibold">Backend:</span> {backend}</p>
      <p><span className="font-semibold">Sync:</span> {import.meta.env.VITE_SYNC_SERVER_URL || "no configurado"}</p>
      <p className="break-all">
        <span className="font-semibold">Doc URL:</span> {docUrl || "creando..."}
      </p>
    </div>
  );
}
