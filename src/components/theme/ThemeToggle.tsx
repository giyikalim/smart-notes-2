"use client";

import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className={cn(
          "w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center",
          "bg-gray-100 dark:bg-gray-800 animate-pulse"
        )}
      >
        <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={cn(
        "w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center",
        "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
        "hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        "transition-all duration-200"
      )}
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 transition-all" />
      ) : (
        <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 transition-all" />
      )}
    </button>
  );
}
