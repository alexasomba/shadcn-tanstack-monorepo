import {
  Calendar as CalendarIcon,
  CaretLeft,
  Columns,
  Gear as Settings,
  Kanban,
  Plus,
  Star,
  Table as TableIcon,
  Trash,
  X,
} from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import type { ColumnDef, Column, Row } from "@tanstack/react-table";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardContent,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

import { AdminPage, AdminPageHeader, AdminStatusBadge } from "@/components/admin/admin-page";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";

import { saveCrmViewFn, deleteCrmViewFn, toggleCrmViewFavoriteFn } from "../../lib/crm.functions";
import { CrmRecordWorkspace } from "./CrmRecordWorkspace";

type CrmObjectPageProps = {
  workspace: unknown;
  previewWorkspace?: unknown;
  previewId?: string | null;
  onPreviewChange: (recordId: string | null) => void;
  onViewChange?: (viewId: string | null) => void;
};

function formatLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMoney(value: unknown, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(Number(value || 0) / 100);
}

interface CrmStructuredRecord {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  title?: string | null;
  subject?: string | null;
  companyName?: string | null;
  companyRecord?: { name?: string | null } | null;
  company?: { name?: string | null } | null;
  contact?: { email?: string | null; firstName?: string | null; lastName?: string | null } | null;
  customer?: { name?: string | null; email?: string | null } | null;
  primaryContact?: { email?: string | null } | null;
  reference?: string | null;
  providerReference?: string | null;
  currency?: string | null;
  value?: number | null;
  priority?: string | null;
  status?: string | null;
  [key: string]: unknown;
}

interface CrmViewConfig {
  columns?: Array<{ fieldKey: string; visible?: boolean | null }> | null;
  dateFieldKey?: string | null;
  [key: string]: unknown;
}

interface CrmView {
  id: string;
  name: string;
  type: string;
  visibility: string;
  config?: CrmViewConfig | null;
  isDefault: boolean;
  isFavorite: boolean;
}

interface CrmObjectMetadata {
  key: string;
  defaultViewType?: string | null;
  primaryLabelFieldKey?: string | null;
  labelPlural?: string | null;
  labelSingular?: string | null;
  description?: string | null;
}

interface CrmWorkspaceType {
  object: CrmObjectMetadata;
  fields?: Array<CrmFieldConfig> | null;
  activeView?: CrmView | null;
  views?: Array<CrmView> | null;
  records?: Array<CrmStructuredRecord> | null;
  recordGroups?: Array<{ key: string; items: Array<CrmStructuredRecord> }> | null;
}

function getRecordValue(record: Record<string, unknown>, fieldKey: string) {
  if (fieldKey in record) return record[fieldKey];
  const r = record as CrmStructuredRecord;
  if (fieldKey === "name") {
    return (
      r.name ||
      [r.firstName, r.lastName].filter(Boolean).join(" ") ||
      r.email ||
      r.title ||
      r.subject
    );
  }
  if (fieldKey === "company") return r.companyName || r.companyRecord?.name || r.company?.name;
  if (fieldKey === "contact") {
    return (
      r.contact?.email || [r.contact?.firstName, r.contact?.lastName].filter(Boolean).join(" ")
    );
  }
  if (fieldKey === "customer") return r.customer?.name || r.customer?.email;
  if (fieldKey === "primaryContact") return r.primaryContact?.email;
  if (fieldKey === "reference") return r.reference || r.providerReference;
  return null;
}

interface CrmFieldConfig {
  key: string;
  label: string;
  type?: string | null;
  isVisible?: boolean | null;
}

