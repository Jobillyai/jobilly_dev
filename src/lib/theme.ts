export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "jb-theme";

export function resolveTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    // ignore storage errors
  }

  // Marketing/default: light unless the user explicitly toggles theme.
  return "light";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
  root.style.backgroundColor = theme === "dark" ? "#0f1117" : "#ffffff";
}
