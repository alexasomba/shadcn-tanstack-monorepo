import {
  CalendarBlank,
  CheckSquare,
  ClockCounterClockwise,
  File,
  GitBranch,
  Note,
  ShoppingBag,
  UsersThree,
} from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
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
import { Separator } from "@workspace/ui/components/separator";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

import {
  saveRecordCrmNoteFn,
  saveCrmTaskFn,
  assignCrmContactsToCompanyFn,
  unassignCrmContactFromCompanyFn,
} from "../../lib/crm.functions";

type CrmField = {
  key: string;
  label?: string | null;
};

type CrmContact = {
  id: string;
  name?: string | null;
  email?: string | null;
};

type CrmTask = {
  id: string;
  status: string;
  title: string;
  body?: string | null;
  priority?: string | null;
};

type CrmWorkspace = {
  record?: Record<string, unknown> & {
    id?: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    title?: string | null;
    subject?: string | null;
    guestAccessToken?: string | null;
    companyName?: string | null;
    companyRecord?: { name?: string | null } | null;
    company?: { name?: string | null } | null;
    contact?: { email?: string | null; firstName?: string | null; lastName?: string | null } | null;
    customer?: { name?: string | null; email?: string | null } | null;
    customerId?: string | null;
    order?: { orderNumber?: string | null } | null;
    orderId?: string | null;
    primaryContact?: { email?: string | null } | null;
    contacts?: Array<CrmContact>;
    primaryContactId?: string | null;
  };
  fields?: Array<CrmField>;
  layout?: {
    config?: {
      keyFieldKeys?: Array<string>;
    };
  };
  object?: {
    key: string;
    primaryLabelFieldKey?: string;
    labelSingular?: string | null;
    labelPlural?: string | null;
  };
  availableContacts?: Array<CrmContact>;
  tasks?: Array<CrmTask>;
  timeline?: Array<{
    id: string;
    type: string;
    title: string;
    status?: string | null;
    body?: string | null;
    createdAt?: string | Date | null;
    creatorName?: string | null;
    description?: string | null;
    occurredAt?: string | Date | null;
    actor?: string | null;
  }>;
};

type CrmRecordWorkspaceProps = {
  workspace: unknown;
  compact?: boolean;
};

function formatLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

interface CrmRecordLike {
  id?: string;
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
}

function getRecordValue(record: Record<string, unknown>, fieldKey: string) {
  if (fieldKey in record) return record[fieldKey];
  const r = record as Record<string, unknown> & CrmRecordLike;
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
  return null;
}

function formatValue(value: unknown) {
  if (value == null || value === "") return "-";
  if (Object.prototype.toString.call(value) === "[object Date]")
    return (value as Date).toLocaleString();
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Date(value).toLocaleString();
  }
  if (typeof value === "object") return "Linked record";
  if (typeof value === "symbol") return value.description || "Symbol";
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : "";
}

function getRecordTitle(workspace: CrmWorkspace) {
  const record = workspace.record || {};
  const fieldKey = workspace.object?.primaryLabelFieldKey || "name";
  return (
    formatValue(getRecordValue(record, fieldKey)) ||
    record.title ||
    record.subject ||
    record.email ||
    record.id
  );
}

function getKeyFields(workspace: CrmWorkspace) {
  const config = workspace.layout?.config || {};
  const keys = Array.isArray(config.keyFieldKeys) ? config.keyFieldKeys : [];
  const fallback = (workspace.fields || []).slice(0, 6).map((field: CrmField) => field.key);
  return (keys.length ? keys : fallback)
    .map((fieldKey: string) => {
      const field = (workspace.fields || []).find((entry: CrmField) => entry.key === fieldKey);
      const value = getRecordValue(workspace.record || {}, fieldKey);
      if (!field && (value == null || value === "")) return null;
      return {
        key: fieldKey,
        label: field?.label || formatLabel(fieldKey),
        value,
      };
    })
    .filter((item): item is { key: string; label: string; value: unknown } => item !== null);
}

function getTimelineIcon(type: string) {
  if (type === "task") return CheckSquare;
  if (type === "note") return Note;
  if (type === "workflow") return GitBranch;
  if (type === "order") return ShoppingBag;
  return ClockCounterClockwise;
}

