import { Result, databaseError } from "@workspace/result";
import type { DatabaseError } from "@workspace/result";
import { and, eq, inArray } from "drizzle-orm";

import type { Database } from "../database/setup";
import {
  crmCompanies,
  crmContacts,
  crmDeals,
  crmFields,
  crmInvoices,
  crmNotes,
  crmObjects,
  crmQuotes,
  crmRecordActivity,
  crmRecordLayouts,
  crmTasks,
  crmTickets,
  crmViews,
  crmViewFavorites,
} from "../drizzle/schema/crm";
import type {
  DbCrmContact,
  DbCrmDeal,
  DbCrmCompany,
  DbCrmTicket,
  DbCrmView,
  DbCrmTask,
} from "../drizzle/schema/crm";
import { customers, parties, payments } from "../drizzle/schema/ecommerce";
import { getNotifyClient } from "../notifications";
import {
  crmObjectKeySchema,
  saveCrmRecordFieldInputSchema,
  saveCrmTaskInputSchema,
  saveCrmViewInputSchema,
  appendCrmRecordActivityInputSchema,
} from "../zod/schema/crm-platform";
import type {
  AppendCrmRecordActivity,
  CrmObjectKey,
  CrmViewConfig,
  SaveCrmRecordField,
  SaveCrmTask,
  SaveCrmView,
} from "../zod/schema/crm-platform";

export type UnifiedCrmContact = DbCrmContact & {
  customerId: string | null;
  name: string;
  companyName: string | null;
  lifecycle: string;
  orderCount: number;
  totalSpend: number;
  firstPurchaseAt: Date | null;
  lastPurchaseAt: Date | null;
  isGuest: boolean;
};

export type UnifiedCrmDeal = DbCrmDeal & {
  contact?: { email: string } | null;
};

export type UnifiedCrmCompany = DbCrmCompany & {
  contacts: Array<{ id: string }>;
  notes: Array<{ id: string; body: string; createdAt: Date }>;
};

export type UnifiedCrmTicket = DbCrmTicket & {
  assignedTo?: string | null;
  isOverdue?: boolean;
  contact?: DbCrmContact | null;
  customer?: { name?: string | null; email?: string | null } | null;
  owner?: { name?: string | null; email?: string | null } | null;
  latestWorkflow?: null;
};

const SUCCESSFUL_ORDER_STATUSES = new Set(["paid", "processing", "shipped", "completed"]);
const VIP_GOLD_TOTAL_SPEND_MINOR = 5000000; // 50,000 NGN/USD in cents

type CrmDefaultField = {
  key: string;
  label: string;
  type?:
    | "text"
    | "rich_text"
    | "number"
    | "boolean"
    | "date"
    | "datetime"
    | "currency"
    | "select"
    | "multi_select"
    | "email"
    | "phone"
    | "url"
    | "json"
    | "relation"
    | "actor"
    | "rating"
    | "file"
    | "address"
    | "full_name";
  storageKind?: "column" | "metadata_json" | "computed" | "relation";
  sourceColumn?: string | null;
  relationObjectKey?: CrmObjectKey | null;
  relationType?: "one" | "many" | null;
  isReadonly?: boolean;
  isRequired?: boolean;
  isSortable?: boolean;
  isFilterable?: boolean;
  isVisible?: boolean;
};

type CrmDefaultObject = {
  key: CrmObjectKey;
  tableName: string | null;
  labelSingular: string;
  labelPlural: string;
  description: string;
  routePath: string | null;
  iconKey: string;
  color: string;
  primaryLabelFieldKey: string;
  defaultViewType: "table" | "kanban" | "calendar";
  position: number;
  fields: Array<CrmDefaultField>;
  views: Array<{
    id: string;
    name: string;
    type: "table" | "kanban" | "calendar";
    config: CrmViewConfig;
    isDefault?: boolean;
  }>;
};

const defaultLayoutConfig = {
  headerFieldKeys: ["name", "title", "email", "status", "stage"],
  keyFieldKeys: ["email", "phone", "company", "value", "priority", "dueAt"],
  detailSections: [
    {
      id: "summary",
      title: "Summary",
      fieldKeys: ["name", "title", "email", "phone", "company", "status", "stage"],
    },
  ],
  relatedObjectKeys: [
    "tasks",
    "deals",
    "tickets",
    "orders",
    "subscriptions",
  ] as Array<CrmObjectKey>,
};

