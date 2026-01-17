// components/editor/MilkdownEditor.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Milkdown imports
import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from "@milkdown/core";
import { commonmark } from "@milkdown/preset-commonmark";
import { gfm } from "@milkdown/preset-gfm";
import { Milkdown, MilkdownProvider, useEditor, useInstance } from "@milkdown/react";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { replaceAll, getMarkdown } from "@milkdown/utils";
import { history } from "@milkdown/plugin-history";
import { clipboard } from "@milkdown/plugin-clipboard";

// Local imports
import { useImageUpload } from "@/hooks/useImageUpload";
import { UploadedImage } from "@/lib/image-uploader";
import { NoteImage } from "@/lib/elasticsearch-client";
import { hasImages } from "@/lib/image-processor";
import { ImageRegistry, createImageRegistry } from "./imageRegistry";
import { transformForEditor, transformForStorage } from "./contentTransformer";
import { handleFileInputUpload } from "./milkdownUploader";
import { MilkdownToolbar } from "./MilkdownToolbar";
import { getSignedUrl } from "@/lib/image-uploader";

// Import styles
import "@/styles/milkdown.css";

import { Image as ImageIcon, Loader2, X } from "lucide-react";

interface MilkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  disabled?: boolean;
  onImageUpload?: (image: UploadedImage) => void;
  className?: string;
  images?: NoteImage[]; // Existing images for loading signed URLs
}