function formatCellValue(record: Record<string, unknown>, field: CrmFieldConfig) {
  const value = getRecordValue(record, field.key);
  if (value == null || value === "") return "-";
  const r = record as CrmStructuredRecord;
  if (field.type === "currency") return formatMoney(value, r.currency || "NGN");
  if (field.type === "datetime" || field.type === "date")
    return new Date(value as string | number | Date).toLocaleDateString();
  if (field.type === "select")
    return formatLabel(typeof value === "string" || typeof value === "number" ? String(value) : "");
  if (typeof value === "object") return "Linked record";
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function getColumns(
  workspace: CrmWorkspaceType,
  onPreviewChange: (recordId: string | null) => void,
): Array<ColumnDef<Record<string, unknown>>> {
  const configuredColumns =
    workspace.activeView?.config?.columns?.filter((column) => column.visible !== false) || [];
  const fieldsByKey = new Map((workspace.fields || []).map((field) => [field.key, field]));
  const fields = configuredColumns.length
    ? (configuredColumns
        .map((column) => fieldsByKey.get(column.fieldKey))
        .filter(Boolean) as Array<CrmFieldConfig>)
    : (workspace.fields || []).filter((field) => field.isVisible).slice(0, 5);

  const primaryFieldKey = workspace.object.primaryLabelFieldKey || fields[0]?.key || "name";

  return [
    ...fields.map((field) => ({
      id: field.key,
      accessorFn: (row: Record<string, unknown>) => getRecordValue(row, field.key),
      header: ({ column }: { column: Column<Record<string, unknown>, unknown> }) => (
        <DataTableColumnHeader column={column} title={field.label} />
      ),
      cell: ({ row }: { row: Row<Record<string, unknown>> }) => {
        const value = formatCellValue(row.original, field);
        const isPrimary = field.key === primaryFieldKey;
        if (isPrimary) {
          return (
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-semibold">{value}</span>
              {typeof row.original.email === "string" && field.key !== "email" ? (
                <span className="truncate text-xs text-muted-foreground">{row.original.email}</span>
              ) : null}
            </div>
          );
        }
        if (field.type === "select") {
          const rawStatus = getRecordValue(row.original, field.key);
          const statusStr =
            typeof rawStatus === "string" || typeof rawStatus === "number" ? String(rawStatus) : "";
          return <AdminStatusBadge status={statusStr}>{value}</AdminStatusBadge>;
        }
        return <span className="text-sm">{value}</span>;
      },
    })),
    {
      id: "actions",
      header: () => <div className="pr-4 text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2 pr-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              onPreviewChange(typeof row.original.id === "string" ? row.original.id : null);
            }}
          >
            Preview
          </Button>
          <Button
            render={
              workspace.object.key === "contacts" ? (
                <Link
                  to="/crm/contacts/$id"
                  params={{ id: typeof row.original.id === "string" ? row.original.id : "" }}
                />
              ) : workspace.object.key === "deals" ? (
                <Link
                  to="/crm/deals/$id"
                  params={{ id: typeof row.original.id === "string" ? row.original.id : "" }}
                />
              ) : (
                <Link
                  to="/crm/companies/$companyId"
                  params={{
                    companyId: typeof row.original.id === "string" ? row.original.id : "",
                  }}
                />
              )
            }
            variant="outline"
            size="sm"
            onClick={(event) => event.stopPropagation()}
          >
            Open
          </Button>
        </div>
      ),
    },
  ];
}

function ViewIcon({ type }: { type?: string | null }) {
  if (type === "kanban") return <Kanban className="size-4" />;
  if (type === "calendar") return <CalendarIcon className="size-4" />;
  return <TableIcon className="size-4" />;
}

