import { createServerFn } from "@tanstack/react-start";
import { unwrapResult } from "@workspace/result";
import {
  createDatabase,
  logAdminAuditEvent,
  appendCrmRecordActivity,
  assignCrmContactsToCompany,
  getCrmObjectWorkspace,
  getCrmCompanyWorkspace,
  getCrmPlatformShell,
  getCrmRecordWorkspace,
  listCrmCompanies,
  listCrmContacts,
  listCrmDeals,
  listCrmTickets,
  saveCrmCompany,
  deleteCrmView,
  saveCrmRecordField,
  saveCrmTask,
  saveCrmView,
  saveRecordNote,
  toggleCrmViewFavorite,
  unassignCrmContactFromCompany,
  updateCrmTicket,
  updateCrmContactMarketingStatus,
  saveCrmDeal,
  saveCrmTicket,
  getCrmCustomerWorkspace,
  crmObjectKeySchema,
  saveCrmRecordFieldInputSchema,
  saveCrmTaskInputSchema,
  saveCrmViewInputSchema,
  appendCrmRecordActivityInputSchema,
} from "data-ops";
import { z } from "zod";

import { requireAdminMiddleware } from "./auth.middleware";
import { getDatabase, getCloudflareEnv } from "./cloudflare-env";

const crmRecordWorkspaceSchema = z.object({
  objectKey: crmObjectKeySchema,
  recordId: z.string().min(1),
});

const crmObjectWorkspaceSchema = z.object({
  objectKey: crmObjectKeySchema,
  viewId: z.string().optional().nullable(),
  filters: z
    .array(
      z.object({
        fieldKey: z.string(),
        operator: z.string(),
        value: z.unknown().optional(),
      }),
    )
    .optional(),
});

export const getCrmPlatformShellFn = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    const db = createDatabase(getDatabase());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return unwrapResult(await getCrmPlatformShell(db)) as any;
  });

export const getCrmObjectWorkspaceFn = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .validator((data: unknown) => crmObjectWorkspaceSchema.parse(data))
  .handler(async ({ data }) => {
    const db = createDatabase(getDatabase());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return unwrapResult(await getCrmObjectWorkspace(db, data)) as any;
  });

export const getCrmRecordWorkspaceFn = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .validator((data: unknown) => crmRecordWorkspaceSchema.parse(data))
  .handler(async ({ data }) => {
    const db = createDatabase(getDatabase());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return unwrapResult(await getCrmRecordWorkspace(db, data)) as any;
  });

export const getCrmCustomerWorkspaceFn = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .validator(z.object({ customerId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const db = createDatabase(getDatabase());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return unwrapResult(await getCrmCustomerWorkspace(db, data.customerId)) as any;
  });

export const getCrmCompanyWorkspaceFn = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .validator(z.object({ companyId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const db = createDatabase(getDatabase());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return unwrapResult(await getCrmCompanyWorkspace(db, data.companyId)) as any;
  });

export const saveCrmViewFn = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((data: unknown) => saveCrmViewInputSchema.parse(data))
  .handler(async ({ context, data }) => {
    const db = createDatabase(getDatabase());
    const actorUserId = context.user.id;
    const view = unwrapResult(
      await saveCrmView(db, {
        ...data,
        actorUserId,
        ownerUserId: data.visibility === "private" ? actorUserId : data.ownerUserId,
      }),
    );

    unwrapResult(
      await logAdminAuditEvent(db, {
        actorUserId,
        action: data.id ? "crm.view.update" : "crm.view.create",
        entityType: "crm_view",
        entityId: view.id,
        summary: `${data.id ? "Updated" : "Created"} CRM ${data.type} view ${data.name}`,
        metadata: { objectKey: data.objectKey, visibility: data.visibility },
      }),
    );

    return view;
  });

export const deleteCrmViewFn = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const db = createDatabase(getDatabase());
    const actorUserId = context.user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = unwrapResult(await deleteCrmView(db, data)) as any;

    unwrapResult(
      await logAdminAuditEvent(db, {
        actorUserId,
        action: "crm.view.delete",
        entityType: "crm_view",
        entityId: data.id,
        summary: `Deleted CRM view`,
      }),
    );

    return result;
  });

