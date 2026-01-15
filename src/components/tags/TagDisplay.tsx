"use client";

import { CATEGORIES, getCategoryName, getCategoryColors } from "@/lib/categories";
import { FolderOpen, Tag, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";

interface CategoryDisplayProps {
  category: string;
  subcategory?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  linkToCategory?: boolean;
  className?: string;
}

export function CategoryDisplay({
  category,
  subcategory,
  size = "sm",
  showIcon = true,
  linkToCategory = false,
  className = "",
}: CategoryDisplayProps) {
  const locale = useLocale();

  const categoryDef = CATEGORIES[category];
  const colors = getCategoryColors(category);
  const categoryName = getCategoryName(category, locale);
  const subcategoryName = subcategory ? getCategoryName(subcategory, locale) : null;

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  const CategoryBadge = (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Main Category */}
      <span
        className={`inline-flex items-center rounded-lg border ${colors.border} ${colors.bg} ${colors.text} ${sizeClasses[size]} font-medium`}
      >
        {showIcon && categoryDef && <span className="mr-1">{categoryDef.icon}</span>}
        {categoryName}
      </span>

      {/* Subcategory */}
      {subcategoryName && (
        <>
          <ChevronRight className="w-3 h-3 text-gray-400" />
          <span
            className={`inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 ${sizeClasses[size]} font-medium`}
          >
            <Tag className="w-3 h-3 mr-1" />
            {subcategoryName}
          </span>
        </>
      )}
    </div>
  );

  if (linkToCategory) {
    return (
      <Link
        href={`/browse?category=${category}${subcategory ? `&subcategory=${subcategory}` : ""}`}
        className="hover:opacity-80 transition-opacity"
      >
        {CategoryBadge}
      </Link>
    );
  }

  return CategoryBadge;
}

interface CategoryBadgeProps {
  category: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

export function CategoryBadge({ category, size = "sm", onClick }: CategoryBadgeProps) {
  const locale = useLocale();
  const categoryDef = CATEGORIES[category];
  const colors = getCategoryColors(category);
  const categoryName = getCategoryName(category, locale);

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg border ${colors.border} ${colors.bg} ${colors.text} ${sizeClasses[size]} font-medium transition-all hover:shadow-md ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      {categoryDef && <span>{categoryDef.icon}</span>}
      <span>{categoryName}</span>
    </button>
  );
}

interface SubcategoryBadgeProps {
  subcategory: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

export function SubcategoryBadge({ subcategory, size = "sm", onClick }: SubcategoryBadgeProps) {
  const locale = useLocale();
  const subcategoryName = getCategoryName(subcategory, locale);

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 ${sizeClasses[size]} font-medium transition-all hover:shadow-md ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <Tag className="w-3 h-3" />
      <span>{subcategoryName}</span>
    </button>
  );
}

interface CategoryBreadcrumbProps {
  category?: string;
  subcategory?: string;
  onNavigate: (category?: string, subcategory?: string) => void;
}

export function CategoryBreadcrumb({
  category,
  subcategory,
  onNavigate,
}: CategoryBreadcrumbProps) {
  const locale = useLocale();

  return (
    <nav className="flex items-center gap-1 flex-wrap text-sm">
      <button
        onClick={() => onNavigate(undefined, undefined)}
        className={`px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
          !category
            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium"
            : "text-gray-600 dark:text-gray-400"
        }`}
      >
        <FolderOpen className="w-4 h-4 inline mr-1" />
        Tümü
      </button>

      {category && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <button
            onClick={() => onNavigate(category, undefined)}
            className={`px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 capitalize ${
              category && !subcategory
                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {getCategoryName(category, locale)}
          </button>
        </>
      )}

      {subcategory && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <button
            onClick={() => onNavigate(category, subcategory)}
            className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium capitalize"
          >
            {getCategoryName(subcategory, locale)}
          </button>
        </>
      )}
    </nav>
  );
}
