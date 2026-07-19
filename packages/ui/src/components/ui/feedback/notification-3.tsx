import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardFooter, CardHeader } from "@workspace/ui/components/card";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";
import React, { useState } from "react";
import {
  RiNotification3Fill,
  RiCheckFill,
  RiFileTextFill,
  RiSettings4Fill,
  RiArrowRightSFill,
  RiCircleFill,
  RiCloseFill,
} from "react-icons/ri";

export type ActivityKind = "merge" | "deploy" | "comment" | "invite" | "review" | "report";

export type ActivityTab = "all" | "activity" | "tasks" | "digest";

export interface ActivityActor {
  name: string;
  initials: string;
  avatar?: string;
}

export interface ActivityAttachment {
  label: string;
  meta: string;
}

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  actor: ActivityActor;
  workspace: string;
  summary: string;
  timestamp: string;
  isNew: boolean;
  isTask: boolean;
  isDigest: boolean;
  attachment?: ActivityAttachment;
  actions?: { label: string; variant: "default" | "outline" }[];
}

export interface Notification3Props {
  title?: string;
  items?: ActivityItem[];
  className?: string;
}

const KindColorMap: Record<ActivityKind, string> = {
  merge: "bg-primary/10 text-primary",
  deploy: "bg-primary/10 text-primary",
  comment: "bg-secondary text-secondary-foreground",
  invite: "bg-muted text-muted-foreground",
  review: "bg-muted text-muted-foreground",
  report: "bg-destructive/10 text-destructive",
};

const KindLabelMap: Record<ActivityKind, string> = {
  merge: "Merged",
  deploy: "Deploy",
  comment: "Comment",
  invite: "Invite",
  review: "Review",
  report: "Report",
};

const defaultItems: ActivityItem[] = [
  {
    id: "1",
    kind: "deploy",
    actor: { name: "CI Pipeline", initials: "CI" },
    workspace: "Atlas Platform",
    summary: "Release v4.2.0 deployed to production — 0 errors, 98% test coverage.",
    timestamp: "Just now",
    isNew: true,
    isTask: false,
    isDigest: false,
  },
  {
    id: "2",
    kind: "review",
    actor: {
      name: "Nadia Osei",
      initials: "NO",
      avatar: "https://assets.watermelon.sh/wm_emma.png",
    },
    workspace: "Design System",
    summary: "Requested your review on the updated component token schema.",
    timestamp: "12m ago",
    isNew: true,
    isTask: true,
    isDigest: false,
    actions: [
      { label: "Decline", variant: "outline" },
      { label: "Review", variant: "default" },
    ],
  },
  {
    id: "3",
    kind: "merge",
    actor: {
      name: "Ravi Menon",
      initials: "RM",
      avatar: "https://assets.watermelon.sh/wm_alex.png",
    },
    workspace: "Atlas Platform",
    summary: "PR #389 — Unified auth middleware merged into main.",
    timestamp: "1h ago",
    isNew: true,
    isTask: false,
    isDigest: false,
    attachment: { label: "auth-middleware.ts", meta: "3 files changed" },
  },
  {
    id: "4",
    kind: "comment",
    actor: {
      name: "Sara Lin",
      initials: "SL",
      avatar: "https://assets.watermelon.sh/wm_mia.png",
    },
    workspace: "Content Hub",
    summary: '"Looks great — the new skeleton loader feels much snappier! 🚀"',
    timestamp: "3h ago",
    isNew: false,
    isTask: false,
    isDigest: true,
  },
  {
    id: "5",
    kind: "invite",
    actor: {
      name: "Dev Ops",
      initials: "DO",
    },
    workspace: "Infrastructure",
    summary: "Kaito Nakamura has been added to the Infrastructure workspace.",
    timestamp: "Yesterday",
    isNew: false,
    isTask: false,
    isDigest: true,
  },
  {
    id: "6",
    kind: "report",
    actor: { name: "Monitor", initials: "MN" },
    workspace: "Atlas Platform",
    summary: "Weekly digest: 142 events, 4 deploys, 12 PRs merged, 0 incidents.",
    timestamp: "Yesterday",
    isNew: false,
    isTask: false,
    isDigest: true,
    attachment: { label: "weekly-report.pdf", meta: "1.2 MB" },
  },
];

function TabPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-[inset_0_2px_4px_0_rgba(255,255,255,0.5),inset_0_-2px_4px_0_rgba(0,0,0,0.1)] dark:shadow-[inset_0_-2px_4px_0_rgba(0,0,0,0.1),inset_0_2px_4px_0_rgba(255,255,255,0.08)]"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            "flex h-4 min-w-[16px] items-center justify-center rounded-full text-[9px] font-bold tabular-nums",
            active
              ? "bg-primary-foreground/50 text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function AttachmentChip({ attachment }: { attachment: ActivityAttachment }) {
  return (
    <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5">
      <RiFileTextFill className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="text-xs font-medium text-foreground">{attachment.label}</span>
      <span className="text-xs text-muted-foreground">· {attachment.meta}</span>
    </div>
  );
}

