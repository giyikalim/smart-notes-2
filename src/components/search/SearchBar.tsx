"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface SearchBarProps {
  onSearch?: (query: string) => void;
  initialQuery?: string;
  autoFocus?: boolean;
  openAdvanceSearchModal: () => void;
}

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar(
    {
      onSearch,
      initialQuery = "",
      autoFocus = false,
      openAdvanceSearchModal,
    }: SearchBarProps,
    ref
  ) {
    const [query, setQuery] = useState(initialQuery);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const t = useTranslations("dashboard");
    const tSearch = useTranslations("search");

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        if (onSearch) {
          onSearch(query.trim());
        } else {
          router.push(
            `/dashboard/search?q=${encodeURIComponent(query.trim())}`
          );
        }
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setQuery("");
        onSearch?.("");
        inputRef.current?.focus();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    return (
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onSearch?.(e.target.value);
            }}
            onFocus={(e) => e.target.select()}
            onKeyDown={handleKeyDown}
            placeholder={t("searchPlaceholder")}
            className="w-full pl-10 sm:pl-12 pr-10 py-2.5 sm:py-3 bg-white dark:bg-gray-800 
                       border border-gray-200 dark:border-gray-700 
                       rounded-xl shadow-sm
                       text-sm sm:text-base
                       text-gray-700 dark:text-gray-300 
                       placeholder-gray-400 dark:placeholder-gray-500
                       focus:outline-none 
                       focus:border-primary dark:focus:border-primary
                       focus:ring-2 focus:ring-primary/20
                       hover:border-gray-300 dark:hover:border-gray-600
                       transition-all duration-200"
            autoFocus={autoFocus}
          />

          <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                onSearch?.("");
                inputRef.current?.focus();
              }}
              className="absolute right-10 top-1/2 transform -translate-y-1/2 
                         text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                         p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700
                         transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}

          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
            ⏎
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
          <span className="hidden sm:inline">📝 {t("searchHint")}</span>
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
              Ctrl+K
            </span>
            <button
              type="button"
              onClick={() => openAdvanceSearchModal()}
              className="text-primary dark:text-blue-400 hover:text-primary/80 text-xs font-medium"
            >
              {tSearch("advanced")} →
            </button>
          </div>
        </div>
      </form>
    );
  }
);

export default SearchBar;