export function CrmRecordWorkspace({
  compact = false,
  workspace: rawWorkspace,
}: CrmRecordWorkspaceProps) {
  const workspace = rawWorkspace as CrmWorkspace;
  const router = useRouter();
  const record = workspace.record || {};
  const keyFields = getKeyFields(workspace);
  const timeline = workspace.timeline || [];
  const objectKey = workspace.object?.key;

  const canWriteCrm = true as boolean;

  const [noteText, setNoteText] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskBody, setTaskBody] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");

  const [contactToAssign, setContactToAssign] = useState("none");

  const { mutate: saveNote, isPending: isSavingNote } = useMutation({
    mutationFn: async () => {
      return await saveRecordCrmNoteFn({
        data: {
          objectKey,
          recordId: record.id || "",
          body: noteText.trim(),
        },
      });
    },
    onSuccess: async () => {
      toast.success("Note added to timeline");
      setNoteText("");
      await router.invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not save note");
    },
  });

  const { mutate: saveTask, isPending: isSavingTask } = useMutation({
    mutationFn: async () => {
      return await saveCrmTaskFn({
        data: {
          relatedObjectKey: objectKey || "",
          relatedRecordId: record.id || "",
          title: taskTitle.trim(),
          body: taskBody.trim() || null,
          priority: taskPriority,
          status: "todo",
        },
      });
    },
    onSuccess: async () => {
      toast.success("Task created successfully");
      setTaskTitle("");
      setTaskBody("");
      setTaskPriority("medium");
      await router.invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not create task");
    },
  });

  const { mutate: toggleTaskStatus, isPending: isUpdatingTask } = useMutation({
    mutationFn: async (task: CrmTask) => {
      const nextStatus = task.status === "done" ? "todo" : "done";
      return await saveCrmTaskFn({
        data: {
          id: task.id,
          relatedObjectKey: objectKey || "",
          relatedRecordId: record.id || "",
          title: task.title,
          body: task.body || null,
          priority: task.priority || "medium",
          status: nextStatus,
        },
      });
    },
    onSuccess: async () => {
      toast.success("Task status updated");
      await router.invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not update task status");
    },
  });

  const { mutate: assignContact, isPending: isAssigningContact } = useMutation({
    mutationFn: async (contactId: string) => {
      return await assignCrmContactsToCompanyFn({
        data: {
          companyId: record.id || "",
          contactIds: [contactId],
        },
      });
    },
    onSuccess: async () => {
      toast.success("Contact assigned successfully");
      setContactToAssign("none");
      await router.invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not assign contact");
    },
  });

  const { mutate: makePrimaryContact, isPending: isSettingPrimary } = useMutation({
    mutationFn: async (contactId: string) => {
      return await assignCrmContactsToCompanyFn({
        data: {
          companyId: record.id || "",
          contactIds: [contactId],
          primaryContactId: contactId,
        },
      });
    },
    onSuccess: async () => {
      toast.success("Primary contact set");
      await router.invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not set primary contact");
    },
  });

  const { mutate: unassignContact, isPending: isUnassigningContact } = useMutation({
    mutationFn: async (contactId: string) => {
      return await unassignCrmContactFromCompanyFn({
        data: {
          contactId,
        },
      });
    },
    onSuccess: async () => {
      toast.success("Contact unassigned");
      await router.invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not unassign contact");
    },
  });

  return (
    <div className={cn("flex flex-col gap-4", compact && "text-sm")}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="animate-pulse text-xs font-medium tracking-normal text-muted-foreground uppercase">
              {workspace.object?.labelSingular || "Record"}
            </p>
            <h2 className={cn("truncate font-semibold", compact ? "text-lg" : "text-2xl")}>
              {getRecordTitle(workspace)}
            </h2>
          </div>
          {objectKey && record.id ? (
            <Button
              render={
                objectKey === "contacts" ? (
                  <Link to="/crm/contacts/$id" params={{ id: record.id }} />
                ) : objectKey === "deals" ? (
                  <Link to="/crm/deals/$id" params={{ id: record.id }} />
                ) : (
                  <Link to="/crm/companies/$companyId" params={{ companyId: record.id }} />
                )
              }
              size="sm"
              variant="outline"
            >
              Open
            </Button>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {keyFields.map((field: { key: string; label: string; value: unknown }) => (
            <div className="rounded-md border bg-background p-3" key={field.key}>
              <p className="text-xs text-muted-foreground">{field.label}</p>
              <p className="truncate font-medium">{formatValue(field.value)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={cn("grid gap-4", compact ? "grid-cols-1" : "lg:grid-cols-[1fr_18rem]")}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
            <CardDescription>
              Notes, tasks, orders, workflow events, and audit activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {canWriteCrm ? (
              <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3">
                <Textarea
                  placeholder="Type an internal operations note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="min-h-[60px] bg-background"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={isSavingNote || !noteText.trim()}
                    onClick={() => saveNote()}
                  >
                    {isSavingNote ? "Saving..." : "Save Note"}
                  </Button>
                </div>
              </div>
            ) : null}

            {timeline.length ? (
              timeline.map((entry) => {
                const Icon = getTimelineIcon(entry.type);
                return (
                  <div className="flex gap-3" key={entry.id}>
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{entry.title}</p>
                        {entry.status ? (
                          <Badge variant="secondary">{formatLabel(entry.status)}</Badge>
                        ) : null}
                      </div>
                      {entry.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
                      ) : null}
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        {entry.occurredAt
                          ? new Date(entry.occurredAt).toLocaleString()
                          : "No timestamp"}
                        {entry.actor ? ` · ${entry.actor}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                No activity has been recorded for this record yet.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          {objectKey === "companies" ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UsersThree className="size-4" />
                  Contacts
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {canWriteCrm && (workspace.availableContacts || []).length > 0 ? (
                  <div className="flex flex-col gap-2 rounded-md border bg-muted/20 p-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      Assign Contact
                    </p>
                    <div className="flex gap-2">
                      <select
                        value={contactToAssign}
                        onChange={(e) => setContactToAssign(e.target.value)}
                        className="flex-1 rounded border bg-background px-2 py-1 text-xs"
                      >
                        <option value="none">Select contact...</option>
                        {(workspace.availableContacts || []).map((c: CrmContact) => (
                          <option key={c.id} value={c.id}>
                            {c.name || c.email}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        disabled={contactToAssign === "none" || isAssigningContact}
                        onClick={() => assignContact(contactToAssign)}
                      >
                        Assign
                      </Button>
                    </div>
                  </div>
                ) : null}

                {(record.contacts || []).length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {(record.contacts || []).map((contact: CrmContact) => {
                      const isPrimary = record.primaryContactId === contact.id;
                      return (
                        <div
                          key={contact.id}
                          className="flex flex-col gap-1.5 rounded-md border bg-background p-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate font-medium">
                              {contact.name || contact.email}
                            </span>
                            {isPrimary ? (
                              <Badge variant="default" className="px-1 py-0 text-[10px]">
                                Primary
                              </Badge>
                            ) : null}
                          </div>
                          {canWriteCrm ? (
                            <div className="flex justify-end gap-1.5">
                              {!isPrimary ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isSettingPrimary}
                                  onClick={() => makePrimaryContact(contact.id)}
                                >
                                  Make primary
                                </Button>
                              ) : null}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-[11px] text-destructive hover:text-destructive"
                                disabled={isUnassigningContact}
                                onClick={() => unassignContact(contact.id)}
                              >
                                Remove
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No contacts assigned.</p>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckSquare className="size-4" />
                Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {canWriteCrm ? (
                <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-2.5">
                  <Input
                    placeholder="Task title..."
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="bg-background text-xs"
                  />
                  <Textarea
                    placeholder="Task details (optional)..."
                    value={taskBody}
                    onChange={(e) => setTaskBody(e.target.value)}
                    className="min-h-[50px] bg-background text-xs"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">Priority:</span>
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value as typeof taskPriority)}
                        className="rounded border bg-background px-1.5 py-0.5 text-[11px]"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <Button
                      size="sm"
                      disabled={isSavingTask || !taskTitle.trim()}
                      onClick={() => saveTask()}
                    >
                      {isSavingTask ? "Adding..." : "Add"}
                    </Button>
                  </div>
                </div>
              ) : null}

              {(workspace.tasks || []).length ? (
                (workspace.tasks || []).map((task: CrmTask) => (
                  <div
                    className="flex flex-col gap-1 rounded-md border bg-background p-2.5 text-xs"
                    key={task.id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "font-medium",
                          task.status === "done" && "text-muted-foreground line-through",
                        )}
                      >
                        {task.title}
                      </p>
                      {canWriteCrm ? (
                        <button
                          type="button"
                          disabled={isUpdatingTask}
                          onClick={() => toggleTaskStatus(task)}
                          className="text-[10px] font-semibold text-primary hover:underline"
                        >
                          {task.status === "done" ? "Todo" : "Done"}
                        </button>
                      ) : null}
                    </div>
                    {task.body ? (
                      <p className="text-[11px] text-muted-foreground">{task.body}</p>
                    ) : null}
                    <div className="mt-1 flex items-center gap-1.5">
                      <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                        {formatLabel(task.priority || "medium")}
                      </Badge>
                      <Badge variant="outline" className="px-1 py-0 text-[10px]">
                        {formatLabel(task.status || "todo")}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No open tasks.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <File className="size-4" />
                Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                File attachments will appear here once R2-backed record files are enabled.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarBlank className="size-4" />
                Context
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Customer</span>
                <span className="truncate font-medium">
                  {String(record.customer?.email || record.customerId || "-")}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Order</span>
                <span className="truncate font-medium">
                  {record.order?.orderNumber || record.orderId || "-"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
