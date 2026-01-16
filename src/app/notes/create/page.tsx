"use client";

import MilkdownEditor from "@/components/editor/MilkdownEditor";
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
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Tag,
} from "lucide-react";
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

      setIsAILoading(true);
      setIsCategoryLoading(true);

      try {
        // Use clean text + OCR for AI analysis
        const [suggestion, category] = await Promise.all([
          getAISuggestion(contentForAI),
          getAICategory(contentForAI),
        ]);

        if (suggestion.success) {
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
    [userTitle, userSummary, uploadedImages],
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Yeni Not Oluştur
                </h1>
                <p className="text-blue-100 dark:text-blue-300 mt-1">
                  Markdown destekli • Resim ekleyebilirsiniz • AI otomatik
                  analiz
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

            {/* AI Status Bar */}
            <div className="mb-6 flex flex-wrap items-center gap-4">
              {isAILoading && (
                <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI analiz ediyor...
                </div>
              )}
              {aiSuggestions && !isAILoading && (
                <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                  ✓ AI analizi tamamlandı
                </div>
              )}
              {uploadedImages.length > 0 && (
                <div className="flex items-center text-sm text-purple-600 dark:text-purple-400">
                  <ImageIcon className="w-4 h-4 mr-1" />
                  {uploadedImages.length} resim eklendi
                </div>
              )}
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

            {/* Milkdown Editor */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Not İçeriği *
              </label>
              <MilkdownEditor
                value={content}
                onChange={handleContentChange}
                onImageUpload={handleImageUpload}
                placeholder="Notunuzu buraya yazın... (Markdown destekli, resim ekleyebilirsiniz)"
                minHeight="350px"
                disabled={isSubmitting}
              />
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between gap-4 mb-8 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-4">
                <span>
                  {
                    getSearchableContent(content)
                      .split(/\s+/)
                      .filter((w) => w.length > 0).length
                  }{" "}
                  kelime
                </span>
                <span>{cleanTextLength} karakter</span>
                <span>3 ay expire</span>
              </div>
              {totalContentLength < 30 && (
                <span className="text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  AI analizi için en az 30 karakter (metin + OCR)
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
                  <>
                    ✓ {aiSuggestions ? "AI ile Kaydet" : "Not Oluştur"}
                    {uploadedImages.length > 0 &&
                      ` (${uploadedImages.length} 📷)`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
