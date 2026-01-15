// app/api/ai/categorize/route.ts
import { isValidCategory, isValidSubcategory } from "@/lib/categories";
import { NextRequest, NextResponse } from "next/server";

//const CLOUDFLARE_WORKER_URL =
//"https://ai-suggest-category-openai.alimgiyik.workers.dev/";
const CLOUDFLARE_WORKER_URL =
  "https://ai-suggest-category-openai.alimgiyik.workers.dev/";
const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_WORKER_API_KEY;

export interface CategoryResult {
  success: boolean;
  data?: {
    category: string;
    subcategory: string;
  };
  error?: string;
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || text.length < 20) {
      return NextResponse.json(
        {
          success: false,
          error: "Content too short (minimum 20 characters)",
        },
        { status: 400 }
      );
    }

    // Check if Cloudflare Worker is configured
    if (!CLOUDFLARE_WORKER_URL || !CLOUDFLARE_API_KEY) {
      // Fallback: Generate category locally
      console.warn("Cloudflare Worker not configured, using fallback");
      return NextResponse.json(generateFallbackCategory(text));
    }

    const words = text.trim().split(/\s+/);
    const firstNwords = words.length > 20 ? words.slice(0, 20).join(" ") : text;

    // Call Cloudflare Worker
    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CLOUDFLARE_API_KEY}`,
      },
      body: JSON.stringify({ text: firstNwords }),
    });

    if (!response.ok) {
      console.error("Cloudflare Worker error:", response.status);
      return NextResponse.json(generateFallbackCategory(text));
    }

    const result = await response.json();

    // Validate the response
    if (result.success && result.mainCategory && result.subCategory) {
      // Verify categories are valid
      const category = isValidCategory(result.mainCategory)
        ? result.mainCategory
        : "log-archive";
      const subcategory = isValidSubcategory(category, result.subCategory)
        ? result.subCategory
        : "unsorted";

      return NextResponse.json({
        success: true,
        data: {
          category,
          subcategory,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(generateFallbackCategory(text));
  } catch (error) {
    console.error("Category generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: {
          category: "log-archive",
          subcategory: "unsorted",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Fallback category generation when AI is not available
 */
function generateFallbackCategory(text: string): CategoryResult {
  const lowerText = text.toLowerCase();

  // Category detection keywords
  const categoryKeywords: Record<
    string,
    { keywords: string[]; defaultSub: string }
  > = {
    "tech-production": {
      keywords: [
        "code",
        "function",
        "const",
        "let",
        "var",
        "import",
        "export",
        "class",
        "def ",
        "async",
        "await",
        "return",
        "sql",
        "select",
        "insert",
        "database",
        "query",
        "api",
        "http",
        "javascript",
        "python",
        "react",
        "node",
        "npm",
        "git",
        "docker",
        "linux",
        "server",
        "html",
        "css",
        "json",
        "programlama",
        "kod",
        "yazılım",
        "bug",
        "error",
        "debug",
      ],
      defaultSub: "code-snippet",
    },
    "work-career": {
      keywords: [
        "meeting",
        "project",
        "deadline",
        "client",
        "team",
        "manager",
        "office",
        "work",
        "job",
        "task",
        "sprint",
        "agile",
        "toplantı",
        "proje",
        "iş",
        "müşteri",
        "presentation",
        "report",
        "sunum",
        "rapor",
      ],
      defaultSub: "project-plan",
    },
    "personal-growth": {
      keywords: [
        "learn",
        "study",
        "course",
        "tutorial",
        "lesson",
        "education",
        "school",
        "university",
        "öğren",
        "ders",
        "kurs",
        "eğitim",
        "okul",
        "book",
        "kitap",
        "research",
        "araştırma",
      ],
      defaultSub: "study-notes",
    },
    "projects-planning": {
      keywords: [
        "idea",
        "plan",
        "brainstorm",
        "goal",
        "strategy",
        "fikir",
        "hedef",
        "strateji",
        "düşün",
        "project idea",
        "proje fikri",
        "vision",
        "vizyon",
      ],
      defaultSub: "brainstorm",
    },
    "finance-management": {
      keywords: [
        "money",
        "budget",
        "invest",
        "stock",
        "bank",
        "salary",
        "expense",
        "para",
        "bütçe",
        "yatırım",
        "maaş",
        "fatura",
        "bill",
        "price",
        "fiyat",
      ],
      defaultSub: "budget-track",
    },
    "life-organization": {
      keywords: [
        "shopping",
        "alışveriş",
        "home",
        "ev",
        "appointment",
        "randevu",
        "recipe",
        "tarif",
        "yemek",
        "cook",
        "pişir",
        "list",
        "liste",
        "pack",
        "bavul",
      ],
      defaultSub: "shopping-list",
    },
    "health-wellbeing": {
      keywords: [
        "health",
        "doctor",
        "medicine",
        "exercise",
        "fitness",
        "gym",
        "diet",
        "sağlık",
        "doktor",
        "ilaç",
        "egzersiz",
        "spor",
        "diyet",
        "sleep",
        "uyku",
        "symptom",
        "semptom",
      ],
      defaultSub: "fitness-track",
    },
    "log-archive": {
      keywords: [
        "diary",
        "günlük",
        "journal",
        "note",
        "not",
        "remember",
        "hatırla",
        "bookmark",
        "link",
        "memory",
        "anı",
      ],
      defaultSub: "quick-note",
    },
  };

  // Find matching category
  let matchedCategory = "log-archive";
  let matchedSubcategory = "unsorted";
  let maxMatches = 0;

  for (const [category, config] of Object.entries(categoryKeywords)) {
    const matches = config.keywords.filter((kw) =>
      lowerText.includes(kw)
    ).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      matchedCategory = category;
      matchedSubcategory = config.defaultSub;
    }
  }

  return {
    success: true,
    data: {
      category: matchedCategory,
      subcategory: matchedSubcategory,
    },
    timestamp: new Date().toISOString(),
  };
}
