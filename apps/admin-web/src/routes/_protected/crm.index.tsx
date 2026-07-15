import { Handshake, Lifebuoy, Users, Warning } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
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
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";

import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPage,
  AdminPageHeader,
} from "../../components/admin/admin-page";
import { DataTable } from "../../components/data-table/data-table";
import { DataTableColumnHeader } from "../../components/data-table/data-table-column-header";
import { authClient } from "../../lib/auth-client";
import {
  assignCrmContactsToCompanyFn,
  getCrmWorkbenchFn,
  saveCrmCompanyFn,
  updateCrmTicketFn,
  unassignCrmContactFromCompanyFn,
} from "../../lib/crm.functions";

const crmSearchSchema = z.object({
  view: z.enum(["all", "mine", "unassigned", "urgent", "overdue"]).optional().catch(undefined),
  ticketId: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/crm/")({
  validateSearch: (search) => crmSearchSchema.parse(search),
  loader: async () => await getCrmWorkbenchFn(),
  component: CrmWorkbenchPage,
});

type WorkbenchData = Awaited<ReturnType<typeof getCrmWorkbenchFn>>;
type Contact = WorkbenchData["contacts"][number];
type SupportQueueItem = WorkbenchData["supportQueue"][number];
type QueueView = "all" | "mine" | "unassigned" | "urgent" | "overdue";

const contactColumns: Array<ColumnDef<Contact>> = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Contact" />,
    cell: ({ row }) => {
      const contact = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium">
            {contact.firstName || contact.lastName
              ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
              : contact.email}
          </span>
          <span className="text-xs text-muted-foreground">{contact.email}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "lifecycle",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Lifecycle" />,
    cell: ({ row }) => {
      return <Badge variant="secondary">{String(row.getValue("lifecycle") || "Lead")}</Badge>;
    },
  },
  {
    accessorKey: "orderCount",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Orders" />,
    cell: ({ row }) => <span>{String(row.getValue("orderCount") || "0")}</span>,
  },
  {
    accessorKey: "totalSpend",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total Spend" />,
    cell: ({ row }) => {
      const spend = Number(row.getValue("totalSpend") || 0);
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 0,
      }).format(spend / 100);
    },
  },
];

