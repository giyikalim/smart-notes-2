// Wrapper functions for AI API calls with usage tracking
import { countWords, DAILY_WORD_LIMIT } from "./ai-usage";

export interface AIUsageCheck {
  canProceed: boolean;
  wordsUsed: number;
  remaining: number;
  error?: string;
}

// Check if user can make an AI request (client-side)
export function checkCanUseAI(
  currentWordsUsed: number,
  inputText: string
): AIUsageCheck {
  const inputWordCount = countWords(inputText);
  const remaining = DAILY_WORD_LIMIT - currentWordsUsed;

  if (currentWordsUsed >= DAILY_WORD_LIMIT) {
    return {
      canProceed: false,
      wordsUsed: currentWordsUsed,
      remaining: 0,
      error: "LIMIT_REACHED",
    };
  }

  // Allow the request even if it might exceed limit slightly
  // We'll track actual usage after the response
  return {
    canProceed: true,
    wordsUsed: currentWordsUsed,
    remaining,
  };
}

// Calculate words to track from AI request
export function calculateUsageFromRequest(inputText: string): number {
  // Track input words as usage
  // This is a simplified approach - in production you might want to track
  // both input and output tokens
  return countWords(inputText);
}