const systemCrmObjects: Array<CrmDefaultObject> = [
  {
    key: "contacts",
    tableName: "crm_contacts",
    labelSingular: "Contact",
    labelPlural: "Contacts",
    description: "People in the CRM, including commerce-linked customers.",
    routePath: "/crm/contacts",
    iconKey: "User",
    color: "blue",
    primaryLabelFieldKey: "name",
    defaultViewType: "table",
    position: 10,
    fields: [
      { key: "name", label: "Name", type: "full_name", storageKind: "computed", isReadonly: true },
      {
        key: "email",
        label: "Email",
        type: "email",
        storageKind: "column",
        sourceColumn: "email",
        isRequired: true,
        isSortable: true,
      },
      { key: "phone", label: "Phone", type: "phone", storageKind: "column", sourceColumn: "phone" },
      {
        key: "company",
        label: "Company",
        type: "relation",
        storageKind: "relation",
        relationObjectKey: "companies",
        relationType: "one",
      },
      {
        key: "lifecycle",
        label: "Lifecycle",
        type: "select",
        storageKind: "computed",
        isReadonly: true,
        isSortable: true,
      },
      {
        key: "marketingStatus",
        label: "Marketing",
        type: "select",
        storageKind: "column",
        sourceColumn: "marketing_status",
      },
      {
        key: "orderCount",
        label: "Orders",
        type: "number",
        storageKind: "computed",
        isReadonly: true,
        isSortable: true,
      },
      {
        key: "totalSpend",
        label: "Spend",
        type: "currency",
        storageKind: "computed",
        isReadonly: true,
        isSortable: true,
      },
    ],
    views: [
      {
        id: "crm-view-contacts-table",
        name: "All contacts",
        type: "table",
        isDefault: true,
        config: {
          type: "table",
          columns: [
            { fieldKey: "name", visible: true },
            { fieldKey: "email", visible: true },
            { fieldKey: "phone", visible: true },
            { fieldKey: "company", visible: true },
            { fieldKey: "lifecycle", visible: true },
          ],
          filters: [],
          sorts: [],
        },
      },
    ],
  },
  {
    key: "companies",
    tableName: "crm_companies",
    labelSingular: "Company",
    labelPlural: "Companies",
    description: "Organizations connected to CRM contacts.",
    routePath: "/crm",
    iconKey: "Buildings",
    color: "green",
    primaryLabelFieldKey: "name",
    defaultViewType: "table",
    position: 20,
    fields: [
      {
        key: "name",
        label: "Name",
        type: "text",
        storageKind: "column",
        sourceColumn: "name",
        isRequired: true,
        isSortable: true,
      },
      {
        key: "website",
        label: "Website",
        type: "url",
        storageKind: "column",
        sourceColumn: "website",
      },
      {
        key: "industry",
        label: "Industry",
        type: "text",
        storageKind: "column",
        sourceColumn: "industry",
      },
      {
        key: "primaryContact",
        label: "Primary contact",
        type: "relation",
        storageKind: "relation",
        relationObjectKey: "contacts",
        relationType: "one",
      },
    ],
    views: [
      {
        id: "crm-view-companies-table",
        name: "All companies",
        type: "table",
        isDefault: true,
        config: {
          type: "table",
          columns: [
            { fieldKey: "name", visible: true },
            { fieldKey: "website", visible: true },
            { fieldKey: "industry", visible: true },
            { fieldKey: "primaryContact", visible: true },
          ],
          filters: [],
          sorts: [],
        },
      },
    ],
  },
  {
    key: "deals",
    tableName: "crm_deals",
    labelSingular: "Deal",
    labelPlural: "Deals",
    description: "Sales opportunities, quotes, and pipeline movement.",
    routePath: "/crm/deals",
    iconKey: "Handshake",
    color: "amber",
    primaryLabelFieldKey: "title",
    defaultViewType: "kanban",
    position: 30,
    fields: [
      {
        key: "title",
        label: "Title",
        type: "text",
        storageKind: "column",
        sourceColumn: "title",
        isRequired: true,
        isSortable: true,
      },
      {
        key: "value",
        label: "Value",
        type: "currency",
        storageKind: "column",
        sourceColumn: "value",
        isSortable: true,
      },
      {
        key: "stage",
        label: "Stage",
        type: "select",
        storageKind: "column",
        sourceColumn: "stage",
        isSortable: true,
      },
      {
        key: "priority",
        label: "Priority",
        type: "select",
        storageKind: "column",
        sourceColumn: "priority",
      },
      {
        key: "expectedCloseDate",
        label: "Expected close",
        type: "date",
        storageKind: "column",
        sourceColumn: "expected_close_date",
        isSortable: true,
      },
      {
        key: "contact",
        label: "Contact",
        type: "relation",
        storageKind: "relation",
        relationObjectKey: "contacts",
        relationType: "one",
      },
    ],
    views: [
      {
        id: "crm-view-deals-kanban",
        name: "Pipeline",
        type: "kanban",
        isDefault: true,
        config: {
          type: "kanban",
          groupBy: "stage",
          columns: [
            { fieldKey: "title", visible: true },
            { fieldKey: "value", visible: true },
            { fieldKey: "stage", visible: true },
            { fieldKey: "priority", visible: true },
          ],
          filters: [],
          sorts: [],
        },
      },
    ],
  },
  {
    key: "tickets",
    tableName: "crm_tickets",
    labelSingular: "Ticket",
    labelPlural: "Tickets",
    description: "Support requests linked to CRM contacts and customers.",
    routePath: "/crm",
    iconKey: "Lifebuoy",
    color: "red",
    primaryLabelFieldKey: "subject",
    defaultViewType: "kanban",
    position: 40,
    fields: [
      {
        key: "subject",
        label: "Subject",
        type: "text",
        storageKind: "column",
        sourceColumn: "subject",
        isRequired: true,
        isSortable: true,
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        storageKind: "column",
        sourceColumn: "status",
        isSortable: true,
      },
      {
        key: "priority",
        label: "Priority",
        type: "select",
        storageKind: "column",
        sourceColumn: "priority",
      },
      {
        key: "contact",
        label: "Contact",
        type: "relation",
        storageKind: "relation",
        relationObjectKey: "contacts",
        relationType: "one",
      },
    ],
    views: [
      {
        id: "crm-view-tickets-kanban",
        name: "Support board",
        type: "kanban",
        isDefault: true,
        config: {
          type: "kanban",
          groupBy: "status",
          columns: [
            { fieldKey: "subject", visible: true },
            { fieldKey: "status", visible: true },
            { fieldKey: "priority", visible: true },
          ],
          filters: [],
          sorts: [],
        },
      },
    ],
  },
  {
    key: "tasks",
    tableName: "crm_tasks",
    labelSingular: "Task",
    labelPlural: "Tasks",
    description: "Follow-ups and internal work tied to CRM records.",
    routePath: "/crm",
    iconKey: "CheckSquare",
    color: "violet",
    primaryLabelFieldKey: "title",
    defaultViewType: "calendar",
    position: 50,
    fields: [
      {
        key: "title",
        label: "Title",
        type: "text",
        storageKind: "column",
        sourceColumn: "title",
        isRequired: true,
        isSortable: true,
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        storageKind: "column",
        sourceColumn: "status",
        isSortable: true,
      },
      {
        key: "priority",
        label: "Priority",
        type: "select",
        storageKind: "column",
        sourceColumn: "priority",
      },
      {
        key: "dueAt",
        label: "Due",
        type: "datetime",
        storageKind: "column",
        sourceColumn: "due_at",
        isSortable: true,
      },
    ],
    views: [
      {
        id: "crm-view-tasks-calendar",
        name: "Task calendar",
        type: "calendar",
        isDefault: true,
        config: {
          type: "calendar",
          dateFieldKey: "dueAt",
          titleFieldKey: "title",
          columns: [],
          filters: [],
          sorts: [],
        },
      },
    ],
  },
  {
    key: "products",
    tableName: "crm_products",
    labelSingular: "Product",
    labelPlural: "Products",
    description: "Commerce products mirrored from HubSpot catalog.",
    routePath: "/crm/products",
    iconKey: "Package",
    color: "pink",
    primaryLabelFieldKey: "name",
    defaultViewType: "table",
    position: 55,
    fields: [
      {
        key: "name",
        label: "Name",
        type: "text",
        storageKind: "column",
        sourceColumn: "name",
        isRequired: true,
        isSortable: true,
      },
      {
        key: "description",
        label: "Description",
        type: "rich_text",
        storageKind: "column",
        sourceColumn: "description",
      },
      {
        key: "sku",
        label: "SKU",
        type: "text",
        storageKind: "column",
        sourceColumn: "sku",
        isSortable: true,
      },
      {
        key: "price",
        label: "Price",
        type: "currency",
        storageKind: "column",
        sourceColumn: "price",
        isSortable: true,
      },
      {
        key: "currency",
        label: "Currency",
        type: "text",
        storageKind: "column",
        sourceColumn: "currency",
      },
      {
        key: "recurringBillingFrequency",
        label: "Billing Frequency",
        type: "select",
        storageKind: "column",
        sourceColumn: "recurring_billing_frequency",
      },
    ],
    views: [
      {
        id: "crm-view-products-table",
        name: "All products",
        type: "table",
        isDefault: true,
        config: {
          type: "table",
          columns: [
            { fieldKey: "name", visible: true },
            { fieldKey: "sku", visible: true },
            { fieldKey: "price", visible: true },
            { fieldKey: "recurringBillingFrequency", visible: true },
          ],
          filters: [],
          sorts: [],
        },
      },
    ],
  },
  {
    key: "subscriptions",
    tableName: "crm_subscriptions",
    labelSingular: "Subscription",
    labelPlural: "Subscriptions",
    description: "Recurring revenue subscriptions synced from HubSpot.",
    routePath: "/crm/subscriptions",
    iconKey: "RefreshCw",
    color: "rose",
    primaryLabelFieldKey: "id",
    defaultViewType: "table",
    position: 58,
    fields: [
      {
        key: "status",
        label: "Status",
        type: "select",
        storageKind: "column",
        sourceColumn: "status",
        isSortable: true,
      },
      {
        key: "billingPeriod",
        label: "Billing Period",
        type: "select",
        storageKind: "column",
        sourceColumn: "billing_period",
      },
      {
        key: "billingInterval",
        label: "Interval",
        type: "number",
        storageKind: "column",
        sourceColumn: "billing_interval",
      },
      {
        key: "recurringTotal",
        label: "Recurring Amount",
        type: "currency",
        storageKind: "column",
        sourceColumn: "recurring_total",
        isSortable: true,
      },
      {
        key: "nextPaymentDate",
        label: "Next Payment",
        type: "datetime",
        storageKind: "column",
        sourceColumn: "next_payment_date",
        isSortable: true,
      },
      {
        key: "endDate",
        label: "End Date",
        type: "datetime",
        storageKind: "column",
        sourceColumn: "end_date",
      },
    ],
    views: [
      {
        id: "crm-view-subscriptions-table",
        name: "All subscriptions",
        type: "table",
        isDefault: true,
        config: {
          type: "table",
          columns: [
            { fieldKey: "status", visible: true },
            { fieldKey: "recurringTotal", visible: true },
            { fieldKey: "nextPaymentDate", visible: true },
          ],
          filters: [],
          sorts: [],
        },
      },
    ],
  },
  {
    key: "customers",
    tableName: "customers",
    labelSingular: "Customer",
    labelPlural: "Customers",
    description: "Commerce customer identities linked to CRM contacts.",
    routePath: "/customers",
    iconKey: "ShoppingBag",
    color: "cyan",
    primaryLabelFieldKey: "name",
    defaultViewType: "table",
    position: 60,
    fields: [
      {
        key: "name",
        label: "Name",
        type: "text",
        storageKind: "column",
        sourceColumn: "name",
        isSortable: true,
      },
      {
        key: "email",
        label: "Email",
        type: "email",
        storageKind: "column",
        sourceColumn: "email",
        isRequired: true,
        isSortable: true,
      },
    ],
    views: [
      {
        id: "crm-view-customers-table",
        name: "Commerce customers",
        type: "table",
        isDefault: true,
        config: {
          type: "table",
          columns: [
            { fieldKey: "name", visible: true },
            { fieldKey: "email", visible: true },
          ],
          filters: [],
          sorts: [],
        },
      },
    ],
  },
  {
    key: "orders",
    tableName: "orders",
    labelSingular: "Order",
    labelPlural: "Orders",
    description: "Commerce orders projected into CRM timelines.",
    routePath: "/orders",
    iconKey: "Receipt",
    color: "gray",
    primaryLabelFieldKey: "orderNumber",
    defaultViewType: "table",
    position: 70,
    fields: [
      {
        key: "orderNumber",
        label: "Order",
        type: "text",
        storageKind: "column",
        sourceColumn: "order_number",
        isSortable: true,
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        storageKind: "column",
        sourceColumn: "status",
        isSortable: true,
      },
      {
        key: "total",
        label: "Total",
        type: "currency",
        storageKind: "column",
        sourceColumn: "total",
        isSortable: true,
      },
    ],
    views: [
      {
        id: "crm-view-orders-table",
        name: "Recent orders",
        type: "table",
        isDefault: true,
        config: {
          type: "table",
          columns: [
            { fieldKey: "orderNumber", visible: true },
            { fieldKey: "status", visible: true },
            { fieldKey: "total", visible: true },
          ],
          filters: [],
          sorts: [],
        },
      },
    ],
  },
  {
    key: "quotes",
    tableName: "crm_quotes",
    labelSingular: "Quote",
    labelPlural: "Quotes",
    description: "CRM quotes and commercial proposals.",
    routePath: "/crm/quotes",
    iconKey: "FileText",
    color: "purple",
    primaryLabelFieldKey: "reference",
    defaultViewType: "table",
    position: 80,
    fields: [
      {
        key: "reference",
        label: "Reference",
        type: "text",
        storageKind: "column",
        sourceColumn: "reference",
        isSortable: true,
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        storageKind: "column",
        sourceColumn: "status",
        isSortable: true,
      },
      {
        key: "value",
        label: "Value",
        type: "currency",
        storageKind: "column",
        sourceColumn: "value",
        isSortable: true,
      },
    ],
    views: [
      {
        id: "crm-view-quotes-table",
        name: "All quotes",
        type: "table",
        isDefault: true,
        config: {
          type: "table",
          columns: [
            { fieldKey: "reference", visible: true },
            { fieldKey: "status", visible: true },
            { fieldKey: "value", visible: true },
          ],
          filters: [],
          sorts: [],
        },
      },
    ],
  },
  {
    key: "invoices",
    tableName: "crm_invoices",
    labelSingular: "Invoice",
    labelPlural: "Invoices",
    description: "CRM invoices and payment collection state.",
    routePath: "/crm/invoices",
    iconKey: "FileSpreadsheet",
    color: "teal",
    primaryLabelFieldKey: "reference",
    defaultViewType: "table",
    position: 90,
    fields: [
      {
        key: "reference",
        label: "Reference",
        type: "text",
        storageKind: "column",
        sourceColumn: "reference",
        isSortable: true,
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        storageKind: "column",
        sourceColumn: "status",
        isSortable: true,
      },
      {
        key: "amountTotal",
        label: "Total",
        type: "currency",
        storageKind: "column",
        sourceColumn: "amount_total",
        isSortable: true,
      },
    ],
    views: [
      {
        id: "crm-view-invoices-table",
        name: "All invoices",
        type: "table",
        isDefault: true,
        config: {
          type: "table",
          columns: [
            { fieldKey: "reference", visible: true },
            { fieldKey: "status", visible: true },
            { fieldKey: "amountTotal", visible: true },
          ],
          filters: [],
          sorts: [],
        },
      },
    ],
  },
  {
    key: "transactions",
    tableName: "payments",
    labelSingular: "Transaction",
    labelPlural: "Transactions",
    description: "Payment transactions visible in CRM context.",
    routePath: "/crm/transactions",
    iconKey: "CreditCard",
    color: "emerald",
    primaryLabelFieldKey: "reference",
    defaultViewType: "table",
    position: 100,
    fields: [
      {
        key: "reference",
        label: "Reference",
        type: "text",
        storageKind: "computed",
        isReadonly: true,
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        storageKind: "column",
        sourceColumn: "status",
        isSortable: true,
      },
      {
        key: "amountTotal",
        label: "Total",
        type: "currency",
        storageKind: "column",
        sourceColumn: "amount_total",
        isSortable: true,
      },
    ],
    views: [
      {
        id: "crm-view-transactions-table",
        name: "All transactions",
        type: "table",
        isDefault: true,
        config: {
          type: "table",
          columns: [
            { fieldKey: "reference", visible: true },
            { fieldKey: "status", visible: true },
            { fieldKey: "amountTotal", visible: true },
          ],
          filters: [],
          sorts: [],
        },
      },
    ],
  },
  {
    key: "segments",
    tableName: "crm_segments",
    labelSingular: "Segment",
    labelPlural: "Segments",
    description: "Saved CRM audiences used by campaigns and workflows.",
    routePath: "/crm/segments",
    iconKey: "Filter",
    color: "orange",
    primaryLabelFieldKey: "name",
    defaultViewType: "table",
    position: 110,
    fields: [
      {
        key: "name",
        label: "Name",
        type: "text",
        storageKind: "column",
        sourceColumn: "name",
        isRequired: true,
        isSortable: true,
      },
      {
        key: "contactCount",
        label: "Contacts",
        type: "number",
        storageKind: "column",
        sourceColumn: "contact_count",
        isReadonly: true,
        isSortable: true,
      },
    ],
    views: [
      {
        id: "crm-view-segments-table",
        name: "All segments",
        type: "table",
        isDefault: true,
        config: {
          type: "table",
          columns: [
            { fieldKey: "name", visible: true },
            { fieldKey: "contactCount", visible: true },
          ],
          filters: [],
          sorts: [],
        },
      },
    ],
  },
];

