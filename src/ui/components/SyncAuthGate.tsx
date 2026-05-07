import { useState, useEffect } from "react";
import { checkAuthStatus, registerDevice, getStoredToken } from "../../infra/automerge/auth.js";
import { getStorageBackend } from "../../infra/store-provider.js";
import { PROFILES, getActiveProfile, setActiveProfile } from "../../infra/profile-store.js";

interface SyncAuthGateProps {
  children: React.ReactNode;
}

/**
 * Determine initial auth status synchronously from localStorage — no network needed.
 * Local-first principle: the app starts instantly from local data.
 */
function getInitialStatus(): "authenticated" | "needs-registration" {
  const backend = getStorageBackend();
  if (backend === "verdant") {
    // Verdant needs a profile selected to pick the right library
    return getActiveProfile() ? "authenticated" : "needs-registration";
  }
  if (backend !== "automerge") return "authenticated";
  const token = getStoredToken();
  const profile = getActiveProfile();
  if (token && profile) return "authenticated";
  return "needs-registration";
}

/**
 * Gate that requires profile selection and device registration before showing the app.
 * Only active for automerge backend when sync server requires auth.
 */
export function SyncAuthGate({ children }: SyncAuthGateProps) {
  const [status, setStatus] = useState<"authenticated" | "needs-registration">(getInitialStatus);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    () => getActiveProfile()?.id ?? null,
  );
  const [deviceName, setDeviceName] = useState("");
  const [registrationKey, setRegistrationKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Background validation — runs after mount but never blocks UI
  useEffect(() => {
    if (getStorageBackend() !== "automerge" || status !== "authenticated") return;
    
    // Fire-and-forget validation — if token is invalid, log a warning but don't block
    checkAuthStatus().then((result) => {
      if (result.status === "needs-registration") {
        console.warn("Auth token may be expired, sync may not work until re-registered");
      }
    }).catch(() => {
      // Server unreachable — fine, we're local-first
    });
  }, [status]);


  const currentBackend = getStorageBackend();
  const needsDeviceRegistration = currentBackend === "automerge";

  // Memory backend: skip the entire gate — no profile or registration needed
  if (currentBackend === "memory") {
    return <>{children}</>;
  }

  // Already authenticated AND profile selected → go straight to app
  if (status === "authenticated" && getActiveProfile()) {
    return <>{children}</>;
  }

  function handleProfileSelect(profileId: string) {
    setSelectedProfileId(profileId);
    setActiveProfile(profileId);
    // For verdant: profile selection is enough — reload to init the right library
    // For automerge: if already registered, reload; otherwise show registration form
    if (!needsDeviceRegistration || status === "authenticated") {
      window.location.reload();
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProfileId) {
      setError("Selecciona un perfil primero");
      return;
    }
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

  const needsRegistration = status === "needs-registration";

  return (
    <div className="flex items-center justify-center min-h-screen bg-amber-50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">📝</div>
          <h2 className="text-xl font-bold text-amber-900">ScratchPad</h2>
        </div>

        {/* Profile selection */}
        <div className="mb-6">
          <p className="text-sm font-medium text-amber-800 mb-3 text-center">¿Quién eres?</p>
          <div className="flex gap-3 justify-center">
            {PROFILES.map((profile) => (
              <button
                key={profile.id}
                onClick={() => handleProfileSelect(profile.id)}
                className={`flex-1 py-3 px-4 rounded-lg border-2 text-center font-medium transition-colors ${
                  selectedProfileId === profile.id
                    ? "border-amber-600 bg-amber-100 text-amber-900"
                    : "border-amber-200 bg-white text-amber-700 hover:border-amber-400"
                }`}
                data-testid={`profile-button-${profile.id}`}
              >
                <div className="text-2xl mb-1">👤</div>
                <div>{profile.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Registration form — only shown for automerge backend when device is not yet registered */}
        {needsDeviceRegistration && needsRegistration && (
          <>
            <div className="border-t border-amber-200 my-4" />
            <p className="text-sm text-amber-600 text-center mb-4">Registrar dispositivo</p>
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
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
              )}

              <button
                type="submit"
                disabled={submitting || !deviceName.trim() || !registrationKey || !selectedProfileId}
                className="w-full py-2 px-4 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="register-button"
              >
                {submitting ? "Registrando..." : "Registrar"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
