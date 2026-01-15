"use client";

import {
  AICategoryResult,
  getAICategory,
  getAISuggestion,
} from "@/lib/ai-helper";
import { useAuth } from "@/lib/auth";
import {
  CATEGORIES,
  getCategoryColors,
  getCategoryName,
} from "@/lib/categories";
import { noteAPI } from "@/lib/elasticsearch-client";
import debounce from "lodash/debounce";
import { FolderOpen, Loader2, Tag } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";

export default function CreateNotePage() {
  const { user } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);

  // Kullanıcının girdiği başlık ve özet
  const [userTitle, setUserTitle] = useState("");
  const [userSummary, setUserSummary] = useState("");

  // AI önerileri
  const [aiSuggestions, setAiSuggestions] = useState<{
    suggestedTitle: string;
    suggestedSummary: string;
    language: string;
    wordCount: number;
  } | null>(null);

  // AI Category
  const [aiCategory, setAiCategory] = useState<AICategoryResult | null>(null);

  // Debounced AI suggestion
  const getAISuggestions = useCallback(
    debounce(async (text: string) => {
      if (text.length < 30) {
        setAiSuggestions(null);
        setAiCategory(null);
        return;
      }

      setIsAILoading(true);
      setIsCategoryLoading(true);

      try {
        // Parallel API calls for suggestions and category
        const suggestion = await getAISuggestion(text);

        if (suggestion.success) {
          const aiSuggestion = {
            suggestedTitle: suggestion.title,
            suggestedSummary: suggestion.summary,
            language: suggestion.language,
            wordCount: suggestion.wordCount,
          };

          setAiSuggestions(aiSuggestion);

          // Kullanıcı düzenlemediyse AI önerisini göster
          setUserTitle(aiSuggestion.suggestedTitle);
          setUserSummary(aiSuggestion.suggestedSummary);

          const languageEmoji = suggestion.language === "tr" ? "🇹🇷" : "🇬🇧";
          toast.success(`${languageEmoji} AI başlık ve özet oluşturuldu!`, {
            duration: 2000,
          });
        }

        if (!aiCategory) {
          const category = await getAICategory(text);
          if (category.success && category.data) {
            setAiCategory(category);
          }
        }
      } catch (error) {
        console.error("AI suggestion error:", error);
        toast.error("AI servisi geçici olarak kullanılamıyor", {
          duration: 3000,
        });
      } finally {
        setIsAILoading(false);
        setIsCategoryLoading(false);
      }
    }, 1500),
    [userTitle, userSummary]
  );

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setContent(text);

    if (text.trim() && text.length >= 30) {
      getAISuggestions(text);
    } else {
      setUserTitle("");
      setUserSummary("");
      setAiSuggestions(null);
      setAiCategory(null);
    }
  };

  const handleSubmit = async () => {
    if (!user || !content.trim()) {
      toast.error("Lütfen not içeriği girin");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalTitle =
        userTitle ||
        aiSuggestions?.suggestedTitle ||
        content.split("\n")[0].substring(0, 60) +
          (content.split("\n")[0].length > 60 ? "..." : "");

      const finalSummary =
        userSummary ||
        aiSuggestions?.suggestedSummary ||
        content.substring(0, 200) + (content.length > 200 ? "..." : "");

      const note = await noteAPI.createNoteWithAIMetadata({
        userId: user.id,
        content,
        title: finalTitle,
        summary: finalSummary,
        language: aiSuggestions?.language || "tr",
        wordCount: aiSuggestions?.wordCount,
        aiSuggestions: aiSuggestions
          ? {
              suggestedTitle: aiSuggestions.suggestedTitle,
              suggestedSummary: aiSuggestions.suggestedSummary,
              language: aiSuggestions.language,
              wordCount: aiSuggestions.wordCount,
            }
          : undefined,
        categoryData:
          aiCategory?.success && aiCategory.data
            ? {
                category: aiCategory.data.category,
                subcategory: aiCategory.data.subcategory,
              }
            : undefined,
      });

      const isEdited = userTitle && userTitle !== aiSuggestions?.suggestedTitle;

      toast.success(
        `📝 Not başarıyla ${isEdited ? "düzenlenerek " : ""}kaydedildi!`,
        { duration: 3000, icon: isEdited ? "✏️" : "🤖" }
      );

      router.push(`/notes/${note._id}`);
    } catch (error) {
      console.error("Not oluşturma hatası:", error);
      toast.error("Not kaydedilemedi. Lütfen tekrar deneyin.", {
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get category display info
  const categoryInfo = aiCategory?.data
    ? {
        category: CATEGORIES[aiCategory.data.category],
        categoryName: getCategoryName(aiCategory.data.category, locale),
        subcategoryName: getCategoryName(aiCategory.data.subcategory, locale),
        colors: getCategoryColors(aiCategory.data.category),
      }
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Yeni Not Oluştur
                </h1>
                <p className="text-blue-100 dark:text-blue-300 mt-1">
                  AI önerilerini kabul edin veya kendiniz düzenleyin
                </p>
              </div>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                ← Geri
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Başlık */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Başlık
                </label>
                {aiSuggestions &&
                  userTitle !== aiSuggestions.suggestedTitle && (
                    <button
                      onClick={() => setUserTitle(aiSuggestions.suggestedTitle)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      AI önerisine dön
                    </button>
                  )}
              </div>
              <input
                type="text"
                value={userTitle}
                onChange={(e) => setUserTitle(e.target.value)}
                placeholder="Not başlığı..."
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                disabled={isSubmitting}
              />
            </div>

            {/* Özet */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Özet
                </label>
                {aiSuggestions &&
                  userSummary !== aiSuggestions.suggestedSummary && (
                    <button
                      onClick={() =>
                        setUserSummary(aiSuggestions.suggestedSummary)
                      }
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      AI önerisine dön
                    </button>
                  )}
              </div>
              <textarea
                value={userSummary}
                onChange={(e) => setUserSummary(e.target.value)}
                placeholder="Not özeti..."
                rows={2}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 resize-none"
                disabled={isSubmitting}
              />
            </div>

            {/* AI Category Section */}
            {(categoryInfo || isCategoryLoading) && (
              <div
                className={`mb-6 p-4 rounded-xl border ${
                  categoryInfo
                    ? `${categoryInfo.colors.bg} ${categoryInfo.colors.border}`
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <FolderOpen
                    className={`w-5 h-5 ${categoryInfo ? categoryInfo.colors.text : "text-gray-500"}`}
                  />
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    AI Kategorisi
                  </span>
                  {isCategoryLoading && (
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  )}
                </div>

                {categoryInfo && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${categoryInfo.colors.bg} ${categoryInfo.colors.text} border ${categoryInfo.colors.border}`}
                    >
                      <span className="text-lg">
                        {categoryInfo.category?.icon}
                      </span>
                      <span className="font-medium">
                        {categoryInfo.categoryName}
                      </span>
                    </div>
                    <span className="text-gray-400">→</span>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                      <Tag className="w-4 h-4" />
                      <span>{categoryInfo.subcategoryName}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Not İçeriği */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Not İçeriği *
                </label>
                {isAILoading && (
                  <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    AI analiz ediyor...
                  </div>
                )}
              </div>
              <textarea
                value={content}
                onChange={handleContentChange}
                placeholder="Notunuzu buraya yazın... (en az 30 karakter)"
                className="w-full h-64 p-4 border-2 border-gray-300 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between gap-4 mb-8 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-4">
                <span>
                  {content.split(/\s+/).filter((w) => w.length > 0).length}{" "}
                  kelime
                </span>
                <span>{content.length} karakter</span>
                <span>3 ay expire</span>
              </div>
              {aiSuggestions && (
                <span className="text-green-600 dark:text-green-400">
                  ✓ AI analizi tamamlandı
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                disabled={isSubmitting}
              >
                İptal
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !content.trim()}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center shadow-md hover:shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>✓ {aiSuggestions ? "AI ile Kaydet" : "Not Oluştur"}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
