"use client";

import { useAuth, useProtectedRoute } from "@/lib/auth";
import { usePreferences } from "@/lib/preferences";
import {
  LocalePreference,
  ReadingMode,
  ThemePreference,
} from "@/types/supabase";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Globe,
  Loader2,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

const THEMES: { value: ThemePreference; icon: React.ReactNode }[] = [
  { value: "light", icon: <Sun className="w-5 h-5" /> },
  { value: "dark", icon: <Moon className="w-5 h-5" /> },
  { value: "system", icon: <Monitor className="w-5 h-5" /> },
];

const LANGUAGES: { value: LocalePreference; label: string; flag: string }[] = [
  { value: "tr", label: "Turkce", flag: "TR" },
  { value: "en", label: "English", flag: "EN" },
  { value: "de", label: "Deutsch", flag: "DE" },
];

const READING_MODES: { value: ReadingMode; labelKey: string }[] = [
  { value: "comfortable", labelKey: "comfortable" },
  { value: "compact", labelKey: "compact" },
];

export default function SettingsPage() {
  const { isLoading: authLoading } = useProtectedRoute();
  const { user } = useAuth();
  const { preferences, isLoading: prefsLoading, updatePreference } = usePreferences();
  const t = useTranslations("settings");
  const tTheme = useTranslations("theme");

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t("title")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("subtitle")}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {prefsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Theme Section */}
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Sun className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="font-medium text-gray-900 dark:text-white">
                    {t("theme")}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("themeDescription")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {THEMES.map(({ value, icon }) => (
                  <button
                    key={value}
                    onClick={() => updatePreference("theme", value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      preferences.theme === value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        preferences.theme === value
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {icon}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        preferences.theme === value
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {tTheme(value)}
                    </span>
                    {preferences.theme === value && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* Language Section */}
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="font-medium text-gray-900 dark:text-white">
                    {t("language")}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("languageDescription")}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {LANGUAGES.map(({ value, label, flag }) => (
                  <button
                    key={value}
                    onClick={() => updatePreference("language", value)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      preferences.language === value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-medium text-gray-600 dark:text-gray-400 w-8">
                        {flag}
                      </span>
                      <span
                        className={`font-medium ${
                          preferences.language === value
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    {preferences.language === value && (
                      <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* Reading Mode Section */}
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <BookOpen className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="font-medium text-gray-900 dark:text-white">
                    {t("readingMode")}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("readingModeDescription")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {READING_MODES.map(({ value, labelKey }) => (
                  <button
                    key={value}
                    onClick={() => updatePreference("reading_mode", value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      preferences.reading_mode === value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div
                      className={`w-full h-16 rounded-lg flex flex-col justify-center px-3 ${
                        value === "comfortable"
                          ? "bg-gray-100 dark:bg-gray-700 space-y-2"
                          : "bg-gray-100 dark:bg-gray-700 space-y-1"
                      }`}
                    >
                      <div
                        className={`bg-gray-300 dark:bg-gray-600 rounded ${
                          value === "comfortable" ? "h-2 w-full" : "h-1.5 w-full"
                        }`}
                      />
                      <div
                        className={`bg-gray-300 dark:bg-gray-600 rounded ${
                          value === "comfortable" ? "h-2 w-3/4" : "h-1.5 w-3/4"
                        }`}
                      />
                      <div
                        className={`bg-gray-300 dark:bg-gray-600 rounded ${
                          value === "comfortable" ? "h-2 w-1/2" : "h-1.5 w-1/2"
                        }`}
                      />
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        preferences.reading_mode === value
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {t(labelKey)}
                    </span>
                    {preferences.reading_mode === value && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