function safeParseJson(value: string | null | undefined) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function stringifyJson(value: unknown) {
  return value == null ? null : JSON.stringify(value);
}

function deriveLifecycle(orderCount: number, totalSpend: number) {
  if (orderCount >= 5 || totalSpend >= VIP_GOLD_TOTAL_SPEND_MINOR) return "VIP";
  if (orderCount >= 2) return "Repeat";
  if (orderCount >= 1) return "Customer";
  return "Lead";
}

function getSuccessfulOrders<
  TOrder extends {
    status?: string | null;
    total?: number | null;
    createdAt?: Date | null;
  },
>(customer: { orders?: Array<TOrder> }) {
  return (customer.orders ?? []).filter((order) =>
    SUCCESSFUL_ORDER_STATUSES.has(String(order.status)),
  );
}

export async function listCrmContacts(
  db: Database,
): Promise<Result<Array<UnifiedCrmContact>, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const [canonicalParties, allCustomers, storedContacts] = await Promise.all([
        db.query.parties.findMany({
          orderBy: (t, { desc }) => [desc(t.updatedAt)],
        }),
        db.query.customers.findMany({
          orderBy: (t, { desc }) => [desc(t.lastPurchaseAt)],
          with: {
            party: true,
            orders: {
              orderBy: (t, { desc }) => [desc(t.createdAt)],
            },
          },
        }),
        db.query.crmContacts.findMany({
          with: {
            companyRecord: true,
          },
        }),
      ]);

      const customerByPartyId = new Map(
        allCustomers
          .filter((customer) => customer.partyId)
          .map((customer) => [customer.partyId!, customer]),
      );
      const customerByEmail = new Map(
        allCustomers.map((customer) => [customer.email.toLowerCase(), customer]),
      );
      const contactByPartyId = new Map(
        storedContacts
          .filter((contact) => contact.partyId)
          .map((contact) => [contact.partyId!, contact]),
      );
      const contactByEmail = new Map(
        storedContacts.map((contact) => [contact.email.toLowerCase(), contact]),
      );
      const seenKeys = new Set<string>();
      const results: Array<unknown> = [];

      canonicalParties.forEach((party) => {
        const customer =
          customerByPartyId.get(party.id) || customerByEmail.get(party.email.toLowerCase()) || null;
        const storedContact =
          contactByPartyId.get(party.id) || contactByEmail.get(party.email.toLowerCase()) || null;
        const ordersForCustomer = customer ? getSuccessfulOrders(customer) : [];
        const orderCount = ordersForCustomer.length;
        const totalSpend = ordersForCustomer.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0,
        );
        const key = customer?.id || storedContact?.id || party.id;
        seenKeys.add(key);

        results.push({
          firstName: storedContact?.firstName || customer?.firstName || party.firstName || null,
          lastName: storedContact?.lastName || customer?.lastName || party.lastName || null,
          id: storedContact?.id || party.id,
          partyId: party.id,
          customerId: customer?.id || null,
          userId: party.userId || storedContact?.userId || customer?.userId || null,
          name: party.name || customer?.name || storedContact?.email || party.email,
          email: party.email,
          phone: party.phone || storedContact?.phone || customer?.phone || null,
          companyId: storedContact?.companyId || null,
          companyName: storedContact?.companyRecord?.name || storedContact?.company || null,
          lifecycle: deriveLifecycle(orderCount, totalSpend),
          marketingStatus: storedContact?.marketingStatus || "subscribed",
          orderCount,
          totalSpend,
          firstPurchaseAt: ordersForCustomer.at(-1)?.createdAt ?? null,
          lastPurchaseAt: customer?.lastPurchaseAt ?? ordersForCustomer.at(0)?.createdAt ?? null,
          isGuest: customer?.isGuest ?? false,
          prefix: storedContact?.prefix || null,
          lastContactedAt: storedContact?.lastContactedAt || null,
          externalId: storedContact?.externalId || null,
          externalSource: storedContact?.externalSource || null,
        });
      });

      for (const customer of allCustomers) {
        const key = customer.id;
        if (seenKeys.has(key)) continue;
        const storedContact = contactByEmail.get(customer.email.toLowerCase()) || null;
        const ordersForCustomer = getSuccessfulOrders(customer);
        const orderCount = ordersForCustomer.length;
        const totalSpend = ordersForCustomer.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0,
        );

        results.push({
          id: storedContact?.id || customer.id,
          partyId: customer.partyId || null,
          customerId: customer.id,
          userId: storedContact?.userId || customer.userId || null,
          name: customer.name || customer.email,
          email: customer.email,
          phone: storedContact?.phone || customer.phone,
          companyId: storedContact?.companyId || null,
          companyName: storedContact?.companyRecord?.name || storedContact?.company || null,
          lifecycle: deriveLifecycle(orderCount, totalSpend),
          marketingStatus: storedContact?.marketingStatus || "subscribed",
          orderCount,
          totalSpend,
          firstPurchaseAt: ordersForCustomer.at(-1)?.createdAt ?? null,
          lastPurchaseAt: customer.lastPurchaseAt ?? ordersForCustomer.at(0)?.createdAt ?? null,
          isGuest: customer.isGuest,
          prefix: storedContact?.prefix || null,
          lastContactedAt: storedContact?.lastContactedAt || null,
          externalId: storedContact?.externalId || null,
          externalSource: storedContact?.externalSource || null,
        });
        seenKeys.add(key);
      }

      for (const storedContact of storedContacts) {
        const key = storedContact.partyId || storedContact.id;
        if (seenKeys.has(key)) continue;
        const party = storedContact.partyId
          ? canonicalParties.find((entry) => entry.id === storedContact.partyId) || null
          : null;
        const customer = party
          ? customerByPartyId.get(party.id) ||
            customerByEmail.get(storedContact.email.toLowerCase()) ||
            null
          : customerByEmail.get(storedContact.email.toLowerCase()) || null;
        const ordersForCustomer = customer ? getSuccessfulOrders(customer) : [];
        const orderCount = ordersForCustomer.length;
        const totalSpend = ordersForCustomer.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0,
        );

        results.push({
          id: storedContact.id,
          partyId: storedContact.partyId || null,
          customerId: customer?.id || null,
          userId: storedContact.userId || party?.userId || null,
          name:
            [storedContact.firstName, storedContact.lastName].filter(Boolean).join(" ") ||
            party?.name ||
            storedContact.email,
          email: storedContact.email,
          phone: storedContact.phone || party?.phone || null,
          companyId: storedContact.companyId || null,
          companyName: storedContact.companyRecord?.name || storedContact.company || null,
          lifecycle:
            orderCount > 0
              ? deriveLifecycle(orderCount, totalSpend)
              : storedContact.status === "customer"
                ? "Customer"
                : "Lead",
          marketingStatus: storedContact.marketingStatus || "subscribed",
          orderCount,
          totalSpend,
          firstPurchaseAt: ordersForCustomer.at(-1)?.createdAt ?? null,
          lastPurchaseAt: customer?.lastPurchaseAt ?? ordersForCustomer.at(0)?.createdAt ?? null,
          isGuest: false,
          prefix: storedContact.prefix || null,
          lastContactedAt: storedContact.lastContactedAt || null,
          externalId: storedContact.externalId || null,
          externalSource: storedContact.externalSource || null,
        });
        seenKeys.add(key);
      }

      return results as Array<UnifiedCrmContact>;
    },
    catch: (cause) => databaseError("listCrmContacts", cause),
  });
}

async function resolveCustomerForContact(
  db: Database,
  contact: { partyId?: string | null; email?: string | null },
) {
  if (contact.partyId) {
    const byParty = await db.query.customers.findFirst({
      where: { partyId: contact.partyId },
    });
    if (byParty) return byParty;
  }
  if (contact.email) {
    return await db.query.customers.findFirst({
      where: { email: contact.email },
    });
  }
  return null;
}

export async function ensureCrmContactForCustomer(
  db: Database,
  customerId: string,
): Promise<Result<DbCrmContact | null, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const customer = await db.query.customers.findFirst({
        where: { id: customerId },
      });
      if (!customer) return null;

      // Find or create a party
      let party = customer.partyId
        ? await db.query.parties.findFirst({ where: { id: customer.partyId } })
        : null;

      if (!party) {
        const partyId = crypto.randomUUID();
        const [newParty] = await db
          .insert(parties)
          .values({
            id: partyId,
            userId: customer.userId,
            email: customer.email,
            name: customer.name,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            kind: "customer",
            source: "checkout",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        party = newParty;

        await db
          .update(customers)
          .set({ partyId: newParty.id, updatedAt: new Date() })
          .where(eq(customers.id, customer.id));
      }

      const existing =
        (await db.query.crmContacts.findFirst({
          where: { partyId: party.id },
        })) ||
        (customer.email
          ? await db.query.crmContacts.findFirst({
              where: { email: customer.email },
            })
          : null);

      if (existing) {
        if (!existing.partyId || existing.partyId !== party.id) {
          const updated = await db
            .update(crmContacts)
            .set({
              partyId: party.id,
              userId: customer.userId || existing.userId,
              firstName: existing.firstName || customer.name?.split(" ")[0] || null,
              lastName: existing.lastName || customer.name?.split(" ").slice(1).join(" ") || null,
              prefix:
                existing.prefix ||
                (safeParseJson(customer.metadata as string).prefix as string) ||
                null,
              phone: existing.phone || customer.phone || null,
              updatedAt: new Date(),
            })
            .where(eq(crmContacts.id, existing.id))
            .returning();

          return updated[0];
        }
        return existing;
      }

      const [contact] = await db
        .insert(crmContacts)
        .values({
          id: crypto.randomUUID(),
          partyId: party.id,
          userId: customer.userId || null,
          firstName: customer.name?.split(" ")[0] || null,
          lastName: customer.name?.split(" ").slice(1).join(" ") || null,
          prefix: (safeParseJson(customer.metadata as string).prefix as string) || null,
          email: customer.email,
          phone: customer.phone || null,
          source: customer.isGuest ? "guest-checkout" : "customer",
          status: customer.lastPurchaseAt ? "customer" : "lead",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return contact;
    },
    catch: (cause) => databaseError("ensureCrmContactForCustomer", cause),
  });
}

