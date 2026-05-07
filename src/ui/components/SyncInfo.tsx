import { useEffect, useState } from "react";
import { getStorageBackend } from "../../infra/store-provider.js";

export function SyncInfo() {
  const backend = getStorageBackend();
  const [automergeDocUrl, setAutomergeDocUrl] = useState<string>("");

  useEffect(() => {
    if (backend !== "automerge") return;
    const check = () => {
      const saved = localStorage.getItem("scratchpad-automerge-doc-url") || "";
      setAutomergeDocUrl(saved);
    };
    check();
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, [backend]);

  const docUrl = backend === "automerge"
    ? automergeDocUrl
    : backend === "verdant" ? "Verdant local-first" : "N/A";

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