function ActivityRow({ item, onDismiss }: { item: ActivityItem; onDismiss: (id: string) => void }) {
  const iconColor = KindColorMap[item.kind];

  return (
    <div
      className={cn(
        "group relative flex gap-3 px-4 py-3 transition-colors duration-150",
        "hover:bg-muted/40",
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-9 w-9">
          <AvatarImage src={item.actor.avatar} alt={item.actor.name} />
          <AvatarFallback className="bg-muted text-xs font-bold text-muted-foreground">
            {item.actor.initials}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="text-sm font-semibold text-foreground">{item.actor.name}</span>
            <Badge
              variant="outline"
              className={cn(
                "h-4 shrink-0 rounded-full border-0 px-1.5 text-[10px] font-semibold",
                iconColor,
              )}
            >
              {KindLabelMap[item.kind]}
            </Badge>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-xs text-muted-foreground/60 tabular-nums">{item.timestamp}</span>
            <button
              onClick={() => onDismiss(item.id)}
              className="rounded p-0.5 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 hover:text-muted-foreground"
              aria-label="Dismiss"
            >
              <RiCloseFill className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <p className="mt-0.5 text-xs font-medium text-muted-foreground">{item.workspace}</p>

        <p className="mt-1 text-sm leading-snug text-foreground/80">{item.summary}</p>

        {item.attachment && <AttachmentChip attachment={item.attachment} />}

        {item.actions && item.actions.length > 0 && (
          <div className="mt-2.5 flex items-center gap-2">
            {item.actions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant}
                size="sm"
                className="h-7 rounded-full px-3 text-xs font-semibold shadow-[inset_0_2px_4px_0_rgba(255,255,255,0.5),inset_0_-2px_4px_0_rgba(0,0,0,0.1)] dark:shadow-[inset_0_-2px_4px_0_rgba(0,0,0,0.1),inset_0_2px_4px_0_rgba(255,255,255,0.08)]"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Notification3({
  title = "Activity",
  items = defaultItems,
  className,
}: Notification3Props) {
  const [activeTab, setActiveTab] = useState<ActivityTab>("all");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  const visible = items.filter((i) => !dismissed.has(i.id));
  const newCount = visible.filter((i) => i.isNew).length;
  const taskCount = visible.filter((i) => i.isTask).length;
  const digestCount = visible.filter((i) => i.isDigest).length;

  const filtered =
    activeTab === "all"
      ? visible
      : activeTab === "activity"
        ? visible.filter((i) => i.isNew)
        : activeTab === "tasks"
          ? visible.filter((i) => i.isTask)
          : visible.filter((i) => i.isDigest);

  const tabs: { id: ActivityTab; label: string; count?: number }[] = [
    { id: "all", label: "All", count: visible.length },
    { id: "activity", label: "New", count: newCount },
    { id: "tasks", label: "Tasks", count: taskCount },
    { id: "digest", label: "Digest", count: digestCount },
  ];

  return (
    <section
      className={cn("flex min-h-screen items-center justify-center bg-background", className)}
    >
      <Card className="w-full max-w-2xl gap-0 overflow-hidden rounded-3xl p-0 shadow-xs">
        <CardHeader className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                <RiNotification3Fill className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2>
                <p className="text-[11px] font-medium text-muted-foreground">
                  {newCount > 0 ? `${newCount} new` : "All caught up"} · {visible.length} total
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 rounded-xl px-3 text-xs font-semibold text-primary hover:bg-primary/5"
              onClick={() => setDismissed(new Set(items.filter((i) => i.isNew).map((i) => i.id)))}
            >
              <RiCheckFill className="h-3.5 w-3.5" />
              Clear new
            </Button>
          </div>

          <div className="mt-1 flex items-center gap-1">
            {tabs.map((tab) => (
              <TabPill
                key={tab.id}
                label={tab.label}
                count={tab.count}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[340px] w-full">
            {filtered.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <RiNotification3Fill className="h-5 w-5 text-muted-foreground opacity-40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Nothing here</p>
              </div>
            ) : (
              <div>
                {filtered.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    <ActivityRow item={item} onDismiss={handleDismiss} />
                    {idx < filtered.length - 1 && <Separator className="mx-4 w-auto" />}
                  </React.Fragment>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>

        <CardFooter className="border-t border-border px-5 py-3">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <RiCircleFill className="h-1.5 w-1.5 text-primary" />
              <span>{newCount > 0 ? `${newCount} unread` : "Up to date"}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-0.5 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <RiSettings4Fill className="h-3.5 w-3.5" />
              Manage
              <RiArrowRightSFill className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </section>
  );
}
