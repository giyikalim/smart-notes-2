"use client";

import {
  LocalePreference,
  ReadingMode,
  ThemePreference,
} from "@/types/supabase";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

export interface UserPreferences {
  theme: ThemePreference;
  language: LocalePreference;
  reading_mode: ReadingMode;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  language: "tr",
  reading_mode: "comfortable",
};

interface PreferencesContextType {
  preferences: UserPreferences;
  isLoading: boolean;
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(
  undefined
);

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { setTheme } = useTheme();
  const router = useRouter();
  const [preferences, setPreferences] =
    useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from Supabase
  const loadPreferences = useCallback(async () => {
    if (!user) {
      setPreferences(DEFAULT_PREFERENCES);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // If no preferences found, create default ones
        if (error.code === "PGRST116") {
          const { data: newData, error: insertError } = await (supabase as any)
            .from("user_preferences")
            .insert({
              user_id: user.id,
              ...DEFAULT_PREFERENCES,
            })
            .select()
            .single();

          if (!insertError && newData) {
            setPreferences({
              theme: newData.theme,
              language: newData.language,
              reading_mode: newData.reading_mode,
            });
          }
        } else {
          console.error("Error loading preferences:", error);
        }
      } else if (data) {
        setPreferences({
          theme: data.theme,
          language: data.language,
          reading_mode: data.reading_mode,
        });

        // Apply theme
        setTheme(data.theme);

        // Apply language if different from current
        const currentLocale = document.cookie
          .split(";")
          .find((c) => c.trim().startsWith("NEXT_LOCALE="))
          ?.split("=")[1];

        if (currentLocale !== data.language) {
          document.cookie = `NEXT_LOCALE=${data.language};path=/;max-age=31536000`;
          router.refresh();
        }
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, setTheme, router]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Update a single preference
  const updatePreference = useCallback(
    async <K extends keyof UserPreferences>(
      key: K,
      value: UserPreferences[K]
    ) => {
      if (!user) return;

      // Optimistic update
      setPreferences((prev) => ({ ...prev, [key]: value }));

      // Apply immediately based on key
      if (key === "theme") {
        setTheme(value as string);
      } else if (key === "language") {
        document.cookie = `NEXT_LOCALE=${value};path=/;max-age=31536000`;
        router.refresh();
      }

      try {
        const { error } = await (supabase as any)
          .from("user_preferences")
          .update({ [key]: value, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);

        if (error) {
          console.error("Error updating preference:", error);
          // Revert on error
          loadPreferences();
        }
      } catch (error) {
        console.error("Error updating preference:", error);
        loadPreferences();
      }
    },
    [user, setTheme, router, loadPreferences]
  );

  const refreshPreferences = useCallback(async () => {
    await loadPreferences();
  }, [loadPreferences]);

  return (
    <PreferencesContext.Provider
      value={{ preferences, isLoading, updatePreference, refreshPreferences }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
}
