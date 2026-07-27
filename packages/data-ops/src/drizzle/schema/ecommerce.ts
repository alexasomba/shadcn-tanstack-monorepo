import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index, uniqueIndex, check } from "drizzle-orm/sqlite-core";

import { organization, user } from "./auth";

// --- Parties ---
export const parties = sqliteTable(
  "parties",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),
    email: text("email").notNull().unique(),
    name: text("name"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    phone: text("phone"),
    kind: text("kind", { enum: ["lead", "customer", "affiliate", "company_contact"] })
      .default("customer")
      .notNull(),
    source: text("source").default("internal").notNull(),
    metadata: text("metadata"), // JSON
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("parties_user_id_uidx").on(table.userId),
    index("parties_organization_id_idx").on(table.organizationId),
    index("parties_kind_idx").on(table.kind),
  ],
);

// --- Customers ---
export const customers = sqliteTable(
  "customers",
  {
    id: text("id").primaryKey(),
    sourceSystem: text("source_system").default("internal"),
    sourceId: text("source_id"),
    sourceUpdatedAt: integer("source_updated_at", { mode: "timestamp" }),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
    syncHash: text("sync_hash"),
    sourceSnapshot: text("source_snapshot"),
    partyId: text("party_id").references(() => parties.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),
    email: text("email").notNull().unique(),
    paystackCustomerCode: text("paystack_customer_code"),
    name: text("name"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    onesignalId: text("onesignal_id"),
    isGuest: integer("is_guest", { mode: "boolean" }).default(true).notNull(),
    metadata: text("metadata"),
    abandonedCartCount: integer("abandoned_cart_count").default(0).notNull(),
    lastPurchaseAt: integer("last_purchase_at", { mode: "timestamp" }),
    phone: text("phone"),
    addressStreet: text("address_street"),
    addressStreet2: text("address_street2"),
    addressCity: text("address_city"),
    addressState: text("address_state"),
    addressZip: text("address_zip"),
    addressCountry: text("address_country"),
    walletBalance: integer("wallet_balance").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("customers_party_id_uidx").on(table.partyId),
    index("customers_user_id_idx").on(table.userId),
    index("customers_organization_id_idx").on(table.organizationId),
    index("customers_source_system_source_id_idx").on(table.sourceSystem, table.sourceId),
    check("customers_abandoned_cart_count_nonnegative_chk", sql`${table.abandonedCartCount} >= 0`),
    check("customers_wallet_balance_nonnegative_chk", sql`${table.walletBalance} >= 0`),
  ],
);

// --- Orders ---
export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    sourceSystem: text("source_system").default("internal"),
    sourceId: text("source_id"),
    sourceUpdatedAt: integer("source_updated_at", { mode: "timestamp" }),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
    syncHash: text("sync_hash"),
    sourceSnapshot: text("source_snapshot"),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    purchaseScope: text("purchase_scope", { enum: ["personal", "organization"] })
      .default("personal")
      .notNull(),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),
    orderNumber: text("order_number"),
    externalStatus: text("external_status"),
    status: text("status", {
      enum: [
        "draft",
        "pending",
        "paid",
        "processing",
        "shipped",
        "completed",
        "refunded",
        "failed",
        "cancelled",
      ],
    }).default("draft"),
    total: integer("total").notNull(),
    discountAmount: integer("discount_amount").default(0).notNull(),
    couponCode: text("coupon_code"),
    currency: text("currency").default("NGN"),
    paymentStatus: text("payment_status").default("unpaid"),
    paymentReference: text("payment_reference"),
    shippingMethod: text("shipping_method"),
    shippingCost: integer("shipping_cost").default(0).notNull(),
    taxAmount: integer("tax_amount").default(0).notNull(),
    billingFirstName: text("billing_first_name"),
    billingLastName: text("billing_last_name"),
    billingCompany: text("billing_company"),
    billingEmail: text("billing_email"),
    billingPhone: text("billing_phone"),
    billingAddressStreet: text("billing_address_street"),
    billingAddressStreet2: text("billing_address_street2"),
    billingAddressCity: text("billing_address_city"),
    billingAddressState: text("billing_address_state"),
    billingAddressZip: text("billing_address_zip"),
    billingAddressCountry: text("billing_address_country"),
    shippingFirstName: text("shipping_first_name"),
    shippingLastName: text("shipping_last_name"),
    shippingCompany: text("shipping_company"),
    shippingAddressStreet: text("shipping_address_street"),
    shippingAddressStreet2: text("shipping_address_street2"),
    shippingAddressCity: text("shipping_address_city"),
    shippingAddressState: text("shipping_address_state"),
    shippingAddressZip: text("shipping_address_zip"),
    shippingAddressCountry: text("shipping_address_country"),
    customerPhone: text("customer_phone"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index("orders_customer_id_idx").on(table.customerId),
    index("orders_organization_id_idx").on(table.organizationId),
  ],
);

// --- Payments (HubSpot Tracked Commerce Payments / Transactions) ---
export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    sourceSystem: text("source_system").default("internal"),
    sourceId: text("source_id"),
    sourceUpdatedAt: integer("source_updated_at", { mode: "timestamp" }),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
    syncHash: text("sync_hash"),
    sourceSnapshot: text("source_snapshot"),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
    partyId: text("party_id").references(() => parties.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    provider: text("provider").default("paystack").notNull(),
    providerReference: text("provider_reference").notNull().unique(),
    transactionId: text("transaction_id"),
    paymentMethod: text("payment_method"),
    paymentMethodTitle: text("payment_method_title"),
    authTransactionId: text("auth_transaction_id"),
    kind: text("kind", { enum: ["payment", "refund", "credit"] })
      .default("payment")
      .notNull(),
    source: text("source", { enum: ["checkout", "crm", "migration", "manual", "webhook"] })
      .default("manual")
      .notNull(),
    status: text("status", {
      enum: ["pending", "authorized", "completed", "failed", "refunded", "cancelled"],
    })
      .default("pending")
      .notNull(),
    currency: text("currency").default("NGN").notNull(),
    amountTotal: integer("amount_total").notNull(),
    amountFee: integer("amount_fee").default(0).notNull(),
    amountTax: integer("amount_tax").default(0).notNull(),
    amountShipping: integer("amount_shipping").default(0).notNull(),
    amountDiscount: integer("amount_discount").default(0).notNull(),
    paidAt: integer("paid_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index("payments_order_id_idx").on(table.orderId),
    index("payments_customer_id_idx").on(table.customerId),
    index("payments_party_id_idx").on(table.partyId),
    index("payments_user_id_idx").on(table.userId),
    index("payments_status_completed_at_idx").on(table.status, table.completedAt),
    check("payments_amount_total_nonnegative_chk", sql`${table.amountTotal} >= 0`),
  ],
);
