"use client";

import { useAuth } from "@/lib/auth";
import { noteAPI, Note, BrowseStatistics, CategoryAggregation } from "@/lib/elasticsearch-client";
import { CATEGORIES, getCategoryName, getCategoryColors, getAllCategories } from "@/lib/categories";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  FolderOpen,
  Tag,
  ChevronRight,
  FileText,
  Clock,
  TrendingUp,
  BarChart3,
  ArrowLeft,
  Loader2,
  Search,
} from "lucide-react";

export default function BrowsePage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();

  // URL'den kategori bilgisi al
  const currentCategory = searchParams.get("category") || undefined;
  const currentSubcategory = searchParams.get("subcategory") || undefined;

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [statistics, setStatistics] = useState<BrowseStatistics | null>(null);
  const [categories, setCategories] = useState<CategoryAggregation[]>([]);
  const [subcategories, setSubcategories] = useState<{ subcategory: string; count: number }[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [totalNotes, setTotalNotes] = useState(0);

  // Verileri yükle
  useEffect(() => {
    if (!user?.id) return;
    loadData();
  }, [user?.id, currentCategory, currentSubcategory]);

  const loadData = async () => {
    if (!user?.id) return;
    setIsLoading(true);

    try {
      // İstatistikleri yükle
      const stats = await noteAPI.getBrowseStatistics(user.id);
      setStatistics(stats);

      if (!currentCategory) {
        // Ana sayfa: Tüm kategorileri göster
        const cats = await noteAPI.getCategoriesWithSubcategories(user.id);
        setCategories(cats);
        setNotes([]);
      } else if (!currentSubcategory) {
        // Kategori seçili: Alt kategorileri ve notları göster
        const subs = await noteAPI.getSubcategoriesForCategory(user.id, currentCategory);
        setSubcategories(subs);
        const result = await noteAPI.getNotesByCategory(user.id, currentCategory);
        setNotes(result.notes);
        setTotalNotes(result.total);
      } else {
        // Alt kategori seçili: Sadece notları göster
        const result = await noteAPI.getNotesByCategory(user.id, currentCategory, currentSubcategory);
        setNotes(result.notes);
        setTotalNotes(result.total);
      }
    } catch (error) {
      console.error("Browse data load error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigasyon
  const navigateTo = (category?: string, subcategory?: string) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (subcategory) params.set("subcategory", subcategory);
    router.push(`/browse${params.toString() ? `?${params.toString()}` : ""}`);
  };

  // Tarih formatla
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-700 dark:to-pink-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <FolderOpen className="w-7 h-7" />
                  Notları Keşfet
                </h1>
                <p className="text-purple-100 mt-1">
                  Kategorilere göre notlarınızı görüntüleyin
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* İstatistikler */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={<FileText className="w-5 h-5" />}
              label="Toplam Not"
              value={statistics.totalNotes}
              color="blue"
            />
            <StatCard
              icon={<FolderOpen className="w-5 h-5" />}
              label="Kategori"
              value={statistics.totalCategories}
              color="purple"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Kategorize"
              value={`%${statistics.coveragePercentage}`}
              color="green"
            />
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              label="Bu Hafta"
              value={statistics.recentlyCategorized}
              color="orange"
            />
          </div>
        )}

        {/* Breadcrumb */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <nav className="flex items-center gap-2 text-sm flex-wrap">
            <button
              onClick={() => navigateTo()}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                !currentCategory
                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              Tüm Kategoriler
            </button>

            {currentCategory && (
              <>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <button
                  onClick={() => navigateTo(currentCategory)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                    !currentSubcategory
                      ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <span>{CATEGORIES[currentCategory]?.icon}</span>
                  {getCategoryName(currentCategory, locale)}
                </button>
              </>
            )}

            {currentSubcategory && (
              <>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium">
                  <Tag className="w-4 h-4" />
                  {getCategoryName(currentSubcategory, locale)}
                </span>
              </>
            )}
          </nav>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sol Panel: Kategoriler */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    {!currentCategory ? (
                      <>
                        <BarChart3 className="w-5 h-5 text-purple-600" />
                        Ana Kategoriler
                      </>
                    ) : (
                      <>
                        <Tag className="w-5 h-5 text-purple-600" />
                        Alt Kategoriler
                      </>
                    )}
                  </h2>
                </div>

                <div className="p-2 max-h-[500px] overflow-y-auto">
                  {!currentCategory ? (
                    // Ana kategoriler
                    categories.length > 0 ? (
                      categories.map((cat) => (
                        <CategoryCard
                          key={cat.category}
                          category={cat.category}
                          count={cat.count}
                          subcategoryCount={cat.subcategories?.length || 0}
                          locale={locale}
                          onClick={() => navigateTo(cat.category)}
                        />
                      ))
                    ) : (
                      // Hiç not yoksa tüm kategorileri göster
                      getAllCategories().map((cat) => (
                        <CategoryCard
                          key={cat.id}
                          category={cat.id}
                          count={0}
                          subcategoryCount={cat.subcategories.length}
                          locale={locale}
                          onClick={() => navigateTo(cat.id)}
                        />
                      ))
                    )
                  ) : (
                    // Alt kategoriler
                    subcategories.length > 0 ? (
                      subcategories.map((sub) => (
                        <SubcategoryCard
                          key={sub.subcategory}
                          subcategory={sub.subcategory}
                          count={sub.count}
                          locale={locale}
                          isActive={currentSubcategory === sub.subcategory}
                          onClick={() => navigateTo(currentCategory, sub.subcategory)}
                        />
                      ))
                    ) : (
                      // Kategorinin tüm alt kategorilerini göster
                      CATEGORIES[currentCategory]?.subcategories.map((sub) => (
                        <SubcategoryCard
                          key={sub}
                          subcategory={sub}
                          count={0}
                          locale={locale}
                          isActive={currentSubcategory === sub}
                          onClick={() => navigateTo(currentCategory, sub)}
                        />
                      ))
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Sağ Panel: Notlar */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    {currentCategory ? (
                      <>
                        Notlar
                        <span className="text-sm font-normal text-gray-500">
                          ({totalNotes} not)
                        </span>
                      </>
                    ) : (
                      "Kategori Seçin"
                    )}
                  </h2>
                </div>

                <div className="p-4">
                  {!currentCategory ? (
                    <div className="text-center py-12">
                      <FolderOpen className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">
                        Sol panelden bir kategori seçin
                      </p>
                    </div>
                  ) : notes.length > 0 ? (
                    <div className="space-y-3">
                      {notes.map((note) => (
                        <NoteCard
                          key={note._id || note.id}
                          note={note}
                          locale={locale}
                          formatDate={formatDate}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Search className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">
                        Bu kategoride henüz not yok
                      </p>
                      <Link
                        href="/notes/create"
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        + Yeni Not Oluştur
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: "blue" | "purple" | "green" | "orange";
}) {
  const colors = {
    blue: "from-blue-500 to-cyan-500 text-blue-600",
    purple: "from-purple-500 to-pink-500 text-purple-600",
    green: "from-green-500 to-emerald-500 text-green-600",
    orange: "from-orange-500 to-amber-500 text-orange-600",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className={`inline-flex p-2 rounded-lg bg-gradient-to-r ${colors[color]} bg-opacity-10 mb-2`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

// Category Card Component
function CategoryCard({
  category,
  count,
  subcategoryCount,
  locale,
  onClick,
}: {
  category: string;
  count: number;
  subcategoryCount: number;
  locale: string;
  onClick: () => void;
}) {
  const categoryDef = CATEGORIES[category];
  const colors = getCategoryColors(category);
  const name = getCategoryName(category, locale);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all hover:shadow-md ${colors.bg} ${colors.border} border mb-2`}
    >
      <span className="text-2xl">{categoryDef?.icon}</span>
      <div className="flex-1 text-left">
        <div className={`font-medium ${colors.text}`}>{name}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {count} not • {subcategoryCount} alt kategori
        </div>
      </div>
      <ChevronRight className={`w-5 h-5 ${colors.text}`} />
    </button>
  );
}

// Subcategory Card Component
function SubcategoryCard({
  subcategory,
  count,
  locale,
  isActive,
  onClick,
}: {
  subcategory: string;
  count: number;
  locale: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const name = getCategoryName(subcategory, locale);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all mb-2 ${
        isActive
          ? "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700"
          : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
      } border`}
    >
      <Tag className={`w-4 h-4 ${isActive ? "text-purple-600" : "text-gray-500"}`} />
      <div className="flex-1 text-left">
        <div className={`font-medium ${isActive ? "text-purple-700 dark:text-purple-300" : "text-gray-700 dark:text-gray-300"}`}>
          {name}
        </div>
      </div>
      <span className={`text-sm ${isActive ? "text-purple-600" : "text-gray-500"}`}>
        {count}
      </span>
    </button>
  );
}

// Note Card Component
function NoteCard({
  note,
  locale,
  formatDate,
}: {
  note: Note;
  locale: string;
  formatDate: (date: string) => string;
}) {
  return (
    <Link
      href={`/notes/${note._id || note.id}`}
      className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md transition-all bg-white dark:bg-gray-800"
    >
      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1 line-clamp-1">
        {note.title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
        {note.summary}
      </p>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span>{note.metadata?.wordCount || 0} kelime</span>
          {note.subcategory && (
            <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">
              {getCategoryName(note.subcategory, locale)}
            </span>
          )}
        </div>
        <span>{formatDate(note.createdAt)}</span>
      </div>
    </Link>
  );
}
