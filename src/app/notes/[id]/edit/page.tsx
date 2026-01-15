"use client";

import AIQuickActions from "@/components/ai/AIQuickActions";
import {
  AI_WORKERS,
  getAIEdit,
  getAIOrganize,
  getAISuggestion,
} from "@/lib/ai-helper";
import { useAuth } from "@/lib/auth";
import { noteAPI } from "@/lib/elasticsearch-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function FullscreenEditPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const noteId = params.id as string;

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [wordCount, setWordCount] = useState(0);

  // AI özellikleri
  const [aiSuggestions, setAiSuggestions] = useState<{
    suggestedTitle?: string;
    suggestedSummary?: string;
    suggestedContent?: string;
    language: string;
  } | null>(null);

  const [isAILoading, setIsAILoading] = useState(false);
  const [showAIRequestPanel, setShowAIRequestPanel] = useState(false);

  // Edit modları ve yeni state'ler
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [isSummaryEditing, setIsSummaryEditing] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [isSidePanelCollapsed, setIsSidePanelCollapsed] = useState(false); // Yeni state

  const toggleContentFullscreen = () => {
    setIsContentExpanded(!isContentExpanded);
  };

  // Not verilerini getir
  const { data: note, isLoading } = useQuery({
    queryKey: ["note", noteId],
    queryFn: () => noteAPI.getNoteById(noteId),
    enabled: !!noteId && !!user,
  });

  const [aiResults, setAiResults] = useState<Record<string, any>>({});
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [currentAIWorker, setCurrentAIWorker] = useState<string | null>(null);

  // İlk yükleme
  useEffect(() => {
    if (note) {
      setContent(note.content);
      setTitle(note.title);
      setSummary(note.summary || "");
      setKeywords(note.keywords || []);
      setWordCount(
        note.content.split(/\s+/).filter((w) => w.length > 0).length
      );

      // Eğer AI metadata varsa, AI önerilerini yükle
      if (note.metadata?.aiMetadata) {
        setAiSuggestions((s) => ({
          ...s,
          suggestedTitle: note.metadata?.aiMetadata?.suggestedTitle || "",
          suggestedSummary: note.metadata?.aiMetadata?.suggestedSummary || "",
          language: note.metadata?.aiMetadata?.aiLanguage || "tr",
        }));
      }
    }
  }, [note]);

  // Kelime sayısını güncelle
  useEffect(() => {
    setWordCount(content.split(/\s+/).filter((w) => w.length > 0).length);
  }, [content]);

  // AI önerisini uygula
  const applyAISuggestion = (
    type: "title" | "summary" | "both" | "content"
  ) => {
    if (!aiSuggestions) return;

    switch (type) {
      case "title":
        setTitle(aiSuggestions?.suggestedTitle || "");
        toast.success("AI başlık önerisi uygulandı!", { duration: 1500 });
        break;
      case "summary":
        setSummary(aiSuggestions?.suggestedSummary || "");
        toast.success("AI özet önerisi uygulandı!", { duration: 1500 });
        break;
      case "both":
        setTitle(aiSuggestions?.suggestedTitle || "");
        setSummary(aiSuggestions?.suggestedSummary || "");
        toast.success("AI başlık ve özet önerileri uygulandı!", {
          duration: 1500,
        });
        break;
      case "content":
        setContent(aiSuggestions?.suggestedContent || "");
        toast.success("AI içerik önerisi uygulandı!", {
          duration: 1500,
        });
    }
  };

  // AI önerisini sıfırla (orijinal AI önerisine dön)
  const resetTitleToOriginalAI = () => {
    if (note?.metadata?.aiMetadata) {
      setTitle(note.metadata.aiMetadata.suggestedTitle);
      toast.success("Orijinal AI önerisine dönüldü!", { duration: 1500 });
    }
  };

  const resetSummaryToOriginalAI = () => {
    if (note?.metadata?.aiMetadata) {
      setSummary(note.metadata.aiMetadata.suggestedSummary);
      toast.success("Orijinal AI önerisine dönüldü!", { duration: 1500 });
    }
  };

  const resetContentToOriginalAI = () => {
    if (note?.content) {
      setContent(note.content);
      toast.success("Orijinal AI önerisine dönüldü!", { duration: 1500 });
    }
  };

  const handleAIWorkerRequest = async (workerId: string) => {
    if (content.length < 10) {
      toast.error("En az 10 karakter yazın");
      return { success: false, error: "Content too short" };
    }

    setIsAIProcessing(true);
    setCurrentAIWorker(workerId);

    try {
      let result: any;

      switch (workerId) {
        case "suggest":
          result = await getAISuggestion(content);
          if (result.success) {
            // Önerileri state'e kaydet
            setAiSuggestions((s) => ({
              ...s,
              suggestedTitle: result.title,
              suggestedSummary: result.summary,
              language: result.language,
            }));
            setShowAIRequestPanel(true);
          }
          break;

        case "edit":
          result = await getAIEdit(content);
          if (result.success) {
            // Önerileri state'e kaydet
            setAiSuggestions((s) => ({
              ...s,
              language: result.data?.language || "tr",
              suggestedContent: result.data?.editedContent || "tr",
            }));
            setShowAIRequestPanel(true);
          }
          break;

        case "organize":
          result = await getAIOrganize(content);
          if (result.success) {
            // Önerileri state'e kaydet
            setAiSuggestions((s) => ({
              ...s,
              language: result.data?.language || "tr",
              suggestedContent: result.data?.editedContent || "tr",
            }));
            setShowAIRequestPanel(true);
          }
          break;

        default:
          throw new Error("Geçersiz AI worker");
      }

      // Sonuçları state'e kaydet
      if (result) {
        setAiResults((prev) => ({ ...prev, [workerId]: result }));

        if (result.success) {
          const worker = AI_WORKERS.find((w) => w.id === workerId);
          toast.success(`${worker?.name} tamamlandı!`, {
            icon: worker?.icon,
            duration: 2000,
          });
        } else {
          toast.error(result.error || "AI işlemi başarısız oldu");
        }
      }

      return result || { success: false, error: "No result" };
    } catch (error) {
      console.error(`AI ${workerId} error:`, error);
      toast.error("AI servisi geçici olarak kullanılamıyor");
      return { success: false, error: "Service error" };
    } finally {
      setIsAIProcessing(false);
      // Loading durumunu temizle
      setTimeout(() => setCurrentAIWorker(null), 500);
    }
  };

  // Sonucu uygulama fonksiyonu
  const handleApplyAIResult = (workerId: string, result: any) => {
    if (!result || !result.success) {
      toast.error("Uygulanacak sonuç bulunamadı");
      return;
    }

    switch (workerId) {
      case "suggest":
        // AI önerilerini uygula
        applyAISuggestion("both");
        toast.success("AI önerileri uygulandı!");
        break;

      case "edit":
        if (result.data) {
          // Düzenlenmiş içeriği uygula
          setContent(result.data.editedContent);
          toast.success("İçerik düzenlendi ve güncellendi!");
        }
        break;

      case "organize":
        if (result.data) {
          // Organize edilmiş içeriği uygula
          setContent(result.data.editedContent);
          toast.success("İçerik organize edildi!", {
            icon: "🔧",
          });
        }
        break;
    }

    // Sonuçları temizle (opsiyonel)
    setAiResults((prev) => ({ ...prev, [workerId]: null }));
  };

  // Notu kaydet
  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("Lütfen not içeriği girin");
      return;
    }

    setIsSaving(true);
    try {
      // Yeni AI önerisi varsa güncelleyelim
      const finalAiMetadata = aiSuggestions
        ? {
            suggestedTitle: aiSuggestions.suggestedTitle,
            suggestedSummary: aiSuggestions.suggestedSummary,
            suggestedContent: aiSuggestions.suggestedContent,
            isAISuggested: true,
            aiLanguage: aiSuggestions.language,
            aiWordCount: aiSuggestions.suggestedContent?.length || 0,
            userEdited:
              title !== aiSuggestions.suggestedTitle ||
              summary !== aiSuggestions.suggestedSummary ||
              content !== aiSuggestions.suggestedContent,
            editedAt: new Date().toISOString(),
          }
        : note?.metadata?.aiMetadata;

      const updates = {
        content,
        title: title || "Güncellenmiş Not",
        summary:
          summary ||
          content.substring(0, 200) + (content.length > 200 ? "..." : ""),
        keywords,
        metadata: {
          ...note?.metadata,
          wordCount,
          lastEdited: new Date().toISOString(),
          aiMetadata: finalAiMetadata,
        },
      };

      await noteAPI.updateNote({
        noteId,
        content,
        title: title || updates.title,
        summary: summary || updates.summary,
        isEditedByUser: true,
      });

      toast.success("Not Elasticsearch'e kaydedildi!", {
        icon: aiSuggestions ? "🤖" : "✏️",
        duration: 3000,
      });

      // Query cache'i güncelle
      queryClient.invalidateQueries({ queryKey: ["note", noteId] });
      queryClient.invalidateQueries({ queryKey: ["notes", user?.id] });

      router.push(`/notes/${noteId}`);
    } catch (error) {
      console.error("Kaydetme hatası:", error);
      toast.error("Not kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  // Vazgeç
  const handleCancel = () => {
    if (
      (content !== note?.content ||
        summary !== note.summary ||
        title !== note.title) &&
      !confirm(
        "Kaydedilmemiş değişiklikler var. Çıkmak istediğinize emin misiniz?"
      )
    ) {
      return;
    }
    router.back();
  };

  // Kısayol tuşları
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // AI Quick Actions için global kısayollar
      if (e.ctrlKey && !isAIProcessing && !isContentExpanded) {
        switch (e.key.toLowerCase()) {
          case "i":
            e.preventDefault();
            handleAIWorkerRequest("suggest");
            break;
          case "e":
            e.preventDefault();
            handleAIWorkerRequest("edit");
            break;
          case "o":
            e.preventDefault();
            handleAIWorkerRequest("organize");
            break;
        }
      }

      // Diğer mevcut kısayollar
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSave();
      }

      // ESC - context'e göre farklı davran
      if (e.key === "Escape") {
        if (isContentExpanded) {
          e.preventDefault();
          setIsContentExpanded(false);
        } else {
          handleCancel();
        }
      }

      // F11 veya Ctrl+F - Fullscreen toggle
      if ((e.key === "F11" || (e.ctrlKey && e.key === "f")) && !e.shiftKey) {
        e.preventDefault();
        toggleContentFullscreen();
      }

      // Ctrl+K - AI Panel (fullscreen değilse)
      if (e.ctrlKey && e.key === "k" && !isContentExpanded) {
        e.preventDefault();
        setShowAIRequestPanel(!showAIRequestPanel);
      }

      // Ctrl+Shift+F - Fullscreen + focus
      if (e.ctrlKey && e.shiftKey && e.key === "F") {
        e.preventDefault();
        setIsContentExpanded(true);
        // Textarea'ya focus et
        setTimeout(() => {
          const textarea = document.querySelector("textarea");
          textarea?.focus();
        }, 100);
      }

      // Ctrl+M - Side panel toggle
      if (e.ctrlKey && e.key === "m" && !isContentExpanded) {
        e.preventDefault();
        setIsSidePanelCollapsed(!isSidePanelCollapsed);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleSave,
    handleCancel,
    showAIRequestPanel,
    isAIProcessing,
    content,
    isContentExpanded,
    isSidePanelCollapsed,
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col">
      {/* Header - Fullscreen mode'da gizle */}
      {!isContentExpanded && (
        <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
                >
                  ← Geri Dön
                </button>
                <button
                  onClick={() => setIsSidePanelCollapsed(!isSidePanelCollapsed)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-2"
                  title="Ctrl+M ile aç/kapat"
                >
                  {isSidePanelCollapsed
                    ? "📋 Metaveri Göster"
                    : "📋 Metaveri Gizle"}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>{wordCount} kelime</span>
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>{content.length} karakter</span>
                  {note?.metadata?.aiMetadata && (
                    <>
                      <span className="text-gray-400 dark:text-gray-600">
                        •
                      </span>
                      <span className="flex items-center">
                        {note.metadata.aiMetadata.aiLanguage === "tr"
                          ? "🇹🇷"
                          : "🇬🇧"}
                        {note.metadata.aiMetadata.userEdited && " ✏️"}
                      </span>
                    </>
                  )}
                </div>

                {/* AI Review Butonu */}
                <AIQuickActions
                  content={content}
                  onWorkerSelect={handleAIWorkerRequest}
                  onApplyResult={handleApplyAIResult}
                  recentResults={aiResults}
                />

                <button
                  onClick={() => setShowAnalysis(!showAnalysis)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
                >
                  {showAnalysis ? "📊 Paneli Gizle" : "📊 Paneli Göster"}
                </button>

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 text-white rounded-lg font-medium disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
                >
                  {isSaving ? "Kaydediliyor..." : "💾 Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Sidebar - Collapsible Metadata Panel */}
        {!isContentExpanded && (
          <div
            className={`${isSidePanelCollapsed ? "lg:w-0 opacity-0" : "lg:w-80 opacity-100"} transition-all duration-300 overflow-hidden border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800`}
          >
            <div className="p-6 h-full overflow-y-auto">
              <div className="space-y-6">
                {/* Başlık Editörü */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <span className="text-lg">📝</span>
                      Başlık
                    </h3>
                    <div className="flex items-center gap-2">
                      {aiSuggestions &&
                        aiSuggestions?.suggestedTitle &&
                        aiSuggestions?.suggestedTitle !== title && (
                          <button
                            onClick={() => applyAISuggestion("title")}
                            className="text-xs px-2 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 rounded hover:from-amber-600 hover:to-yellow-600 transition-colors"
                            title="AI Önerisini Uygula"
                          >
                            🤖 AI
                          </button>
                        )}
                      {note?.metadata?.aiMetadata &&
                        title !== note.metadata.aiMetadata.suggestedTitle && (
                          <button
                            onClick={resetTitleToOriginalAI}
                            className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            title="Orijinal AI'ya Dön"
                          >
                            ↺
                          </button>
                        )}
                      <button
                        onClick={() => setIsTitleEditing(!isTitleEditing)}
                        className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                        title="Düzenle"
                      >
                        {isTitleEditing ? "✓" : "✏️"}
                      </button>
                    </div>
                  </div>

                  {isTitleEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Başlık"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsTitleEditing(false)}
                          className="text-xs px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                        >
                          Kaydet
                        </button>
                        <button
                          onClick={() => {
                            setIsTitleEditing(false);
                            setTitle(note?.title || "");
                          }}
                          className="text-xs px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
                        >
                          İptal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      onClick={() => setIsTitleEditing(true)}
                    >
                      <p className="text-gray-800 dark:text-gray-200 font-medium">
                        {title || "Başlık yok - tıklayarak düzenleyin"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Özet Editörü */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <span className="text-lg">📋</span>
                      Özet
                      <span className="text-xs text-gray-500">
                        ({summary.length}/200)
                      </span>
                    </h3>
                    <div className="flex items-center gap-2">
                      {aiSuggestions &&
                        aiSuggestions?.suggestedSummary &&
                        aiSuggestions?.suggestedSummary !== summary && (
                          <button
                            onClick={() => applyAISuggestion("summary")}
                            className="text-xs px-2 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 rounded hover:from-amber-600 hover:to-yellow-600 transition-colors"
                            title="AI Önerisini Uygula"
                          >
                            🤖 AI
                          </button>
                        )}
                      {note?.metadata?.aiMetadata &&
                        summary !==
                          note.metadata.aiMetadata.suggestedSummary && (
                          <button
                            onClick={resetSummaryToOriginalAI}
                            className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            title="Orijinal AI'ya Dön"
                          >
                            ↺
                          </button>
                        )}
                      <button
                        onClick={() => setIsSummaryEditing(!isSummaryEditing)}
                        className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                        title="Düzenle"
                      >
                        {isSummaryEditing ? "✓" : "✏️"}
                      </button>
                    </div>
                  </div>

                  {isSummaryEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="w-full h-32 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="Özet"
                        maxLength={200}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsSummaryEditing(false)}
                          className="text-xs px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                        >
                          Kaydet
                        </button>
                        <button
                          onClick={() => {
                            setIsSummaryEditing(false);
                            setSummary(note?.summary || "");
                          }}
                          className="text-xs px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
                        >
                          İptal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-[100px]"
                      onClick={() => setIsSummaryEditing(true)}
                    >
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {summary || "Özet yok - tıklayarak düzenleyin"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Keywords */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <span className="text-lg">🏷️</span>
                      Anahtar Kelimeler
                    </h3>
                    <span className="text-xs text-gray-500">
                      {keywords.length} kelime
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-full text-sm border border-blue-200 dark:border-blue-800/50"
                      >
                        {keyword}
                        <button
                          onClick={() =>
                            setKeywords((kw) => kw.filter((k) => k !== keyword))
                          }
                          className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {keywords.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        Anahtar kelime eklenmemiş
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Editor - Takes remaining space */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-0 flex-1 flex flex-col overflow-hidden">
            {/* İçerik Editörü - Full width */}
            <div className="flex-1 min-h-0 p-4 md:p-6">
              <div className="h-full relative">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    İçerik
                  </h3>
                  <div className="flex items-center gap-2">
                    {aiSuggestions &&
                      aiSuggestions?.suggestedContent &&
                      aiSuggestions?.suggestedContent !== content && (
                        <button
                          onClick={() => applyAISuggestion("content")}
                          className="text-xs px-2 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 rounded hover:from-amber-600 hover:to-yellow-600 transition-colors"
                          title="AI Önerisini Uygula"
                        >
                          🤖 AI İçerik
                        </button>
                      )}
                    {note?.content && content !== note.content && (
                      <button
                        onClick={resetContentToOriginalAI}
                        className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        title="Orijinal AI'ya Dön"
                      >
                        ↺ Orijinal
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-full min-h-[calc(100vh-200px)] px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 resize-none text-base md:text-lg placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Notunuzu buraya yazın... (Ctrl+S: Kaydet, Esc: Çık, Ctrl+M: Metaveri, F11: Tam Ekran)"
                  autoFocus={!isContentExpanded}
                />
                {isContentExpanded && (
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <button
                      onClick={toggleContentFullscreen}
                      className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                    >
                      Tam Ekrandan Çık
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Panel - Sağ */}
        {!isContentExpanded && showAnalysis && (
          <div className="w-full lg:w-96 flex flex-col border-t lg:border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 sm:p-6">
                <h2 className="text-lg font-semibold mb-6 text-blue-600 dark:text-blue-400">
                  🔍 Analiz Paneli
                </h2>

                {/* AI Results Summary */}
                {Object.keys(aiResults).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800">
                    <h4 className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-2">
                      🤖 Son AI İşlemleri
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(aiResults).map(([workerId, result]) => {
                        if (!result?.success) return null;
                        const worker = AI_WORKERS.find(
                          (w) => w.id === workerId
                        );
                        return (
                          <div
                            key={workerId}
                            className="flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center">
                              <span className="mr-2">{worker?.icon}</span>
                              <span className="text-gray-600 dark:text-gray-400">
                                {worker?.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-green-600 dark:text-green-400">
                                ✓
                              </span>
                              <span className="text-gray-500">
                                {new Date(
                                  result.timestamp || Date.now()
                                ).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                      İstatistikler
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {wordCount}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Kelime
                        </div>
                      </div>
                      <div className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {content.length}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Karakter
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shortcuts */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                    Kısayollar
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                        Ctrl
                      </kbd>
                      <span className="text-gray-600 dark:text-gray-400">
                        +
                      </span>
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                        S
                      </kbd>
                      <span className="text-gray-600 dark:text-gray-400 ml-auto">
                        Kaydet
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                        Esc
                      </kbd>
                      <span className="text-gray-600 dark:text-gray-400 ml-auto">
                        Çık
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                        Ctrl
                      </kbd>
                      <span className="text-gray-600 dark:text-gray-400">
                        +
                      </span>
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                        M
                      </kbd>
                      <span className="text-gray-600 dark:text-gray-400 ml-auto">
                        Metaveri
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                        F11
                      </kbd>
                      <span className="text-gray-600 dark:text-gray-400 ml-auto">
                        Tam Ekran
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                        Ctrl
                      </kbd>
                      <span className="text-gray-600 dark:text-gray-400">
                        +
                      </span>
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                        I
                      </kbd>
                      <span className="text-gray-600 dark:text-gray-400 ml-auto">
                        AI Review
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
