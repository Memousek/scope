import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

/**
 * ThemeSwitcher komponenta umožňuje přepínat světlý, tmavý a systémový režim.
 * Ukládá volbu do localStorage a aplikuje na <html>.
 */
export function ThemeSwitcher() {
  const [theme, setTheme] = useState<"light"|"dark"|"system">("light");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme") as "light"|"dark"|"system"|null;
      if (stored === "dark" || stored === "light" || stored === "system") {
        setTheme(stored);
        applyTheme(stored);
      } else {
        // default: system
        setTheme("system");
        applyTheme("system");
      }
    }
  }, []);

  const applyTheme = (t: "light"|"dark"|"system") => {
    if (typeof window === "undefined") return;
    if (t === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", prefersDark);
    } else {
      document.documentElement.classList.toggle("dark", t === "dark");
    }
  };

  const handleSetTheme = (t: "light"|"dark"|"system") => {
    setTheme(t);
    localStorage.setItem("theme", t);
    applyTheme(t);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="font-medium text-gray-700 mb-1">Vzhled</label>
      <p className="text-gray-500 text-sm italic mb-1">100% funkční je pouze světlý režim</p>
      <div className="flex items-center gap-2 justify-center">
        <button
          onClick={() => handleSetTheme("light")}
          className={`flex items-center gap-1 px-4 py-2 rounded-lg border transition-colors font-semibold ${theme === "light" ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-blue-50"}`}
          aria-pressed={theme === "light"}
        >
          <Sun className="w-5 h-5" /> Světlý
        </button>
        <button
          onClick={() => handleSetTheme("dark")}
          className={`flex items-center gap-1 px-4 py-2 rounded-lg border transition-colors font-semibold ${theme === "dark" ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-blue-50"}`}
          aria-pressed={theme === "dark"}
        >
          <Moon className="w-5 h-5" /> Tmavý
        </button>
        <button
          onClick={() => handleSetTheme("system")}
          className={`flex items-center gap-1 px-4 py-2 rounded-lg border transition-colors font-semibold ${theme === "system" ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-blue-50"}`}
          aria-pressed={theme === "system"}
        >
          <Monitor className="w-5 h-5" /> Systémový
        </button>
      </div>
    </div>
  );
} 