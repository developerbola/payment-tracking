import { atomWithStorage } from "jotai/utils";

export type Theme = "light" | "system" | "dark";

const themeStorage = {
  getItem: (key: string): Theme => {
    const value = localStorage.getItem(key);
    return value === "light" || value === "dark" ? value : "system";
  },
  setItem: (key: string, value: Theme) => {
    if (value === "system") localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  },
  removeItem: (key: string) => localStorage.removeItem(key),
};

export const themeAtom = atomWithStorage<Theme>(
  "theme",
  "system",
  themeStorage,
);

export function applyTheme(theme: Theme) {
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const dark = theme === "dark" || (theme === "system" && mq.matches);
  document.documentElement.classList.toggle("dark", dark);
}
