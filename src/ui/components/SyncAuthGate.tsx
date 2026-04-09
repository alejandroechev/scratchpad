import { useState, useEffect } from "react";
import { checkAuthStatus, registerDevice } from "../../infra/automerge/auth.js";
import { getStorageBackend } from "../../infra/store-provider.js";

interface SyncAuthGateProps {
  children: React.ReactNode;
}

/**
 * Gate that requires device registration before showing the app.
 * Only active for automerge backend when sync server requires auth.
 */
export function SyncAuthGate({ children }: SyncAuthGateProps) {
  const [status, setStatus] = useState<"checking" | "authenticated" | "needs-registration">("checking");
  const [deviceName, setDeviceName] = useState("");
  const [registrationKey, setRegistrationKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (getStorageBackend() !== "automerge") {
      setStatus("authenticated");
      return;
    }
    checkAuthStatus().then((result) => setStatus(result.status));
  }, []);

  if (status === "checking") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-amber-50">
        <div className="text-center text-amber-600">
          <div className="text-2xl mb-2">🔄</div>
          <p>Conectando con el servidor...</p>
        </div>
      </div>
    );
  }

  if (status === "authenticated") {
    return <>{children}</>;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await registerDevice(deviceName.trim(), registrationKey);
      setStatus("authenticated");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar dispositivo");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-amber-50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🔐</div>
          <h2 className="text-xl font-bold text-amber-900">Registrar Dispositivo</h2>
          <p className="text-sm text-amber-600 mt-1">
            Ingresa la clave del servidor de sincronización.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">
              Nombre del dispositivo
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Ej: Mi PC"
              required
              className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              data-testid="device-name-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-800 mb-1">
              Clave de registro
            </label>
            <input
              type="password"
              value={registrationKey}
              onChange={(e) => setRegistrationKey(e.target.value)}
              placeholder="Clave del servidor"
              required
              className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              data-testid="registration-key-input"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !deviceName.trim() || !registrationKey}
            className="w-full py-2 px-4 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="register-button"
          >
            {submitting ? "Registrando..." : "Registrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
