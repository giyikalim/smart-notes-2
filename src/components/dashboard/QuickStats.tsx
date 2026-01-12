"use client";

import { noteAPI } from "@/lib/elasticsearch-client";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

interface QuickStatsProps {
  userId: string;
}

export default function QuickStats({ userId }: QuickStatsProps) {
  const t = useTranslations("stats");
  const locale = useLocale();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats", userId],
    queryFn: () => noteAPI.getStats(userId),
    enabled: !!userId,
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
          📊 {t("totalNotes")}
        </h3>
        <div className="space-y-3 sm:space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      id: "total",
      title: t("totalNotes"),
      value: stats?.totalNotes || 0,
      icon: "📚",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      textColor: "text-blue-700 dark:text-blue-400",
      iconColor: "text-blue-600 dark:text-blue-300",
    },
    {
      id: "active",
      title: t("thisWeek"),
      value: stats?.activeNotes || 0,
      icon: "✅",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      textColor: "text-green-700 dark:text-green-400",
      iconColor: "text-green-600 dark:text-green-300",
    },
    {
      id: "expiring",
      title: t("expiringSoon"),
      value: stats?.expiredNotes || 0,
      icon: "⏰",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      textColor: "text-amber-700 dark:text-amber-400",
      iconColor: "text-amber-600 dark:text-amber-300",
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
        📊 {t("totalNotes")}
      </h3>

      <div className="space-y-3">
        {statCards.map((card) => (
          <div
            key={card.id}
            className={`flex justify-between items-center p-3 ${card.bgColor} rounded-lg transition-all hover:scale-[1.02]`}
          >
            <div>
              <div
                className={`text-xl sm:text-2xl font-bold ${card.textColor}`}
              >
                {card.value}
              </div>
              <div className={`text-xs ${card.textColor} opacity-80`}>
                {card.title}
              </div>
            </div>
            <div className={`text-xl sm:text-2xl ${card.iconColor}`}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {stats?.lastUpdated && (
        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {new Date(stats.lastUpdated).toLocaleTimeString(locale, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      )}
    </div>
  );
}