function KanbanView({
  groups,
  onPreviewChange,
}: {
  groups: Array<{ key: string; items: Array<CrmStructuredRecord> }>;
  onPreviewChange: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-5">
      {groups.map((group) => (
        <Card className="min-h-64" key={group.key}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2 text-sm">
              {formatLabel(group.key)}
              <Badge variant="secondary">{group.items.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {group.items.map((record: CrmStructuredRecord) => (
              <button
                className="rounded-md border bg-background p-3 text-left transition-colors hover:bg-muted/50"
                key={record.id}
                type="button"
                onClick={() => onPreviewChange(record.id)}
              >
                <p className="font-medium">
                  {record.title || record.subject || record.name || record.email}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {record.value != null
                    ? formatMoney(record.value, record.currency || "NGN")
                    : record.priority || record.status || record.email}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CalendarView({
  records,
  workspace,
  onPreviewChange,
}: {
  records: Array<CrmStructuredRecord>;
  workspace: CrmWorkspaceType;
  onPreviewChange: (id: string) => void;
}) {
  const dateFieldKey = workspace.activeView?.config?.dateFieldKey || "dueAt";
  const datedRecords = records.filter((record) => getRecordValue(record, dateFieldKey));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Calendar</CardTitle>
        <CardDescription>Records grouped by {formatLabel(dateFieldKey)}.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {datedRecords.length ? (
          datedRecords.map((record) => (
            <button
              className="rounded-md border bg-background p-3 text-left transition-colors hover:bg-muted/50"
              key={record.id}
              type="button"
              onClick={() => onPreviewChange(record.id)}
            >
              <p className="text-xs text-muted-foreground">
                {new Date(
                  getRecordValue(record, dateFieldKey) as string | number | Date,
                ).toLocaleDateString()}
              </p>
              <p className="font-medium">
                {record.title || record.subject || record.name || record.email}
              </p>
            </button>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No records have dates for this calendar view.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function CrmObjectPage({
  onViewChange,
  onPreviewChange,
  previewId,
  previewWorkspace: rawPreviewWorkspace,
  workspace: rawWorkspace,
}: CrmObjectPageProps) {
  const workspace = rawWorkspace as CrmWorkspaceType;
  const previewWorkspace = rawPreviewWorkspace as CrmWorkspaceType | null | undefined;
  const router = useRouter();
  const columns = getColumns(workspace, onPreviewChange);
  const viewType = workspace.activeView?.type || workspace.object.defaultViewType || "table";

  const [newViewName, setNewViewName] = useState("");
  const [prevViewId, setPrevViewId] = useState<string | null>(null);

  if (workspace.activeView && workspace.activeView.id !== prevViewId) {
    setPrevViewId(workspace.activeView.id);
    setNewViewName(workspace.activeView.name || "");
  }

  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<"table" | "kanban" | "calendar">("table");

  const { mutate: renameView, isPending: isSavingView } = useMutation({
    mutationFn: async () => {
      if (!workspace.activeView) return;
      return await saveCrmViewFn({
        data: {
          id: workspace.activeView.id,
          objectKey: workspace.object.key,
          name: newViewName.trim(),
          type: workspace.activeView.type,
          visibility: workspace.activeView.visibility,
          config: workspace.activeView.config || { type: workspace.activeView.type },
          isDefault: workspace.activeView.isDefault,
        },
      });
    },
    onSuccess: async () => {
      toast.success("View renamed successfully");
      await router.invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not rename view");
    },
  });

  const { mutate: makeViewDefault } = useMutation({
    mutationFn: async () => {
      if (!workspace.activeView) return;
      return await saveCrmViewFn({
        data: {
          id: workspace.activeView.id,
          objectKey: workspace.object.key,
          name: workspace.activeView.name,
          type: workspace.activeView.type,
          visibility: workspace.activeView.visibility,
          config: workspace.activeView.config || { type: workspace.activeView.type },
          isDefault: true,
        },
      });
    },
    onSuccess: async () => {
      toast.success("View set as default");
      await router.invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not set default view");
    },
  });

  const { mutate: toggleFavorite } = useMutation({
    mutationFn: async () => {
      if (!workspace.activeView) return;
      return await toggleCrmViewFavoriteFn({
        data: {
          viewId: workspace.activeView.id,
        },
      });
    },
    onSuccess: async () => {
      toast.success("Favorite status updated");
      await router.invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not toggle favorite");
    },
  });

  const { mutate: deleteView } = useMutation({
    mutationFn: async () => {
      if (!workspace.activeView) return;
      return await deleteCrmViewFn({
        data: {
          id: workspace.activeView.id,
        },
      });
    },
    onSuccess: async () => {
      toast.success("View deleted");
      const nextView = (workspace.views || []).find(
        (v: { id: string }) => v.id !== workspace.activeView?.id,
      );
      onViewChange?.(nextView?.id || null);
      await router.invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not delete view");
    },
  });

  const { mutate: createView, isPending: isCreatingView } = useMutation({
    mutationFn: async () => {
      return await saveCrmViewFn({
        data: {
          objectKey: workspace.object.key,
          name: createName.trim(),
          type: createType,
          visibility: "workspace",
          config: { type: createType },
          isDefault: false,
        },
      });
    },
    onSuccess: async (created) => {
      toast.success("Custom view created");
      setCreateName("");
      onViewChange?.((created as { id: string }).id);
      await router.invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not create view");
    },
  });

  const { mutate: updateViewConfig } = useMutation({
    mutationFn: async (updatedConfig: unknown) => {
      if (!workspace.activeView) return;
      return await saveCrmViewFn({
        data: {
          id: workspace.activeView.id,
          objectKey: workspace.object.key,
          name: workspace.activeView.name,
          type: workspace.activeView.type,
          visibility: workspace.activeView.visibility,
          config: updatedConfig,
          isDefault: workspace.activeView.isDefault,
        },
      });
    },
    onSuccess: async () => {
      toast.success("Columns layout updated");
      await router.invalidate();
    },
  });

  const handleToggleColumn = (fieldKey: string) => {
    if (!workspace.activeView) return;
    const currentColumns = workspace.activeView.config?.columns || [];
    let updatedColumns = [...currentColumns];

    if (updatedColumns.length === 0) {
      updatedColumns = (workspace.fields || []).map((f) => ({
        fieldKey: f.key,
        visible: true,
      }));
    }

    const index = updatedColumns.findIndex((col) => col.fieldKey === fieldKey);
    if (index >= 0) {
      const col = updatedColumns[index];
      updatedColumns[index] = {
        ...col,
        visible: !col.visible,
      };
    } else {
      updatedColumns.push({
        fieldKey,
        visible: false,
      });
    }

    updateViewConfig({
      ...workspace.activeView.config,
      columns: updatedColumns,
    });
  };

  const activeColumnsMap = new Map(
    (workspace.activeView?.config?.columns || []).map((col) => [col.fieldKey, col.visible]),
  );

  return (
    <AdminPage>
      <AdminPageHeader
        title={workspace.object.labelPlural || "CRM"}
        description={workspace.object.description || undefined}
        badge={
          <Button render={<Link to="/crm" />} variant="ghost" size="icon" aria-label="Back to CRM">
            <CaretLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="animate-pulse gap-1" variant="secondary">
              <ViewIcon type={viewType} />
              {formatLabel(viewType)}
            </Badge>
            <Button type="button" variant="default">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New {workspace.object.labelSingular || "Record"}
            </Button>
          </div>
        }
      />

      <div
        className={cn(
          "grid gap-4",
          previewId ? "xl:grid-cols-[minmax(0,1fr)_26rem]" : "grid-cols-1",
        )}
      >
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {(workspace.views || []).map((view: { id: string; type: string; name: string }) => (
              <Button
                className="gap-2"
                key={view.id}
                onClick={() => onViewChange?.(view.id)}
                type="button"
                variant={workspace.activeView?.id === view.id ? "default" : "outline"}
              >
                <ViewIcon type={view.type} />
                {view.name}
              </Button>
            ))}

            {workspace.activeView ? (
              <Popover>
                <PopoverTrigger
                  render={<Button variant="outline" size="icon" aria-label="View Settings" />}
                >
                  <Settings className="size-4" />
                </PopoverTrigger>
                <PopoverContent align="start" className="flex w-80 flex-col gap-3 p-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      Rename View
                    </span>
                    <div className="flex gap-2">
                      <Input
                        value={newViewName}
                        onChange={(e) => setNewViewName(e.target.value)}
                        placeholder="View name..."
                        className="text-xs"
                      />
                      <Button
                        size="sm"
                        disabled={!newViewName.trim() || isSavingView}
                        onClick={() => renameView()}
                      >
                        Rename
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium">Default view for this object</span>
                    <input
                      type="checkbox"
                      checked={workspace.activeView.isDefault}
                      disabled={workspace.activeView.isDefault || isSavingView}
                      onChange={() => makeViewDefault()}
                      className="rounded border"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium">Favorite view</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => toggleFavorite()}
                    >
                      <Star
                        className={cn(
                          "size-3.5",
                          workspace.activeView.isFavorite && "fill-yellow-400 text-yellow-400",
                        )}
                      />
                      {workspace.activeView.isFavorite ? "Favorited" : "Favorite"}
                    </Button>
                  </div>

                  <Separator />
                  <div className="flex justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive/20 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteView()}
                    >
                      <Trash className="mr-1 size-3.5" />
                      Delete View
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : null}

            <Popover>
              <PopoverTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
                <Plus className="size-4" />
                New View
              </PopoverTrigger>
              <PopoverContent align="start" className="flex w-80 flex-col gap-3 p-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Create Custom View
                  </span>
                  <Input
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="E.g. High Priority Deals..."
                    className="text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    View Type
                  </span>
                  <select
                    value={createType}
                    onChange={(e) =>
                      setCreateType(e.target.value as "table" | "kanban" | "calendar")
                    }
                    className="rounded border bg-background p-1.5 text-xs"
                  >
                    <option value="table">Table (Grid)</option>
                    <option value="kanban">Kanban (Pipeline)</option>
                    <option value="calendar">Calendar (Date-based)</option>
                  </select>
                </div>
                <Button
                  size="sm"
                  disabled={!createName.trim() || isCreatingView}
                  onClick={() => createView()}
                >
                  Create View
                </Button>
              </PopoverContent>
            </Popover>

            {workspace.activeView?.type === "table" || !workspace.activeView?.type ? (
              <Popover>
                <PopoverTrigger render={<Button type="button" variant="ghost" />}>
                  <Columns className="mr-2 size-4" />
                  Fields
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="flex max-h-80 w-64 flex-col gap-2 overflow-y-auto p-3"
                >
                  <p className="border-b pb-1 text-xs font-semibold text-muted-foreground uppercase">
                    Toggle Columns
                  </p>
                  {(workspace.fields || []).map((field) => {
                    const isVisible = activeColumnsMap.get(field.key) !== false;
                    return (
                      <label
                        key={field.key}
                        className="flex cursor-pointer items-center gap-2 rounded p-1 text-xs font-medium hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => handleToggleColumn(field.key)}
                          className="rounded border"
                        />
                        {field.label || formatLabel(field.key)}
                      </label>
                    );
                  })}
                </PopoverContent>
              </Popover>
            ) : null}
          </div>

          {viewType === "kanban" ? (
            <KanbanView groups={workspace.recordGroups || []} onPreviewChange={onPreviewChange} />
          ) : viewType === "calendar" ? (
            <CalendarView
              records={workspace.records || []}
              workspace={workspace}
              onPreviewChange={onPreviewChange}
            />
          ) : (
            <DataTable
              columns={columns}
              data={workspace.records || []}
              filterColumn={workspace.object.primaryLabelFieldKey || "name"}
              filterPlaceholder={`Search ${workspace.object.labelPlural?.toLowerCase() || "records"}...`}
              onRowClick={(record) =>
                onPreviewChange(typeof record.id === "string" ? record.id : null)
              }
            />
          )}
        </div>

        {previewId ? (
          <aside
            className="min-w-0"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-title"
          >
            <div className="sticky top-4 rounded-md border bg-card">
              <div className="flex flex-row items-start justify-between gap-3 p-4">
                <div>
                  <h2 id="preview-title" className="text-base font-semibold">
                    Preview
                  </h2>
                  <p className="text-sm text-muted-foreground">Record workspace</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Close preview"
                  onClick={() => onPreviewChange(null)}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <div className="p-4 pt-0">
                {previewWorkspace ? (
                  <CrmRecordWorkspace compact workspace={previewWorkspace} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Record preview could not be loaded.
                  </p>
                )}
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </AdminPage>
  );
}
