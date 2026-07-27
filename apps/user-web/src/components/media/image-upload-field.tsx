import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@workspace/ui/components/attachment";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@workspace/ui/components/field";
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
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      setError(unknownErrorMessage(e, "Upload failed"));
      setPreview(null);
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Field data-invalid={Boolean(error)}>
      <div>
        <FieldLabel htmlFor={`image-upload-${kind}`}>{label}</FieldLabel>
        {description ? <FieldDescription>{description}</FieldDescription> : null}
      </div>

      <div className="flex flex-col gap-3">
        {displayUrl ? (
          <Attachment state={busy ? "uploading" : error ? "error" : "done"}>
            <AttachmentMedia variant="image">
              <img src={displayUrl} alt={label} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>{label}</AttachmentTitle>
              <AttachmentDescription>
                {busy ? "Uploading…" : "Current image active"}
              </AttachmentDescription>
            </AttachmentContent>
          </Attachment>
        ) : null}

        <input
          id={`image-upload-${kind}`}
          ref={inputRef}
          type="file"
          accept={accept}
          aria-label={label || "Upload image"}
          aria-invalid={Boolean(error)}
          aria-errormessage={error ? `image-upload-error-${kind}` : undefined}
          className="sr-only"
          disabled={disabled || busy}
          onChange={(e) => {
            void onPick(e.target.files?.[0]);
          }}
        />

        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Uploading…" : displayUrl ? "Change image" : "Choose image"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Max {(limits.maxBytes / 1_000_000).toFixed(1)} MB · JPEG, PNG, WebP
            {kind === "org-logo" ? ", SVG" : ""}, GIF
          </span>
        </div>
      </div>

      {error ? <FieldError id={`image-upload-error-${kind}`}>{error}</FieldError> : null}
    </Field>
  );
}