export async function listCrmDeals(
  db: Database,
): Promise<Result<Array<UnifiedCrmDeal>, DatabaseError>> {
  return Result.tryPromise({
    try: () =>
      db.query.crmDeals.findMany({
        orderBy: (t, { desc }) => [desc(t.updatedAt)],
        with: {
          contact: true,
          order: true,
          owner: true,
        },
      }),
    catch: (cause) => databaseError("listCrmDeals", cause),
  });
}

export async function listCrmCompanies(
  db: Database,
): Promise<Result<Array<UnifiedCrmCompany>, DatabaseError>> {
  return Result.tryPromise({
    try: () =>
      db.query.crmCompanies.findMany({
        orderBy: (t, { desc }) => [desc(t.updatedAt)],
        with: {
          contacts: true,
          primaryContact: true,
          notes: true,
        },
      }),
    catch: (cause) => databaseError("listCrmCompanies", cause),
  });
}

export async function listCrmTickets(
  db: Database,
): Promise<Result<Array<UnifiedCrmTicket>, DatabaseError>> {
  return Result.tryPromise({
    try: () =>
      db.query.crmTickets.findMany({
        orderBy: (t, { desc }) => [desc(t.updatedAt)],
        with: {
          contact: true,
          customer: true,
          owner: true,
        },
      }),
    catch: (cause) => databaseError("listCrmTickets", cause),
  });
}

export async function getCrmCompanyWorkspace(
  db: Database,
  companyId: string,
): Promise<Result<unknown, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const [company, contacts, tickets, deals] = await Promise.all([
        db.query.crmCompanies.findFirst({
          where: { id: companyId },
          with: {
            contacts: true,
            primaryContact: true,
            notes: true,
          },
        }),
        listCrmContacts(db).then((res) => res.unwrap()),
        listCrmTickets(db).then((res) => res.unwrap()),
        listCrmDeals(db).then((res) => res.unwrap()),
      ]);

      if (!company) return null;

      const companyContactIds = new Set(company.contacts.map((contact) => contact.id));
      const assignedContacts = contacts.filter((contact) => companyContactIds.has(contact.id));

      const timeline = [
        ...company.notes.map((note) => ({
          id: `note:${note.id}`,
          type: "note" as const,
          occurredAt: note.createdAt,
          title: "Company note",
          description: note.body,
          status: null,
          actor: null,
        })),
        ...tickets
          .filter((ticket) => ticket.contactId && companyContactIds.has(ticket.contactId))
          .map((ticket) => ({
            id: `ticket:${ticket.id}`,
            type: "ticket" as const,
            occurredAt: ticket.updatedAt,
            title: ticket.subject,
            description: `Support ticket for ${ticket.contact?.email || ticket.customer?.email || "linked contact"}`,
            status: ticket.status,
            actor: ticket.contact?.email || ticket.customer?.email || null,
          })),
        ...deals
          .filter((deal) => deal.contactId && companyContactIds.has(deal.contactId))
          .map((deal) => ({
            id: `deal:${deal.id}`,
            type: "deal" as const,
            occurredAt: deal.updatedAt,
            title: deal.title,
            description: `Pipeline deal · ${Number(deal.value || 0) / 100} ${deal.currency || "NGN"}`,
            status: deal.stage,
            actor: deal.contact?.email ?? "",
          })),
      ].sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());

      return {
        company,
        contacts,
        assignedContacts,
        availableContacts: contacts.filter(
          (contact) => !contact.companyId || contact.companyId === companyId,
        ),
        notes: company.notes.sort(
          (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        ),
        tickets: tickets.filter(
          (ticket) => ticket.contactId && companyContactIds.has(ticket.contactId),
        ),
        deals: deals.filter((deal) => deal.contactId && companyContactIds.has(deal.contactId)),
        timeline,
      };
    },
    catch: (cause) => databaseError("getCrmCompanyWorkspace", cause),
  });
}

export async function getCrmCustomerWorkspace(
  db: Database,
  customerId: string,
): Promise<Result<unknown, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const customer = await db.query.customers.findFirst({
        where: { id: customerId },
        with: {
          party: true,
          orders: {
            orderBy: (t, { desc }) => [desc(t.createdAt)],
          },
        },
      });

      if (!customer) return null;

      const contact = await ensureCrmContactForCustomer(db, customerId).then((res) => res.unwrap());
      const party =
        customer.party ||
        (customer.partyId
          ? await db.query.parties.findFirst({
              where: { id: customer.partyId },
            })
          : null);

      const [notes, tickets, deals] = await Promise.all([
        contact
          ? db.query.crmNotes.findMany({
              where: { contactId: contact.id },
              orderBy: (t, { desc }) => [desc(t.createdAt)],
              with: { author: true, deal: true },
            })
          : [],
        db.query.crmTickets.findMany({
          where: { customerId: customerId },
          orderBy: (t, { desc }) => [desc(t.updatedAt)],
          with: { owner: true },
        }),
        contact
          ? db.query.crmDeals.findMany({
              where: { contactId: contact.id },
              orderBy: (t, { desc }) => [desc(t.updatedAt)],
              with: { order: true, owner: true },
            })
          : [],
      ]);

      return { customer, contact, party, notes, tickets, deals };
    },
    catch: (cause) => databaseError("getCrmCustomerWorkspace", cause),
  });
}

export async function saveCrmCompany(
  db: Database,
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  data: any,
): Promise<Result<DbCrmCompany, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const now = new Date();

      if (!data.id) {
        const rows = await db
          .insert(crmCompanies)
          .values({
            id: data.id || crypto.randomUUID(),
            name: data.name,
            website: data.website || null,
            email: data.email || null,
            phone: data.phone || null,
            industry: data.industry || null,
            primaryContactId: data.primaryContactId || null,
            metadata: data.metadata || null,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        const created = rows[0] as (typeof rows)[0] | undefined;
        if (!created) {
          throw new Error("Failed to create company");
        }

        if (data.primaryContactId) {
          await assignCrmContactsToCompany(db, {
            companyId: created.id,
            contactIds: [data.primaryContactId],
            primaryContactId: data.primaryContactId,
          });
        }

        return created;
      }

      const rows = await db
        .update(crmCompanies)
        .set({
          name: data.name,
          website: data.website || null,
          email: data.email || null,
          phone: data.phone || null,
          industry: data.industry || null,
          primaryContactId: data.primaryContactId || null,
          metadata: data.metadata || null,
          updatedAt: now,
        })
        .where(eq(crmCompanies.id, data.id))
        .returning();

      const updated = rows[0] as DbCrmCompany | undefined;
      if (!updated) {
        throw new Error("Failed to update company");
      }

      if (data.primaryContactId) {
        await assignCrmContactsToCompany(db, {
          companyId: updated.id,
          contactIds: [data.primaryContactId],
          primaryContactId: data.primaryContactId,
        });
      }

      return updated;
    },
    catch: (cause) => databaseError("saveCrmCompany", cause),
  });
}

export async function assignCrmContactsToCompany(
  db: Database,
  data: {
    companyId: string;
    contactIds: Array<string>;
    primaryContactId?: string | null;
  },
): Promise<Result<unknown, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const company = await db.query.crmCompanies.findFirst({
        where: { id: data.companyId },
      });
      if (!company) throw new Error("Company not found");
      if (data.contactIds.length === 0) return company;

      const contacts = await db.query.crmContacts.findMany({
        where: { id: { in: data.contactIds } },
      });
      if (contacts.length === 0) throw new Error("No contacts found for assignment");

      await db
        .update(crmContacts)
        .set({
          companyId: company.id,
          company: company.name,
          updatedAt: new Date(),
        })
        .where(
          inArray(
            crmContacts.id,
            contacts.map((contact) => contact.id),
          ),
        );

      if (data.primaryContactId) {
        await db
          .update(crmCompanies)
          .set({
            primaryContactId: data.primaryContactId,
            updatedAt: new Date(),
          })
          .where(eq(crmCompanies.id, company.id));
      }

      return await db.query.crmCompanies.findFirst({
        where: { id: company.id },
        with: {
          contacts: true,
          primaryContact: true,
          notes: true,
        },
      });
    },
    catch: (cause) => databaseError("assignCrmContactsToCompany", cause),
  });
}

export async function unassignCrmContactFromCompany(
  db: Database,
  data: {
    contactId: string;
  },
): Promise<Result<unknown, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const contact = await db.query.crmContacts.findFirst({
        where: { id: data.contactId },
      });
      if (!contact) throw new Error("Contact not found");

      await db
        .update(crmContacts)
        .set({
          companyId: null,
          company: null,
          updatedAt: new Date(),
        })
        .where(eq(crmContacts.id, data.contactId));

      if (contact.companyId) {
        const company = await db.query.crmCompanies.findFirst({
          where: { id: contact.companyId },
        });

        if (company?.primaryContactId === data.contactId) {
          await db
            .update(crmCompanies)
            .set({
              primaryContactId: null,
              updatedAt: new Date(),
            })
            .where(eq(crmCompanies.id, contact.companyId));
        }
      }

      return { contactId: data.contactId };
    },
    catch: (cause) => databaseError("unassignCrmContactFromCompany", cause),
  });
}

export async function saveCrmCompanyNote(
  db: Database,
  data: {
    companyId: string;
    body: string;
    authorUserId?: string | null;
  },
): Promise<Result<unknown, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const [note] = await db
        .insert(crmNotes)
        .values({
          id: crypto.randomUUID(),
          companyId: data.companyId,
          authorUserId: data.authorUserId || null,
          body: data.body,
          createdAt: new Date(),
        })
        .returning();

      await db
        .update(crmCompanies)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(crmCompanies.id, data.companyId));

      return note;
    },
    catch: (cause) => databaseError("saveCrmCompanyNote", cause),
  });
}

