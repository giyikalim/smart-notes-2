"use client";

import LoginButtons from "@/components/auth/LoginButtons";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useAuth } from "@/lib/auth";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Locale } from "@/i18n/config";

const providers = [
  {
    id: "google",
    name: "Google",
    color: "bg-white hover:bg-gray-50 border border-gray-300 text-gray-700",
    icon: "G",
  },
  {
    id: "facebook",
    name: "Facebook",
    color: "bg-[#1877F2] hover:bg-[#166FE5] text-white",
    icon: "F",
  },
  {
    id: "twitter",
    name: "Twitter",
    color: "bg-black hover:bg-gray-900 text-white",
    icon: "X",
  },
];

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale() as Locale;

  useEffect(() => {
    if (user && !isLoading) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Top bar with theme and language */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <LanguageSwitcher currentLocale={locale} />
        <ThemeToggle />
      </div>

      <div className="flex flex-col justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-3xl">📝</span>
            </div>
          </div>

          <h2 className="text-center text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
            {t("login.title")}
          </h2>
          <p className="mt-3 text-center text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            {t("login.subtitle")}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-6 sm:px-10 shadow-xl rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t("login.heading")}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  {t("login.description", { count: providers.length })}
                </p>
              </div>

              <LoginButtons providers={providers} />

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium">
                      {t("login.features")}
                    </span>
                  </div>
                </div>

                <ul className="mt-6 space-y-3">
                  {[
                    t("login.feature1"),
                    t("login.feature2"),
                    t("login.feature3"),
                  ].map((feature, index) => (
                    <li
                      key={index}
                      className="flex items-center text-sm text-gray-600 dark:text-gray-400"
                    >
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3">
                        <svg
                          className="h-3 w-3 text-green-600 dark:text-green-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Footer text */}
          <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-500">
            Powered by Elasticsearch & AI
          </p>
        </div>
      </div>
    </div>
  );
}
