"use client";

import { localeFlags, localeNames, locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface LanguageSwitcherProps {
  currentLocale: Locale;
  compact?: boolean;
}

export function LanguageSwitcher({
  currentLocale,
  compact = false,
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLocaleChange = (locale: Locale) => {
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000`;
    setIsOpen(false);
    router.refresh();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-lg transition-all duration-200",
          "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
          "hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
          "text-gray-700 dark:text-gray-300",
          "focus:outline-none focus:ring-2 focus:ring-primary/50",
          compact ? "px-2 py-1.5" : "px-3 py-2"
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe className={cn("text-gray-500", compact ? "w-4 h-4" : "w-4 h-4")} />
        {!compact && (
          <>
            <span className="text-sm font-medium hidden sm:inline">
              {localeFlags[currentLocale]} {localeNames[currentLocale]}
            </span>
            <span className="text-sm font-medium sm:hidden">
              {localeFlags[currentLocale]}
            </span>
          </>
        )}
        {compact && <span className="text-sm">{localeFlags[currentLocale]}</span>}
        <ChevronDown
          className={cn(
            "w-3 h-3 transition-transform text-gray-400",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute right-0 mt-2 w-44 rounded-xl shadow-lg z-50",
            "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
            "animate-slide-down overflow-hidden"
          )}
          role="listbox"
        >
          <div className="py-1">
            {locales.map((locale) => (
              <button
                key={locale}
                onClick={() => handleLocaleChange(locale)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-2.5 text-sm",
                  "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                  locale === currentLocale
                    ? "text-primary dark:text-primary font-medium bg-primary/5"
                    : "text-gray-700 dark:text-gray-300"
                )}
                role="option"
                aria-selected={locale === currentLocale}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">{localeFlags[locale]}</span>
                  <span>{localeNames[locale]}</span>
                </span>
                {locale === currentLocale && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