export async function saveCrmCompanyTicket(
  db: Database,
  data: {
    companyId: string;
    contactId: string;
    subject: string;
    status?: "open" | "pending" | "resolved" | "closed";
    priority?: "low" | "medium" | "high" | "urgent";
  },
): Promise<Result<unknown, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const contact = await db.query.crmContacts.findFirst({
        where: { id: data.contactId },
      });
      if (!contact || contact.companyId !== data.companyId) return null;

      const customer = await resolveCustomerForContact(db, contact);
      const [ticket] = await db
        .insert(crmTickets)
        .values({
          id: crypto.randomUUID(),
          contactId: contact.id,
          customerId: customer?.id || null,
          subject: data.subject,
          status: data.status || "open",
          priority: data.priority || "medium",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      await db
        .update(crmCompanies)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(crmCompanies.id, data.companyId));

      return ticket;
    },
    catch: (cause) => databaseError("saveCrmCompanyTicket", cause),
  });
}

export async function saveCrmCompanyDeal(
  db: Database,
  data: {
    companyId: string;
    contactId: string;
    title: string;
    value: number;
    currency?: string | null;
    stage?: "discovery" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
    priority?: "low" | "medium" | "high" | "urgent";
  },
): Promise<Result<unknown, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const contact = await db.query.crmContacts.findFirst({
        where: { id: data.contactId },
      });
      if (!contact || contact.companyId !== data.companyId) return null;

      const [deal] = await db
        .insert(crmDeals)
        .values({
          id: crypto.randomUUID(),
          contactId: contact.id,
          title: data.title,
          value: data.value,
          currency: data.currency || "NGN",
          stage: data.stage || "discovery",
          priority: data.priority || "medium",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      await db
        .update(crmCompanies)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(crmCompanies.id, data.companyId));

      return deal;
    },
    catch: (cause) => databaseError("saveCrmCompanyDeal", cause),
  });
}

export async function saveRecordNote(
  db: Database,
  data: {
    objectKey: string;
    recordId: string;
    body: string;
    authorUserId?: string | null;
  },
): Promise<Result<unknown, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const values: {
        id: string;
        body: string;
        authorUserId: string | null;
        contactId: string | null;
        companyId: string | null;
        dealId: string | null;
        createdAt: Date;
        updatedAt: Date;
      } = {
        id: crypto.randomUUID(),
        body: data.body,
        authorUserId: data.authorUserId || null,
        contactId: null,
        companyId: null,
        dealId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (data.objectKey === "contacts") {
        values.contactId = data.recordId;
      } else if (data.objectKey === "companies") {
        values.companyId = data.recordId;
      } else if (data.objectKey === "deals") {
        values.dealId = data.recordId;
      } else {
        const record = (await findObjectRecord(
          db,
          data.objectKey as CrmObjectKey,
          data.recordId,
        )) as
          | (Record<string, unknown> & { contactId?: string | null; customerId?: string | null })
          | null;
        if (record) {
          if ("contactId" in record && record.contactId) {
            values.contactId = record.contactId;
          } else if ("customerId" in record && record.customerId) {
            const contact = await ensureCrmContactForCustomer(db, record.customerId).then((res) =>
              res.unwrap(),
            );
            if (contact) {
              values.contactId = contact.id;
            }
          }
        }
      }

      const [inserted] = await db.insert(crmNotes).values(values).returning();
      return inserted;
    },
    catch: (cause) => databaseError("saveRecordNote", cause),
  });
}

export async function saveCrmNote(
  db: Database,
  data: { customerId: string; body: string; dealId?: string | null; authorUserId?: string | null },
): Promise<Result<unknown, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const contact = await ensureCrmContactForCustomer(db, data.customerId).then((res) =>
        res.unwrap(),
      );

      const result = await db
        .insert(crmNotes)
        .values({
          id: crypto.randomUUID(),
          contactId: contact?.id || null,
          dealId: data.dealId || null,
          authorUserId: data.authorUserId || null,
          body: data.body,
          createdAt: new Date(),
        })
        .returning();

      return result[0];
    },
    catch: (cause) => databaseError("saveCrmNote", cause),
  });
}

export async function saveCrmTicket(
  db: Database,
  data: {
    id?: string;
    contactId?: string | null;
    customerId: string;
    ownerUserId?: string | null;
    subject: string;
    description?: string | null;
    status?: "open" | "pending" | "resolved" | "closed";
    priority?: "low" | "medium" | "high" | "urgent";
    metadata?: string | null;
    assignedTo?: string | null;
  },
  config?: {
    env?: unknown;
    appId?: string;
    apiKey?: string;
  },
): Promise<Result<DbCrmTicket, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const contact = await ensureCrmContactForCustomer(db, data.customerId).then((res) =>
        res.unwrap(),
      );

      const result = await db
        .insert(crmTickets)
        .values({
          id: crypto.randomUUID(),
          contactId: contact?.id || null,
          customerId: data.customerId,
          subject: data.subject,
          description: data.description || null,
          status: data.status || "open",
          priority: data.priority || "medium",
          assignedTo: data.assignedTo || null,
          metadata: data.metadata || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      const ticket = result[0] as DbCrmTicket | undefined;
      if (!ticket) {
        throw new Error("Failed to create ticket");
      }

      const notifyEnv = (config?.env ?? {}) as Record<string, string>;
      if (notifyEnv.ONESIGNAL_APP_ID || config?.appId) {
        const notifyClient = getNotifyClient({
          ONESIGNAL_APP_ID: config?.appId || notifyEnv.ONESIGNAL_APP_ID,
          ONESIGNAL_API_KEY: config?.apiKey || notifyEnv.ONESIGNAL_API_KEY,
          DISCORD_WEBHOOK_URL: notifyEnv.DISCORD_WEBHOOK_SUPPORT || notifyEnv.DISCORD_WEBHOOK_URL,
        });

        await notifyClient.platformAlert
          .send({
            input: {
              title: `Ticket Created: ${ticket.subject}`,
              description: `Priority: ${ticket.priority ?? "medium"}\n\n${ticket.description || "No description provided."}`,
              level: ticket.priority === "urgent" || ticket.priority === "high" ? "warn" : "info",
            },
          })
          .catch((err: unknown) => console.error("Failed to send ticket creation alert:", err));
      }

      return ticket;
    },
    catch: (cause) => databaseError("saveCrmTicket", cause),
  });
}

export async function updateCrmTicket(
  db: Database,
  data: {
    id: string;
    subject?: string;
    description?: string | null;
    status?: "open" | "pending" | "resolved" | "closed";
    priority?: "low" | "medium" | "high" | "urgent";
    assignedTo?: string | null;
  },
): Promise<Result<DbCrmTicket, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const existing = await db.query.crmTickets.findFirst({
        where: { id: data.id },
      });

      if (!existing) {
        throw new Error("Ticket not found");
      }

      const rows = await db
        .update(crmTickets)
        .set({
          subject: data.subject ?? existing.subject,
          description: data.description === undefined ? existing.description : data.description,
          status: data.status ?? existing.status,
          priority: data.priority ?? existing.priority,
          assignedTo: data.assignedTo === undefined ? existing.assignedTo : data.assignedTo,
          updatedAt: new Date(),
        })
        .where(eq(crmTickets.id, data.id))
        .returning();

      const updated = rows[0] as DbCrmTicket | undefined;
      if (!updated) {
        throw new Error("Failed to update ticket");
      }
      return updated;
    },
    catch: (cause) => databaseError("updateCrmTicket", cause),
  });
}

export async function saveCrmDeal(
  db: Database,
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  data: any,
): Promise<Result<DbCrmDeal, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const contact = await ensureCrmContactForCustomer(db, data.customerId).then((res) =>
        res.unwrap(),
      );

      const result = await db
        .insert(crmDeals)
        .values({
          id: crypto.randomUUID(),
          contactId: contact?.id || null,
          title: data.title,
          value: Number(data.value || 0),
          currency: data.currency || "NGN",
          stage: data.stage || "discovery",
          priority: data.priority || "medium",
          assignedTo: data.assignedTo || null,
          expiresAt: data.expiresAt || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return result[0];
    },
    catch: (cause) => databaseError("saveCrmDeal", cause),
  });
}

export async function updateCrmContactMarketingStatus(
  db: Database,
  data: { contactId: string; status: "subscribed" | "unsubscribed" | "cleaned" },
): Promise<Result<DbCrmContact, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const now = new Date();
      const result = await db
        .update(crmContacts)
        .set({
          marketingStatus: data.status,
          marketingSubscribedAt: data.status === "subscribed" ? now : null,
          marketingUnsubscribedAt: data.status === "unsubscribed" ? now : null,
          updatedAt: now,
        })
        .where(eq(crmContacts.id, data.contactId))
        .returning();

      return result[0];
    },
    catch: (cause) => databaseError("updateCrmContactMarketingStatus", cause),
  });
}

