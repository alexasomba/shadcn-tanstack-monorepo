import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { useRef, useState } from "react";

import { MEDIA_LIMITS } from "#/lib/media";
import type { MediaKind } from "#/lib/media";

function unknownErrorMessage(error: unknown, fallback: string): string {
  if (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

type Props = {
  kind: MediaKind;
  label: string;
  description?: string;
  currentUrl?: string | null;
  disabled?: boolean;
  onUpload: (payload: {
    contentType: string;
    fileBase64: string;
    fileName: string;
  }) => Promise<void>;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

export function ImageUploadField({
  kind,
  label,
  description,
  currentUrl,
  disabled,
  onUpload,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const limits = MEDIA_LIMITS[kind];
  const accept = limits.kinds.join(",");
  const displayUrl = preview ?? currentUrl ?? null;

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!(limits.kinds as readonly string[]).includes(file.type)) {
      setError(`Unsupported type. Use: ${limits.kinds.join(", ")}`);
      return;
    }
    if (file.size > limits.maxBytes) {
      setError(`Max size ${(limits.maxBytes / 1_000_000).toFixed(1)} MB`);
      return;
    }

    setBusy(true);
    try {
      const dataUrl = await fileToBase64(file);
      setPreview(dataUrl);
      await onUpload({
        contentType: file.type,
        fileBase64: dataUrl,
        fileName: file.name,
      });
    } catch (e) {
      setError(unknownErrorMessage(e, "Upload failed"));
      setPreview(null);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-muted/40">
          {displayUrl ? (
            <img src={displayUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-[10px] text-muted-foreground">None</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="sr-only"
            disabled={disabled || busy}
            onChange={(e) => {
              void onPick(e.target.files?.[0]);
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Uploading…" : "Choose image"}
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Max {(limits.maxBytes / 1_000_000).toFixed(1)} MB · JPEG, PNG, WebP
            {kind === "org-logo" ? ", SVG" : ""}, GIF
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
