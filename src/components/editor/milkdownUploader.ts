// components/editor/milkdownUploader.ts
// Custom uploader for Milkdown's upload plugin

import type { Uploader } from "@milkdown/plugin-upload";
import type { Node } from "@milkdown/prose/model";
import { getSignedUrl, UploadedImage } from "@/lib/image-uploader";
import { ImageRegistry } from "./imageRegistry";

/**
 * Type for the upload handler function from useImageUpload hook
 */
export type UploadHandler = (file: File) => Promise<UploadedImage | null>;

/**
 * Type for the image upload callback
 */
export type OnImageUpload = (image: UploadedImage) => void;

/**
 * Create a custom uploader for Milkdown that integrates with our image upload system
 *
 * @param uploadHandler - The upload function from useImageUpload hook
 * @param registry - ImageRegistry to track UUID/URL mappings
 * @param onImageUpload - Callback when image is uploaded (to notify parent)
 * @returns Uploader function for Milkdown
 */
// Note: This function is no longer used - we handle paste/drop manually in MilkdownEditor
// Keeping for potential future use or reference
export function createMilkdownUploader(
  uploadHandler: UploadHandler,
  registry: ImageRegistry,
  onImageUpload?: OnImageUpload
): Uploader {
  return async (files: FileList, schema): Promise<Node[]> => {
    const nodes: Node[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);

      if (!file || !file.type.startsWith("image/")) {
        continue;
      }

      try {
        const result = await uploadHandler(file);

        if (result) {
          const signedUrl = await getSignedUrl(result.storagePaths.medium);
          registry.register(result.id, signedUrl, result.storagePaths.medium);

          const imageNode = schema.nodes.image?.create({
            src: signedUrl,
            alt: result.originalName || "uploaded image",
            title: result.originalName || "",
          });

          if (imageNode) {
            nodes.push(imageNode);
          }

          onImageUpload?.(result);
        }
      } catch (error) {
        console.error("Image upload failed:", error);
      }
    }

    return nodes;
  };
}

/**
 * Handle file input change event for manual image upload
 */
export async function handleFileInputUpload(
  file: File,
  uploadHandler: UploadHandler,
  registry: ImageRegistry,
  onImageUpload?: OnImageUpload
): Promise<{ signedUrl: string; uuid: string } | null> {
  if (!file.type.startsWith("image/")) {
    return null;
  }

  try {
    const result = await uploadHandler(file);

    if (result) {
      const signedUrl = await getSignedUrl(result.storagePaths.medium);
      registry.register(result.id, signedUrl, result.storagePaths.medium);
      onImageUpload?.(result);

      return { signedUrl, uuid: result.id };
    }
  } catch (error) {
    console.error("Image upload failed:", error);
  }

  return null;
}
