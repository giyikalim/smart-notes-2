"use client";

import { AIUsageIndicator } from "@/components/ai/AIUsageIndicator";
import MilkdownEditor from "@/components/editor/MilkdownEditor";
import {
  AICategoryResult,
  getAICategory,
  getAISuggestion,
} from "@/lib/ai-helper";
import { countWords, useAIUsage } from "@/lib/ai-usage";
import { useAuth } from "@/lib/auth";
import {
  CATEGORIES,
  getCategoryColors,
  getCategoryName,
} from "@/lib/categories";
import { noteAPI, NoteImage } from "@/lib/elasticsearch-client";
import {
  combineOcrTexts,
  filterReferencedImages,
  findOrphanedImages,
  getContentForAI,
  getSearchableContent,
  getTotalContentLength,
  hasImages,
} from "@/lib/image-processor";
import { deleteImages, UploadedImage } from "@/lib/image-uploader";
import debounce from "lodash/debounce";
import {
  AlertCircle,
  ArrowLeft,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Tag,
} from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

export default function CreateNotePage() {
  const { user } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);

  // AI Usage tracking
  const { isLimitReached, canUseAI, trackUsage, remainingWords } = useAIUsage();

  // Kullanıcının girdiği başlık ve özet
  const [userTitle, setUserTitle] = useState("");
  const [userSummary, setUserSummary] = useState("");

  // Auto-focus editor on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const editorElement = editorContainerRef.current?.querySelector('.ProseMirror');
      if (editorElement instanceof HTMLElement) {
        editorElement.focus();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // AI önerileri
  const [aiSuggestions, setAiSuggestions] = useState<{
    suggestedTitle: string;
    suggestedSummary: string;
    language: string;
    wordCount: number;
  } | null>(null);

  // AI Category
  const [aiCategory, setAiCategory] = useState<AICategoryResult | null>(null);

  // Uploaded images
  const [uploadedImages, setUploadedImages] = useState<NoteImage[]>([]);

  // Track if content has images
  const contentHasImages = hasImages(content);

  // Debounced AI suggestion - use clean content + OCR for AI analysis
  const getAISuggestions = useCallback(
    debounce(async (text: string) => {
      // Get clean text for AI analysis (no image placeholders, but include OCR)
      const ocrTexts = uploadedImages.map((img) => img.ocrText);
      const contentForAI = getContentForAI(text, ocrTexts);

      // Check total content length (text + OCR) for AI trigger
      const totalLength = getTotalContentLength(text, ocrTexts);
      if (totalLength < 30) {
        setAiSuggestions(null);
        setAiCategory(null);
        return;
      }

      // Check AI usage limit before calling AI
      const wordCount = countWords(contentForAI);
      if (isLimitReached || !canUseAI(wordCount)) {
        toast.error("Günlük AI limitiniz doldu. Yarın tekrar deneyin.", {
          duration: 3000,
          id: "ai-limit-reached",
        });
        return;
      }

      setIsAILoading(true);
      setIsCategoryLoading(true);

      try {
        // Use clean text + OCR for AI analysis
        const [suggestion, category] = await Promise.all([
          getAISuggestion(contentForAI),
          getAICategory(contentForAI),
        ]);

        if (suggestion.success) {
          // Track AI usage after successful call
          await trackUsage(wordCount);

          const aiSuggestion = {
            suggestedTitle: suggestion.title,
            suggestedSummary: suggestion.summary,
            language: suggestion.language,
            wordCount: suggestion.wordCount,
          };

          setAiSuggestions(aiSuggestion);

          if (!userTitle) setUserTitle(aiSuggestion.suggestedTitle);
          if (!userSummary) setUserSummary(aiSuggestion.suggestedSummary);

          const languageEmoji = suggestion.language === "tr" ? "🇹🇷" : "🇬🇧";
          toast.success(`${languageEmoji} AI başlık ve özet oluşturuldu!`, {
            duration: 2000,
          });
        }

        if (category.success && category.data) {
          setAiCategory(category);
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
    [userTitle, userSummary, uploadedImages, isLimitReached, canUseAI, trackUsage],
  );

  // Handle content change from editor
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);

      const cleanText = getSearchableContent(newContent);
      const ocrTexts = uploadedImages.map((img) => img.ocrText);
      const totalLength = getTotalContentLength(newContent, ocrTexts);

      if (cleanText.trim() && totalLength >= 30) {
        getAISuggestions(newContent);
      } else if (cleanText.trim()) {
        if (!userTitle) setUserTitle("");
        if (!userSummary) setUserSummary("");
        setAiSuggestions(null);
        setAiCategory(null);
      } else {
        setUserTitle("");
        setUserSummary("");
        setAiSuggestions(null);
        setAiCategory(null);
      }
    },
    [getAISuggestions, userTitle, userSummary, uploadedImages],
  );

  // Handle image upload from editor
  const handleImageUpload = useCallback((image: UploadedImage) => {
    const noteImage: NoteImage = {
      id: image.id,
      storagePaths: image.storagePaths,
      ocrText: image.ocrText,
      ocrConfidence: image.ocrConfidence,
      dimensions: image.dimensions,
      originalName: image.originalName,
      uploadedAt: new Date().toISOString(),
    };

    setUploadedImages((prev) => [...prev, noteImage]);

    if (image.ocrText) {
      toast.success(
        `🔍 Resimde metin bulundu: "${image.ocrText.substring(0, 50)}..."`,
        {
          duration: 3000,
        },
      );
    }
  }, []);

  const handleSubmit = async () => {
    if (!user || !content.trim()) {
      toast.error("Lütfen not içeriği girin");
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanText = getSearchableContent(content);

      const finalTitle =
        userTitle ||
        aiSuggestions?.suggestedTitle ||
        cleanText.split("\n")[0].substring(0, 60) +
          (cleanText.split("\n")[0].length > 60 ? "..." : "");

      const finalSummary =
        userSummary ||
        aiSuggestions?.suggestedSummary ||
        cleanText.substring(0, 200) + (cleanText.length > 200 ? "..." : "");

      // Find images that are still referenced in content vs orphaned ones
      const referencedImages = filterReferencedImages(content, uploadedImages);
      const orphanedImages = findOrphanedImages(content, uploadedImages);

      // Delete orphaned images from Supabase storage
      if (orphanedImages.length > 0) {
        const orphanedIds = orphanedImages.map((img) => img.id);
        await deleteImages(user.id, orphanedIds);
        console.log(`Deleted ${orphanedIds.length} orphaned images`);
      }

      // Build searchContent: only OCR text from referenced images
      const searchContent = combineOcrTexts(
        referencedImages.map((img) => img.ocrText),
      );

      const note = await noteAPI.createNoteWithAIMetadata({
        userId: user.id,
        content,
        searchContent,
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
        images: referencedImages.length > 0 ? referencedImages : undefined,
      });

      const isEdited = userTitle && userTitle !== aiSuggestions?.suggestedTitle;

      toast.success(
        `📝 Not başarıyla ${isEdited ? "düzenlenerek " : ""}kaydedildi!${referencedImages.length > 0 ? ` (${referencedImages.length} resim)` : ""}`,
        { duration: 3000, icon: isEdited ? "✏️" : "🤖" },
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

  const cleanTextLength = getSearchableContent(content).length;
  const totalContentLength = getTotalContentLength(
    content,
    uploadedImages.map((img) => img.ocrText),
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header - Compact */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Yeni Not
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    AI otomatik analiz eder
                  </p>
                </div>
              </div>
            </div>

            {/* Actions in header */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                İptal
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !content.trim()}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    {aiSuggestions ? "AI ile Kaydet" : "Kaydet"}
                    {uploadedImages.length > 0 && ` (${uploadedImages.length} 📷)`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left/Main Panel: Editor */}
          <div className="lg:col-span-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  İçerik
                </h2>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {getSearchableContent(content).split(/\s+/).filter((w) => w.length > 0).length} kelime
                  </span>
                  <span>{cleanTextLength} karakter</span>
                </div>
              </div>

              <div ref={editorContainerRef}>
                <MilkdownEditor
                  value={content}
                  onChange={handleContentChange}
                  onImageUpload={handleImageUpload}
                  placeholder="Notunuzu buraya yazın... (Markdown destekli, resim ekleyebilirsiniz)"
                  minHeight="calc(100vh - 250px)"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Right Panel: AI Generated Title, Summary, Category */}
          <div className="lg:col-span-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-4">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  AI Analizi
                  {isAILoading && (
                    <Loader2 className="w-3 h-3 text-blue-600 animate-spin ml-auto" />
                  )}
                </h2>
              </div>

              <div className="p-4 space-y-4">
                {/* AI Usage Status */}
                <AIUsageIndicator variant="full" />

                {/* AI Status */}
                {totalContentLength < 30 && !isLimitReached && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-700 dark:text-amber-400 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>AI analizi için en az 30 karakter yazın</span>
                  </div>
                )}

                {aiSuggestions && !isAILoading && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-400 text-xs">
                    <span>✓</span>
                    <span>AI analizi tamamlandı</span>
                  </div>
                )}

                {/* Title */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Başlık
                    </label>
                    {aiSuggestions && userTitle !== aiSuggestions.suggestedTitle && (
                      <button
                        onClick={() => setUserTitle(aiSuggestions.suggestedTitle)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        AI önerisi
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={userTitle}
                    onChange={(e) => setUserTitle(e.target.value)}
                    placeholder={isAILoading ? "AI oluşturuyor..." : "Otomatik oluşturulacak..."}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Summary */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Özet
                    </label>
                    {aiSuggestions && userSummary !== aiSuggestions.suggestedSummary && (
                      <button
                        onClick={() => setUserSummary(aiSuggestions.suggestedSummary)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        AI önerisi
                      </button>
                    )}
                  </div>
                  <textarea
                    value={userSummary}
                    onChange={(e) => setUserSummary(e.target.value)}
                    placeholder={isAILoading ? "AI oluşturuyor..." : "Otomatik oluşturulacak..."}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 resize-none"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Category */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FolderOpen className="w-3.5 h-3.5 text-gray-500" />
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Kategori
                    </label>
                    {isCategoryLoading && (
                      <Loader2 className="w-3 h-3 text-blue-600 animate-spin ml-auto" />
                    )}
                  </div>

                  {categoryInfo ? (
                    <div className="space-y-2">
                      <div
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${categoryInfo.colors.bg} ${categoryInfo.colors.text} border ${categoryInfo.colors.border}`}
                      >
                        <span>{categoryInfo.category?.icon}</span>
                        <span className="font-medium">{categoryInfo.categoryName}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                        <Tag className="w-3.5 h-3.5" />
                        <span>{categoryInfo.subcategoryName}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                      {isCategoryLoading ? "Belirleniyor..." : "Otomatik belirlenecek..."}
                    </div>
                  )}
                </div>

                {/* Images info */}
                {uploadedImages.length > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-700 dark:text-purple-400 text-xs">
                    <ImageIcon className="w-4 h-4" />
                    <span>{uploadedImages.length} resim eklendi</span>
                  </div>
                )}

                {/* Info */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    💡 30+ karakter yazdığınızda AI otomatik olarak başlık, özet ve kategori önerir.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
