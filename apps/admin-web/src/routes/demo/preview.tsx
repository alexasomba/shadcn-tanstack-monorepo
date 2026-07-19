import { createFileRoute } from "@tanstack/react-router";
import PreviewExample from "@workspace/ui/blocks/preview";

export const Route = createFileRoute("/demo/preview")({
  component: DemoPreviewPage,
  head: () => ({
    meta: [{ title: "Demo — Shadcn Preview" }],
  }),
});

function DemoPreviewPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shadcn Preview</h1>
        <p className="text-muted-foreground text-sm">
          A showcase of all the styled UI cards and design specimens.
        </p>
      </div>
      <div className="rounded-2xl border border-border/70 overflow-hidden bg-muted/10">
        <PreviewExample />
      </div>
    </div>
  );
}

