// app/api/ai/tags/route.ts
import { NextRequest, NextResponse } from "next/server";

const CLOUDFLARE_WORKER_URL = process.env.CLOUDFLARE_TAGS_WORKER_URL;
const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_TAGS_API_KEY;

export interface TagGenerationResult {
  success: boolean;
  data?: {
    hierarchicalTags: Array<{
      en: string;
      original: string;
      originalLang: string;
    }>;
    primaryTag: string;
    secondaryTag: string | null;
    allTagsEn: string[];
    contentLanguage: string;
    tagCount: number;
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
      // Fallback: Generate basic tags locally
      console.warn("Cloudflare Worker not configured, using fallback");
      return NextResponse.json(generateFallbackTags(text));
    }

    // Call Cloudflare Worker
    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CLOUDFLARE_API_KEY}`,
      },
      body: JSON.stringify({ text: text.substring(0, 1500) }),
    });

    if (!response.ok) {
      console.error("Cloudflare Worker error:", response.status);
      return NextResponse.json(generateFallbackTags(text));
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Tag generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Fallback tag generation when AI is not available
 */
function generateFallbackTags(text: string): TagGenerationResult {
  const lowerText = text.toLowerCase();

  // Detect language
  const turkishChars = ["ğ", "ü", "ş", "ı", "ö", "ç"];
  const hasTurkishChars = turkishChars.some((char) => lowerText.includes(char));
  const lang = hasTurkishChars ? "tr" : "en";

  // Simple category detection based on keywords
  const categoryKeywords: Record<string, { en: string; tr: string }> = {
    // Technology
    code: { en: "programming", tr: "programlama" },
    programming: { en: "programming", tr: "programlama" },
    javascript: { en: "programming", tr: "programlama" },
    python: { en: "programming", tr: "programlama" },
    react: { en: "programming", tr: "programlama" },
    api: { en: "programming", tr: "programlama" },
    database: { en: "programming", tr: "programlama" },
    yazılım: { en: "programming", tr: "programlama" },
    kod: { en: "programming", tr: "programlama" },
    
    // Work
    meeting: { en: "work", tr: "iş" },
    project: { en: "work", tr: "iş" },
    deadline: { en: "work", tr: "iş" },
    toplantı: { en: "work", tr: "iş" },
    proje: { en: "work", tr: "iş" },
    
    // Personal
    diary: { en: "personal", tr: "kişisel" },
    günlük: { en: "personal", tr: "kişisel" },
    feeling: { en: "personal", tr: "kişisel" },
    
    // Learning
    learn: { en: "learning", tr: "öğrenme" },
    study: { en: "learning", tr: "öğrenme" },
    course: { en: "learning", tr: "öğrenme" },
    öğren: { en: "learning", tr: "öğrenme" },
    ders: { en: "learning", tr: "öğrenme" },
    
    // Ideas
    idea: { en: "ideas", tr: "fikirler" },
    fikir: { en: "ideas", tr: "fikirler" },
    plan: { en: "ideas", tr: "fikirler" },
    
    // Health
    health: { en: "health", tr: "sağlık" },
    sağlık: { en: "health", tr: "sağlık" },
    exercise: { en: "health", tr: "sağlık" },
    egzersiz: { en: "health", tr: "sağlık" },
    
    // Finance
    money: { en: "finance", tr: "finans" },
    para: { en: "finance", tr: "finans" },
    budget: { en: "finance", tr: "finans" },
    bütçe: { en: "finance", tr: "finans" },
    
    // Recipes
    recipe: { en: "recipes", tr: "tarifler" },
    tarif: { en: "recipes", tr: "tarifler" },
    yemek: { en: "recipes", tr: "tarifler" },
    cook: { en: "recipes", tr: "tarifler" },
  };

  let detectedCategory = { en: "general", tr: "genel" };

  for (const [keyword, category] of Object.entries(categoryKeywords)) {
    if (lowerText.includes(keyword)) {
      detectedCategory = category;
      break;
    }
  }

  const tags = [
    {
      en: detectedCategory.en,
      original: lang === "tr" ? detectedCategory.tr : detectedCategory.en,
      originalLang: lang,
    },
    {
      en: "note",
      original: lang === "tr" ? "not" : "note",
      originalLang: lang,
    },
  ];

  return {
    success: true,
    data: {
      hierarchicalTags: tags,
      primaryTag: tags[0].en,
      secondaryTag: tags[1]?.en || null,
      allTagsEn: tags.map((t) => t.en),
      contentLanguage: lang,
      tagCount: tags.length,
    },
    timestamp: new Date().toISOString(),
  };
}
