"use client";

import MarkdownRenderer from "@/components/editor/MarkdownRenderer";
import { useAuth } from "@/lib/auth";
import { Note, noteAPI } from "@/lib/elasticsearch-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Image as ImageIcon,
  BookOpen,
  Rows3,
  Sun,
  Coffee,
  Clock,
  ArrowUp,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type ReadingMode = "comfortable" | "compact";
type ThemeMode = "normal" | "sepia";

// Calculate estimated reading time (average 200 words per minute)
function getReadingTime(wordCount: number): string {
  const minutes = Math.ceil(wordCount / 200);
  if (minutes < 1) return "< 1 dk";
  return `${minutes} dk`;
}

export default function NoteDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const noteId = params.id as string;
  const [similarNotes, setSimilarNotes] = useState<Note[]>([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
  const queryClient = useQueryClient();

  // Reading preferences
  const [readingMode, setReadingMode] = useState<ReadingMode>("comfortable");
  const [themeMode, setThemeMode] = useState<ThemeMode>("normal");
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    const savedReadingMode = localStorage.getItem("noteReadingMode") as ReadingMode;
    const savedThemeMode = localStorage.getItem("noteThemeMode") as ThemeMode;
    if (savedReadingMode) setReadingMode(savedReadingMode);
    if (savedThemeMode) setThemeMode(savedThemeMode);
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem("noteReadingMode", readingMode);
  }, [readingMode]);

  useEffect(() => {
    localStorage.setItem("noteThemeMode", themeMode);
  }, [themeMode]);

  // Handle scroll for back to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (noteId) {
      loadSimilarNotes();
    }
  }, [noteId]);

  const loadSimilarNotes = async () => {
    if (!user?.id) {
      return;
    }
    setIsLoadingSimilar(true);
    try {
      const similar = await noteAPI.findSimilarNotes(noteId, user.id, 3);
      setSimilarNotes(similar);
    } catch (error) {
      console.error("Benzer notlar yüklenemedi:", error);
    } finally {
      setIsLoadingSimilar(false);
    }
  };

  // Not verilerini getir
  const { data: note, status } = useQuery({
    queryKey: ["note", noteId],
    queryFn: async () => {
      return await noteAPI.getNoteById(noteId);
    },
    enabled: !!noteId && !!user,
  });

  // Not sil
  const handleDeleteNote = async () => {
    if (
      !confirm(
        "Bu notu silmek istediğinize emin misiniz? Bu işlem geri alınamaz!",
      )
    ) {
      return;
    }

    try {
      await noteAPI.deleteNote(noteId);
      toast.success("Not silindi!");

      queryClient.invalidateQueries({ queryKey: ["note", noteId] });
      queryClient.invalidateQueries({ queryKey: ["notes", user?.id] });

      router.push("/dashboard");
    } catch (error) {
      console.error("Silme hatası:", error);
      toast.error("Not silinemedi.");
    }
  };

  // Format tarih
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Loading state
  if (status === "pending") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-8"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (status === "error" || !note) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-red-600 dark:text-red-400 text-6xl mb-6">📝</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Not bulunamadı
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Bu not silinmiş olabilir veya erişim izniniz yok.
          </p>

          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
          >
            ← Notlarıma Dön
          </button>
        </div>
      </div>
    );
  }

  // Expire durumu
  const isExpired = note.isExpired || new Date(note.expiresAt) < new Date();
  const daysLeft = Math.ceil(
    (new Date(note.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-4 sm:py-6 lg:py-8">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <Link
                href="/dashboard"
                className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-2 text-sm"
              >
                <svg
                  className="w-4 h-4 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Notlarıma Dön
              </Link>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 break-words">
                {note.title}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Link
                href={`/notes/${noteId}/edit`}
                className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all font-medium shadow-sm hover:shadow-md text-sm sm:text-base"
              >
                ✏️ <span className="hidden sm:inline">Düzenle</span>
              </Link>
              <button
                onClick={handleDeleteNote}
                className="px-3 sm:px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors font-medium text-sm sm:text-base"
              >
                🗑️ <span className="hidden sm:inline">Sil</span>
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center">
              <span className="font-medium mr-1">Oluşturulma:</span>
              {formatDate(note.createdAt)}
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-1">Expire:</span>
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  isExpired
                    ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                    : "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                }`}
              >
                {isExpired
                  ? `Süresi Doldu (${formatDate(note.expiresAt)})`
                  : `${daysLeft} gün kaldı`}
              </span>
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-1">Kelime:</span>
              {note.metadata?.wordCount || 0}
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-1">Durum:</span>
              {note.isExpired ? "Expired" : "Active"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content - Sol (2/3) */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="p-3 sm:p-5 lg:p-8">
                {/* Content - EN SON */}
                <div className="border-gray-200 dark:border-gray-700">
                  {/* Reading Controls Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {getReadingTime(note.metadata?.wordCount || 0)} okuma
                        </span>
                      </div>
                      {note.hasImages && (
                        <div className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400">
                          <ImageIcon className="w-4 h-4" />
                          {note.imageCount} resim
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Theme Toggle */}
                      <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-1">
                        <button
                          onClick={() => setThemeMode("normal")}
                          className={`p-1.5 rounded transition-colors ${
                            themeMode === "normal"
                              ? "bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                          }`}
                          title="Normal tema"
                        >
                          <Sun className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setThemeMode("sepia")}
                          className={`p-1.5 rounded transition-colors ${
                            themeMode === "sepia"
                              ? "bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100"
                              : "text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400"
                          }`}
                          title="Sepia tema (göz yorgunluğunu azaltır)"
                        >
                          <Coffee className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Reading Mode Toggle */}
                      <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-1">
                        <button
                          onClick={() => setReadingMode("comfortable")}
                          className={`p-1.5 rounded transition-colors ${
                            readingMode === "comfortable"
                              ? "bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100"
                              : "text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                          }`}
                          title="Rahat okuma modu"
                        >
                          <BookOpen className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setReadingMode("compact")}
                          className={`p-1.5 rounded transition-colors ${
                            readingMode === "compact"
                              ? "bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100"
                              : "text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                          }`}
                          title="Kompakt mod (daha fazla içerik)"
                        >
                          <Rows3 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div
                    className={`rounded-lg sm:rounded-xl transition-all ${
                      themeMode === "sepia"
                        ? "bg-amber-50 dark:bg-amber-900/20"
                        : "bg-gray-50 dark:bg-gray-900/50"
                    } ${
                      readingMode === "comfortable"
                        ? "p-3 sm:p-4 lg:p-6 text-base sm:text-lg leading-relaxed"
                        : "p-2 sm:p-3 lg:p-4 text-sm sm:text-base leading-normal"
                    }`}
                  >
                    <div
                      className={`${
                        themeMode === "sepia"
                          ? "text-amber-900 dark:text-amber-100"
                          : "text-gray-700 dark:text-gray-300"
                      } ${
                        readingMode === "comfortable"
                          ? "lg:max-w-prose lg:mx-auto"
                          : "max-w-none"
                      }`}
                    >
                      <MarkdownRenderer
                        content={note.content}
                        images={note.images}
                        className={
                          themeMode === "sepia"
                            ? "prose-sepia"
                            : ""
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Stats at Bottom */}
                <div className="mt-4 sm:mt-6 lg:mt-8 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <div className="text-xl font-bold text-blue-700 dark:text-blue-400">
                        {note.metadata?.wordCount || 0}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-300">
                        Kelime
                      </div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                      <div className="text-xl font-bold text-green-700 dark:text-green-400">
                        {note.keywords?.length || 0}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-300">
                        Anahtar Kelime
                      </div>
                    </div>
                    {note.metadata?.sentiment !== undefined && (
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                        <div className="text-xl font-bold text-purple-700 dark:text-purple-400">
                          {note.metadata.sentiment > 0.3
                            ? "😊"
                            : note.metadata.sentiment < -0.3
                              ? "😔"
                              : "😐"}
                        </div>
                        <div className="text-xs text-purple-600 dark:text-purple-300">
                          Duygu
                        </div>
                      </div>
                    )}
                    <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                      <div className="text-xl font-bold text-amber-700 dark:text-amber-400">
                        {note.metadata?.language === "tr" ? "🇹🇷" : "🇬🇧"}
                      </div>
                      <div className="text-xs text-amber-600 dark:text-amber-300">
                        Dil
                      </div>
                    </div>
                  </div>
                </div>

                {/* Benzer Notlar Bölümü - İçerikten sonra, sidebar'dan önce */}
                <div className="mt-4 sm:mt-6 lg:mt-8 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="p-3 sm:p-4 lg:p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                          <span className="text-purple-600 dark:text-purple-400">
                            🔗
                          </span>
                          Benzer Notlar
                        </h3>
                        <button
                          onClick={loadSimilarNotes}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          disabled={isLoadingSimilar}
                        >
                          {isLoadingSimilar ? "Yükleniyor..." : "Yenile"}
                        </button>
                      </div>

                      {isLoadingSimilar ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        </div>
                      ) : similarNotes.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {similarNotes.map((similarNote) => (
                            <Link
                              key={similarNote.id}
                              href={`/notes/${similarNote.id}`}
                              className="block p-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 transition-all hover:shadow-md group"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2">
                                  {similarNote.title}
                                </h4>
                                <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                                  %
                                  {Math.round(
                                    (similarNote.similarityScore || 0) * 100,
                                  )}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                                {similarNote.summary}
                              </p>
                              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                                <span>
                                  {similarNote.metadata.wordCount} kelime
                                </span>
                                <span>{formatDate(similarNote.createdAt)}</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <div className="text-4xl mb-4">📝</div>
                          <p>Benzer not bulunamadı</p>
                          <p className="text-sm mt-2">
                            Yeni notlar oluşturdukça benzerlikler gösterilecek
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Sağ (1/3) */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            {/* Category Section */}
            {note.category && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-purple-200 dark:border-purple-800">
                <h3 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-3 flex items-center gap-2">
                  <span>📁</span>
                  Kategori
                  <Link
                    href={`/browse?category=${note.category}${note.subcategory ? `&subcategory=${note.subcategory}` : ""}`}
                    className="ml-auto text-xs bg-purple-200 dark:bg-purple-800 px-2 py-0.5 rounded hover:bg-purple-300 dark:hover:bg-purple-700 transition-colors"
                  >
                    Kategoriye Git →
                  </Link>
                </h3>

                {/* Category Path */}
                <div className="flex items-center gap-2 mb-4">
                  <Link
                    href={`/browse?category=${note.category}`}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700 hover:shadow-md transition-all"
                  >
                    <span className="text-lg">
                      {note.category === "tech-production"
                        ? "💻"
                        : note.category === "work-career"
                          ? "💼"
                          : note.category === "personal-growth"
                            ? "🧠"
                            : note.category === "projects-planning"
                              ? "🗺️"
                              : note.category === "finance-management"
                                ? "💰"
                                : note.category === "life-organization"
                                  ? "🏡"
                                  : note.category === "health-wellbeing"
                                    ? "❤️"
                                    : note.category === "log-archive"
                                      ? "📝"
                                      : "📁"}
                    </span>
                    <span className="font-medium capitalize">
                      {note.category.replace(/-/g, " ")}
                    </span>
                  </Link>

                  {note.subcategory && (
                    <>
                      <span className="text-gray-400">→</span>
                      <Link
                        href={`/browse?category=${note.category}&subcategory=${note.subcategory}`}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
                      >
                        <span>🏷️</span>
                        <span className="capitalize">
                          {note.subcategory.replace(/-/g, " ")}
                        </span>
                      </Link>
                    </>
                  )}
                </div>

                {/* Category Metadata */}
                {note.categoryAssignedAt && (
                  <div className="pt-3 border-t border-purple-200 dark:border-purple-700 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Kategorize:</span>{" "}
                    {formatDate(note.categoryAssignedAt)}
                    {note.categoryAssignedBy && (
                      <span className="ml-2 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900 rounded">
                        {note.categoryAssignedBy === "ai"
                          ? "🤖 AI"
                          : "✏️ Manuel"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Özet - İÇERİKTEN ÖNCE */}
            {note.summary && (
              <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl sm:rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <span className="text-blue-600 dark:text-blue-400 text-xl">
                      📋
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                      Özet
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Bu notun kısa özeti
                    </p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {note.summary}
                </p>
              </div>
            )}

            {/* Keywords - Özetten sonra */}
            {note.keywords && note.keywords.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
                  <span>🏷️</span>
                  Anahtar Kelimeler
                </h3>
                <div className="flex flex-wrap gap-2">
                  {note.keywords.map((keyword, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-800 dark:text-blue-300 rounded-lg text-sm font-medium border border-blue-200 dark:border-blue-800"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                <span>📅</span>
                Zaman Çizelgesi
              </h3>

              <div className="space-y-4">
                <div className="relative pl-6">
                  <div className="absolute left-0 top-0 w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="text-xs font-medium text-gray-900 dark:text-gray-300">
                    Oluşturuldu
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(note.createdAt)}
                  </div>
                </div>

                <div className="relative pl-6">
                  <div className="absolute left-0 top-0 w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="text-xs font-medium text-gray-900 dark:text-gray-300">
                    Son Güncelleme
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(
                      note.metadata?.lastEdited ||
                        note.updatedAt ||
                        note.createdAt,
                    )}
                  </div>
                </div>

                <div className="relative pl-6">
                  <div className="absolute left-0 top-0 w-2 h-2 bg-red-500 rounded-full"></div>
                  <div className="text-xs font-medium text-gray-900 dark:text-gray-300">
                    Expire Tarihi
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(note.expiresAt)}
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center text-lg gap-2">
                <span className="text-blue-700 dark:text-blue-400">🔍</span>
                Teknik Bilgiler
              </h3>
              <div className="space-y-5">
                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2 uppercase tracking-wide">
                    Not ID
                  </div>
                  <div className="font-mono text-sm bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 break-all">
                    {note.id}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2 uppercase tracking-wide">
                    User ID
                  </div>
                  <div className="font-mono text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-300 truncate">
                    {note.userId}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2 uppercase tracking-wide">
                    Elasticsearch Durumu
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-600 rounded-full mr-3 animate-pulse"></div>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-300">
                      Indexed & Searchable
                    </span>
                  </div>
                </div>
              </div>
              {note.metadata?.aiMetadata && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-300 mb-2 uppercase tracking-wide">
                    AI Bilgileri
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-700 dark:text-gray-400">
                      <span className="font-medium">Dil:</span>{" "}
                      {note.metadata.aiMetadata.aiLanguage === "tr"
                        ? "🇹🇷 Türkçe"
                        : "🇬🇧 English"}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-400">
                      <span className="font-medium">Kelime:</span>{" "}
                      {note.metadata.aiMetadata.aiWordCount}
                    </div>
                    {note.metadata.aiMetadata.userEdited && (
                      <div className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded">
                        ✏️ Kullanıcı tarafından düzenlendi
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 bg-blue-600 dark:bg-blue-700 text-white rounded-full shadow-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-all hover:scale-110 z-50"
          title="Başa dön"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
