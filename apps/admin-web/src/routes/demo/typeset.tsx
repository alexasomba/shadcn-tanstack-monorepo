import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { Typeset } from "@workspace/ui/components/typeset";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import {
  BookOpen,
  ChatCircle,
  FileText,
  ArrowsOutLineHorizontal,
  FolderOpen,
  Lightning,
  Sparkle,
  TextAa,
  ArrowLineLeftRight,
  Shield,
  Eye,
  CursorClick
} from "@phosphor-icons/react";

export const Route = createFileRoute("/demo/typeset")({
  component: DemoTypesetPage,
  head: () => ({
    meta: [{ title: "Demo — Typeset Typography" }],
  }),
});

type PresetType = "docs" | "chat" | "reading" | "compact" | "large" | "custom";

function DemoTypesetPage() {
  const [preset, setPreset] = React.useState<PresetType>("docs");
  const [size, setSize] = React.useState("16");
  const [leading, setLeading] = React.useState("1.75");
  const [flow, setFlow] = React.useState("1.5");

  // Get active styling based on current state
  const customStyle = preset === "custom" ? {
    "--typeset-size": `${size}px`,
    "--typeset-leading": leading,
    "--typeset-flow": `${flow}em`,
  } as React.CSSProperties : undefined;

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/40 p-8 md:p-12">
        <div className="absolute -right-16 -top-16 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-16 -bottom-16 size-72 rounded-full bg-secondary/10 blur-3xl" />
        
        <div className="relative z-10 flex flex-col gap-4 max-w-3xl">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkle size={14} className="animate-spin-slow" />
            New Typography System
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Shadcn Typeset
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed font-body">
            A single-file styling system designed to make rendered HTML and markdown look professional
            and consistent across different contexts (blogs, documentation, streaming AI chat) with zero specificity.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Controls */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightning size={20} className="text-primary" />
                Rhythm Presets
              </CardTitle>
              <CardDescription>
                Select a preset to tune the typography for a specific context.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {[
                { id: "docs", label: "Documentation", desc: "Balanced grid for docs & guides", icon: FileText },
                { id: "chat", label: "AI Chat", desc: "Tighter spacing for streaming messages", icon: ChatCircle },
                { id: "reading", label: "Reading Mode", desc: "Serif font with generous sizing", icon: BookOpen },
                { id: "compact", label: "Compact UI", desc: "Dense text for dashboards", icon: ArrowsOutLineHorizontal },
                { id: "large", label: "Large Text", desc: "High legibility, accessible rhythm", icon: TextAa },
                { id: "custom", label: "Custom Rhythm", desc: "Fine-tune sizing and flow", icon: Sparkle },
              ].map((p) => {
                const Icon = p.icon;
                const active = preset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPreset(p.id as PresetType)}
                    className={`flex items-start gap-4 rounded-xl p-3.5 text-left border transition-all ${
                      active
                        ? "border-primary bg-primary/5 text-foreground shadow-sm"
                        : "border-border/40 hover:border-border/80 hover:bg-muted/5 text-muted-foreground"
                    }`}
                  >
                    <div className={`rounded-lg p-2 ${active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-sm font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}>
                        {p.label}
                      </span>
                      <span className="text-xs text-muted-foreground/80">{p.desc}</span>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Custom Controls (Visible when custom is selected) */}
          {preset === "custom" && (
            <Card className="border-border/50 bg-card/60 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-200">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ArrowLineLeftRight size={18} />
                  Fine-Tuning Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Base Size</span>
                    <span className="text-primary font-mono">{size}px</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="24"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Line Spacing (Leading)</span>
                    <span className="text-primary font-mono">{leading}</span>
                  </div>
                  <input
                    type="range"
                    min="1.4"
                    max="2.2"
                    step="0.05"
                    value={leading}
                    onChange={(e) => setLeading(e.target.value)}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Paragraph Flow (Flow)</span>
                    <span className="text-primary font-mono">{flow}em</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="2.5"
                    step="0.05"
                    value={flow}
                    onChange={(e) => setFlow(e.target.value)}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Info */}
          <Card className="border-border/40 bg-muted/20">
            <CardContent className="p-4 flex flex-col gap-3 text-xs text-muted-foreground leading-relaxed">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Shield size={16} className="text-primary" />
                Zero-Specificity Guarantee
              </div>
              <p>
                All elements inside Typeset are styled using the <code>:where()</code> guard selector. 
                This keeps the specificity at 0, meaning standard Tailwind utility classes applied to raw HTML tags 
                will always win without needing <code>!important</code>.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Live Specimen View */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between px-4 py-2 bg-muted/40 rounded-xl border border-border/40">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Eye size={16} />
              Live Specimen Sandbox
            </div>
            <div className="flex items-center gap-2 text-xs font-mono bg-background px-2.5 py-1 rounded-md border border-border/30">
              Active Class: <span className="text-primary">.typeset {preset !== "custom" && `.typeset-${preset}`}</span>
            </div>
          </div>

          <Card className="border-border/50 bg-background shadow-lg overflow-hidden">
            <CardContent className="p-6 md:p-8">
              {/* Typeset Wrapper */}
              <Typeset
                preset={preset === "custom" ? undefined : preset}
                style={customStyle}
                className="max-w-none transition-all duration-300"
              >
                <h1>Designing with Rhythm &amp; Flow</h1>
                <p>
                  Typography isn&apos;t just about selecting a font face. It&apos;s about creating a robust, readable, and 
                  engaging vertical rhythm. The <strong>shadcn/typeset</strong> system allows developers to style 
                  rendered markdown or CMS content dynamically, respecting dark mode and local theme tokens.
                </p>

                <h2>Document Hierarchy</h2>
                <p>
                  Each heading element derives its font size and margin spacing proportionally from the three core rhythm variables. 
                  This creates an extremely consistent and balanced cadence.
                </p>

                <h3>Sub-headings and Cadence</h3>
                <p>
                  Notice how sub-headings nest cleanly and own the space below them. Let&apos;s see how other elements, such 
                  as lists and blockquotes, integrate into the document rhythm.
                </p>

                <ul>
                  <li>Fully responsive typographic scaling.</li>
                  <li>Zero layout shifts during content streaming.</li>
                  <li>
                    Built-in support for GFM footnotes and tasks.
                    <ul>
                      <li>Nested lists are automatically indented.</li>
                      <li>Bullet styles adjust recursively.</li>
                    </ul>
                  </li>
                </ul>

                <blockquote>
                  &ldquo;Simplicity is the ultimate sophistication. When typography is set with proper rhythm, the interface disappears and only the content remains.&rdquo;
                </blockquote>

                <h2>Interactive Code Specimen</h2>
                <p>
                  Here is an inline code block <code>const app = typeset()</code>, and below is a full syntax-highlighted code block:
                </p>

                <pre><code>{`// Initialize Typeset
import { Typeset } from "@workspace/ui/components/typeset";

export default function RenderContent({ md }) {
  return (
    <Typeset preset="docs">
      <Markdown>{md}</Markdown>
    </Typeset>
  );
}`}</code></pre>

                <h2>Responsive Tables</h2>
                <p>
                  Tables wrap to fit the page by default, but you can wrap them in a <code>typeset-scroll</code> block 
                  to support beautiful, smooth horizontal scrolling on smaller screens.
                </p>

                <div className="typeset-scroll border border-border/50 rounded-xl overflow-hidden">
                  <table>
                    <thead>
                      <tr>
                        <th>Control Variable</th>
                        <th>Default Value</th>
                        <th>Purpose</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code>--typeset-size</code></td>
                        <td><code>1em</code></td>
                        <td>Determines the base text size of the content.</td>
                      </tr>
                      <tr>
                        <td><code>--typeset-leading</code></td>
                        <td><code>1.75</code></td>
                        <td>Sets the space between lines of text (line-height).</td>
                      </tr>
                      <tr>
                        <td><code>--typeset-flow</code></td>
                        <td><code>1.25em</code></td>
                        <td>Configures the vertical gap between block elements.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <hr />

                <h2>Custom Override Demonstration</h2>
                <p>
                  Because of the zero specificity model, we can apply utility classes directly.
                  For example, the paragraph below is colored and sized using Tailwind utility classes applied directly to the tag:
                </p>

                <p className="text-primary font-bold text-lg border border-primary/20 bg-primary/5 rounded-xl p-4">
                  This paragraph is inside the Typeset container, but has custom classes applied to override its style. 
                  Because the container styles are zero specificity, these Tailwind utility classes win instantly without requiring <code>!important</code>.
                </p>
              </Typeset>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
