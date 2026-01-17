"use client";

import { AIUsageBanner } from "@/components/ai/AIUsageIndicator";
import UserMenu from "@/components/auth/UserMenu";
import QuickStats from "@/components/dashboard/QuickStats";
import NoteList from "@/components/notes/NoteList";
import AdvancedSearchModal from "@/components/search/AdvancedSearchModal";
import AdvancedSearchResults from "@/components/search/AdvancedSearchResults";
import SearchBar from "@/components/search/SearchBar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { type Locale } from "@/i18n/config";
import { useProtectedRoute } from "@/lib/auth";
import {
  AdvancedSearchOptions,
  Note,
  noteAPI,
} from "@/lib/elasticsearch-client";
import { Layers, Menu, Plus, Rocket, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function DashboardPage() {
  const { user, isLoading } = useProtectedRoute();
  const t = useTranslations();
  const locale = useLocale() as Locale;

  const [shouldFocusSearch, setShouldFocusSearch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q");

  const [searchQuery, setSearchQuery] = useState(urlQuery || "");

  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [advancedSearchData, setAdvancedSearchData] = useState<{
    notes: Note[];
    total: number;
    aggregations: Record<string, unknown>;
    searchParams: AdvancedSearchOptions;
  } | null>(null);

  const [showAdvancedResults, setShowAdvancedResults] = useState(false);

  useEffect(() => {
    if (urlQuery) {
      setSearchQuery(urlQuery);
      setShouldFocusSearch(true);
    }
  }, [urlQuery]);

  const handleAdvancedSearch = async (filters: AdvancedSearchOptions) => {
    try {
      const result = await noteAPI.advancedSearch(filters);

      setAdvancedSearchData({
        notes: result.notes,
        total: result.total,
        aggregations: result.aggregations,
        searchParams: filters,
      });

      setShowAdvancedResults(true);
    } catch (error) {
      console.error("Advanced search error:", error);
    }
  };

  const handleClearAdvancedSearch = () => {
    setAdvancedSearchData(null);
    setShowAdvancedResults(false);
  };

  useEffect(() => {
    // Only auto-focus search on desktop (screen width >= 1024px)
    if (!isLoading && user && window.innerWidth >= 1024) {
      const timer = setTimeout(() => {
        setShouldFocusSearch(true);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isLoading, user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      if (
        e.key === "Escape" &&
        searchInputRef.current === document.activeElement &&
        !searchQuery
      ) {
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery]);

  useEffect(() => {
    if (shouldFocusSearch && searchInputRef.current) {
      searchInputRef.current.focus();
      setShouldFocusSearch(false);
    }
  }, [shouldFocusSearch]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 dark:from-gray-900 dark:to-gray-800/30">
      {/* AI Usage Banner */}
      <AIUsageBanner />

      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center py-3 sm:py-4 gap-3">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <div className="flex-shrink-0">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  📚 {t("dashboard.title")}
                </h1>
                <p className="text-xs text-muted-foreground dark:text-gray-400 mt-0.5 hidden sm:block">
                  {t("dashboard.subtitle")}
                </p>
              </div>
            </div>

            {/* Search Bar - Hidden on mobile, shown on tablet+ */}
            <div className="hidden md:block flex-1 max-w-md mx-4">
              <SearchBar
                onSearch={setSearchQuery}
                autoFocus={false}
                ref={searchInputRef}
                openAdvanceSearchModal={() => setIsAdvancedSearchOpen(true)}
              />
            </div>

            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher currentLocale={locale} compact />
              <ThemeToggle />
              <UserMenu />
            </div>

            {/* Mobile Menu Button */}
            <button
              className="sm:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              )}
            </button>
          </div>

          {/* Mobile Search - Always visible on mobile */}
          <div className="md:hidden pb-3">
            <SearchBar
              onSearch={setSearchQuery}
              autoFocus={false}
              ref={searchInputRef}
              openAdvanceSearchModal={() => setIsAdvancedSearchOpen(true)}
            />
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-3 space-y-3 animate-slide-down">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t("theme.toggle")}
              </span>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t("language.select")}
              </span>
              <LanguageSwitcher currentLocale={locale} />
            </div>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <UserMenu />
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-4 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
          {/* Left Sidebar - Quick Stats */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4 lg:mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t("dashboard.quickActions")}
              </h3>
              <div className="space-y-3">
                <Link
                  href="/notes/create"
                  className="block w-full px-4 py-3 bg-gradient-to-r from-primary to-blue-600 dark:from-blue-600 dark:to-primary text-white text-center rounded-xl hover:from-primary/90 hover:to-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md active:scale-[0.98]"
                >
                  {t("dashboard.createNote")}
                </Link>

                <button
                  onClick={() => setIsAdvancedSearchOpen(true)}
                  className="block w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-center rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md active:scale-[0.98] group"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Search className="w-4 h-4" />
                    <span>{t("dashboard.advancedSearch")}</span>
                  </div>
                </button>

                <Link
                  href="/discover"
                  className="block w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-center rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-200 font-medium shadow-sm hover:shadow-md active:scale-[0.98]"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Rocket className="w-4 h-4" />
                    <span>{t("dashboard.discover")}</span>
                  </div>
                </Link>

                <Link
                  href="/browse"
                  className="block w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-center rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all duration-200 font-medium shadow-sm hover:shadow-md active:scale-[0.98]"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Layers className="w-4 h-4" />
                    <span>{t("browse.title") || "Browse Notes"}</span>
                  </div>
                </Link>
              </div>
            </div>
            <QuickStats userId={user.id} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              {showAdvancedResults && (
                <div className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                        🎯 {t("dashboard.advancedSearchResults")}
                      </h2>

                      {showAdvancedResults && advancedSearchData && (
                        <button
                          onClick={handleClearAdvancedSearch}
                          className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                        >
                          ❌ {t("dashboard.clear")}
                        </button>
                      )}
                    </div>

                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t("dashboard.notesFiltered", {
                        count: advancedSearchData?.total || 0,
                      })}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-2 sm:p-4 lg:p-6">
                {showAdvancedResults && advancedSearchData ? (
                  <AdvancedSearchResults
                    notes={advancedSearchData.notes}
                    total={advancedSearchData.total}
                    aggregations={advancedSearchData.aggregations}
                    searchParams={advancedSearchData.searchParams}
                  />
                ) : (
                  <NoteList searchQuery={searchQuery} />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal */}
      {user && (
        <AdvancedSearchModal
          isOpen={isAdvancedSearchOpen}
          onClose={() => setIsAdvancedSearchOpen(false)}
          onSearch={handleAdvancedSearch}
          userId={user.id}
        />
      )}

      {/* Mobile Floating Action Button */}
      <Link
        href="/notes/create"
        className="lg:hidden fixed bottom-6 right-4 z-50 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all"
        aria-label="Yeni Not Oluştur"
      >
        <Plus className="w-7 h-7" />
      </Link>
    </div>
  );
}
