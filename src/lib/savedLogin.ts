const KEY = "marknote.savedLogin";

export interface SavedLogin {
  email: string;
  password: string;
}

export function loadSavedLogin(): SavedLogin | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedLogin;
    if (parsed.email && parsed.password) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function saveSavedLogin(credentials: SavedLogin): void {
  localStorage.setItem(KEY, JSON.stringify(credentials));
}

export function clearSavedLogin(): void {
  localStorage.removeItem(KEY);
}
