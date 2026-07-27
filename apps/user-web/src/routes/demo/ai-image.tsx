import { DownloadSimple, ImageIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select";
import { Spinner } from "@workspace/ui/components/spinner";
import { Textarea } from "@workspace/ui/components/textarea";
import { useState } from "react";

const SIZES = ["1024x1024", "1536x1024", "1024x1536", "auto"];

interface GeneratedImage {
  url?: string;
  b64Json?: string;
  revisedPrompt?: string;
}

function ImagePage() {
  const [prompt, setPrompt] = useState(
    "A cute baby sea otter wearing a beret and glasses, sitting at a small cafe table, sipping a cappuccino",
  );
  const [size, setSize] = useState("1024x1024");
  const [numberOfImages, setNumberOfImages] = useState(1);
  const [images, setImages] = useState<Array<GeneratedImage>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setImages([]);

    try {
      const response = await fetch("/demo/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, size, numberOfImages }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image");
      }

      setImages(data.images);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const getImageSrc = (image: GeneratedImage) => {
    if (image.url) return image.url;
    if (image.b64Json) return `data:image/png;base64,${image.b64Json}`;
    return "";
  };

  const handleDownload = async (image: GeneratedImage, index: number) => {
    const src = getImageSrc(image);
    if (!src) return;

    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `generated-image-${index + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Failed to download image
    }
  };

  return (
    <main className="demo-page demo-page-wide">
      <div>
        <div className="mb-6 flex items-center gap-3">
          <ImageIcon aria-hidden="true" className="text-[var(--lagoon-deep)] size-8" />
          <h1 className="demo-title">Image Generation</h1>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="image-size">Size</FieldLabel>
                <NativeSelect
                  id="image-size"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  disabled={isLoading}
                >
                  {SIZES.map((s) => (
                    <NativeSelectOption key={s} value={s}>
                      {s}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="image-count">Count</FieldLabel>
                <Input
                  id="image-count"
                  type="number"
                  value={numberOfImages}
                  onChange={(e) =>
                    setNumberOfImages(Math.max(1, Math.min(4, parseInt(e.target.value) || 1)))
                  }
                  min={1}
                  max={4}
                  disabled={isLoading}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="image-prompt">Prompt</FieldLabel>
              <Textarea
                id="image-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isLoading}
                rows={6}
                placeholder="Describe the image you want to generate..."
              />
            </Field>

            <Button
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              className="w-full"
            >
              {isLoading ? (
                <span role="status" aria-live="polite" className="flex items-center justify-center gap-2">
                  <Spinner className="size-4" />
                  Generating...
                </span>
              ) : (
                "Generate Image"
              )}
            </Button>
          </FieldGroup>

          <div className="demo-panel lg:col-span-2">
            <h2 className="demo-section-title mb-4">Generated Images</h2>

            {error ? (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {images.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {images.map((image, index) => (
                    <div key={getImageSrc(image)} className="group relative">
                      <img
                        src={getImageSrc(image)}
                        alt={image.revisedPrompt || prompt || `Generated image ${index + 1}`}
                        className="w-full rounded-lg border border-[var(--line)]"
                      />
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => handleDownload(image, index)}
                        className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
                        title="Download image"
                      >
                        <DownloadSimple className="size-4" />
                      </Button>
                      {image.revisedPrompt && (
                        <p className="demo-muted mt-2 text-xs italic">
                          Revised: {image.revisedPrompt}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : !error && !isLoading ? (
              <div className="demo-muted flex h-64 flex-col items-center justify-center">
                <ImageIcon aria-hidden="true" className="mb-4 size-16 opacity-50" />
                <p>Enter a prompt and click "Generate Image" to create an image.</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

export const Route = createFileRoute("/demo/ai-image")({
  component: ImagePage,
});

