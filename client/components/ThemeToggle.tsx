import { useEffect } from "react";
import { useAtom } from "jotai";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { applyTheme, themeAtom } from "@/lib/theme";
import type { Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Theme; label: string; icon: typeof SunIcon }[] = [
  { value: "light", label: "Yorugʻ", icon: SunIcon },
  { value: "system", label: "Tizim", icon: MonitorIcon },
  { value: "dark", label: "Tungi", icon: MoonIcon },
];

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useAtom(themeAtom);

  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const sync = () => applyTheme(theme);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [theme]);

  return (
    <div
      role="radiogroup"
      aria-label="Mavzu"
      className={cn("inline-flex gap-0.5 rounded-lg border p-0.5", className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={`${label} mavzu`}
          title={`${label} mavzu`}
          onClick={() => setTheme(value)}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-md transition-colors",
            theme === value
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
