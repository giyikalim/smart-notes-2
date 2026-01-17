// components/editor/contentTransformer.ts
// Transform content between storage format ({{img:uuid}}) and editor format (![](url))

import { getSignedUrl } from "@/lib/image-uploader";
import { extractImageIds } from "@/lib/image-processor";
import { ImageRegistry } from "./imageRegistry";

const IMAGE_PLACEHOLDER_REGEX = /\{\{img:([a-f0-9-]+)\}\}/g;
const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;

/**
 * Transform content for loading into editor:
 * {{img:uuid}} -> ![image](signedUrl)
 *
 * @param content - Raw content with {{img:uuid}} placeholders
 * @param imageStoragePaths - Map of UUID -> storage path (medium variant)
 * @param registry - ImageRegistry to register the mappings
 * @returns Transformed content with markdown image syntax
 */
export async function transformForEditor(
  content: string,
  imageStoragePaths: Map<string, string>,
  registry: ImageRegistry
): Promise<string> {
  // Find all image UUIDs in the content
  const imageIds = extractImageIds(content);

  if (imageIds.length === 0) {
    return content;
  }

  // Fetch all signed URLs in parallel
  const urlResults = await Promise.all(
    imageIds.map(async (uuid) => {
      const storagePath = imageStoragePaths.get(uuid);
      if (storagePath) {
        try {
          const signedUrl = await getSignedUrl(storagePath);
          registry.register(uuid, signedUrl, storagePath);
          return { uuid, signedUrl, success: true };
        } catch (error) {
          console.error(`Failed to get signed URL for image ${uuid}:`, error);
          return { uuid, signedUrl: "", success: false };
        }
      }
      return { uuid, signedUrl: "", success: false };
    })
  );

  // Replace placeholders with markdown images
  let transformed = content;
  for (const result of urlResults) {
    if (result.success && result.signedUrl) {
      // Replace {{img:uuid}} with ![image](signedUrl)
      transformed = transformed.replace(
        new RegExp(`\\{\\{img:${result.uuid}\\}\\}`, "g"),
        `![image](${result.signedUrl})`
      );
    }
    // If URL fetch failed, leave the placeholder as-is for now
  }

  return transformed;
}

/**
 * Transform content for saving to storage:
 * ![...](signedUrl) -> {{img:uuid}}
 *
 * @param markdown - Editor content with markdown image syntax
 * @param registry - ImageRegistry with UUID/URL mappings
 * @returns Content with {{img:uuid}} placeholders
 */
export function transformForStorage(
  markdown: string,
  registry: ImageRegistry
): string {
  // Match markdown image syntax: ![alt](url)
  return markdown.replace(MARKDOWN_IMAGE_REGEX, (match, alt, url) => {
    // Try to find UUID for this URL
    const uuid = registry.getUuid(url);

    if (uuid) {
      // Convert back to placeholder format
      return `{{img:${uuid}}}`;
    }

    // Keep external images (not from our storage) as standard markdown
    return match;
  });
}

/**
 * Check if content has any image placeholders
 */
export function hasImagePlaceholders(content: string): boolean {
  return IMAGE_PLACEHOLDER_REGEX.test(content);
}

/**
 * Check if content has any markdown images
 */
export function hasMarkdownImages(content: string): boolean {
  return MARKDOWN_IMAGE_REGEX.test(content);
}

/**
 * Extract all markdown image URLs from content
 */
export function extractMarkdownImageUrls(content: string): string[] {
  const urls: string[] = [];
  let match;

  // Reset regex state
  const regex = new RegExp(MARKDOWN_IMAGE_REGEX);

  while ((match = regex.exec(content)) !== null) {
    urls.push(match[2]); // match[2] is the URL
  }

  return urls;
}
