"use client";

import { Badge } from "@workspace/ui/components/badge";
import { ArrowUpRight, Activity, Zap, ShieldCheck, ChevronRight, Sparkles } from "lucide-react";
import React, { useRef, useState } from "react";

function GlowingBorderCard({
  children,
  className,
  glowColor,
  repeatingGradient,
}: {
  children: React.ReactNode;
  className?: string;
  glowColor: string;
  repeatingGradient: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative rounded-2xl bg-border/40 p-[2px] ${className || ""}`}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${glowColor}, transparent 40%)`,
        }}
      />

      <div className="relative z-10 h-full overflow-hidden rounded-2xl bg-background">
        <div
          className="pointer-events-none absolute inset-0 opacity-30 dark:opacity-50"
          style={{ background: repeatingGradient }}
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-background/80" />

        <div className="relative z-20 flex h-full flex-col justify-between p-8">{children}</div>
      </div>
    </div>
  );
}

export default function FinanceSplitSection() {
  return (
    <section className="theme-injected relative w-full bg-background px-4 py-24 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12">
          <div className="flex flex-col gap-8 lg:col-span-5">
            <div className="inline-flex">
              <Badge
                variant="secondary"
                className="flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-sm"
              >
                <Sparkles className="h-4 w-4 text-foreground" />
                <span className="font-medium text-foreground">Next-Gen Fintech</span>
              </Badge>
            </div>

            <h2 className="text-5xl leading-[1.05] font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
              Elevate your <br className="hidden md:block" />
              financial ops
            </h2>

            <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
              Harness real-time data to automate reconciliation, forecast with precision, and
              empower your organization to move at the speed of thought.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                Start building
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                View demo
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:col-span-7">
            <GlowingBorderCard
              glowColor="rgba(59, 130, 246, 0.8)"
              repeatingGradient="repeating-linear-gradient(45deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.15) 15px, transparent 15px, transparent 30px)"
            >
              <div>
                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 bg-background text-foreground shadow-sm">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <div className="mb-2 text-5xl font-bold tracking-tight text-foreground">
                  99.9
                  <span className="ml-1 text-2xl text-muted-foreground">%</span>
                </div>
                <h3 className="mb-2 text-base font-semibold text-foreground">Automated Accuracy</h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Eliminate manual entry errors with AI-driven reconciliation that categorizes
                transactions instantly.
              </p>
            </GlowingBorderCard>

            <GlowingBorderCard
              glowColor="rgba(168, 85, 247, 0.8)"
              repeatingGradient="repeating-linear-gradient(-45deg, rgba(168, 85, 247, 0.15), rgba(168, 85, 247, 0.15) 15px, transparent 15px, transparent 30px)"
            >
              <div>
                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 bg-background text-foreground shadow-sm">
                  <Zap className="h-5 w-5 text-purple-500" />
                </div>
                <div className="mb-2 text-5xl font-bold tracking-tight text-foreground">
                  10
                  <span className="ml-1 text-2xl text-muted-foreground">x</span>
                </div>
                <h3 className="mb-2 text-base font-semibold text-foreground">Faster Audits</h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Prepare for audits in hours, not weeks. All documents are cross-linked and
                cryptographically verified.
              </p>
            </GlowingBorderCard>

            <GlowingBorderCard
              className="sm:col-span-2"
              glowColor="rgba(16, 185, 129, 0.8)"
              repeatingGradient="repeating-linear-gradient(90deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.15) 15px, transparent 15px, transparent 30px)"
            >
              <div className="flex w-full flex-col items-start gap-8 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 bg-background text-foreground shadow-sm">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="mb-2 text-5xl font-bold tracking-tight text-foreground md:text-6xl">
                    $500
                    <span className="ml-1 text-3xl text-muted-foreground">k+</span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    Average Annual Savings
                  </h3>
                </div>
                <div className="flex-1">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    By catching duplicate invoices, predicting cashflow bottlenecks, and enforcing
                    smart policies, our average enterprise customer saves over half a million
                    dollars in their first year alone.
                  </p>

                  <div className="mt-6 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-foreground hover:underline">
                    Read the case study <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </GlowingBorderCard>
          </div>
        </div>
      </div>
    </section>
  );
}