export async function ensureCrmPlatformDefaults(
  db: Database,
): Promise<Result<void, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      for (const object of systemCrmObjects) {
        const objectId = `crm-object-${object.key}`;
        const now = new Date();

        await db
          .insert(crmObjects)
          .values({
            id: objectId,
            key: object.key,
            tableName: object.tableName,
            labelSingular: object.labelSingular,
            labelPlural: object.labelPlural,
            description: object.description,
            sourceType: "system",
            routePath: object.routePath,
            iconKey: object.iconKey,
            color: object.color,
            primaryLabelFieldKey: object.primaryLabelFieldKey,
            defaultViewType: object.defaultViewType,
            isActive: true,
            isAuditEnabled: true,
            position: object.position,
            metadata: stringifyJson({ seededBy: "crm-platform" }),
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing({ target: crmObjects.key });

        for (const [index, field] of object.fields.entries()) {
          await db
            .insert(crmFields)
            .values({
              id: `crm-field-${object.key}-${field.key}`,
              objectId,
              key: field.key,
              label: field.label,
              type: field.type || "text",
              storageKind: field.storageKind || "metadata_json",
              sourceColumn: field.sourceColumn || null,
              relationObjectKey: field.relationObjectKey || null,
              relationType: field.relationType || null,
              isSystem: true,
              isVisible: field.isVisible ?? true,
              isReadonly: field.isReadonly ?? false,
              isRequired: field.isRequired ?? false,
              isFilterable: field.isFilterable ?? true,
              isSortable: field.isSortable ?? false,
              position: index * 10,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoNothing({ target: [crmFields.objectId, crmFields.key] });
        }

        for (const [index, view] of object.views.entries()) {
          await db
            .insert(crmViews)
            .values({
              id: view.id,
              objectId,
              name: view.name,
              type: view.type,
              visibility: "workspace",
              config: JSON.stringify(view.config),
              isDefault: view.isDefault ?? false,
              position: index * 10,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoNothing({ target: crmViews.id });
        }

        await db
          .insert(crmRecordLayouts)
          .values({
            id: `crm-layout-${object.key}-default`,
            objectId,
            name: `${object.labelSingular} workspace`,
            visibility: "workspace",
            config: JSON.stringify(defaultLayoutConfig),
            isDefault: true,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing({ target: crmRecordLayouts.id });
      }
    },
    catch: (cause) => databaseError("ensureCrmPlatformDefaults", cause),
  });
}

function parseViewConfig(value: string): CrmViewConfig {
  const parsed = safeParseJson(value);
  if (parsed && "type" in parsed) {
    return parsed as CrmViewConfig;
  }
  return { type: "table", columns: [], filters: [], sorts: [] };
}

function sortByPosition<T extends { position?: number | null }>(rows: Array<T>) {
  return rows
    .slice()
    .sort((left, right) => Number(left.position || 0) - Number(right.position || 0));
}

async function getCrmObjectDefinition(db: Database, objectKey: CrmObjectKey) {
  await ensureCrmPlatformDefaults(db).then((res) => res.unwrap());

  const object = await db.query.crmObjects.findFirst({
    where: { key: objectKey },
    with: {
      fields: true,
      views: true,
      recordLayouts: true,
    },
  });

  if (!object) {
    throw new Error(`CRM object ${objectKey} is not configured`);
  }

  const views = sortByPosition(object.views).map((view) => ({
    ...view,
    config: parseViewConfig(view.config),
  }));

  return {
    ...object,
    fields: sortByPosition(object.fields),
    views,
    recordLayouts: object.recordLayouts,
  };
}

async function listObjectRecords(db: Database, objectKey: CrmObjectKey) {
  switch (objectKey) {
    case "contacts":
      return await listCrmContacts(db).then((res) => res.unwrap());
    case "companies":
      return await listCrmCompanies(db).then((res) => res.unwrap());
    case "deals":
      return await listCrmDeals(db).then((res) => res.unwrap());
    case "tickets":
      return await listCrmTickets(db).then((res) => res.unwrap());
    case "tasks":
      return await db.query.crmTasks.findMany({
        orderBy: (t, { desc }) => [desc(t.updatedAt)],
        with: {
          owner: true,
          creator: true,
          contact: true,
          company: true,
          deal: true,
          ticket: true,
        },
      });
    case "products":
      return await db.query.crmProducts.findMany({
        orderBy: (t, { desc }) => [desc(t.updatedAt)],
      });
    case "line_items":
      return await db.query.crmLineItems.findMany({
        orderBy: (t, { desc }) => [desc(t.updatedAt)],
      });
    case "subscriptions":
      return await db.query.crmSubscriptions.findMany({
        orderBy: (t, { desc }) => [desc(t.updatedAt)],
        with: {
          customer: true,
          company: true,
          contact: true,
          product: true,
        },
      });
    case "customers":
      return await db.query.customers.findMany({
        orderBy: (t, { desc }) => [desc(t.updatedAt)],
        with: { orders: true, party: true },
      });
    case "orders":
      return await db.query.orders.findMany({
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        with: { customer: true, party: true },
      });
    case "quotes":
      return await db.query.crmQuotes.findMany({
        orderBy: (t, { desc }) => [desc(t.updatedAt)],
        with: { contact: true, deal: true, owner: true },
      });
    case "invoices":
      return await db.query.crmInvoices.findMany({
        orderBy: (t, { desc }) => [desc(t.updatedAt)],
        with: { contact: true, company: true, order: true, quote: true, owner: true },
      });
    case "transactions":
      return await db.query.payments.findMany({
        orderBy: (t, { desc }) => [desc(t.updatedAt)],
        with: { customer: true, party: true, order: true, user: true },
      });
    case "segments":
      return await db.query.crmSegments.findMany({
        orderBy: (t, { desc }) => [desc(t.updatedAt)],
      });
    default:
      crmObjectKeySchema.parse(objectKey);
      return [];
  }
}

function getRecordValue(
  record: Record<string, unknown> & {
    contact?: { email?: string | null; firstName?: string | null; lastName?: string | null } | null;
    companyRecord?: { name?: string | null } | null;
    company?: { name?: string | null } | string | null;
    primaryContact?: { email?: string | null } | null;
    customer?: { email?: string | null; name?: string | null } | null;
    orderNumber?: string | null;
    sourceId?: string | null;
    id?: string | null;
    reference?: string | null;
    providerReference?: string | null;
  },
  fieldKey: string,
) {
  if (fieldKey in record) return record[fieldKey];
  if (fieldKey === "contact" && record.contact) {
    return (
      record.contact.email ||
      [record.contact.firstName, record.contact.lastName].filter(Boolean).join(" ")
    );
  }
  if (fieldKey === "company" && record.companyRecord) return record.companyRecord.name;
  if (fieldKey === "company" && record.company) {
    return typeof record.company === "string" ? record.company : record.company.name || "";
  }
  if (fieldKey === "primaryContact" && record.primaryContact) return record.primaryContact.email;
  if (fieldKey === "customer" && record.customer)
    return record.customer.email || record.customer.name;
  if (fieldKey === "orderNumber") return record.orderNumber || record.sourceId || record.id;
  if (fieldKey === "reference") return record.reference || record.providerReference || record.id;
  return undefined;
}

function comparableString(value: unknown): string {
  if (value == null) return "";
  if (Object.prototype.toString.call(value) === "[object Date]")
    return (value as Date).toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "symbol") return value.description || "Symbol";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  return "";
}

type CrmRecordValueInput = Parameters<typeof getRecordValue>[0];

function applyViewFilters(
  records: Array<CrmRecordValueInput>,
  filters: Array<{ fieldKey: string; operator: string; value?: unknown }>,
) {
  if (filters.length === 0) return records;

  return records.filter((record) =>
    filters.every((filter) => {
      const value = getRecordValue(record, filter.fieldKey);
      const expected = filter.value;

      switch (filter.operator) {
        case "eq":
          return comparableString(value) === comparableString(expected);
        case "neq":
          return comparableString(value) !== comparableString(expected);
        case "contains":
          return comparableString(value)
            .toLowerCase()
            .includes(comparableString(expected).toLowerCase());
        case "starts_with":
          return comparableString(value)
            .toLowerCase()
            .startsWith(comparableString(expected).toLowerCase());
        case "ends_with":
          return comparableString(value)
            .toLowerCase()
            .endsWith(comparableString(expected).toLowerCase());
        case "gt":
          return Number(value ?? 0) > Number(expected ?? 0);
        case "gte":
          return Number(value ?? 0) >= Number(expected ?? 0);
        case "lt":
          return Number(value ?? 0) < Number(expected ?? 0);
        case "lte":
          return Number(value ?? 0) <= Number(expected ?? 0);
        case "in":
          return (
            Array.isArray(expected) &&
            expected.map(comparableString).includes(comparableString(value))
          );
        case "is_empty":
          return value == null || value === "";
        case "is_not_empty":
          return value != null && value !== "";
        default:
          return true;
      }
    }),
  );
}

function applyViewSorts(
  records: Array<CrmRecordValueInput>,
  sorts: Array<{ fieldKey: string; direction: "asc" | "desc" }>,
) {
  if (sorts.length === 0) return records;

  return records.slice().sort((left, right) => {
    for (const sort of sorts) {
      const leftValue = getRecordValue(left, sort.fieldKey);
      const rightValue = getRecordValue(right, sort.fieldKey);
      const leftNumber = new Date((leftValue ?? 0) as string | number | Date).getTime();
      const rightNumber = new Date((rightValue ?? 0) as string | number | Date).getTime();
      const comparison =
        Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
          ? leftNumber - rightNumber
          : comparableString(leftValue).localeCompare(comparableString(rightValue));

      if (comparison !== 0) return sort.direction === "desc" ? comparison * -1 : comparison;
    }
    return 0;
  });
}

function groupRecords(records: Array<CrmRecordValueInput>, config: CrmViewConfig) {
  if (config.type !== "kanban") return [];

  const groups = new Map<string, Array<CrmRecordValueInput>>();
  for (const record of records) {
    const groupKey = comparableString(getRecordValue(record, config.groupBy)) || "Unassigned";
    const group = groups.get(groupKey) || [];
    group.push(record);
    groups.set(groupKey, group);
  }

  return Array.from(groups.entries()).map(([key, items]) => ({ key, items }));
}

export async function getCrmPlatformShell(db: Database): Promise<Result<unknown, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      await ensureCrmPlatformDefaults(db).then((res) => res.unwrap());

      const objects = await db.query.crmObjects.findMany({
        orderBy: (t, { asc }) => [asc(t.position)],
        with: {
          fields: true,
          views: true,
          recordLayouts: true,
        },
      });

      return {
        objects: objects.map((object) => ({
          ...object,
          fields: sortByPosition(object.fields),
          views: sortByPosition(object.views).map((view) => ({
            ...view,
            config: parseViewConfig(view.config),
          })),
          recordLayouts: object.recordLayouts,
        })),
      };
    },
    catch: (cause) => databaseError("getCrmPlatformShell", cause),
  });
}

export async function getCrmObjectWorkspace(
  db: Database,
  input: {
    objectKey: CrmObjectKey;
    viewId?: string | null;
    filters?: Array<{ fieldKey: string; operator: string; value?: unknown }>;
  },
): Promise<Result<unknown, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const objectKey = crmObjectKeySchema.parse(input.objectKey);
      const object = await getCrmObjectDefinition(db, objectKey);
      const activeView =
        (input.viewId ? object.views.find((view) => view.id === input.viewId) : null) ||
        object.views.find((view) => view.isDefault) ||
        object.views[0] ||
        null;
      const viewFilters = "filters" in activeView.config ? activeView.config.filters : [];
      const viewSorts = "sorts" in activeView.config ? activeView.config.sorts : [];
      const records = await listObjectRecords(db, objectKey);
      const filtered = applyViewFilters(records, [...viewFilters, ...(input.filters || [])]);
      const sorted = applyViewSorts(filtered, viewSorts);

      return {
        object,
        fields: object.fields,
        views: object.views,
        layouts: object.recordLayouts,
        activeView,
        records: sorted,
        recordGroups: groupRecords(sorted, activeView.config),
      };
    },
    catch: (cause) => databaseError("getCrmObjectWorkspace", cause),
  });
}

