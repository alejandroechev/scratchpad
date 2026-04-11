const ACTIVE_PROFILE_KEY = "scratchpad-active-profile";

export interface Profile {
  id: string;
  name: string;
  docUrl: string;
}

export const PROFILES: Profile[] = [
  { id: "ale", name: "Ale", docUrl: "automerge:25avBccAaFeLJJ8qVEBq8gBf4Ht3" },
  { id: "dani", name: "Dani", docUrl: "automerge:3KxcCpTNo3eau32TAemXvRQdXyaD" },
];

export function getActiveProfile(): Profile | null {
  const id = localStorage.getItem(ACTIVE_PROFILE_KEY);
  return PROFILES.find((p) => p.id === id) ?? null;
}

export function setActiveProfile(profileId: string): void {
  localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
}

export function clearActiveProfile(): void {
  localStorage.removeItem(ACTIVE_PROFILE_KEY);
}
