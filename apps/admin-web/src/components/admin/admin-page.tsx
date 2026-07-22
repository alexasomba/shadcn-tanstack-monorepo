import { Link } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
type BadgeProps = ComponentProps<typeof Badge>;
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardContent,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";
import type { ComponentProps, ReactNode } from "react";

type AdminPageProps = {
  children: ReactNode;
  className?: string;
};

export function AdminPage({ children, className }: AdminPageProps) {
  return <div className={cn("flex flex-col gap-6", className)}>{children}</div>;
}

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function AdminPageHeader({
  title,
  description,
  badge,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div
      className={cn("flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", className)}
    >
      <div className="flex min-w-0 flex-col gap-2">
        {badge ? <div className="flex flex-wrap items-center gap-2">{badge}</div> : null}
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? <p className="max-w-3xl text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

type AdminMetricCardProps = {
  title: string;
  value: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  className?: string;
};

export function AdminMetricCard({
  title,
  value,
  description,
  icon,
  badge,
  className,
}: AdminMetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div className="flex min-w-0 flex-col gap-1">
          <CardDescription>{title}</CardDescription>
          <CardTitle className="truncate text-2xl font-semibold tabular-nums">{value}</CardTitle>
        </div>
        {icon ? (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        ) : null}
      </CardHeader>
      {description || badge ? (
        <CardContent className="flex flex-col gap-3">
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          {badge}
        </CardContent>
      ) : null}
    </Card>
  );
}

type AdminToolbarProps = {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function AdminToolbar({ actions, children, className }: AdminToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

type AdminSectionProps = {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  description?: ReactNode;
  title?: ReactNode;
};

export function AdminSection({
  actions,
  children,
  className,
  contentClassName,
  description,
  title,
}: AdminSectionProps) {
  return (
    <Card className={className}>
      {title || description || actions ? (
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            {title ? <CardTitle>{title}</CardTitle> : null}
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn("flex flex-col gap-4", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

type AdminDetailLayoutProps = {
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AdminDetailLayout({ aside, children, className }: AdminDetailLayoutProps) {
  return (
    <div className={cn("grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]", className)}>
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
      {aside ? (
        <aside className="flex min-w-0 flex-col gap-6 xl:sticky xl:top-20 xl:self-start">
          {aside}
        </aside>
      ) : null}
    </div>
  );
}

type AdminDetailTabsListProps = ComponentProps<typeof TabsList>;

export function AdminDetailTabsList({ children, className, ...props }: AdminDetailTabsListProps) {
  return (
    <TabsList
      {...props}
      className={cn(
        "h-auto w-full justify-start overflow-x-auto rounded-none border-b bg-transparent p-0",
        className,
      )}
    >
      {children}
    </TabsList>
  );
}

type AdminDetailTabsTriggerProps = ComponentProps<typeof TabsTrigger>;

export function AdminDetailTabsTrigger({
  children,
  className,
  ...props
}: AdminDetailTabsTriggerProps) {
  return (
    <TabsTrigger
      {...props}
      className={cn(
        "rounded-none border-b-2 border-transparent px-4 py-2 whitespace-nowrap data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none",
        className,
      )}
    >
      {children}
    </TabsTrigger>
  );
}

type AdminDetailItemProps = {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  label: ReactNode;
};

export function AdminDetailItem({ children, className, icon, label }: AdminDetailItemProps) {
  return (
    <div className={cn("flex items-start gap-3 rounded-lg border bg-muted/30 p-3", className)}>
      {icon ? (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground uppercase">{label}</span>
        <div className="min-w-0 text-sm font-medium text-foreground">{children}</div>
      </div>
    </div>
  );
}

type AdminMetadataRowProps = {
  label: ReactNode;
  value: ReactNode;
};

export function AdminMetadataRow({ label, value }: AdminMetadataRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-medium text-foreground">{value}</span>
    </div>
  );
}

type AdminPageSkeletonProps = {
  metrics?: number;
  sections?: number;
};

export function AdminPageSkeleton({ metrics = 4, sections = 2 }: AdminPageSkeletonProps) {
  return (
    <AdminPage>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: metrics }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="gap-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      {Array.from({ length: sections }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="gap-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </CardHeader>
          <CardContent className="gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ))}
    </AdminPage>
  );
}

type AdminEmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function AdminEmptyState({
  title,
  description,
  icon,
  action,
  className,
}: AdminEmptyStateProps) {
  return (
    <Empty className={cn("min-h-72 rounded-lg border border-dashed", className)}>
      <EmptyHeader>
        {icon ? <EmptyMedia variant="icon">{icon}</EmptyMedia> : null}
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}

export function AdminErrorState({
  title = "Unable to load this admin view",
  description,
  action,
  className,
}: {
  action?: ReactNode;
  className?: string;
  description: string;
  title?: string;
}) {
  return (
    <AdminEmptyState
      title={title}
      description={description}
      action={action}
      className={cn("border-destructive/30 bg-destructive/5", className)}
    />
  );
}

export function AdminEmptyLink({
  to,
  children,
  className,
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Button render={<Link to={to} />} size="sm" className={className}>
      {children}
    </Button>
  );
}

export type AdminTone = "default" | "success" | "warning" | "error" | "info" | "secondary";

const statusToneByValue: Record<string, AdminTone> = {
  active: "success",
  approved: "success",
  completed: "success",
  delivered: "success",
  enabled: "success",
  instock: "success",
  paid: "success",
  published: "success",
  resolved: "success",
  verified: "success",
  pending: "warning",
  processing: "info",
  shipped: "info",
  suspended: "warning",
  draft: "secondary",
  guest: "warning",
  disabled: "secondary",
  refunded: "secondary",
  archived: "secondary",
  cancelled: "error",
  failed: "error",
  inactive: "error",
  outofstock: "error",
  rejected: "error",
  unresolved: "error",
  backorder: "warning",
  onbackorder: "warning",
};

const toneVariant: Record<AdminTone, BadgeProps["variant"]> = {
  default: "outline",
  error: "destructive",
  info: "secondary",
  secondary: "secondary",
  success: "default",
  warning: "outline",
};

export function getAdminStatusTone(value?: string | null): AdminTone {
  if (!value) return "default";
  return statusToneByValue[value.toLowerCase()] ?? "default";
}

type AdminStatusBadgeProps = Omit<BadgeProps, "variant"> & {
  status?: string | null;
  tone?: AdminTone;
};

export function AdminStatusBadge({
  status,
  tone,
  className,
  children,
  ...props
}: AdminStatusBadgeProps) {
  const resolvedTone = tone ?? getAdminStatusTone(status);

  return (
    <Badge {...props} variant={toneVariant[resolvedTone]} className={cn("capitalize", className)}>
      {children ?? status ?? "Unknown"}
    </Badge>
  );
}
