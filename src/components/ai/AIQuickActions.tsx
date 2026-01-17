// app/components/AIQuickActions.tsx
"use client";

import { AI_WORKERS } from "@/lib/ai-helper";
import { countWords, DAILY_WORD_LIMIT, useAIUsage } from "@/lib/ai-usage";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Pencil,
  Settings,
  Sparkles,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface AIQuickActionsProps {
  content: string;
  onWorkerSelect: (
    workerId: string,
  ) => Promise<{ success: boolean; data?: any; [key: string]: any }>;
  onApplyResult: (workerId: string, result: any) => void;
  recentResults?: Record<string, any>;
  hasImages?: boolean; // Disable content editing if has images
}

export default function AIQuickActions({
  content,
  onWorkerSelect,
  onApplyResult,
  recentResults = {},
  hasImages = false,
}: AIQuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentWorker, setCurrentWorker] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [localResults, setLocalResults] =
    useState<Record<string, any>>(recentResults);

  // AI Usage tracking
  const {
    isLimitReached,
    remainingWords,
    usagePercentage,
    trackUsage,
    canUseAI,
  } = useAIUsage();
  const t = useTranslations("aiUsage");

  // Content modifying workers (disabled when hasImages)
  const contentModifyingWorkers = ["edit", "organize"];

  // recentResults prop'u değiştiğinde localResults'u güncelle
  useEffect(() => {
    setLocalResults(recentResults);
  }, [recentResults]);

  // Worker icon'ları için fonksiyon
  const getWorkerIcon = (workerId: string) => {
    switch (workerId) {
      case "suggest":
        return <Wand2 className="w-5 h-5" />;
      case "edit":
        return <Pencil className="w-5 h-5" />;
      case "organize":
        return <Settings className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  const handleWorkerSelect = async (workerId: string) => {
    const worker = AI_WORKERS.find((w) => w.id === workerId);

    if (!worker || !worker.minLength) {
      console.error(`Worker ${workerId} not found or missing minLength`);
      return;
    }

    // Check AI usage limits
    if (isLimitReached || !canUseAI()) {
      return;
    }

    // Block content-modifying workers if content has images
    if (hasImages && contentModifyingWorkers.includes(workerId)) {
      return;
    }

    if (content.length < worker.minLength || isProcessing) {
      return;
    }

    setSelectedWorker(workerId);
    setIsProcessing(true);
    setCurrentWorker(workerId);

    try {
      const result = await onWorkerSelect(workerId);

      // Sonucu local state'e kaydet
      if (result) {
        setLocalResults((prev) => ({ ...prev, [workerId]: result }));
      }

      // Başarılıysa kullanımı kaydet ve modal'ı kapat
      if (result?.success) {
        // Track AI usage - count words from input content
        const wordsUsed = countWords(result.content || content);
        await trackUsage(wordsUsed);

        setIsProcessing(false);
        setCurrentWorker(null);
        setSelectedWorker(null);
      } else {
        setIsProcessing(false);
        setCurrentWorker(null);
        setSelectedWorker(null);
      }
    } catch (error) {
      console.error("AI worker error:", error);
      setIsProcessing(false);
      setCurrentWorker(null);
      setSelectedWorker(null);
    }
  };

  const getWorkerStatus = (workerId: string) => {
    if (currentWorker === workerId && isProcessing) return "processing";
    if (localResults[workerId]?.success) return "success";
    return "idle";
  };

  const getProcessingMessage = (workerId: string) => {
    const messages: Record<string, string> = {
      suggest: "Başlık ve özet önerileri hazırlanıyor...",
      edit: "İçerik geliştiriliyor ve düzenleniyor...",
      organize: "Dilbilgisi kontrolü ve format düzenlemesi yapılıyor...",
    };

    return messages[workerId] || "İşleniyor...";
  };

  const getWorkerColorClasses = (workerId: string) => {
    const worker = AI_WORKERS.find((w) => w.id === workerId);
    if (!worker) return "bg-purple-100 dark:bg-purple-900/30";

    // Gradient color'ları normal background color'a çevir
    const colorMap: Record<string, string> = {
      "from-yellow-500 to-orange-500":
        "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
      "from-blue-500 to-cyan-500":
        "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
      "from-green-500 to-emerald-500":
        "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
    };

    return (
      colorMap[worker.color] ||
      "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
    );
  };

  const handleApplyResult = (e: React.MouseEvent, workerId: string) => {
    e.stopPropagation();
    const result = localResults[workerId];
    if (result) {
      onApplyResult(workerId, result);
      setIsOpen(false);
    }
  };

  // Klavye kısayolları
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape" && !isProcessing) {
        setIsOpen(false);
      }

      if (e.ctrlKey && !isProcessing) {
        switch (e.key.toLowerCase()) {
          case "e":
            e.preventDefault();
            handleWorkerSelect("edit");
            break;
          case "o":
            e.preventDefault();
            handleWorkerSelect("organize");
            break;
          case "i":
            e.preventDefault();
            handleWorkerSelect("suggest");
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isProcessing, content]);

  const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
  const hasReadyResults = Object.values(localResults).some((r) => r?.success);

  return (
    <>
      {/* Main Button */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(true)}
          disabled={content.length < 10 || isLimitReached}
          className={`group relative px-4 py-2 ${
            isLimitReached
              ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-500 dark:to-pink-500 hover:from-purple-700 hover:to-pink-700"
          } text-white rounded-lg font-medium disabled:opacity-50 transition-all flex items-center shadow-lg hover:shadow-xl active:scale-95`}
        >
          {isLimitReached ? (
            <AlertTriangle className="w-4 h-4 mr-2" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {isLimitReached ? t("limitReached") : "AI'a Sor"}
          {hasReadyResults && !isLimitReached && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 rounded-full text-xs flex items-center justify-center animate-pulse">
              {Object.values(localResults).filter((r) => r?.success).length}
            </span>
          )}
        </button>

        {/* Tooltip */}
        <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
            {isLimitReached
              ? t("limitReachedMessage")
              : "AI araçlarını aç (Ctrl+I)"}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => !isProcessing && setIsOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-purple-500" />
                    AI Araçları
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    İçeriğinizi geliştirmek için bir araç seçin
                  </p>
                </div>
                <button
                  onClick={() => !isProcessing && setIsOpen(false)}
                  disabled={isProcessing}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* AI Usage Indicator */}
              <div
                className={`mt-4 p-3 rounded-lg ${
                  isLimitReached
                    ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                    : usagePercentage >= 80
                      ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                      : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap
                      className={`w-4 h-4 ${
                        isLimitReached
                          ? "text-red-500"
                          : usagePercentage >= 80
                            ? "text-yellow-500"
                            : "text-blue-500"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        isLimitReached
                          ? "text-red-700 dark:text-red-300"
                          : usagePercentage >= 80
                            ? "text-yellow-700 dark:text-yellow-300"
                            : "text-blue-700 dark:text-blue-300"
                      }`}
                    >
                      {t("dailyUsage")}
                    </span>
                  </div>
                  <span
                    className={`text-sm ${
                      isLimitReached
                        ? "text-red-600 dark:text-red-400"
                        : usagePercentage >= 80
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {remainingWords} / {DAILY_WORD_LIMIT} {t("words")}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      isLimitReached
                        ? "bg-red-500"
                        : usagePercentage >= 80
                          ? "bg-yellow-500"
                          : "bg-blue-500"
                    }`}
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  />
                </div>
                {isLimitReached && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    {t("limitReachedMessage")}
                  </p>
                )}
              </div>

              {/* Content Stats */}
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Icerik Durumu
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {content.length >= 100
                        ? "Analiz icin hazir"
                        : "Daha fazla yazin"}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {wordCount}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        kelime
                      </div>
                    </div>
                    <div className="h-8 w-px bg-gray-300 dark:bg-gray-700" />
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {content.length}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        karakter
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Worker Selection */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {isProcessing && currentWorker ? (
                // Processing State
                <div className="text-center py-8 animate-in fade-in">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full mb-6">
                    <Clock className="w-10 h-10 text-purple-500 animate-spin" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {getProcessingMessage(currentWorker)}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    AI modeli yanıt hazırlıyor...
                  </p>
                  <div className="mt-4">
                    <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse w-3/4"></div>
                    </div>
                  </div>
                </div>
              ) : (
                // Worker List
                <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-300">
                  {/* Image warning */}
                  {hasImages && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>
                          Bu notta resim var. İçerik düzenleme araçları devre
                          dışı.
                        </span>
                      </div>
                    </div>
                  )}

                  {AI_WORKERS.map((worker) => {
                    const status = getWorkerStatus(worker.id);
                    const hasResult = localResults[worker.id]?.success;
                    const isImageBlocked =
                      hasImages && contentModifyingWorkers.includes(worker.id);
                    const isDisabled =
                      content.length < worker.minLength ||
                      isProcessing ||
                      isImageBlocked ||
                      isLimitReached;

                    return (
                      <div
                        key={worker.id}
                        className={`w-full p-4 rounded-xl transition-all ${
                          selectedWorker === worker.id
                            ? "ring-2 ring-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20"
                            : "bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800"
                        } ${isDisabled ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98]"}`}
                      >
                        {/* Tıklanabilir alanı div olarak ve içinde button'lar */}
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() =>
                            !isDisabled && handleWorkerSelect(worker.id)
                          }
                        >
                          <div className="flex items-center flex-1 min-w-0">
                            <div
                              className={`p-3 rounded-lg ${getWorkerColorClasses(worker.id)} mr-4 flex-shrink-0`}
                            >
                              {getWorkerIcon(worker.id)}
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white truncate">
                                {worker.name}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                                {worker.description}
                              </div>
                              {isImageBlocked && (
                                <div className="text-xs text-amber-500 dark:text-amber-400 mt-1">
                                  📷 Resimli notlarda kullanılamaz
                                </div>
                              )}
                              {isDisabled &&
                                !isImageBlocked &&
                                content.length < worker.minLength && (
                                  <div className="text-xs text-red-500 dark:text-red-400 mt-1">
                                    En az {worker.minLength} karakter gerekli
                                  </div>
                                )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-2">
                            {status === "processing" && (
                              <div className="flex items-center text-purple-600 dark:text-purple-400">
                                <Clock className="w-4 h-4" />
                                <span className="ml-1 text-xs">Çalışıyor</span>
                              </div>
                            )}
                            {status === "success" && !isProcessing && (
                              <div className="flex items-center text-green-600 dark:text-green-400">
                                <CheckCircle className="w-4 h-4" />
                                <span className="ml-1 text-xs">Hazır</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Uygula butonu - ayrı bir buton olarak */}
                        {hasResult && status === "success" && !isProcessing && (
                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplyResult(e, worker.id);
                              }}
                              className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg transition-colors whitespace-nowrap"
                            >
                              Sonucu Uygula
                            </button>
                          </div>
                        )}

                        {/* Diğer içerikler... */}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {!isProcessing && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-medium mb-1">Kısayollar:</div>
                      <div className="flex flex-wrap gap-2">
                        <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                          Ctrl
                        </kbd>
                        <span className="text-gray-400">+</span>
                        <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                          E
                        </kbd>
                        <span className="text-gray-400">Düzenle</span>

                        <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs ml-2">
                          Ctrl
                        </kbd>
                        <span className="text-gray-400">+</span>
                        <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                          O
                        </kbd>
                        <span className="text-gray-400">Organize</span>

                        <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs ml-2">
                          Ctrl
                        </kbd>
                        <span className="text-gray-400">+</span>
                        <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                          I
                        </kbd>
                        <span className="text-gray-400">Öneri</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Kapat (Esc)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