export const toggleCrmViewFavoriteFn = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator(z.object({ viewId: z.string() }))
  .handler(async ({ context, data }) => {
    const db = createDatabase(getDatabase());
    const actorUserId = context.user.id;
    const result = unwrapResult(
      await toggleCrmViewFavorite(db, {
        viewId: data.viewId,
        userId: actorUserId,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    unwrapResult(
      await logAdminAuditEvent(db, {
        actorUserId,
        action: "crm.view.favorite",
        entityType: "crm_view",
        entityId: data.viewId,
        summary: `Toggled favorite for CRM view`,
      }),
    );

    return result;
  });

export const saveCrmRecordFieldFn = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((data: unknown) => saveCrmRecordFieldInputSchema.parse(data))
  .handler(async ({ context, data }) => {
    const db = createDatabase(getDatabase());
    const actorUserId = context.user.id;
    const record = unwrapResult(
      await saveCrmRecordField(db, {
        ...data,
        actorUserId,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    unwrapResult(
      await logAdminAuditEvent(db, {
        actorUserId,
        action: "crm.record_field.update",
        entityType: `crm_${data.objectKey}`,
        entityId: data.recordId,
        summary: `Updated CRM field ${data.fieldKey}`,
        metadata: { objectKey: data.objectKey, fieldKey: data.fieldKey },
      }),
    );

    return record;
  });

export const saveCrmTaskFn = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((data: unknown) => saveCrmTaskInputSchema.parse(data))
  .handler(async ({ context, data }) => {
    const db = createDatabase(getDatabase());
    const actorUserId = context.user.id;
    const task = unwrapResult(
      await saveCrmTask(db, {
        ...data,
        createdBy: data.createdBy || actorUserId,
      }),
    );

    unwrapResult(
      await logAdminAuditEvent(db, {
        actorUserId,
        action: data.id ? "crm.task.update" : "crm.task.create",
        entityType: "crm_task",
        entityId: task.id,
        summary: `${data.id ? "Updated" : "Created"} CRM task ${data.title}`,
        metadata: {
          relatedObjectKey: data.relatedObjectKey,
          relatedRecordId: data.relatedRecordId,
        },
      }),
    );

    return task;
  });

const saveRecordCrmNoteSchema = z.object({
  objectKey: z.string().min(1),
  recordId: z.string().min(1),
  body: z.string().min(1),
});

export const saveRecordCrmNoteFn = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((data: unknown) => saveRecordCrmNoteSchema.parse(data))
  .handler(async ({ context, data }) => {
    const db = createDatabase(getDatabase());
    const actorUserId = context.user.id;
    const note = unwrapResult(
      await saveRecordNote(db, {
        ...data,
        authorUserId: actorUserId,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    unwrapResult(
      await logAdminAuditEvent(db, {
        actorUserId,
        action: "crm.record_note.create",
        entityType: `crm_${data.objectKey}`,
        entityId: data.recordId,
        summary: `Added CRM note to ${data.objectKey}`,
        metadata: {
          bodyLength: data.body.length,
        },
      }),
    );

    return note;
  });

export const appendCrmRecordActivityFn = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((data: unknown) => appendCrmRecordActivityInputSchema.parse(data))
  .handler(async ({ context, data }) => {
    const db = createDatabase(getDatabase());
    const actorUserId = context.user.id;
    const activity = unwrapResult(
      await appendCrmRecordActivity(db, {
        ...data,
        actorUserId: data.actorUserId || actorUserId,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    unwrapResult(
      await logAdminAuditEvent(db, {
        actorUserId,
        action: "crm.activity.append",
        entityType: `crm_${data.objectKey}`,
        entityId: data.recordId,
        summary: `Appended CRM activity ${data.title}`,
        metadata: { activityType: data.activityType },
      }),
    );

    return activity;
  });

export const saveCrmTicketFn = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator(
    z.object({
      id: z.string().optional(),
      customerId: z.string().min(1),
      subject: z.string().min(1),
      description: z.string().optional().nullable(),
      status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      assignedTo: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ context, data }) => {
    const db = createDatabase(getDatabase());
    const actorUserId = context.user.id;
    const env = getCloudflareEnv();

    const ticket = unwrapResult(
      await saveCrmTicket(
        db,
        {
          ...data,
          ownerUserId: actorUserId,
        },
        { env },
      ),
    );

    unwrapResult(
      await logAdminAuditEvent(db, {
        actorUserId,
        action: data.id ? "crm.ticket.update" : "crm.ticket.create",
        entityType: "crm_ticket",
        entityId: ticket.id,
        summary: `${data.id ? "Updated" : "Created"} CRM support ticket ${data.subject}`,
      }),
    );

    return ticket;
  });

export const updateCrmTicketFn = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator(
    z.object({
      id: z.string().min(1),
      subject: z.string().optional(),
      description: z.string().optional().nullable(),
      status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      assignedTo: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ context, data }) => {
    const db = createDatabase(getDatabase());
    const actorUserId = context.user.id;

    const ticket = unwrapResult(await updateCrmTicket(db, data));

    unwrapResult(
      await logAdminAuditEvent(db, {
        actorUserId,
        action: "crm.ticket.update",
        entityType: "crm_ticket",
        entityId: data.id,
        summary: `Updated CRM support ticket`,
      }),
    );

    return ticket;
  });

export const saveCrmCompanyFn = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      website: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      industry: z.string().optional().nullable(),
      primaryContactId: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ context, data }) => {
    const db = createDatabase(getDatabase());
    const actorUserId = context.user.id;

    const company = unwrapResult(await saveCrmCompany(db, data));

    unwrapResult(
      await logAdminAuditEvent(db, {
        actorUserId,
        action: data.id ? "crm.company.update" : "crm.company.create",
        entityType: "crm_company",
        entityId: company.id,
        summary: `${data.id ? "Updated" : "Created"} CRM company ${data.name}`,
      }),
    );

    return company;
  });

export const assignCrmContactsToCompanyFn = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator(
    z.object({
      companyId: z.string().min(1),
      contactIds: z.array(z.string()).min(1),
      primaryContactId: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ context, data }) => {
    const db = createDatabase(getDatabase());
    const actorUserId = context.user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const company = unwrapResult(await assignCrmContactsToCompany(db, data)) as any;

    unwrapResult(
      await logAdminAuditEvent(db, {
        actorUserId,
        action: "crm.company.assign_contacts",
        entityType: "crm_company",
        entityId: data.companyId,
        summary: `Assigned contacts to company`,
        metadata: { contactIds: data.contactIds },
      }),
    );

    return company;
  });

export const unassignCrmContactFromCompanyFn = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator(
    z.object({
      contactId: z.string().min(1),
    }),
  )
  .handler(async ({ context, data }) => {
    const db = createDatabase(getDatabase());
    const actorUserId = context.user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = unwrapResult(await unassignCrmContactFromCompany(db, data)) as any;

    unwrapResult(
      await logAdminAuditEvent(db, {
        actorUserId,
        action: "crm.company.unassign_contact",
        entityType: "crm_contact",
        entityId: data.contactId,
        summary: `Unassigned contact from company`,
      }),
    );

    return result;
  });

export const saveCrmDealFn = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator(
    z.object({
      customerId: z.string().min(1),
      title: z.string().min(1),
      value: z.number(),
      currency: z.string().optional(),
      stage: z
        .enum(["discovery", "proposal", "negotiation", "closed_won", "closed_lost"])
        .optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      assignedTo: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ context, data }) => {
    const db = createDatabase(getDatabase());
    const actorUserId = context.user.id;

    const deal = unwrapResult(await saveCrmDeal(db, data));

    unwrapResult(
      await logAdminAuditEvent(db, {
        actorUserId,
        action: "crm.deal.create",
        entityType: "crm_deal",
        entityId: deal.id,
        summary: `Created CRM deal ${data.title}`,
      }),
    );

    return deal;
  });

export const updateCrmContactMarketingStatusFn = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator(
    z.object({
      contactId: z.string().min(1),
      status: z.enum(["subscribed", "unsubscribed", "cleaned"]),
    }),
  )
  .handler(async ({ context, data }) => {
    const db = createDatabase(getDatabase());
    const actorUserId = context.user.id;

    const contact = unwrapResult(await updateCrmContactMarketingStatus(db, data));

    unwrapResult(
      await logAdminAuditEvent(db, {
        actorUserId,
        action: "crm.contact.marketing_status.update",
        entityType: "crm_contact",
        entityId: data.contactId,
        summary: `Updated CRM contact marketing status to ${data.status}`,
      }),
    );

    return contact;
  });

export const getCrmWorkbenchFn = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    const db = createDatabase(getDatabase());
    const [
      contactsRes,
      dealsRes,
      companiesRes,
      ticketsRes,
      invoices,
      quotes,
      transactions,
      segments,
    ] = await Promise.all([
      listCrmContacts(db),
      listCrmDeals(db),
      listCrmCompanies(db),
      listCrmTickets(db),
      db.query.crmInvoices.findMany({ with: { contact: true, company: true } }),
      db.query.crmQuotes.findMany({ with: { contact: true } }),
      db.query.payments.findMany({ with: { customer: true } }),
      db.query.crmSegments.findMany(),
    ]);

    const contacts = unwrapResult(contactsRes);
    const deals = unwrapResult(dealsRes);
    const companies = unwrapResult(companiesRes);
    const tickets = unwrapResult(ticketsRes);

    const supportQueue = tickets.map((ticket) => {
      const updatedAt = ticket.updatedAt;
      const ageHours = Math.max(
        0,
        Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60)),
      );
      const isOverdue =
        ticket.priority === "urgent"
          ? ageHours > 4
          : ticket.priority === "high"
            ? ageHours > 24
            : ageHours > 72;

      return {
        ...ticket,
        contactName: ticket.contact
          ? `${ticket.contact.firstName || ""} ${ticket.contact.lastName || ""}`.trim()
          : null,
        contactEmail: ticket.contact?.email || null,
        companyName: ticket.contact?.company || null,
        companyId: ticket.contact?.companyId || null,
        customerName: ticket.customer?.name || null,
        assignedName: ticket.owner?.name || ticket.owner?.email || null,
        ageHours,
        isOverdue,
        latestWorkflow: null,
      };
    });

    return {
      contacts,
      deals,
      companies,
      tickets,
      invoices,
      quotes,
      transactions,
      segments,
      supportQueue,
    };
  });
