"use client";

import { DAILY_WORD_LIMIT, useAIUsage } from "@/lib/ai-usage";
import { AlertTriangle, Sparkles, X, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface AIUsageIndicatorProps {
  variant?: "compact" | "full";
  showDismiss?: boolean;
}

export function AIUsageIndicator({
  variant = "compact",
  showDismiss = false,
}: AIUsageIndicatorProps) {
  const {
    usage,
    isLoading,
    isLimitReached,
    isNearLimit,
    remainingWords,
    usagePercentage,
  } = useAIUsage();
  const t = useTranslations("aiUsage");
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if loading, dismissed, or no usage data
  if (isLoading || isDismissed || !usage) {
    return null;
  }

  // For compact variant, only show when near limit or limit reached
  if (variant === "compact" && !isNearLimit && !isLimitReached) {
    return null;
  }

  // Determine color scheme based on usage
  const getColorClasses = () => {
    if (isLimitReached) {
      return {
        bg: "bg-red-50 dark:bg-red-900/30",
        border: "border-red-200 dark:border-red-800",
        text: "text-red-700 dark:text-red-300",
        progress: "bg-red-500",
        icon: "text-red-500 dark:text-red-400",
      };
    }
    if (isNearLimit) {
      return {
        bg: "bg-yellow-50 dark:bg-yellow-900/30",
        border: "border-yellow-200 dark:border-yellow-800",
        text: "text-yellow-700 dark:text-yellow-300",
        progress: "bg-yellow-500",
        icon: "text-yellow-500 dark:text-yellow-400",
      };
    }
    return {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-700 dark:text-blue-300",
      progress: "bg-blue-500",
      icon: "text-blue-500 dark:text-blue-400",
    };
  };

  const colors = getColorClasses();

  if (variant === "compact") {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors.bg} ${colors.border} border`}
      >
        {isLimitReached ? (
          <AlertTriangle className={`w-4 h-4 ${colors.icon}`} />
        ) : (
          <Zap className={`w-4 h-4 ${colors.icon}`} />
        )}
        <span className={`text-sm font-medium ${colors.text}`}>
          {isLimitReached
            ? t("limitReached")
            : t("wordsRemaining", { count: remainingWords })}
        </span>
        {showDismiss && !isLimitReached && (
          <button
            onClick={() => setIsDismissed(true)}
            className={`ml-1 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 ${colors.text}`}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div
      className={`rounded-xl ${colors.bg} ${colors.border} border p-4`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${colors.bg}`}>
            <Sparkles className={`w-4 h-4 ${colors.icon}`} />
          </div>
          <div>
            <h4 className={`font-medium ${colors.text}`}>
              {t("dailyUsage")}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("resetsDaily")}
            </p>
          </div>
        </div>
        {showDismiss && (
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className={colors.text}>
            {usage.wordsUsed} / {DAILY_WORD_LIMIT} {t("words")}
          </span>
          <span className={colors.text}>{Math.round(usagePercentage)}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${colors.progress} transition-all duration-300`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Status message */}
      <p className={`text-sm ${colors.text}`}>
        {isLimitReached ? (
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            {t("limitReachedMessage")}
          </span>
        ) : isNearLimit ? (
          t("nearLimitMessage", { count: remainingWords })
        ) : (
          t("usageNormal", { count: remainingWords })
        )}
      </p>
    </div>
  );
}

// Warning banner for dashboard header
export function AIUsageBanner() {
  const { isLimitReached, isNearLimit, remainingWords, isLoading } = useAIUsage();
  const t = useTranslations("aiUsage");
  const [isDismissed, setIsDismissed] = useState(false);

  // Reset dismissed state at midnight
  // In production, you might want to use a more sophisticated approach

  if (isLoading || isDismissed || (!isLimitReached && !isNearLimit)) {
    return null;
  }

  const isWarning = isNearLimit && !isLimitReached;

  return (
    <div
      className={`w-full px-4 py-2 flex items-center justify-center gap-3 ${
        isLimitReached
          ? "bg-red-500 dark:bg-red-600 text-white"
          : "bg-yellow-400 dark:bg-yellow-500 text-yellow-900"
      }`}
    >
      {isLimitReached ? (
        <AlertTriangle className="w-4 h-4" />
      ) : (
        <Zap className="w-4 h-4" />
      )}
      <span className="text-sm font-medium">
        {isLimitReached
          ? t("bannerLimitReached")
          : t("bannerNearLimit", { count: remainingWords })}
      </span>
      <button
        onClick={() => setIsDismissed(true)}
        className={`ml-2 p-1 rounded-full ${
          isLimitReached
            ? "hover:bg-red-600 dark:hover:bg-red-700"
            : "hover:bg-yellow-500 dark:hover:bg-yellow-600"
        }`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
