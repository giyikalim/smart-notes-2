// lib/categories.ts
// Static predefined categories for note organization

export interface CategoryDefinition {
  id: string;
  icon: string;
  color: string;
  subcategories: string[];
}

export interface CategoryNames {
  [key: string]: {
    en: string;
    tr: string;
    de: string;
  };
}

// Ana kategoriler ve alt kategorileri
export const CATEGORIES: Record<string, CategoryDefinition> = {
  "tech-production": {
    id: "tech-production",
    icon: "💻",
    color: "blue",
    subcategories: [
      "code-snippet",
      "project-dev",
      "sys-admin",
      "tech-learning",
      "ai-prompt",
      "tech-review",
      "bug-solution",
      "idea-tech",
    ],
  },
  "work-career": {
    id: "work-career",
    icon: "💼",
    color: "amber",
    subcategories: [
      "meeting-minutes",
      "project-plan",
      "client-comm",
      "report-analysis",
      "presentation",
      "career-goal",
      "business-idea",
      "process-workflow",
    ],
  },
  "personal-growth": {
    id: "personal-growth",
    icon: "🧠",
    color: "green",
    subcategories: [
      "study-notes",
      "language-learning",
      "skill-practice",
      "research-notes",
      "lecture-summary",
      "concept-map",
      "question-list",
      "certification",
    ],
  },
  "projects-planning": {
    id: "projects-planning",
    icon: "🗺️",
    color: "purple",
    subcategories: [
      "brainstorm",
      "life-goals",
      "hobby-project",
      "event-planning",
      "creative-writing",
      "productivity-sys",
      "decision-log",
      "vision-board",
    ],
  },
  "finance-management": {
    id: "finance-management",
    icon: "💰",
    color: "emerald",
    subcategories: [
      "budget-track",
      "investment-res",
      "expense-log",
      "financial-goal",
      "tax-notes",
      "price-comparison",
      "subscription-mgmt",
    ],
  },
  "life-organization": {
    id: "life-organization",
    icon: "🏡",
    color: "orange",
    subcategories: [
      "shopping-list",
      "home-maintenance",
      "appointment",
      "admin-task",
      "home-recipe",
      "packing-list",
      "important-info",
      "wishlist",
    ],
  },
  "health-wellbeing": {
    id: "health-wellbeing",
    icon: "❤️",
    color: "red",
    subcategories: [
      "fitness-track",
      "nutrition-plan",
      "symptom-log",
      "mental-notes",
      "habit-tracker",
      "medical-history",
      "sleep-log",
      "wellness-activity",
    ],
  },
  "log-archive": {
    id: "log-archive",
    icon: "📝",
    color: "gray",
    subcategories: [
      "daily-journal",
      "bookmark",
      "quick-note",
      "reference-data",
      "conversation",
      "memory",
      "review-personal",
      "unsorted",
    ],
  },
};