const supportQueueColumns = (props: {
  canWriteCrm: boolean;
  currentUserId?: string | null;
  isUpdatingTicket: boolean;
  updateTicket: (input: {
    id: string;
    status?: "open" | "pending" | "resolved" | "closed";
    assignedTo?: string | null;
  }) => void;
}): Array<ColumnDef<SupportQueueItem>> => [
  {
    accessorKey: "subject",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ticket" />,
    cell: ({ row }) => {
      const ticket = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{ticket.subject}</span>
          <span className="text-xs text-muted-foreground">
            {ticket.contactName || "Unknown contact"}
            {ticket.contactEmail ? ` · ${ticket.contactEmail}` : ""}
          </span>
        </div>
      );
    },
  },
  {
    id: "account",
    accessorFn: (row) => row.companyName || row.customerName || "",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Account" />,
    cell: ({ row }) => {
      const ticket = row.original;
      return (
        <div className="flex flex-col">
          <span>{ticket.companyName || "No company"}</span>
          <span className="text-xs text-muted-foreground">
            {ticket.customerName || "No customer profile"}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "priority",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
    cell: ({ row }) => {
      const ticket = row.original;
      const priority = String(row.getValue("priority") || "medium");
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className="capitalize">{priority}</span>
          {ticket.isOverdue ? (
            <Badge variant="outline" className="border-amber-500/40 text-amber-500">
              Overdue
            </Badge>
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <Badge variant="secondary">{String(row.getValue("status") || "open")}</Badge>
    ),
  },
  {
    id: "owner",
    accessorFn: (row) => row.assignedName || "",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Owner" />,
    cell: ({ row }) => <span>{row.original.assignedName || "Unassigned"}</span>,
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
    cell: ({ row }) => {
      const ticket = row.original;
      const date = row.getValue("updatedAt") || ticket.createdAt;
      return (
        <div className="flex flex-col font-mono text-xs">
          <span>{new Date(date as string | number | Date).toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">{ticket.ageHours}h old</span>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const ticket = row.original;
      const isOwnedByCurrentUser =
        !!props.currentUserId && ticket.assignedTo === props.currentUserId;

      return (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!props.canWriteCrm || props.isUpdatingTicket || isOwnedByCurrentUser}
            onClick={() =>
              props.updateTicket({
                id: ticket.id,
                assignedTo: props.currentUserId || null,
              })
            }
          >
            {isOwnedByCurrentUser ? "Assigned to you" : "Assign to me"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!props.canWriteCrm || props.isUpdatingTicket}
            onClick={() =>
              props.updateTicket({
                id: ticket.id,
                status: ticket.status === "resolved" ? "open" : "resolved",
              })
            }
          >
            {ticket.status === "resolved" ? "Reopen" : "Resolve"}
          </Button>
        </div>
      );
    },
  },
];

function SupportTicketDetail(props: {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  ticket: any;
  canWriteCrm: boolean;
  currentUserId?: string | null;
  isUpdatingTicket: boolean;
  updateTicket: (input: {
    id: string;
    status?: "open" | "pending" | "resolved" | "closed";
    assignedTo?: string | null;
  }) => void;
}) {
  const { ticket, canWriteCrm, currentUserId, isUpdatingTicket, updateTicket } = props;

  if (!ticket) {
    return (
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Ticket Detail</CardTitle>
          <CardDescription>Select a ticket from the support queue to inspect it.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isOwnedByCurrentUser = !!currentUserId && ticket.assignedTo === currentUserId;

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{ticket.subject}</CardTitle>
            <CardDescription>
              {ticket.contactName || "Unknown contact"}
              {ticket.contactEmail ? ` · ${ticket.contactEmail}` : ""}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant="secondary">{ticket.status || "open"}</Badge>
            <Badge variant="outline" className="capitalize">
              {ticket.priority || "medium"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs text-muted-foreground">Company</div>
            <div className="font-medium">{ticket.companyName || "No linked company"}</div>
            {ticket.companyId ? (
              <Link
                to="/crm/companies/$companyId"
                params={{ companyId: ticket.companyId }}
                className="text-xs text-primary underline-offset-4 hover:underline"
              >
                Open company workspace
              </Link>
            ) : null}
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Customer</div>
            <div className="font-medium">{ticket.customerName || "No customer profile"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Owner</div>
            <div className="font-medium">{ticket.assignedName || "Unassigned"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Last Updated</div>
            <div className="font-mono text-xs font-medium">
              {new Date(ticket.updatedAt || ticket.createdAt || "").toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!canWriteCrm || isUpdatingTicket || isOwnedByCurrentUser}
            onClick={() => updateTicket({ id: ticket.id, assignedTo: currentUserId || null })}
          >
            {isOwnedByCurrentUser ? "Assigned to you" : "Assign to me"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!canWriteCrm || isUpdatingTicket}
            onClick={() =>
              updateTicket({
                id: ticket.id,
                status: ticket.status === "resolved" ? "open" : "resolved",
              })
            }
          >
            {ticket.status === "resolved" ? "Reopen ticket" : "Resolve ticket"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!canWriteCrm || isUpdatingTicket}
            onClick={() => updateTicket({ id: ticket.id, status: "pending" })}
          >
            Mark pending
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CrmWorkbenchPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const {
    contacts,
    deals,
    companies,
    tickets,
    invoices,
    quotes,
    transactions,
    segments,
    supportQueue,
  } = Route.useLoaderData();
  const canWriteCrm = !!session;
  const currentUserId = session?.user.id || null;

  const search = Route.useSearch();
  const queueView = search.view || "all";

  const setQueueView = React.useCallback(
    (view: QueueView) => {
      void router.navigate({
        to: ".",
        search: (prev: Record<string, unknown>) => ({ ...prev, view, ticketId: undefined }),
      });
    },
    [router],
  );

  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string>(
    companies[0]?.id || "new",
  );
  const selectedCompany =
    selectedCompanyId !== "new"
      ? companies.find((company) => company.id === selectedCompanyId) || null
      : null;
  const [companyForm, setCompanyForm] = React.useState({
    id: "",
    name: "",
    website: "",
    industry: "",
    primaryContactId: "none",
  });
  const [contactToAssign, setContactToAssign] = React.useState<string>("none");
  const [prevSelectedCompanyId, setPrevSelectedCompanyId] = React.useState<string | null>(null);

  if (selectedCompanyId !== prevSelectedCompanyId) {
    setPrevSelectedCompanyId(selectedCompanyId);
    setCompanyForm({
      id: selectedCompany?.id || "",
      name: selectedCompany?.name || "",
      website: selectedCompany?.website || "",
      industry: selectedCompany?.industry || "",
      primaryContactId: selectedCompany?.primaryContactId || "none",
    });
  }

  const invalidateCrm = async () => {
    await router.invalidate();
  };

  const { mutate: saveCompany, isPending: isSavingCompany } = useMutation({
    mutationFn: async () => {
      return await saveCrmCompanyFn({
        data: {
          id: companyForm.id || undefined,
          name: companyForm.name.trim(),
          website: companyForm.website.trim() || null,
          industry: companyForm.industry.trim() || null,
          primaryContactId:
            companyForm.primaryContactId && companyForm.primaryContactId !== "none"
              ? companyForm.primaryContactId
              : null,
        },
      });
    },
    onSuccess: async (company) => {
      toast.success(companyForm.id ? "Company updated" : "Company created");
      setSelectedCompanyId((company as { id?: string }).id || "new");
      await invalidateCrm();
    },
    onError: (error) => {
      toast.error(error.message || "Could not save company");
    },
  });

  const { mutate: assignContacts, isPending: isAssigningContacts } = useMutation({
    mutationFn: async (payload: {
      contactIds: Array<string>;
      primaryContactId?: string | null;
    }) => {
      return await assignCrmContactsToCompanyFn({
        data: {
          companyId: selectedCompanyId,
          contactIds: payload.contactIds,
          primaryContactId: payload.primaryContactId,
        },
      });
    },
    onSuccess: async () => {
      toast.success("Contact assigned to company");
      setContactToAssign("none");
      await invalidateCrm();
    },
    onError: (error) => {
      toast.error(error.message || "Could not assign contact");
    },
  });

  const { mutate: unassignContact, isPending: isUnassigningContact } = useMutation({
    mutationFn: async (contactId: string) => {
      return await unassignCrmContactFromCompanyFn({ data: { contactId } });
    },
    onSuccess: async () => {
      toast.success("Contact removed from company");
      await invalidateCrm();
    },
    onError: (error) => {
      toast.error(error.message || "Could not remove contact");
    },
  });

  const { mutate: updateTicket, isPending: isUpdatingTicket } = useMutation({
    mutationFn: async (input: {
      id: string;
      status?: "open" | "pending" | "resolved" | "closed";
      assignedTo?: string | null;
    }) => {
      return await updateCrmTicketFn({ data: input });
    },
    onSuccess: async () => {
      toast.success("Ticket updated");
      await invalidateCrm();
    },
    onError: (error) => {
      toast.error(error.message || "Could not update ticket");
    },
  });

  const availableContacts = contacts.filter(
    (contact) => !contact.companyId || contact.companyId === selectedCompanyId,
  );
  const assignedContacts = contacts.filter((contact) => contact.companyId === selectedCompanyId);
  const visibleSupportQueue = supportQueue.filter((ticket) => {
    if (queueView === "mine") return !!currentUserId && ticket.assignedTo === currentUserId;
    if (queueView === "unassigned") return !ticket.assignedTo;
    if (queueView === "urgent") return ticket.priority === "urgent";
    if (queueView === "overdue") return !!ticket.isOverdue;
    return true;
  });

  const selectedSupportTicketId = search.ticketId || visibleSupportQueue[0]?.id || null;

  const setSelectedSupportTicketId = React.useCallback(
    (ticketId: string | null) => {
      void router.navigate({
        to: ".",
        search: (prev: Record<string, unknown>) => ({ ...prev, ticketId: ticketId || undefined }),
      });
    },
    [router],
  );

  const openSupportTickets = supportQueue.filter(
    (ticket) => !["resolved", "closed"].includes(ticket.status || "open"),
  );
  const overdueSupportTickets = openSupportTickets.filter((ticket) => ticket.isOverdue);
  const unassignedSupportTickets = openSupportTickets.filter((ticket) => !ticket.assignedTo);
  const averageTicketAgeHours =
    openSupportTickets.length > 0
      ? Math.round(
          openSupportTickets.reduce((sum, ticket) => sum + (ticket.ageHours || 0), 0) /
            openSupportTickets.length,
        )
      : 0;
  const ownerLoadMap = new Map<string, number>();
  for (const ticket of supportQueue) {
    const key = ticket.assignedName || "Unassigned";
    ownerLoadMap.set(key, (ownerLoadMap.get(key) || 0) + 1);
  }
  const ownerLoad = Array.from(ownerLoadMap)
    .map(([owner, count]) => ({ owner, count }))
    .sort((left, right) => right.count - left.count);
  const priorityAging = ["urgent", "high", "medium", "low"].map((priority) => {
    const items = openSupportTickets.filter((ticket) => ticket.priority === priority);
    const averageAge =
      items.length > 0
        ? Math.round(items.reduce((sum, ticket) => sum + (ticket.ageHours || 0), 0) / items.length)
        : 0;

    return {
      priority,
      count: items.length,
      averageAge,
    };
  });
  const selectedSupportTicket =
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    visibleSupportQueue.find((ticket) => ticket.id === selectedSupportTicketId) ??
    visibleSupportQueue[0] ??
    null;

  return (
    <AdminPage>
      <AdminPageHeader
        title="CRM Workbench"
        description="Unified contact intelligence, lifecycle visibility, and sales pipeline context."
      />

      <div className="grid animate-in gap-4 duration-300 fade-in md:grid-cols-4">
        <AdminMetricCard title="Contacts" value={String(contacts.length)} />
        <AdminMetricCard
          title="Customers"
          value={String(contacts.filter((contact) => contact.lifecycle !== "Lead").length)}
        />
        <AdminMetricCard
          title="Open Deals"
          value={String(deals.filter((deal) => !String(deal.stage).startsWith("closed")).length)}
        />
        <AdminMetricCard title="Segments" value={String(segments.length)} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard title="Companies" value={String(companies.length)} />
        <AdminMetricCard
          title="Open Tickets"
          value={String(tickets.filter((ticket) => ticket.status !== "closed").length)}
        />
        <AdminMetricCard
          title="Urgent Tickets"
          value={String(tickets.filter((ticket) => ticket.priority === "urgent").length)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard
          title="Paid Invoices"
          value={new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            minimumFractionDigits: 0,
          }).format(
            invoices
              .filter((i) => i.status === "paid")
              .reduce((sum, i) => sum + Number(i.amountTotal || 0), 0) / 100,
          )}
        />
        <AdminMetricCard
          title="Accepted Quotes"
          value={new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            minimumFractionDigits: 0,
          }).format(
            quotes
              .filter((q) => q.status === "accepted" || q.status === "signed")
              .reduce((sum, q) => sum + Number(q.value || 0), 0) / 100,
          )}
        />
        <AdminMetricCard
          title="Transaction Vol."
          value={new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            minimumFractionDigits: 0,
          }).format(
            transactions
              .filter((t) => t.status === "completed")
              .reduce((sum, t) => sum + Number(t.amountTotal || 0), 0) / 100,
          )}
        />
        <AdminMetricCard title="Invoices" value={String(invoices.length)} />
      </div>

      <div className="flex items-center gap-4 border-b pb-1">
        <Link
          to="/crm"
          className={cn(
            "border-b-2 border-primary pb-3 text-sm font-medium text-primary transition-colors hover:text-primary",
          )}
        >
          Workbench
        </Link>
        <Link
          to="/crm/$objectKey"
          params={{ objectKey: "invoices" }}
          className={cn(
            "border-b-2 border-transparent pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-primary",
          )}
        >
          Invoices
        </Link>
        <Link
          to="/crm/$objectKey"
          params={{ objectKey: "quotes" }}
          className={cn(
            "border-b-2 border-transparent pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-primary",
          )}
        >
          Quotes
        </Link>
        <Link
          to="/crm/$objectKey"
          params={{ objectKey: "transactions" }}
          className={cn(
            "border-b-2 border-transparent pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-primary",
          )}
        >
          Transactions
        </Link>
        <Link
          to="/crm/$objectKey"
          params={{ objectKey: "contacts" }}
          className={cn(
            "border-b-2 border-transparent pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-primary",
          )}
        >
          Contacts
        </Link>
        <Link
          to="/crm/$objectKey"
          params={{ objectKey: "deals" }}
          className={cn(
            "border-b-2 border-transparent pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-primary",
          )}
        >
          Deals
        </Link>
        <Link
          to="/crm/$objectKey"
          params={{ objectKey: "segments" }}
          className={cn(
            "border-b-2 border-transparent pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-primary",
          )}
        >
          Segments
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Lifecycle contacts</CardTitle>
            <CardDescription>Derived from customer behavior and order history.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={contactColumns}
              data={contacts.slice(0, 12)}
              className="border-none bg-transparent"
            />
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Pipeline snapshot</CardTitle>
            <CardDescription>Deals and dynamic groups in one place.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              {deals.length === 0 ? (
                <AdminEmptyState
                  title="No deals yet"
                  description="Sales pipeline activity will appear here once deals are created."
                  icon={<Handshake className="size-8 text-muted-foreground" />}
                  className="min-h-40 rounded-xl bg-muted/20"
                />
              ) : (
                deals.slice(0, 6).map((deal) => (
                  <Card key={deal.id} className="rounded-lg shadow-none">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{deal.title}</p>
                          <p className="text-xs text-muted-foreground">{deal.contact?.email}</p>
                        </div>
                        <Badge variant="outline">{deal.stage}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <Card className="rounded-lg shadow-none">
              <CardContent className="p-4">
                <p className="mb-3 text-sm font-medium">Saved segments</p>
                <div className="flex flex-wrap gap-2">
                  {segments.length > 0 ? (
                    segments.map((segment: { id: string; name: string }) => (
                      <Badge key={segment.id} variant="secondary">
                        {segment.name}
                      </Badge>
                    ))
                  ) : (
                    <AdminEmptyState
                      title="No saved segments"
                      description="Dynamic customer groups will appear here after segments are saved."
                      className="min-h-32 w-full rounded-xl bg-muted/20"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lifebuoy className="size-5 animate-spin text-primary" />
              Support Queue
            </CardTitle>
            <CardDescription>
              Ticket triage with linked account and latest automation context.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {supportQueue.some((ticket) => ticket.priority === "urgent") ? (
              <Card className="rounded-lg border-amber-500/30 bg-amber-500/5 shadow-none">
                <CardContent className="flex items-start gap-3 p-4 text-sm">
                  <Warning className="mt-0.5 size-5 shrink-0 text-amber-500" />
                  <div>
                    <p className="font-medium text-foreground">
                      {supportQueue.filter((ticket) => ticket.priority === "urgent").length} urgent
                      tickets need attention
                    </p>
                    <p className="text-muted-foreground">
                      Prioritize these before routine CRM follow-up so customer issues do not get
                      buried under campaign and deal activity.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "All" },
                { key: "mine", label: "My Queue" },
                { key: "unassigned", label: "Unassigned" },
                { key: "urgent", label: "Urgent" },
                { key: "overdue", label: "Overdue" },
              ].map((view) => (
                <Button
                  key={view.key}
                  type="button"
                  size="sm"
                  variant={queueView === view.key ? "default" : "outline"}
                  onClick={() => {
                    setQueueView(view.key as QueueView);
                  }}
                >
                  {view.label}
                </Button>
              ))}
            </div>

            <DataTable
              columns={supportQueueColumns({
                canWriteCrm,
                currentUserId,
                isUpdatingTicket,
                updateTicket,
              })}
              data={visibleSupportQueue}
              filterColumn="subject"
              filterPlaceholder="Filter support queue..."
              className="border-none bg-transparent"
              onRowClick={(ticket) => setSelectedSupportTicketId(ticket.id)}
            />
          </CardContent>
        </Card>

        <SupportTicketDetail
          ticket={selectedSupportTicket}
          canWriteCrm={canWriteCrm}
          currentUserId={currentUserId}
          isUpdatingTicket={isUpdatingTicket}
          updateTicket={updateTicket}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Support Metrics</CardTitle>
            <CardDescription>
              Queue health, unassigned load, and aging across active support tickets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminMetricCard title="Overdue" value={String(overdueSupportTickets.length)} />
              <AdminMetricCard title="Unassigned" value={String(unassignedSupportTickets.length)} />
              <AdminMetricCard title="Avg Age" value={`${averageTicketAgeHours}h`} />
              <AdminMetricCard title="Open Queue" value={String(openSupportTickets.length)} />
            </div>

            <Card className="rounded-lg shadow-none">
              <CardContent className="p-4">
                <p className="mb-3 text-sm font-medium">Aging by priority</p>
                <div className="space-y-3">
                  {priorityAging.map((entry) => (
                    <div key={entry.priority} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {entry.priority}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{entry.count} tickets</span>
                      </div>
                      <span className="text-sm font-medium">{entry.averageAge}h avg</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Owner Load</CardTitle>
            <CardDescription>
              Current ticket distribution across support owners and unassigned work.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ownerLoad.length ? (
              ownerLoad.map((entry) => (
                <div
                  key={entry.owner}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{entry.owner}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.owner === "Unassigned"
                        ? "Needs ownership"
                        : "Active support ownership"}
                    </p>
                  </div>
                  <Badge variant={entry.owner === "Unassigned" ? "outline" : "secondary"}>
                    {entry.count}
                  </Badge>
                </div>
              ))
            ) : (
              <AdminEmptyState
                title="No ticket ownership data"
                description="Support ownership counts will appear once tickets have assignees."
                icon={<Lifebuoy className="size-8 text-muted-foreground" />}
                className="min-h-40 rounded-xl bg-muted/20"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Companies</CardTitle>
            <CardDescription>
              Proper account records with primary contacts and member assignment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={selectedCompanyId === "new" ? "default" : "outline"}
                onClick={() => setSelectedCompanyId("new")}
              >
                New company
              </Button>
              {companies.map((company) => (
                <Button
                  key={company.id}
                  type="button"
                  variant={selectedCompanyId === company.id ? "default" : "outline"}
                  onClick={() => setSelectedCompanyId(company.id)}
                >
                  {company.name}
                </Button>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                placeholder="Company name"
                value={companyForm.name}
                disabled={!canWriteCrm}
                onChange={(event) =>
                  setCompanyForm((current) => ({ ...current, name: event.target.value }))
                }
              />
              <Input
                placeholder="Website"
                value={companyForm.website}
                disabled={!canWriteCrm}
                onChange={(event) =>
                  setCompanyForm((current) => ({ ...current, website: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                placeholder="Industry"
                value={companyForm.industry}
                disabled={!canWriteCrm}
                onChange={(event) =>
                  setCompanyForm((current) => ({ ...current, industry: event.target.value }))
                }
              />
              <Select
                value={companyForm.primaryContactId}
                onValueChange={(value) =>
                  setCompanyForm((current) => ({
                    ...current,
                    primaryContactId: value || "none",
                  }))
                }
              >
                <SelectTrigger disabled={!canWriteCrm} className="w-full">
                  <SelectValue placeholder="Primary contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No primary contact</SelectItem>
                  {availableContacts.map(
                    (contact: {
                      id: string;
                      firstName?: string | null;
                      lastName?: string | null;
                      email?: string | null;
                    }) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.firstName || contact.lastName
                          ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                          : contact.email}{" "}
                        ({contact.email})
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedCompany ? (
              <Card className="rounded-lg shadow-none">
                <CardContent className="p-4 text-sm text-muted-foreground">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">{selectedCompany.name}</p>
                      <p>Website: {selectedCompany.website || "Not set"}</p>
                      <p>Industry: {selectedCompany.industry || "Not set"}</p>
                    </div>
                    <Badge variant="outline">{selectedCompany.contacts.length || 0} contacts</Badge>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {!canWriteCrm ? (
              <Card className="rounded-lg border-border/60 bg-muted/40 shadow-none">
                <CardContent className="p-3 text-sm text-muted-foreground">
                  Read-only role: company creation and assignment actions are disabled.
                </CardContent>
              </Card>
            ) : null}

            <Button
              type="button"
              disabled={isSavingCompany || !companyForm.name.trim() || !canWriteCrm}
              onClick={() => saveCompany()}
            >
              {isSavingCompany ? "Saving..." : companyForm.id ? "Update company" : "Create company"}
            </Button>
            {selectedCompany ? (
              <Button
                render={
                  <Link to="/crm/companies/$companyId" params={{ companyId: selectedCompany.id }} />
                }
                type="button"
                variant="outline"
              >
                Open company workspace
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Company Contacts</CardTitle>
            <CardDescription>
              Assign customer-linked contacts to the selected company and promote one to primary.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCompanyId === "new" ? (
              <p className="text-sm text-muted-foreground">
                Create a company first, then assign contacts to it.
              </p>
            ) : (
              <>
                <div className="flex gap-3">
                  <Select
                    value={contactToAssign}
                    onValueChange={(value) => setContactToAssign(value || "none")}
                  >
                    <SelectTrigger disabled={!canWriteCrm} className="flex-1">
                      <SelectValue placeholder="Choose contact to assign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a contact</SelectItem>
                      {contacts
                        .filter((contact) => contact.companyId !== selectedCompanyId)
                        .map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.firstName || contact.lastName
                              ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                              : contact.email}{" "}
                            ({contact.email})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    disabled={
                      !canWriteCrm ||
                      contactToAssign === "none" ||
                      isAssigningContacts ||
                      selectedCompanyId === "new"
                    }
                    onClick={() =>
                      assignContacts({
                        contactIds: [contactToAssign],
                        primaryContactId:
                          companyForm.primaryContactId && companyForm.primaryContactId !== "none"
                            ? companyForm.primaryContactId
                            : undefined,
                      })
                    }
                  >
                    {isAssigningContacts ? "Assigning..." : "Assign contact"}
                  </Button>
                </div>

                {assignedContacts.length === 0 ? (
                  <AdminEmptyState
                    title="No contacts assigned"
                    description="Assigned contacts for this company will appear here."
                    icon={<Users className="size-8 text-muted-foreground" />}
                    className="min-h-40 rounded-xl bg-muted/20"
                  />
                ) : (
                  <div className="space-y-3">
                    {assignedContacts.map(
                      (contact: {
                        id: string;
                        firstName?: string | null;
                        lastName?: string | null;
                        email?: string | null;
                      }) => (
                        <Card key={contact.id} className="rounded-lg shadow-none">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium">
                                  {contact.firstName || contact.lastName
                                    ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                                    : contact.email}
                                </p>
                                <p className="text-xs text-muted-foreground">{contact.email}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {selectedCompany?.primaryContactId === contact.id ? (
                                  <Badge variant="secondary">Primary</Badge>
                                ) : null}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={!canWriteCrm || isAssigningContacts}
                                  onClick={() => {
                                    setCompanyForm((current) => ({
                                      ...current,
                                      primaryContactId: contact.id,
                                    }));
                                    assignContacts({
                                      contactIds: [contact.id],
                                      primaryContactId: contact.id,
                                    });
                                  }}
                                >
                                  Make primary
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={!canWriteCrm || isUnassigningContact}
                                  onClick={() => unassignContact(contact.id)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ),
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPage>
  );
}