async function findObjectRecord(db: Database, objectKey: CrmObjectKey, recordId: string) {
  switch (objectKey) {
    case "contacts": {
      const contact = await db.query.crmContacts.findFirst({
        where: { id: recordId },
        with: { companyRecord: true, deals: true, notes: true, tickets: true },
      });
      if (contact) return contact;
      return (
        (await listCrmContacts(db).then((res) => res.unwrap())).find(
          (entry) => entry.id === recordId,
        ) || null
      );
    }
    case "companies":
      return await db.query.crmCompanies.findFirst({
        where: { id: recordId },
        with: { contacts: true, primaryContact: true, notes: true, invoices: true },
      });
    case "deals":
      return await db.query.crmDeals.findFirst({
        where: { id: recordId },
        with: { contact: true, order: true, owner: true, notes: true, quotes: true },
      });
    case "tickets":
      return await db.query.crmTickets.findFirst({
        where: { id: recordId },
        with: { contact: true, customer: true, owner: true },
      });
    case "tasks":
      return await db.query.crmTasks.findFirst({
        where: { id: recordId },
        with: {
          owner: true,
          creator: true,
          contact: true,
          company: true,
          deal: true,
          ticket: true,
        },
      });
    case "products":
      return await db.query.crmProducts.findFirst({
        where: { id: recordId },
      });
    case "line_items":
      return await db.query.crmLineItems.findFirst({
        where: { id: recordId },
        with: { deal: true, product: true },
      });
    case "subscriptions":
      return await db.query.crmSubscriptions.findFirst({
        where: { id: recordId },
        with: { customer: true, company: true, contact: true, product: true },
      });
    case "customers":
      return await db.query.customers.findFirst({
        where: { id: recordId },
        with: { party: true, orders: true },
      });
    case "orders":
      return await db.query.orders.findFirst({
        where: { id: recordId },
        with: { customer: true, party: true },
      });
    case "quotes":
      return await db.query.crmQuotes.findFirst({
        where: { id: recordId },
        with: { contact: true, deal: true, owner: true },
      });
    case "invoices":
      return await db.query.crmInvoices.findFirst({
        where: { id: recordId },
        with: { contact: true, company: true, order: true, quote: true, owner: true },
      });
    case "transactions":
      return await db.query.payments.findFirst({
        where: { id: recordId },
        with: { customer: true, party: true, order: true, user: true },
      });
    case "segments":
      return await db.query.crmSegments.findFirst({
        where: { id: recordId },
      });
    default:
      return null;
  }
}

function normalizeTimelineEntry(entry: {
  id: string;
  type: string;
  occurredAt: Date | string | number | null;
  title: string;
  description?: string | null;
  status?: string | null;
  actor?: string | null;
  href?: string | null;
}) {
  return {
    ...entry,
    occurredAt: entry.occurredAt ? new Date(entry.occurredAt) : null,
    description: entry.description || null,
    status: entry.status || null,
    actor: entry.actor || null,
    href: entry.href || null,
  };
}

interface CrmRecordTimelineInput {
  id?: string | null;
  contactId?: string | null;
  contact?: { id?: string | null } | null;
  customerId?: string | null;
  customer?: { id?: string | null } | null;
  contacts?: Array<{ id: string }> | null;
}

async function buildCrmRecordTimeline(
  db: Database,
  objectKey: CrmObjectKey,
  recordId: string,
  record: CrmRecordTimelineInput,
) {
  const [activities, tasks] = await Promise.all([
    db.query.crmRecordActivity.findMany({
      where: { objectKey: objectKey, recordId: recordId },
      orderBy: (t, { desc }) => [desc(t.occurredAt)],
      with: { actor: true, task: true, note: true, ticket: true, deal: true },
    }),
    db.query.crmTasks.findMany({
      where: { relatedObjectKey: objectKey, relatedRecordId: recordId },
      orderBy: (t, { desc }) => [desc(t.updatedAt)],
      with: { owner: true, creator: true },
    }),
  ]);

  const timeline = [
    ...activities.map((activity) =>
      normalizeTimelineEntry({
        id: `activity:${activity.id}`,
        type: activity.activityType,
        occurredAt: activity.occurredAt,
        title: activity.title,
        description: activity.body,
        actor: activity.actor?.name || activity.actor?.email || null,
      }),
    ),
    ...tasks.map((task) =>
      normalizeTimelineEntry({
        id: `task:${task.id}`,
        type: "task",
        occurredAt: task.completedAt || task.dueAt || task.updatedAt,
        title: task.title,
        description: task.body,
        status: task.status,
        actor:
          task.owner?.name ||
          task.owner?.email ||
          task.creator?.name ||
          task.creator?.email ||
          null,
      }),
    ),
  ];

  const contactId =
    objectKey === "contacts"
      ? record.id
      : typeof record.contactId === "string"
        ? record.contactId
        : record.contact?.id;
  const customerId =
    objectKey === "customers"
      ? record.id
      : typeof record.customerId === "string"
        ? record.customerId
        : record.customer?.id || null;

  if (contactId) {
    const [notes, deals, tickets] = await Promise.all([
      db.query.crmNotes.findMany({
        where: { contactId: contactId },
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        with: { author: true },
      }),
      db.query.crmDeals.findMany({
        where: { contactId: contactId },
        orderBy: (t, { desc }) => [desc(t.updatedAt)],
        with: { contact: true },
      }),
      db.query.crmTickets.findMany({
        where: { contactId: contactId },
        orderBy: (t, { desc }) => [desc(t.updatedAt)],
        with: { customer: true, contact: true },
      }),
    ]);

    timeline.push(
      ...notes.map((note) =>
        normalizeTimelineEntry({
          id: `note:${note.id}`,
          type: "note",
          occurredAt: note.createdAt,
          title: "CRM note",
          description: note.body,
          actor: note.author?.name || note.author?.email || null,
        }),
      ),
      ...deals.map((deal) =>
        normalizeTimelineEntry({
          id: `deal:${deal.id}`,
          type: "deal",
          occurredAt: deal.updatedAt,
          title: deal.title,
          description: `Pipeline deal · ${Number(deal.value || 0) / 100} ${deal.currency || "NGN"}`,
          status: deal.stage,
          actor: deal.contact?.email ?? "",
          href: `/crm/deals/${deal.id}`,
        }),
      ),
      ...tickets.map((ticket) =>
        normalizeTimelineEntry({
          id: `ticket:${ticket.id}`,
          type: "ticket",
          occurredAt: ticket.updatedAt,
          title: ticket.subject,
          description: `Support ticket · priority ${ticket.priority || "medium"}`,
          status: ticket.status,
          actor: ticket.contact?.email || ticket.customer?.email || null,
        }),
      ),
    );
  }

  if (customerId) {
    const customerOrders = await db.query.orders.findMany({
      where: { customerId: customerId },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    timeline.push(
      ...customerOrders.map((order) =>
        normalizeTimelineEntry({
          id: `order:${order.id}`,
          type: "order",
          occurredAt: order.createdAt,
          title: `Order #${order.orderNumber || order.sourceId || order.id.slice(0, 8).toUpperCase()}`,
          description: `Order ${order.status} · ${Number(order.total || 0) / 100} ${order.currency || "NGN"}`,
          status: order.status,
          href: `/orders/${order.id}`,
        }),
      ),
    );
  }

  if (objectKey === "companies") {
    const companyWorkspace = (await getCrmCompanyWorkspace(db, recordId).then((res) =>
      res.unwrap(),
    )) as { timeline: Array<{ occurredAt: Date }> } | null;
    if (companyWorkspace) {
      timeline.push(
        ...companyWorkspace.timeline.map((entry) =>
          normalizeTimelineEntry(entry as Parameters<typeof normalizeTimelineEntry>[0]),
        ),
      );
    }
  }

  const auditLogs = await db.query.adminAuditLogs.findMany({
    where: { entityId: recordId },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    with: { actor: true },
    limit: 25,
  });

  timeline.push(
    ...auditLogs.map((audit) =>
      normalizeTimelineEntry({
        id: `audit:${audit.id}`,
        type: "audit",
        occurredAt: audit.createdAt,
        title: audit.summary,
        description: audit.action,
        actor: audit.actor?.name || audit.actor?.email || null,
      }),
    ),
  );

  return timeline.sort(
    (left, right) =>
      new Date(right.occurredAt || 0).getTime() - new Date(left.occurredAt || 0).getTime(),
  );
}

export async function getCrmRecordWorkspace(
  db: Database,
  input: {
    objectKey: CrmObjectKey;
    recordId: string;
  },
): Promise<Result<unknown, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const objectKey = crmObjectKeySchema.parse(input.objectKey);
      const object = await getCrmObjectDefinition(db, objectKey);
      const record = await findObjectRecord(db, objectKey, input.recordId);

      if (!record) return null;

      const defaultLayout =
        object.recordLayouts.find((layout) => layout.isDefault) || object.recordLayouts[0] || null;
      const timeline = await buildCrmRecordTimeline(db, objectKey, input.recordId, record);

      const extra: Record<string, unknown> = {};
      if (objectKey === "companies") {
        const allContacts = await listCrmContacts(db).then((res) => res.unwrap());
        const assignedContactIds = new Set(
          (record as { contacts?: Array<{ id: string }> }).contacts?.map((c) => c.id) || [],
        );
        extra.availableContacts = allContacts.filter((c) => !assignedContactIds.has(c.id));
      }

      return {
        object,
        fields: object.fields,
        views: object.views,
        layout: {
          ...defaultLayout,
          config: safeParseJson(defaultLayout.config),
        },
        record,
        timeline,
        tasks: timeline.filter((entry) => entry.type === "task"),
        ...extra,
      };
    },
    catch: (cause) => databaseError("getCrmRecordWorkspace", cause),
  });
}