// Kategori isimleri (tüm dillerde)
export const CATEGORY_NAMES: CategoryNames = {
  // Ana Kategoriler
  "tech-production": {
    en: "Technology & Production",
    tr: "Teknoloji & Üretim",
    de: "Technologie & Produktion",
  },
  "work-career": {
    en: "Work & Career",
    tr: "İş & Kariyer",
    de: "Arbeit & Karriere",
  },
  "personal-growth": {
    en: "Personal Growth",
    tr: "Kişisel Gelişim",
    de: "Persönliche Entwicklung",
  },
  "projects-planning": {
    en: "Projects & Planning",
    tr: "Projeler & Planlama",
    de: "Projekte & Planung",
  },
  "finance-management": {
    en: "Finance & Management",
    tr: "Finans & Yönetim",
    de: "Finanzen & Management",
  },
  "life-organization": {
    en: "Life & Organization",
    tr: "Yaşam & Organizasyon",
    de: "Leben & Organisation",
  },
  "health-wellbeing": {
    en: "Health & Wellbeing",
    tr: "Sağlık & İyi Oluş",
    de: "Gesundheit & Wohlbefinden",
  },
  "log-archive": {
    en: "Records & Archive",
    tr: "Kayıtlar & Arşiv",
    de: "Aufzeichnungen & Archiv",
  },

  // tech-production alt kategorileri
  "code-snippet": {
    en: "Code Snippet",
    tr: "Kod Parçacığı",
    de: "Code-Snippet",
  },
  "project-dev": {
    en: "Project Development",
    tr: "Proje Geliştirme",
    de: "Projektentwicklung",
  },
  "sys-admin": {
    en: "System Administration",
    tr: "Sistem Yönetimi",
    de: "Systemadministration",
  },
  "tech-learning": {
    en: "Tech Learning",
    tr: "Teknoloji Öğrenimi",
    de: "Technologie-Lernen",
  },
  "ai-prompt": { en: "AI Prompt", tr: "AI İstemi", de: "KI-Prompt" },
  "tech-review": {
    en: "Tech Review",
    tr: "Teknoloji İncelemesi",
    de: "Technologie-Review",
  },
  "bug-solution": {
    en: "Bug Solution",
    tr: "Hata Çözümü",
    de: "Fehlerbehebung",
  },
  "idea-tech": {
    en: "Tech Idea",
    tr: "Teknoloji Fikri",
    de: "Technologie-Idee",
  },

  // work-career alt kategorileri
  "meeting-minutes": {
    en: "Meeting Minutes",
    tr: "Toplantı Notları",
    de: "Sitzungsprotokoll",
  },
  "project-plan": { en: "Project Plan", tr: "Proje Planı", de: "Projektplan" },
  "client-comm": {
    en: "Client Communication",
    tr: "Müşteri İletişimi",
    de: "Kundenkommunikation",
  },
  "report-analysis": {
    en: "Report & Analysis",
    tr: "Rapor & Analiz",
    de: "Bericht & Analyse",
  },
  presentation: { en: "Presentation", tr: "Sunum", de: "Präsentation" },
  "career-goal": {
    en: "Career Goal",
    tr: "Kariyer Hedefi",
    de: "Karriereziel",
  },
  "business-idea": { en: "Business Idea", tr: "İş Fikri", de: "Geschäftsidee" },
  "process-workflow": {
    en: "Process & Workflow",
    tr: "Süreç & İş Akışı",
    de: "Prozess & Workflow",
  },

  // personal-growth alt kategorileri
  "study-notes": {
    en: "Study Notes",
    tr: "Çalışma Notları",
    de: "Studiennotizen",
  },
  "language-learning": {
    en: "Language Learning",
    tr: "Dil Öğrenimi",
    de: "Sprachenlernen",
  },
  "skill-practice": {
    en: "Skill Practice",
    tr: "Beceri Pratiği",
    de: "Fertigkeitenübung",
  },
  "research-notes": {
    en: "Research Notes",
    tr: "Araştırma Notları",
    de: "Forschungsnotizen",
  },
  "lecture-summary": {
    en: "Lecture Summary",
    tr: "Ders Özeti",
    de: "Vorlesungszusammenfassung",
  },
  "concept-map": {
    en: "Concept Map",
    tr: "Kavram Haritası",
    de: "Konzeptkarte",
  },
  "question-list": {
    en: "Question List",
    tr: "Soru Listesi",
    de: "Fragenliste",
  },
  certification: {
    en: "Certification",
    tr: "Sertifikasyon",
    de: "Zertifizierung",
  },

  // projects-planning alt kategorileri
  brainstorm: { en: "Brainstorm", tr: "Beyin Fırtınası", de: "Brainstorming" },
  "life-goals": { en: "Life Goals", tr: "Hayat Hedefleri", de: "Lebensziele" },
  "hobby-project": {
    en: "Hobby Project",
    tr: "Hobi Projesi",
    de: "Hobbyprojekt",
  },
  "event-planning": {
    en: "Event Planning",
    tr: "Etkinlik Planlama",
    de: "Veranstaltungsplanung",
  },
  "creative-writing": {
    en: "Creative Writing",
    tr: "Yaratıcı Yazarlık",
    de: "Kreatives Schreiben",
  },
  "productivity-sys": {
    en: "Productivity System",
    tr: "Verimlilik Sistemi",
    de: "Produktivitätssystem",
  },
  "decision-log": {
    en: "Decision Log",
    tr: "Karar Günlüğü",
    de: "Entscheidungsprotokoll",
  },
  "vision-board": {
    en: "Vision Board",
    tr: "Vizyon Panosu",
    de: "Visionstafel",
  },

  // finance-management alt kategorileri
  "budget-track": {
    en: "Budget Tracking",
    tr: "Bütçe Takibi",
    de: "Budgetverfolgung",
  },
  "investment-res": {
    en: "Investment Research",
    tr: "Yatırım Araştırması",
    de: "Investitionsforschung",
  },
  "expense-log": {
    en: "Expense Log",
    tr: "Harcama Kaydı",
    de: "Ausgabenprotokoll",
  },
  "financial-goal": {
    en: "Financial Goal",
    tr: "Finansal Hedef",
    de: "Finanzziel",
  },
  "tax-notes": { en: "Tax Notes", tr: "Vergi Notları", de: "Steuernotizen" },
  "price-comparison": {
    en: "Price Comparison",
    tr: "Fiyat Karşılaştırma",
    de: "Preisvergleich",
  },
  "subscription-mgmt": {
    en: "Subscription Management",
    tr: "Abonelik Yönetimi",
    de: "Abonnementverwaltung",
  },

  // life-organization alt kategorileri
  "shopping-list": {
    en: "Shopping List",
    tr: "Alışveriş Listesi",
    de: "Einkaufsliste",
  },
  "home-maintenance": {
    en: "Home Maintenance",
    tr: "Ev Bakımı",
    de: "Hauswartung",
  },
  appointment: { en: "Appointment", tr: "Randevu", de: "Termin" },
  "admin-task": {
    en: "Administrative Task",
    tr: "İdari Görev",
    de: "Verwaltungsaufgabe",
  },
  "home-recipe": { en: "Home Recipe", tr: "Ev Tarifi", de: "Hausrezept" },
  "packing-list": { en: "Packing List", tr: "Bavul Listesi", de: "Packliste" },
  "important-info": {
    en: "Important Info",
    tr: "Önemli Bilgi",
    de: "Wichtige Info",
  },
  wishlist: { en: "Wishlist", tr: "İstek Listesi", de: "Wunschliste" },

  // health-wellbeing alt kategorileri
  "fitness-track": {
    en: "Fitness Tracking",
    tr: "Fitness Takibi",
    de: "Fitness-Tracking",
  },
  "nutrition-plan": {
    en: "Nutrition Plan",
    tr: "Beslenme Planı",
    de: "Ernährungsplan",
  },
  "symptom-log": {
    en: "Symptom Log",
    tr: "Semptom Kaydı",
    de: "Symptomprotokoll",
  },
  "mental-notes": {
    en: "Mental Notes",
    tr: "Zihinsel Notlar",
    de: "Mentale Notizen",
  },
  "habit-tracker": {
    en: "Habit Tracker",
    tr: "Alışkanlık Takibi",
    de: "Gewohnheitstracker",
  },
  "medical-history": {
    en: "Medical History",
    tr: "Tıbbi Geçmiş",
    de: "Krankengeschichte",
  },
  "sleep-log": { en: "Sleep Log", tr: "Uyku Kaydı", de: "Schlafprotokoll" },
  "wellness-activity": {
    en: "Wellness Activity",
    tr: "Sağlık Aktivitesi",
    de: "Wellness-Aktivität",
  },

  // log-archive alt kategorileri
  "daily-journal": { en: "Daily Journal", tr: "Günlük", de: "Tagebuch" },
  bookmark: { en: "Bookmark", tr: "Yer İmi", de: "Lesezeichen" },
  "quick-note": { en: "Quick Note", tr: "Hızlı Not", de: "Schnellnotiz" },
  "reference-data": {
    en: "Reference Data",
    tr: "Referans Verisi",
    de: "Referenzdaten",
  },
  conversation: { en: "Conversation", tr: "Konuşma", de: "Gespräch" },
  memory: { en: "Memory", tr: "Anı", de: "Erinnerung" },
  "review-personal": {
    en: "Personal Review",
    tr: "Kişisel İnceleme",
    de: "Persönliche Bewertung",
  },
  unsorted: { en: "Unsorted", tr: "Sınıflandırılmamış", de: "Unsortiert" },
};

