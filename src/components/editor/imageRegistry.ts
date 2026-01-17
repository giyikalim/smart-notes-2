// components/editor/imageRegistry.ts
// Bidirectional mapping between image UUIDs and their signed URLs

export interface ImageRegistryEntry {
  uuid: string;
  signedUrl: string;
  storagePath: string;
}

/**
 * Registry to track the mapping between image UUIDs and signed URLs.
 * Used during editor load/save to transform between storage format and display format.
 */
export class ImageRegistry {
  private uuidToUrl: Map<string, string> = new Map();
  private uuidToPath: Map<string, string> = new Map();

  /**
   * Register an image with its UUID, signed URL, and storage path
   */
  register(uuid: string, signedUrl: string, storagePath?: string): void {
    this.uuidToUrl.set(uuid, signedUrl);
    if (storagePath) {
      this.uuidToPath.set(uuid, storagePath);
    }
  }

  /**
   * Get signed URL for a given UUID
   */
  getUrl(uuid: string): string | undefined {
    return this.uuidToUrl.get(uuid);
  }

  /**
   * Get storage path for a given UUID
   */
  getStoragePath(uuid: string): string | undefined {
    return this.uuidToPath.get(uuid);
  }

  /**
   * Get UUID from a signed URL
   * Handles URL variations (query params may change between requests)
   */
  getUuid(url: string): string | undefined {
    // Extract base URL without query params for comparison
    const targetBase = this.extractBasePath(url);

    for (const [uuid, storedUrl] of this.uuidToUrl) {
      const storedBase = this.extractBasePath(storedUrl);
      if (targetBase === storedBase) {
        return uuid;
      }
    }

    return undefined;
  }

  /**
   * Check if a UUID is registered
   */
  has(uuid: string): boolean {
    return this.uuidToUrl.has(uuid);
  }

  /**
   * Get all registered UUIDs
   */
  getAllUuids(): string[] {
    return Array.from(this.uuidToUrl.keys());
  }

  /**
   * Clear all registered images
   */
  clear(): void {
    this.uuidToUrl.clear();
    this.uuidToPath.clear();
  }

  /**
   * Extract base path from URL (without query params and token)
   */
  private extractBasePath(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.origin + urlObj.pathname;
    } catch {
      // If URL parsing fails, just split on ?
      return url.split("?")[0];
    }
  }
}

/**
 * Create a new ImageRegistry instance
 */
export function createImageRegistry(): ImageRegistry {
  return new ImageRegistry();
}
