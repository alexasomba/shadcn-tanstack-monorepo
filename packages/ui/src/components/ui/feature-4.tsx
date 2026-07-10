"use client";

import { Card, CardContent } from "@workspace/ui/components/card";
import {
  HiSignal,
  HiUsers,
  HiChartBar,
  HiArrowTrendingUp,
  HiClock,
  HiExclamationTriangle,
} from "react-icons/hi2";

export default function Features4() {
  return (
    <section className="flex w-full flex-col items-center justify-center px-6 py-16">
      <h1 className="text-center text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
        Understand faster, act smarter
      </h1>

      <p className="mt-4 max-w-2xl text-center text-muted-foreground">
        Get clarity on performance, uncover patterns, and take action with insights that actually
        move things forward.
      </p>

      <div className="mt-12 grid w-full max-w-6xl items-stretch gap-6 md:grid-cols-3">
        <Card className="flex h-full flex-col rounded-[40px] bg-muted/40 p-0">
          <CardContent className="flex h-full flex-col gap-8 p-4">
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-foreground">Activity stream</h3>
              <p className="text-md/6 text-muted-foreground">
                Track live system activity and event flow in real time, helping you spot spikes and
                performance changes instantly.
              </p>
            </div>

            <div className="flex min-h-[350px] flex-col justify-between rounded-4xl bg-background p-4 shadow-[0px_3px_8px_-1px_rgba(0,0,0,0.03),0px_1px_2px_-1px_rgba(0,0,0,0.04),0px_2px_4px_0px_rgba(0,0,0,0.04)] dark:bg-background/60 dark:shadow-[0px_3px_8px_-1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.04),0px_2px_4px_0px_rgba(0,0,0,0.04),inset_0px_2px_0px_0px_rgba(255,255,255,0.05)]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <HiSignal className="h-4 w-4 text-primary" />
                  Live events
                </span>
                <span className="text-xs text-primary">● live</span>
              </div>

              <div className="flex items-end justify-between">
                <div className="text-4xl font-semibold text-foreground">18,942</div>
                <div className="text-sm text-primary">+12%</div>
              </div>

              <div className="flex h-24 items-end gap-2">
                {[40, 60, 35, 80, 55, 90, 70].map((h, i) => (
                  <div
                    key={i}
                    className="w-full rounded-md bg-primary/80"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted p-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <HiClock className="h-3 w-3" />
                    Latency
                  </div>
                  <div className="text-lg font-medium text-foreground">1.2s</div>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <HiExclamationTriangle className="h-3 w-3" />
                    Errors
                  </div>
                  <div className="text-lg font-medium text-destructive">-2.3%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col rounded-4xl bg-muted/40 p-0">
          <CardContent className="flex h-full flex-col gap-8 p-4">
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-foreground">User segments</h3>
              <p className="text-md/6 text-muted-foreground">
                Understand how different user groups behave and interact, so you can identify
                patterns and high-impact segments quickly.
              </p>
            </div>

            <div className="flex min-h-[350px] flex-col justify-between rounded-4xl bg-background p-4 shadow-[0px_3px_8px_-1px_rgba(0,0,0,0.03),0px_1px_2px_-1px_rgba(0,0,0,0.04),0px_2px_4px_0px_rgba(0,0,0,0.04)] dark:bg-background/60 dark:shadow-[0px_3px_8px_-1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.04),0px_2px_4px_0px_rgba(0,0,0,0.04),inset_0px_2px_0px_0px_rgba(255,255,255,0.05)]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <HiUsers className="h-4 w-4 text-primary" />
                  Active segments
                </span>
                <span className="text-xs text-muted-foreground">12 groups</span>
              </div>

              <div className="flex items-center justify-center">
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-8 border-primary/20">
                  <div className="absolute h-full w-full rotate-45 rounded-full border-8 border-primary border-t-transparent" />
                  <span className="text-xl font-semibold text-foreground">68%</span>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { name: "Power users", value: 48 },
                  { name: "New users", value: 32 },
                  { name: "Churn risk", value: 47 },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium text-foreground">{item.value}%</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <div className="h-2 flex-1 rounded-full bg-primary" />
                <div className="h-2 flex-1 rounded-full bg-primary/60" />
                <div className="h-2 flex-1 rounded-full bg-primary/30" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col rounded-4xl bg-muted/40 p-0">
          <CardContent className="flex h-full flex-col gap-8 p-4">
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-foreground">Momentum score</h3>
              <p className="text-md/6 text-muted-foreground">
                Monitor growth across key metrics with a unified score, revealing trends and
                momentum shifts at a glance.
              </p>
            </div>

            <div className="flex min-h-[350px] flex-col justify-between rounded-4xl bg-background p-4 shadow-[0px_3px_8px_-1px_rgba(0,0,0,0.03),0px_1px_2px_-1px_rgba(0,0,0,0.04),0px_2px_4px_0px_rgba(0,0,0,0.04)] dark:bg-background/60 dark:shadow-[0px_3px_8px_-1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.04),0px_2px_4px_0px_rgba(0,0,0,0.04),inset_0px_2px_0px_0px_rgba(255,255,255,0.05)]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <HiChartBar className="h-4 w-4 text-primary" />
                  Growth score
                </span>
                <span className="rounded-3xl border border-primary/20 bg-primary/5 px-2 text-xs text-primary">
                  +6.2%
                </span>
              </div>

              <div className="text-5xl font-semibold text-foreground">78</div>

              <div className="space-y-4">
                {[
                  { label: "Acquisition", value: 82 },
                  { label: "Engagement", value: 68 },
                  { label: "Retention", value: 74 },
                ].map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{item.label}</span>
                      <span>{item.value}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between rounded-lg bg-muted p-3 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <HiArrowTrendingUp className="h-4 w-4" />
                  Trend
                </span>
                <span className="font-medium text-primary">Accelerating</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