function MilkdownEditorInner({
  value,
  onChange,
  placeholder = "Notunuzu buraya yazin...",
  minHeight = "300px",
  disabled = false,
  onImageUpload,
  className = "",
  images = [],
}: MilkdownEditorProps) {
  const { state: uploadState, upload: uploadImage, reset: resetUpload } = useImageUpload();
  const registryRef = useRef<ImageRegistry>(createImageRegistry());
  const [editorReady, setEditorReady] = useState(false);
  const [initialContent, setInitialContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastValueRef = useRef(value);
  const isInternalChangeRef = useRef(false);

  // Use refs for callbacks and value to prevent editor reinitialization
  const onChangeRef = useRef(onChange);
  const onImageUploadRef = useRef(onImageUpload);
  const valueRef = useRef(value);
  const uploadImageRef = useRef(uploadImage);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onImageUploadRef.current = onImageUpload;
  }, [onImageUpload]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    uploadImageRef.current = uploadImage;
  }, [uploadImage]);


  // Build storage path map from images prop
  const imageStoragePaths = useMemo(() => {
    const map = new Map<string, string>();
    images.forEach((img) => {
      if (img.storagePaths?.medium) {
        map.set(img.id, img.storagePaths.medium);
      }
    });
    return map;
  }, [images]);

  // Transform initial content on mount
  useEffect(() => {
    let mounted = true;

    async function prepareContent() {
      setIsLoading(true);
      try {
        const transformed = await transformForEditor(
          value,
          imageStoragePaths,
          registryRef.current
        );
        if (mounted) {
          setInitialContent(transformed);
          lastValueRef.current = value;
        }
      } catch (error) {
        console.error("Failed to transform content:", error);
        if (mounted) {
          setInitialContent(value);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    prepareContent();

    return () => {
      mounted = false;
    };
  }, []); // Only on mount

  // Editor configuration - without upload plugin, we handle paste manually
  const { get } = useEditor(
    (root) =>
      Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root);
          if (initialContent !== null) {
            ctx.set(defaultValueCtx, initialContent);
          }

          // Configure listener for content changes
          ctx.get(listenerCtx).markdownUpdated((ctx, markdown, prevMarkdown) => {
            if (markdown !== prevMarkdown) {
              // Prevent unexpected content clearing (e.g., when browser tab becomes inactive/active)
              // Only block if document is hidden (tab not active) - allow user to delete content normally
              if (!markdown.trim() && valueRef.current.trim() && document.hidden) {
                return;
              }
              isInternalChangeRef.current = true;
              // Transform back to storage format before calling onChange
              const storageMarkdown = transformForStorage(
                markdown,
                registryRef.current
              );
              onChangeRef.current(storageMarkdown);
              lastValueRef.current = storageMarkdown;
            }
          });
        })
        .use(commonmark)
        .use(gfm)
        .use(history)
        .use(clipboard)
        .use(listener),
    [initialContent]
  );

  // Get editor instance for programmatic control
  const [loading, getInstance] = useInstance();

  // Handle external value changes (controlled component)
  useEffect(() => {
    if (loading || !editorReady) return;

    // Skip if this was an internal change
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }

    // External value changed - update editor
    if (value !== lastValueRef.current) {
      const editor = getInstance();
      if (editor) {
        transformForEditor(value, imageStoragePaths, registryRef.current)
          .then((transformed) => {
            editor.action(replaceAll(transformed));
            lastValueRef.current = value;
          })
          .catch(console.error);
      }
    }
  }, [value, loading, editorReady, imageStoragePaths, getInstance]);

  // Mark editor as ready after mount
  useEffect(() => {
    if (!loading && initialContent !== null) {
      setEditorReady(true);
    }
  }, [loading, initialContent]);

  // Restore editor content when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && editorReady && !loading) {
        // Small delay to let any pending editor events settle
        setTimeout(() => {
          try {
            const editor = getInstance();
            if (!editor) return;

            // Try to get current editor content safely
            let currentMarkdown = '';
            try {
              currentMarkdown = editor.action(getMarkdown());
            } catch {
              // Editor context not ready, skip this check
              return;
            }

            // If editor is empty but we have content in value, restore it
            if (!currentMarkdown.trim() && valueRef.current.trim()) {
              transformForEditor(valueRef.current, imageStoragePaths, registryRef.current)
                .then((transformed) => {
                  isInternalChangeRef.current = true;
                  editor.action(replaceAll(transformed));
                  lastValueRef.current = valueRef.current;
                })
                .catch(console.error);
            }
          } catch (error) {
            // Editor not ready or other error, ignore
            console.debug('Editor visibility restore skipped:', error);
          }
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [editorReady, loading, imageStoragePaths, getInstance]);

  // Insert image into editor at cursor position
  const insertImageIntoEditor = useCallback((signedUrl: string, altText: string = "uploaded image") => {
    const editor = getInstance();
    if (editor) {
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        if (view) {
          const { state, dispatch } = view;
          const { from } = state.selection;

          // Create image node
          const imageNode = state.schema.nodes.image?.create({
            src: signedUrl,
            alt: altText,
          });

          if (imageNode) {
            const tr = state.tr.insert(from, imageNode);
            dispatch(tr);
          }
        }
      });
    }
  }, [getInstance]);

  // Handle file upload (from toolbar or paste)
  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;

      try {
        const result = await uploadImageRef.current(file);

        if (result) {
          const signedUrl = await getSignedUrl(result.storagePaths.medium);
          registryRef.current.register(result.id, signedUrl, result.storagePaths.medium);

          // Insert image into editor
          insertImageIntoEditor(signedUrl, result.originalName || "uploaded image");

          // Notify parent
          onImageUploadRef.current?.(result);
        }
      } catch (error) {
        console.error("Image upload failed:", error);
      } finally {
        resetUpload();
      }
    },
    [insertImageIntoEditor, resetUpload]
  );

  // Handle file input for manual upload (toolbar button)
  const handleFileSelect = useCallback(
    async (file: File) => {
      await handleImageUpload(file);
    },
    [handleImageUpload]
  );

  // Handle paste event for images
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await handleImageUpload(file);
          }
          return;
        }
      }
    },
    [handleImageUpload]
  );

  // Handle drop event for images
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith("image/")) {
          e.preventDefault();
          await handleImageUpload(file);
          return;
        }
      }
    },
    [handleImageUpload]
  );

  const hasImagesInContent = hasImages(value);

  // Loading state
  if (isLoading || initialContent === null) {
    return (
      <div
        className={`border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}
      >
        <div
          className="flex items-center justify-center bg-white dark:bg-gray-900"
          style={{ minHeight }}
        >
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Editor yukleniyor...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`milkdown-editor-wrapper border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}
    >
      {/* Toolbar */}
      <MilkdownToolbar
        disabled={disabled}
        uploadState={uploadState}
        onFileSelect={handleFileSelect}
      />

      {/* Upload progress */}
      {(uploadState.stage === "processing" ||
        uploadState.stage === "uploading") && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{uploadState.message}</span>
            <span className="ml-auto">{Math.round(uploadState.progress)}%</span>
          </div>
          <div className="mt-1 h-1 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300"
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error state */}
      {uploadState.stage === "error" && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 flex items-center justify-between">
          <span className="text-sm text-red-700 dark:text-red-300">
            {uploadState.error}
          </span>
          <button
            onClick={resetUpload}
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editor */}
      <div
        className={`milkdown-container prose dark:prose-invert max-w-none p-4 bg-white dark:bg-gray-900 ${
          disabled ? "opacity-50 pointer-events-none" : ""
        }`}
        style={{ minHeight }}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* Placeholder - only show when empty */}
        {!value.trim() && (
          <div className="absolute top-4 left-4 text-gray-400 pointer-events-none select-none">
            {placeholder}
          </div>
        )}
        <Milkdown />
      </div>

      {/* Image info panel */}
      {hasImagesInContent && (
        <div className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 border-t border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
            <ImageIcon className="w-4 h-4" />
            <span>Bu notta resim var - AI icerik duzenleme devre disi</span>
          </div>
        </div>
      )}

      {/* Footer info */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
        <span>Markdown destekli - Resim: surukle-birak veya yapistir</span>
        <span>{value.length} karakter</span>
      </div>
    </div>
  );
}

// Wrap with MilkdownProvider
export default function MilkdownEditor(props: MilkdownEditorProps) {
  return (
    <MilkdownProvider>
      <MilkdownEditorInner {...props} />
    </MilkdownProvider>
  );
}