// Renk sınıfları (Tailwind)
export const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; border: string; gradient: string }
> = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    gradient: "from-blue-500 to-cyan-500",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    gradient: "from-amber-500 to-yellow-500",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
    gradient: "from-green-500 to-emerald-500",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
    gradient: "from-purple-500 to-pink-500",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    gradient: "from-emerald-500 to-teal-500",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-200 dark:border-amber-800",
    gradient: "from-orange-500 to-red-500",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    gradient: "from-red-500 to-pink-500",
  },
  gray: {
    bg: "bg-gray-50 dark:bg-gray-800",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-200 dark:border-gray-700",
    gradient: "from-gray-500 to-slate-500",
  },
};

// ==================== HELPER FONKSİYONLAR ====================

/**
 * Kategori adını belirtilen dilde getir
 */
export function getCategoryName(categoryId: string, locale: string): string {
  const names = CATEGORY_NAMES[categoryId];
  if (!names) return categoryId;
  return names[locale as keyof typeof names] || names.en || categoryId;
}

/**
 * Kategori bilgisini getir
 */
export function getCategory(categoryId: string): CategoryDefinition | null {
  return CATEGORIES[categoryId] || null;
}

/**
 * Kategori renklerini getir
 */
export function getCategoryColors(categoryId: string) {
  const category = CATEGORIES[categoryId];
  if (!category) return CATEGORY_COLORS.gray;
  return CATEGORY_COLORS[category.color] || CATEGORY_COLORS.gray;
}

/**
 * Alt kategorinin ana kategorisini bul
 */
export function findParentCategory(subcategoryId: string): string | null {
  for (const [catId, cat] of Object.entries(CATEGORIES)) {
    if (cat.subcategories.includes(subcategoryId)) {
      return catId;
    }
  }
  return null;
}

/**
 * Kategori geçerli mi kontrol et
 */
export function isValidCategory(categoryId: string): boolean {
  return categoryId in CATEGORIES;
}

/**
 * Alt kategori geçerli mi kontrol et
 */
export function isValidSubcategory(
  categoryId: string,
  subcategoryId: string,
): boolean {
  const category = CATEGORIES[categoryId];
  if (!category) return false;
  return category.subcategories.includes(subcategoryId);
}

/**
 * Tüm ana kategorileri listele
 */
export function getAllCategories(): CategoryDefinition[] {
  return Object.values(CATEGORIES);
}

/**
 * Bir kategorinin tüm alt kategorilerini getir
 */
export function getSubcategories(categoryId: string): string[] {
  return CATEGORIES[categoryId]?.subcategories || [];
}