export async function saveCrmView(
  db: Database,
  input: SaveCrmView,
): Promise<Result<DbCrmView, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const data = saveCrmViewInputSchema.parse(input);
      if (data.config.type !== data.type) {
        throw new Error("CRM view config type must match view type");
      }

      const object = await getCrmObjectDefinition(db, data.objectKey);
      const now = new Date();

      if (data.isDefault) {
        await db
          .update(crmViews)
          .set({ isDefault: false, updatedAt: now })
          .where(eq(crmViews.objectId, object.id));
      }

      if (!data.id) {
        const [created] = await db
          .insert(crmViews)
          .values({
            id: crypto.randomUUID(),
            objectId: object.id,
            ownerUserId: data.ownerUserId || null,
            name: data.name,
            type: data.type,
            visibility: data.visibility,
            config: JSON.stringify(data.config),
            isDefault: data.isDefault ?? false,
            createdBy: data.actorUserId || null,
            updatedBy: data.actorUserId || null,
            position: data.position ?? object.views.length * 10,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        const createdRow = created as DbCrmView | undefined;
        if (!createdRow) {
          throw new Error("Failed to create view");
        }
        return createdRow;
      }

      const [updated] = await db
        .update(crmViews)
        .set({
          ownerUserId: data.ownerUserId || null,
          name: data.name,
          type: data.type,
          visibility: data.visibility,
          config: JSON.stringify(data.config),
          isDefault: data.isDefault ?? false,
          updatedBy: data.actorUserId || null,
          position: data.position ?? undefined,
          updatedAt: now,
        })
        .where(and(eq(crmViews.id, data.id), eq(crmViews.objectId, object.id)))
        .returning();

      const updatedRow = updated as DbCrmView | undefined;
      if (!updatedRow) {
        throw new Error("Failed to update view");
      }
      return updatedRow;
    },
    catch: (cause) => databaseError("saveCrmView", cause),
  });
}

export async function deleteCrmView(
  db: Database,
  data: { id: string },
): Promise<Result<unknown, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const [deleted] = await db.delete(crmViews).where(eq(crmViews.id, data.id)).returning();
      return deleted;
    },
    catch: (cause) => databaseError("deleteCrmView", cause),
  });
}

export async function toggleCrmViewFavorite(
  db: Database,
  data: { viewId: string; userId: string },
): Promise<Result<unknown, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const existing = await db.query.crmViewFavorites.findFirst({
        where: { viewId: data.viewId, userId: data.userId },
      });

      if (existing) {
        await db.delete(crmViewFavorites).where(eq(crmViewFavorites.id, existing.id));
        return { isFavorite: false };
      } else {
        const id = crypto.randomUUID();
        await db.insert(crmViewFavorites).values({
          id,
          viewId: data.viewId,
          userId: data.userId,
          createdAt: new Date(),
        });
        return { isFavorite: true };
      }
    },
    catch: (cause) => databaseError("toggleCrmViewFavorite", cause),
  });
}

function buildTaskRecordRefs(input: SaveCrmTask) {
  return {
    contactId: input.relatedObjectKey === "contacts" ? input.relatedRecordId : null,
    companyId: input.relatedObjectKey === "companies" ? input.relatedRecordId : null,
    dealId: input.relatedObjectKey === "deals" ? input.relatedRecordId : null,
    ticketId: input.relatedObjectKey === "tickets" ? input.relatedRecordId : null,
    customerId: input.relatedObjectKey === "customers" ? input.relatedRecordId : null,
  };
}

export async function saveCrmTask(
  db: Database,
  input: SaveCrmTask,
): Promise<Result<DbCrmTask, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const data = saveCrmTaskInputSchema.parse(input);
      await getCrmObjectDefinition(db, data.relatedObjectKey);
      const now = new Date();
      const completedAt =
        data.status === "done" ? data.completedAt || now : data.completedAt || null;
      const refs = buildTaskRecordRefs(data);

      if (!data.id) {
        const rows = await db
          .insert(crmTasks)
          .values({
            id: crypto.randomUUID(),
            relatedObjectKey: data.relatedObjectKey,
            relatedRecordId: data.relatedRecordId,
            ...refs,
            title: data.title,
            body: data.body || null,
            status: data.status || "todo",
            priority: data.priority || "medium",
            dueAt: data.dueAt || null,
            completedAt,
            assignedTo: data.assignedTo || null,
            createdBy: data.createdBy || null,
            metadata: stringifyJson(data.metadata || null),
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        const created = rows[0] as DbCrmTask | undefined;
        if (!created) {
          throw new Error("Failed to create task");
        }

        await appendCrmRecordActivity(db, {
          objectKey: data.relatedObjectKey,
          recordId: data.relatedRecordId,
          activityType: "task",
          title: `Task created: ${data.title}`,
          body: data.body || null,
          actorUserId: data.createdBy || null,
          taskId: created.id,
          occurredAt: now,
        });
        return created;
      }

      const rows = await db
        .update(crmTasks)
        .set({
          relatedObjectKey: data.relatedObjectKey,
          relatedRecordId: data.relatedRecordId,
          ...refs,
          title: data.title,
          body: data.body || null,
          status: data.status || "todo",
          priority: data.priority || "medium",
          dueAt: data.dueAt || null,
          completedAt,
          assignedTo: data.assignedTo || null,
          metadata: stringifyJson(data.metadata || null),
          updatedAt: now,
        })
        .where(eq(crmTasks.id, data.id))
        .returning();

      const updated = rows[0] as DbCrmTask | undefined;
      if (!updated) {
        throw new Error("Failed to update task");
      }

      await appendCrmRecordActivity(db, {
        objectKey: data.relatedObjectKey,
        recordId: data.relatedRecordId,
        activityType: "task",
        title: `Task updated: ${data.title}`,
        body: data.body || null,
        actorUserId: data.createdBy || null,
        taskId: updated.id,
        occurredAt: now,
      });
      return updated;
    },
    catch: (cause) => databaseError("saveCrmTask", cause),
  });
}

export async function appendCrmRecordActivity(
  db: Database,
  input: AppendCrmRecordActivity,
): Promise<Result<unknown, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const data = appendCrmRecordActivityInputSchema.parse(input);
      await getCrmObjectDefinition(db, data.objectKey);
      const now = new Date();
      const [created] = await db
        .insert(crmRecordActivity)
        .values({
          id: crypto.randomUUID(),
          objectKey: data.objectKey,
          recordId: data.recordId,
          activityType: data.activityType,
          title: data.title,
          body: data.body || null,
          payload: stringifyJson(data.payload || null),
          actorUserId: data.actorUserId || null,
          taskId: data.taskId || null,
          noteId: data.noteId || null,
          ticketId: data.ticketId || null,
          dealId: data.dealId || null,
          occurredAt: data.occurredAt || now,
          createdAt: now,
        })
        .returning();

      return created;
    },
    catch: (cause) => databaseError("appendCrmRecordActivity", cause),
  });
}

async function readMetadataRecord(db: Database, objectKey: CrmObjectKey, recordId: string) {
  switch (objectKey) {
    case "contacts":
      return await db.query.crmContacts.findFirst({ where: { id: recordId } });
    case "companies":
      return await db.query.crmCompanies.findFirst({ where: { id: recordId } });
    case "deals":
      return await db.query.crmDeals.findFirst({ where: { id: recordId } });
    case "tickets":
      return await db.query.crmTickets.findFirst({ where: { id: recordId } });
    case "quotes":
      return await db.query.crmQuotes.findFirst({ where: { id: recordId } });
    case "invoices":
      return await db.query.crmInvoices.findFirst({ where: { id: recordId } });
    case "customers":
      return await db.query.customers.findFirst({ where: { id: recordId } });
    case "orders":
      return await db.query.orders.findFirst({ where: { id: recordId } });
    case "transactions":
      return await db.query.payments.findFirst({ where: { id: recordId } });
    default:
      return null;
  }
}

async function writeRecordMetadata(
  db: Database,
  objectKey: CrmObjectKey,
  recordId: string,
  metadata: string,
) {
  const now = new Date();
  switch (objectKey) {
    case "contacts":
      return (
        await db
          .update(crmContacts)
          .set({ metadata, updatedAt: now })
          .where(eq(crmContacts.id, recordId))
          .returning()
      )[0];
    case "companies":
      return (
        await db
          .update(crmCompanies)
          .set({ metadata, updatedAt: now })
          .where(eq(crmCompanies.id, recordId))
          .returning()
      )[0];
    case "deals":
      return (
        await db
          .update(crmDeals)
          .set({ metadata, updatedAt: now })
          .where(eq(crmDeals.id, recordId))
          .returning()
      )[0];
    case "tickets":
      return (
        await db
          .update(crmTickets)
          .set({ metadata, updatedAt: now })
          .where(eq(crmTickets.id, recordId))
          .returning()
      )[0];
    case "quotes":
      return (
        await db
          .update(crmQuotes)
          .set({ metadata, updatedAt: now })
          .where(eq(crmQuotes.id, recordId))
          .returning()
      )[0];
    case "invoices":
      return (
        await db
          .update(crmInvoices)
          .set({ metadata, updatedAt: now })
          .where(eq(crmInvoices.id, recordId))
          .returning()
      )[0];
    case "customers":
      return (
        await db
          .update(customers)
          .set({ metadata, updatedAt: now })
          .where(eq(customers.id, recordId))
          .returning()
      )[0];
    case "transactions":
      return (
        await db
          .update(payments)
          .set({ metadata, updatedAt: now })
          .where(eq(payments.id, recordId))
          .returning()
      )[0];
    default:
      throw new Error(`CRM object ${objectKey} does not support metadata-backed fields`);
  }
}

export async function saveCrmRecordField(
  db: Database,
  input: SaveCrmRecordField,
): Promise<Result<unknown, DatabaseError>> {
  return Result.tryPromise({
    try: async () => {
      const data = saveCrmRecordFieldInputSchema.parse(input);
      const object = await getCrmObjectDefinition(db, data.objectKey);
      const field = object.fields.find((entry) => entry.key === data.fieldKey);

      if (!field) {
        throw new Error(`CRM field ${data.fieldKey} is not configured for ${data.objectKey}`);
      }
      if (field.isReadonly || field.storageKind !== "metadata_json") {
        throw new Error(`CRM field ${data.fieldKey} is not writable through metadata storage`);
      }

      const record = await readMetadataRecord(db, data.objectKey, data.recordId);
      if (!record) {
        throw new Error(`CRM record ${data.recordId} was not found`);
      }

      const currentMetadata = safeParseJson((record as { metadata?: string | null }).metadata);
      const nextMetadata = {
        ...currentMetadata,
        crmFields: {
          ...currentMetadata.crmFields,
          [data.fieldKey]: data.value,
        },
      };
      const updated = await writeRecordMetadata(
        db,
        data.objectKey,
        data.recordId,
        JSON.stringify(nextMetadata),
      );

      await appendCrmRecordActivity(db, {
        objectKey: data.objectKey,
        recordId: data.recordId,
        activityType: "audit",
        title: `Updated field ${field.label}`,
        payload: { fieldKey: data.fieldKey },
        actorUserId: data.actorUserId || null,
      });

      return updated;
    },
    catch: (cause) => databaseError("saveCrmRecordField", cause),
  });
}
