"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

// Daily word limit per user
export const DAILY_WORD_LIMIT = 1000;

// Warning threshold (show warning when usage exceeds this percentage)
export const WARNING_THRESHOLD = 0.8; // 80%

export interface AIUsageData {
  wordsUsed: number;
  requestsCount: number;
  date: string;
}

interface AIUsageContextType {
  usage: AIUsageData | null;
  isLoading: boolean;
  isLimitReached: boolean;
  isNearLimit: boolean;
  remainingWords: number;
  usagePercentage: number;
  refreshUsage: () => Promise<void>;
  trackUsage: (wordCount: number) => Promise<boolean>;
  canUseAI: (requiredWords?: number) => boolean;
}

const AIUsageContext = createContext<AIUsageContextType | undefined>(undefined);

// Get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// Count words in text
export function countWords(text: string): number {
  if (!text || typeof text !== "string") return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

export function AIUsageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [usage, setUsage] = useState<AIUsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Calculate derived values
  const wordsUsed = usage?.wordsUsed ?? 0;
  const remainingWords = Math.max(0, DAILY_WORD_LIMIT - wordsUsed);
  const usagePercentage = Math.min(100, (wordsUsed / DAILY_WORD_LIMIT) * 100);
  const isLimitReached = wordsUsed >= DAILY_WORD_LIMIT;
  const isNearLimit = usagePercentage >= WARNING_THRESHOLD * 100;

  // Load usage from database
  const loadUsage = useCallback(async () => {
    if (!user) {
      setUsage(null);
      setIsLoading(false);
      return;
    }

    try {
      const today = getTodayDate();

      const { data, error } = await (supabase as any)
        .from("ai_daily_usage")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .single();

      if (error) {
        // No record for today - this is fine, user hasn't used AI yet
        if (error.code === "PGRST116") {
          setUsage({
            wordsUsed: 0,
            requestsCount: 0,
            date: today,
          });
        } else {
          console.error("Error loading AI usage:", error);
        }
      } else if (data) {
        setUsage({
          wordsUsed: data.words_used,
          requestsCount: data.requests_count,
          date: data.date,
        });
      }
    } catch (error) {
      console.error("Error loading AI usage:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load usage on mount and when user changes
  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  // Refresh usage data
  const refreshUsage = useCallback(async () => {
    await loadUsage();
  }, [loadUsage]);

  // Track new usage (called after successful AI request)
  const trackUsage = useCallback(
    async (wordCount: number): Promise<boolean> => {
      if (!user) return false;

      const today = getTodayDate();
      const currentWordsUsed = usage?.wordsUsed ?? 0;
      const currentRequestsCount = usage?.requestsCount ?? 0;

      try {
        // Try to update existing record
        const { data: existingData } = await (supabase as any)
          .from("ai_daily_usage")
          .select("id, words_used, requests_count")
          .eq("user_id", user.id)
          .eq("date", today)
          .single();

        if (existingData) {
          // Update existing record
          const { error } = await (supabase as any)
            .from("ai_daily_usage")
            .update({
              words_used: existingData.words_used + wordCount,
              requests_count: existingData.requests_count + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingData.id);

          if (error) {
            console.error("Error updating AI usage:", error);
            return false;
          }
        } else {
          // Insert new record
          const { error } = await (supabase as any)
            .from("ai_daily_usage")
            .insert({
              user_id: user.id,
              date: today,
              words_used: wordCount,
              requests_count: 1,
            });

          if (error) {
            console.error("Error inserting AI usage:", error);
            return false;
          }
        }

        // Update local state
        setUsage({
          wordsUsed: currentWordsUsed + wordCount,
          requestsCount: currentRequestsCount + 1,
          date: today,
        });

        return true;
      } catch (error) {
        console.error("Error tracking AI usage:", error);
        return false;
      }
    },
    [user, usage],
  );

  // Check if user can use AI
  const canUseAI = useCallback(
    (requiredWords: number = 0): boolean => {
      if (!user) return false;
      if (isLimitReached) return false;
      if (requiredWords > 0 && wordsUsed + requiredWords > DAILY_WORD_LIMIT) {
        return false;
      }
      return true;
    },
    [user, isLimitReached, wordsUsed],
  );

  return (
    <AIUsageContext.Provider
      value={{
        usage,
        isLoading,
        isLimitReached,
        isNearLimit,
        remainingWords,
        usagePercentage,
        refreshUsage,
        trackUsage,
        canUseAI,
      }}
    >
      {children}
    </AIUsageContext.Provider>
  );
}

export function useAIUsage() {
  const context = useContext(AIUsageContext);
  if (context === undefined) {
    throw new Error("useAIUsage must be used within an AIUsageProvider");
  }
  return context;
}

// Helper function to check usage before AI call (for use in API routes or server-side)
export async function checkUserAIUsage(
  userId: string,
): Promise<{ canUse: boolean; wordsUsed: number; remaining: number }> {
  const today = getTodayDate();

  const { data, error } = await (supabase as any)
    .from("ai_daily_usage")
    .select("words_used")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error checking AI usage:", error);
  }

  const wordsUsed = data?.words_used ?? 0;
  const remaining = Math.max(0, DAILY_WORD_LIMIT - wordsUsed);

  return {
    canUse: wordsUsed < DAILY_WORD_LIMIT,
    wordsUsed,
    remaining,
  };
}

// Helper function to record usage (for use in API routes)
export async function recordAIUsage(
  userId: string,
  wordCount: number,
): Promise<boolean> {
  const today = getTodayDate();

  try {
    const { data: existingData } = await (supabase as any)
      .from("ai_daily_usage")
      .select("id, words_used, requests_count")
      .eq("user_id", userId)
      .eq("date", today)
      .single();

    if (existingData) {
      const { error } = await (supabase as any)
        .from("ai_daily_usage")
        .update({
          words_used: existingData.words_used + wordCount,
          requests_count: existingData.requests_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingData.id);

      return !error;
    } else {
      const { error } = await (supabase as any).from("ai_daily_usage").insert({
        user_id: userId,
        date: today,
        words_used: wordCount,
        requests_count: 1,
      });

      return !error;
    }
  } catch (error) {
    console.error("Error recording AI usage:", error);
    return false;
  }
}
