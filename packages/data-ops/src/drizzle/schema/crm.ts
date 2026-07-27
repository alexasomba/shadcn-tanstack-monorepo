import { sql } from "drizzle-orm";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { sqliteTable, text, integer, index, uniqueIndex, check } from "drizzle-orm/sqlite-core";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

import { organization, user } from "./auth";
import { customers, orders, parties } from "./ecommerce";

// --- CRM Contacts ---
export const crmContacts = sqliteTable(
  "crm_contacts",
  {
    id: text("id").primaryKey(),
    partyId: text("party_id").references(() => parties.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    companyId: text("company_id").references((): AnySQLiteColumn => crmCompanies.id, {
      onDelete: "set null",
    }),
    firstName: text("first_name"),
    lastName: text("last_name"),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    jobTitle: text("job_title"),
    company: text("company"),
    linkedinUrl: text("linkedin_url"),
    source: text("source"), // e.g., "referral", "inbound", "outbound"
    status: text("status", { enum: ["lead", "prospect", "customer", "lost"] }).default("lead"),
    marketingStatus: text("marketing_status", {
      enum: ["subscribed", "unsubscribed", "cleaned"],
    }).default("subscribed"),
    marketingSubscribedAt: integer("marketing_subscribed_at", { mode: "timestamp" }),
    marketingUnsubscribedAt: integer("marketing_unsubscribed_at", { mode: "timestamp" }),
    lastMarketingEngagementAt: integer("last_marketing_engagement_at", { mode: "timestamp" }),
    metadata: text("metadata"), // JSON
    prefix: text("prefix"),
    lastContactedAt: integer("last_contacted_at", { mode: "timestamp" }),
    externalId: text("external_id"),
    externalSource: text("external_source"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("crm_contacts_party_id_uidx").on(table.partyId),
    index("crm_contacts_user_id_idx").on(table.userId),
    index("crm_contacts_company_id_idx").on(table.companyId),
    index("crm_contacts_status_idx").on(table.status),
    index("crm_contacts_marketing_status_idx").on(table.marketingStatus),
    index("crm_contacts_external_source_external_id_idx").on(
      table.externalSource,
      table.externalId,
    ),
  ],
);

// --- CRM Objects (Dynamic System Metadata) ---
export const crmObjects = sqliteTable(
  "crm_objects",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    tableName: text("table_name"),
    labelSingular: text("label_singular").notNull(),
    labelPlural: text("label_plural").notNull(),
    description: text("description"),
    sourceType: text("source_type", { enum: ["system", "custom"] })
      .default("system")
      .notNull(),
    routePath: text("route_path"),
    iconKey: text("icon_key"),
    color: text("color"),
    primaryLabelFieldKey: text("primary_label_field_key"),
    primaryImageFieldKey: text("primary_image_field_key"),
    defaultViewType: text("default_view_type", { enum: ["table", "kanban", "calendar"] })
      .default("table")
      .notNull(),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    isAuditEnabled: integer("is_audit_enabled", { mode: "boolean" }).default(true).notNull(),
    position: integer("position").default(0).notNull(),
    externalId: text("external_id"),
    externalSource: text("external_source"),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("crm_objects_key_uidx").on(table.key),
    index("crm_objects_source_type_idx").on(table.sourceType),
    index("crm_objects_active_position_idx").on(table.isActive, table.position),
    index("crm_objects_external_idx").on(table.externalSource, table.externalId),
  ],
);

// --- CRM Fields ---
export const crmFields = sqliteTable(
  "crm_fields",
  {
    id: text("id").primaryKey(),
    objectId: text("object_id")
      .notNull()
      .references(() => crmObjects.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    type: text("type", {
      enum: [
        "text",
        "rich_text",
        "number",
        "boolean",
        "date",
        "datetime",
        "currency",
        "select",
        "multi_select",
        "email",
        "phone",
        "url",
        "json",
        "relation",
        "actor",
        "rating",
        "file",
        "address",
        "full_name",
      ],
    })
      .default("text")
      .notNull(),
    storageKind: text("storage_kind", {
      enum: ["column", "metadata_json", "computed", "relation"],
    })
      .default("metadata_json")
      .notNull(),
    sourceColumn: text("source_column"),
    relationObjectKey: text("relation_object_key"),
    relationType: text("relation_type", { enum: ["one", "many"] }),
    options: text("options"),
    validation: text("validation"),
    defaultValue: text("default_value"),
    isSystem: integer("is_system", { mode: "boolean" }).default(false).notNull(),
    isVisible: integer("is_visible", { mode: "boolean" }).default(true).notNull(),
    isReadonly: integer("is_readonly", { mode: "boolean" }).default(false).notNull(),
    isRequired: integer("is_required", { mode: "boolean" }).default(false).notNull(),
    isFilterable: integer("is_filterable", { mode: "boolean" }).default(true).notNull(),
    isSortable: integer("is_sortable", { mode: "boolean" }).default(false).notNull(),
    position: integer("position").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("crm_fields_object_key_uidx").on(table.objectId, table.key),
    index("crm_fields_object_position_idx").on(table.objectId, table.position),
    index("crm_fields_relation_object_idx").on(table.relationObjectKey),
  ],
);

// --- CRM Views ---
export const crmViews = sqliteTable(
  "crm_views",
  {
    id: text("id").primaryKey(),
    objectId: text("object_id")
      .notNull()
      .references(() => crmObjects.id, { onDelete: "cascade" }),
    ownerUserId: text("owner_user_id").references(() => user.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    type: text("type", { enum: ["table", "kanban", "calendar"] })
      .default("table")
      .notNull(),
    visibility: text("visibility", { enum: ["workspace", "private", "unlisted"] })
      .default("workspace")
      .notNull(),
    config: text("config").notNull(),
    isDefault: integer("is_default", { mode: "boolean" }).default(false).notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    position: integer("position").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index("crm_views_object_type_idx").on(table.objectId, table.type),
    index("crm_views_object_default_idx").on(table.objectId, table.isDefault),
    index("crm_views_owner_user_id_idx").on(table.ownerUserId),
  ],
);

// --- CRM View Favorites ---
export const crmViewFavorites = sqliteTable(
  "crm_view_favorites",
  {
    id: text("id").primaryKey(),
    viewId: text("view_id")
      .notNull()
      .references(() => crmViews.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("crm_view_favorites_view_user_uidx").on(table.viewId, table.userId),
    index("crm_view_favorites_user_idx").on(table.userId),
  ],
);

// --- CRM Record Layouts ---
export const crmRecordLayouts = sqliteTable(
  "crm_record_layouts",
  {
    id: text("id").primaryKey(),
    objectId: text("object_id")
      .notNull()
      .references(() => crmObjects.id, { onDelete: "cascade" }),
    ownerUserId: text("owner_user_id").references(() => user.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    visibility: text("visibility", { enum: ["workspace", "private"] })
      .default("workspace")
      .notNull(),
    config: text("config").notNull(),
    isDefault: integer("is_default", { mode: "boolean" }).default(false).notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index("crm_record_layouts_object_default_idx").on(table.objectId, table.isDefault),
    index("crm_record_layouts_owner_user_id_idx").on(table.ownerUserId),
  ],
);

// --- Customer Channel Subscriptions ---
export const customerChannelSubscriptions = sqliteTable(
  "customer_channel_subscriptions",
  {
    id: text("id").primaryKey(),
    contactId: text("contact_id").references(() => crmContacts.id, { onDelete: "set null" }),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    channel: text("channel", { enum: ["email", "push"] }).notNull(),
    provider: text("provider", { enum: ["onesignal"] })
      .default("onesignal")
      .notNull(),
    providerSubscriptionId: text("provider_subscription_id"),
    providerUserId: text("provider_user_id"),
    externalId: text("external_id"),
    tokenHash: text("token_hash"),
    tokenMasked: text("token_masked"),
    status: text("status", {
      enum: ["subscribed", "unsubscribed", "cleaned", "blocked", "unknown"],
    })
      .default("unknown")
      .notNull(),
    source: text("source", {
      enum: [
        "signup",
        "checkout",
        "account_preference",
        "admin",
        "webhook",
        "import",
        "sdk_sync",
        "system",
      ],
    })
      .default("system")
      .notNull(),
    permissionState: text("permission_state", {
      enum: ["granted", "denied", "default", "prompt", "unsupported", "unknown"],
    })
      .default("unknown")
      .notNull(),
    optedIn: integer("opted_in", { mode: "boolean" }),
    subscribedAt: integer("subscribed_at", { mode: "timestamp" }),
    unsubscribedAt: integer("unsubscribed_at", { mode: "timestamp" }),
    cleanedAt: integer("cleaned_at", { mode: "timestamp" }),
    blockedAt: integer("blocked_at", { mode: "timestamp" }),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("customer_channel_subscriptions_provider_subscription_uidx").on(
      table.provider,
      table.channel,
      table.providerSubscriptionId,
    ),
    uniqueIndex("customer_channel_subscriptions_provider_token_uidx").on(
      table.provider,
      table.channel,
      table.tokenHash,
    ),
    index("customer_channel_subscriptions_contact_idx").on(table.contactId),
    index("customer_channel_subscriptions_customer_idx").on(table.customerId),
    index("customer_channel_subscriptions_user_idx").on(table.userId),
    index("customer_channel_subscriptions_status_idx").on(table.status),
    index("customer_channel_subscriptions_channel_status_idx").on(table.channel, table.status),
    index("customer_channel_subscriptions_external_idx").on(table.provider, table.externalId),
  ],
);

// --- CRM Deals ---
export const crmDeals = sqliteTable(
  "crm_deals",
  {
    id: text("id").primaryKey(),
    contactId: text("contact_id").references(() => crmContacts.id, { onDelete: "cascade" }),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    value: integer("value").notNull(), // in cents
    currency: text("currency").default("NGN"),
    pipelineId: text("pipeline_id"),
    stage: text("stage").default("discovery"),
    priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).default("medium"),
    assignedTo: text("assigned_to").references(() => user.id, { onDelete: "set null" }),
    expectedCloseDate: integer("expected_close_date", { mode: "timestamp" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    externalId: text("external_id"),
    externalSource: text("external_source"),
    metadata: text("metadata"), // JSON
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index("crm_deals_contact_id_idx").on(table.contactId),
    index("crm_deals_order_id_idx").on(table.orderId),
    index("crm_deals_assigned_to_idx").on(table.assignedTo),
    index("crm_deals_stage_priority_idx").on(table.stage, table.priority),
    index("crm_deals_expected_close_date_idx").on(table.expectedCloseDate),
    index("crm_deals_external_idx").on(table.externalSource, table.externalId),
    check("crm_deals_value_nonnegative_chk", sql`${table.value} >= 0`),
  ],
);

// --- CRM Companies ---
export const crmCompanies = sqliteTable(
  "crm_companies",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    primaryContactId: text("primary_contact_id").references((): AnySQLiteColumn => crmContacts.id, {
      onDelete: "set null",
    }),
    domain: text("domain"),
    website: text("website"),
    email: text("email"),
    phone: text("phone"),
    industry: text("industry"),
    externalId: text("external_id"),
    externalSource: text("external_source"),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index("crm_companies_organization_id_idx").on(table.organizationId),
    index("crm_companies_primary_contact_id_idx").on(table.primaryContactId),
    index("crm_companies_domain_idx").on(table.domain),
    index("crm_companies_external_idx").on(table.externalSource, table.externalId),
  ],
);

// --- CRM Notes ---
export const crmNotes = sqliteTable(
  "crm_notes",
  {
    id: text("id").primaryKey(),
    contactId: text("contact_id").references(() => crmContacts.id, { onDelete: "cascade" }),
    companyId: text("company_id").references(() => crmCompanies.id, { onDelete: "cascade" }),
    dealId: text("deal_id").references(() => crmDeals.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id").references(() => user.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    externalId: text("external_id"),
    externalSource: text("external_source"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index("crm_notes_contact_id_idx").on(table.contactId),
    index("crm_notes_company_id_idx").on(table.companyId),
    index("crm_notes_deal_id_idx").on(table.dealId),
    index("crm_notes_author_user_id_idx").on(table.authorUserId),
    index("crm_notes_created_at_idx").on(table.createdAt),
    index("crm_notes_external_idx").on(table.externalSource, table.externalId),
  ],
);

// --- CRM Tickets ---
export const crmTickets = sqliteTable(
  "crm_tickets",
  {
    id: text("id").primaryKey(),
    contactId: text("contact_id").references(() => crmContacts.id, { onDelete: "cascade" }),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    description: text("description"),
    pipelineId: text("pipeline_id"),
    status: text("status").default("open"),
    priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).default("medium"),
    assignedTo: text("assigned_to").references(() => user.id, { onDelete: "set null" }),
    externalId: text("external_id"),
    externalSource: text("external_source"),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index("crm_tickets_contact_id_idx").on(table.contactId),
    index("crm_tickets_customer_id_idx").on(table.customerId),
    index("crm_tickets_assigned_to_idx").on(table.assignedTo),
    index("crm_tickets_status_priority_idx").on(table.status, table.priority),
    index("crm_tickets_external_idx").on(table.externalSource, table.externalId),
  ],
);

// --- CRM Tasks ---
export const crmTasks = sqliteTable(
  "crm_tasks",
  {
    id: text("id").primaryKey(),
    relatedObjectKey: text("related_object_key").notNull(),
    relatedRecordId: text("related_record_id").notNull(),
    contactId: text("contact_id").references(() => crmContacts.id, { onDelete: "set null" }),
    companyId: text("company_id").references(() => crmCompanies.id, { onDelete: "set null" }),
    dealId: text("deal_id").references(() => crmDeals.id, { onDelete: "set null" }),
    ticketId: text("ticket_id").references(() => crmTickets.id, { onDelete: "set null" }),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    body: text("body"),
    status: text("status", { enum: ["todo", "in_progress", "done", "canceled"] })
      .default("todo")
      .notNull(),
    priority: text("priority", { enum: ["low", "medium", "high", "urgent"] })
      .default("medium")
      .notNull(),
    dueAt: integer("due_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    assignedTo: text("assigned_to").references(() => user.id, { onDelete: "set null" }),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    externalId: text("external_id"),
    externalSource: text("external_source"),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index("crm_tasks_related_record_idx").on(table.relatedObjectKey, table.relatedRecordId),
    index("crm_tasks_status_due_at_idx").on(table.status, table.dueAt),
    index("crm_tasks_assigned_to_idx").on(table.assignedTo),
    index("crm_tasks_contact_id_idx").on(table.contactId),
    index("crm_tasks_company_id_idx").on(table.companyId),
    index("crm_tasks_deal_id_idx").on(table.dealId),
    index("crm_tasks_ticket_id_idx").on(table.ticketId),
    index("crm_tasks_customer_id_idx").on(table.customerId),
    index("crm_tasks_external_idx").on(table.externalSource, table.externalId),
  ],
);

// --- Notification Delivery Records ---
export const notificationDeliveryRecords = sqliteTable(
  "notification_delivery_records",
  {
    id: text("id").primaryKey(),
    businessEventType: text("business_event_type").notNull(),
    businessEventId: text("business_event_id").notNull(),
    sourceEntityType: text("source_entity_type", {
      enum: [
        "order",
        "support_ticket",
        "abandoned_cart",
        "payment",
        "delivery_record",
        "auth",
        "user",
        "organization",
        "lead",
        "customer",
        "deal",
        "system",
      ],
    }).notNull(),
    sourceEntityId: text("source_entity_id").notNull(),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
    supportTicketId: text("support_ticket_id").references(() => crmTickets.id, {
      onDelete: "set null",
    }),
    route: text("route", {
      enum: [
        "customer_email",
        "customer_push",
        "platform_admin_push",
        "internal_email",
        "discord_operations",
        "discord_sales",
        "discord_support",
        "discord_growth",
        "discord_partnerships",
        "aggregate_report",
      ],
    }).notNull(),
    recipientType: text("recipient_type", {
      enum: [
        "customer",
        "platform_admin",
        "support",
        "sales",
        "ops",
        "growth",
        "partnerships",
        "internal_email",
        "discord_operations",
      ],
    }).notNull(),
    recipientId: text("recipient_id").notNull(),
    recipientLabel: text("recipient_label").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    status: text("status", {
      enum: ["pending", "sending", "sent", "retrying", "failed", "skipped", "cancelled"],
    })
      .default("pending")
      .notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(4).notNull(),
    firstAttemptAt: integer("first_attempt_at", { mode: "timestamp" }),
    lastAttemptAt: integer("last_attempt_at", { mode: "timestamp" }),
    nextRetryAt: integer("next_retry_at", { mode: "timestamp" }),
    terminalAt: integer("terminal_at", { mode: "timestamp" }),
    providerMessageId: text("provider_message_id"),
    providerResponseSummary: text("provider_response_summary"),
    providerErrorCode: text("provider_error_code"),
    failureClass: text("failure_class"),
    templateVersion: text("template_version"),
    sendProvenance: text("send_provenance"),
    lastError: text("last_error"),
    templateKey: text("template_key"),
    metadata: text("metadata"),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("notification_delivery_records_dedupe_key_uidx").on(table.dedupeKey),
    index("notification_delivery_records_order_id_idx").on(table.orderId),
    index("notification_delivery_records_customer_id_idx").on(table.customerId),
    index("notification_delivery_records_support_ticket_id_idx").on(table.supportTicketId),
    index("notification_delivery_records_source_idx").on(
      table.sourceEntityType,
      table.sourceEntityId,
    ),
    index("notification_delivery_records_retry_idx").on(table.status, table.nextRetryAt),
    index("notification_delivery_records_expires_at_idx").on(table.expiresAt),
  ],
);

// --- CRM Segments ---
export const crmSegments = sqliteTable(
  "crm_segments",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    description: text("description"),
    filterDefinition: text("filter_definition"),
    contactCount: integer("contact_count").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [check("crm_segments_contact_count_nonnegative_chk", sql`${table.contactCount} >= 0`)],
);

// --- Marketing Campaigns ---
export const marketingCampaigns = sqliteTable(
  "marketing_campaigns",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    subject: text("subject").notNull(),
    previewText: text("preview_text"),
    fromName: text("from_name"),
    fromEmail: text("from_email"),
    channelMode: text("channel_mode", {
      enum: ["push", "email", "both"],
    }).default("both"),
    pushTargetMode: text("push_target_mode", {
      enum: ["auto", "external_id", "onesignal_id"],
    }).default("auto"),
    emailTargetMode: text("email_target_mode", {
      enum: ["auto", "external_id", "email"],
    }).default("auto"),
    status: text("status", {
      enum: ["draft", "scheduled", "sending", "sent", "paused"],
    }).default("draft"),
    segmentId: text("segment_id").references(() => crmSegments.id, { onDelete: "set null" }),
    segmentDefinition: text("segment_definition"),
    content: text("content"),
    scheduledAt: integer("scheduled_at", { mode: "timestamp" }),
    sentAt: integer("sent_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index("marketing_campaigns_segment_id_idx").on(table.segmentId),
    index("marketing_campaigns_status_scheduled_at_idx").on(table.status, table.scheduledAt),
  ],
);

// --- Campaign Deliveries ---
export const campaignDeliveries = sqliteTable(
  "campaign_deliveries",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => marketingCampaigns.id, { onDelete: "cascade" }),
    contactId: text("contact_id")
      .notNull()
      .references(() => crmContacts.id, { onDelete: "cascade" }),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["queued", "sent", "opened", "clicked", "bounced", "failed", "unsubscribed"],
    }).default("queued"),
    sentAt: integer("sent_at", { mode: "timestamp" }),
    openedAt: integer("opened_at", { mode: "timestamp" }),
    clickedAt: integer("clicked_at", { mode: "timestamp" }),
    failedAt: integer("failed_at", { mode: "timestamp" }),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("campaign_deliveries_campaign_contact_uidx").on(table.campaignId, table.contactId),
    index("campaign_deliveries_customer_id_idx").on(table.customerId),
    index("campaign_deliveries_status_idx").on(table.status),
  ],
);

// --- Workflow Definitions ---
export const workflowDefinitions = sqliteTable(
  "workflow_definitions",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    key: text("key").notNull(),
    description: text("description"),
    status: text("status", { enum: ["draft", "active", "paused", "archived"] })
      .default("draft")
      .notNull(),
    workflowType: text("workflow_type", { enum: ["lifecycle", "transactional", "ops"] }).notNull(),
    triggerType: text("trigger_type", {
      enum: [
        "checkout_abandoned",
        "customer_inactive_28d",
        "order_payment_failed",
        "order_paid",
        "invoice_overdue",
        "quote_expiring",
        "manual_enrollment",
      ],
    }).notNull(),
    triggerConfig: text("trigger_config").notNull(),
    audienceConfig: text("audience_config"),
    stepConfig: text("step_config").notNull(),
    goalConfig: text("goal_config"),
    suppressionConfig: text("suppression_config"),
    channelConfig: text("channel_config"),
    version: integer("version").default(1).notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("workflow_definitions_key_uidx").on(table.key),
    index("workflow_definitions_status_idx").on(table.status),
    index("workflow_definitions_trigger_type_idx").on(table.triggerType),
    check("workflow_definitions_version_positive_chk", sql`${table.version} >= 1`),
  ],
);

// --- Workflow Trigger Events ---
export const workflowTriggerEvents = sqliteTable(
  "workflow_trigger_events",
  {
    id: text("id").primaryKey(),
    eventType: text("event_type", {
      enum: [
        "checkout_abandoned",
        "customer_inactive_28d",
        "order_payment_failed",
        "order_paid",
        "invoice_overdue",
        "quote_expiring",
        "manual_enrollment",
      ],
    }).notNull(),
    source: text("source", {
      enum: ["storefront", "admin", "payment", "crm", "cron", "system"],
    }).notNull(),
    subjectType: text("subject_type", {
      enum: ["customer", "contact", "order", "deal", "ticket"],
    }).notNull(),
    subjectId: text("subject_id").notNull(),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
    payload: text("payload").notNull(),
    occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("workflow_trigger_events_dedupe_uidx").on(table.dedupeKey),
    index("workflow_trigger_events_type_idx").on(table.eventType),
    index("workflow_trigger_events_subject_idx").on(table.subjectType, table.subjectId),
    index("workflow_trigger_events_customer_id_idx").on(table.customerId),
    index("workflow_trigger_events_order_id_idx").on(table.orderId),
  ],
);

// --- Workflow Enrollments ---
export const workflowEnrollments = sqliteTable(
  "workflow_enrollments",
  {
    id: text("id").primaryKey(),
    workflowDefinitionId: text("workflow_definition_id")
      .notNull()
      .references(() => workflowDefinitions.id, { onDelete: "cascade" }),
    subjectType: text("subject_type", {
      enum: ["customer", "contact", "order", "deal", "ticket"],
    }).notNull(),
    subjectId: text("subject_id").notNull(),
    triggerEventId: text("trigger_event_id").references(() => workflowTriggerEvents.id, {
      onDelete: "set null",
    }),
    status: text("status", {
      enum: ["pending", "active", "completed", "cancelled", "suppressed", "failed"],
    })
      .default("pending")
      .notNull(),
    enteredAt: integer("entered_at", { mode: "timestamp" }).notNull(),
    exitedAt: integer("exited_at", { mode: "timestamp" }),
    exitReason: text("exit_reason"),
    currentRunId: text("current_run_id"),
    dedupeKey: text("dedupe_key").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("workflow_enrollments_dedupe_uidx").on(table.dedupeKey),
    index("workflow_enrollments_definition_idx").on(table.workflowDefinitionId),
    index("workflow_enrollments_subject_idx").on(table.subjectType, table.subjectId),
    index("workflow_enrollments_status_idx").on(table.status),
    index("workflow_enrollments_trigger_event_id_idx").on(table.triggerEventId),
  ],
);

// --- Workflow Runs ---
export const workflowRuns = sqliteTable(
  "workflow_runs",
  {
    id: text("id").primaryKey(),
    workflowDefinitionId: text("workflow_definition_id")
      .notNull()
      .references(() => workflowDefinitions.id, { onDelete: "cascade" }),
    workflowEnrollmentId: text("workflow_enrollment_id")
      .notNull()
      .references(() => workflowEnrollments.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["queued", "running", "completed", "failed", "cancelled"],
    })
      .default("queued")
      .notNull(),
    workflowInstanceKey: text("workflow_instance_key").notNull(),
    goalType: text("goal_type", {
      enum: ["order_recovered", "payment_recovered", "customer_reactivated"],
    }),
    goalStatus: text("goal_status", {
      enum: ["pending", "achieved", "missed"],
    }),
    goalAchievedAt: integer("goal_achieved_at", { mode: "timestamp" }),
    goalValue: integer("goal_value"),
    goalMetadata: text("goal_metadata"),
    triggerSnapshot: text("trigger_snapshot"),
    subjectSnapshot: text("subject_snapshot"),
    failureReason: text("failure_reason"),
    startedAt: integer("started_at", { mode: "timestamp" }),
    finishedAt: integer("finished_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("workflow_runs_instance_key_uidx").on(table.workflowInstanceKey),
    index("workflow_runs_definition_idx").on(table.workflowDefinitionId),
    index("workflow_runs_enrollment_idx").on(table.workflowEnrollmentId),
    index("workflow_runs_status_idx").on(table.status),
  ],
);

// --- Workflow Step Runs ---
export const workflowStepRuns = sqliteTable(
  "workflow_step_runs",
  {
    id: text("id").primaryKey(),
    workflowRunId: text("workflow_run_id")
      .notNull()
      .references(() => workflowRuns.id, { onDelete: "cascade" }),
    stepKey: text("step_key").notNull(),
    stepType: text("step_type", {
      enum: [
        "wait",
        "wait_until",
        "condition",
        "send_message",
        "create_task",
        "perform_action",
        "exit",
      ],
    }).notNull(),
    status: text("status", {
      enum: ["pending", "running", "completed", "skipped", "failed"],
    })
      .default("pending")
      .notNull(),
    inputSnapshot: text("input_snapshot"),
    outputSnapshot: text("output_snapshot"),
    failureReason: text("failure_reason"),
    startedAt: integer("started_at", { mode: "timestamp" }),
    finishedAt: integer("finished_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("workflow_step_runs_run_step_uidx").on(table.workflowRunId, table.stepKey),
    index("workflow_step_runs_run_idx").on(table.workflowRunId),
    index("workflow_step_runs_status_idx").on(table.status),
  ],
);

// --- Workflow Suppressions ---
export const workflowSuppressions = sqliteTable(
  "workflow_suppressions",
  {
    id: text("id").primaryKey(),
    subjectType: text("subject_type", {
      enum: ["customer", "contact", "order", "deal", "ticket"],
    }).notNull(),
    subjectId: text("subject_id").notNull(),
    channel: text("channel", { enum: ["email", "push"] }),
    suppressionType: text("suppression_type", {
      enum: ["cooldown", "opt_out", "frequency_cap", "workflow_conflict"],
    }).notNull(),
    scopeKey: text("scope_key").notNull(),
    activeUntil: integer("active_until", { mode: "timestamp" }),
    reason: text("reason"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index("workflow_suppressions_subject_idx").on(table.subjectType, table.subjectId),
    index("workflow_suppressions_scope_key_idx").on(table.scopeKey),
    index("workflow_suppressions_active_until_idx").on(table.activeUntil),
  ],
);

// --- Workflow Action Deliveries ---
export const workflowActionDeliveries = sqliteTable(
  "workflow_action_deliveries",
  {
    id: text("id").primaryKey(),
    workflowRunId: text("workflow_run_id")
      .notNull()
      .references(() => workflowRuns.id, { onDelete: "cascade" }),
    workflowStepRunId: text("workflow_step_run_id").references(() => workflowStepRuns.id, {
      onDelete: "set null",
    }),
    subjectType: text("subject_type", {
      enum: ["customer", "contact", "order", "deal", "ticket"],
    }).notNull(),
    subjectId: text("subject_id").notNull(),
    channel: text("channel", { enum: ["email", "push"] }).notNull(),
    provider: text("provider"),
    templateKey: text("template_key"),
    status: text("status", {
      enum: ["queued", "sent", "delivered", "failed", "suppressed"],
    })
      .default("queued")
      .notNull(),
    providerMessageId: text("provider_message_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    errorMessage: text("error_message"),
    sentAt: integer("sent_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("workflow_action_deliveries_idempotency_uidx").on(table.idempotencyKey),
    index("workflow_action_deliveries_run_idx").on(table.workflowRunId),
    index("workflow_action_deliveries_step_run_idx").on(table.workflowStepRunId),
    index("workflow_action_deliveries_status_idx").on(table.status),
  ],
);

// --- Affiliate Profiles ---
export const affiliateProfiles = sqliteTable(
  "affiliate_profiles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
    code: text("code").notNull().unique(),
    status: text("status", { enum: ["pending", "active", "blocked"] }).default("pending"),
    payoutEmail: text("payout_email"),
    rateType: text("rate_type", { enum: ["percentage", "flat"] }).default("percentage"),
    rateValue: integer("rate_value").default(0).notNull(),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("affiliate_profiles_user_id_uidx").on(table.userId),
    uniqueIndex("affiliate_profiles_customer_id_uidx").on(table.customerId),
    check("affiliate_profiles_rate_value_nonnegative_chk", sql`${table.rateValue} >= 0`),
  ],
);

// --- Redirect Rules ---
export const redirectRules = sqliteTable(
  "redirect_rules",
  {
    id: text("id").primaryKey(),
    sourcePath: text("source_path").notNull().unique(),
    targetPath: text("target_path").notNull(),
    statusCode: integer("status_code").default(301).notNull(),
    matchType: text("match_type", { enum: ["exact", "prefix", "regex"] }).default("exact"),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    hitCount: integer("hit_count").default(0).notNull(),
    lastHitAt: integer("last_hit_at", { mode: "timestamp" }),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index("redirect_rules_match_type_active_idx").on(table.matchType, table.isActive),
    check("redirect_rules_hit_count_nonnegative_chk", sql`${table.hitCount} >= 0`),
    check("redirect_rules_status_code_valid_chk", sql`${table.statusCode} IN (301, 302, 307, 308)`),
  ],
);

// --- Not Found Events ---
export const notFoundEvents = sqliteTable(
  "not_found_events",
  {
    id: text("id").primaryKey(),
    path: text("path").notNull(),
    referer: text("referer"),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
    hitCount: integer("hit_count").default(1).notNull(),
    firstSeenAt: integer("first_seen_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    resolvedRedirectId: text("resolved_redirect_id").references(() => redirectRules.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("not_found_events_path_idx").on(table.path),
    index("not_found_events_resolved_redirect_id_idx").on(table.resolvedRedirectId),
    check("not_found_events_hit_count_positive_chk", sql`${table.hitCount} >= 1`),
  ],
);

// --- Admin Audit Logs ---
export const adminAuditLogs = sqliteTable(
  "admin_audit_logs",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    summary: text("summary").notNull(),
    metadata: text("metadata"), // JSON
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index("admin_audit_logs_actor_user_id_idx").on(table.actorUserId),
    index("admin_audit_logs_entity_type_entity_id_idx").on(table.entityType, table.entityId),
    index("admin_audit_logs_created_at_idx").on(table.createdAt),
  ],
);

// --- CRM Invoices ---
export const crmInvoices = sqliteTable(
  "crm_invoices",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
    contactId: text("contact_id").references(() => crmContacts.id, { onDelete: "set null" }),
    companyId: text("company_id").references(() => crmCompanies.id, { onDelete: "set null" }),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
    quoteId: text("quote_id").references((): AnySQLiteColumn => crmQuotes.id, {
      onDelete: "set null",
    }),
    reference: text("reference"),
    status: text("status", {
      enum: ["draft", "sent", "viewed", "paid", "void"],
    }).default("draft"),
    currency: text("currency").default("NGN"),
    amountNet: integer("amount_net").default(0),
    amountTax: integer("amount_tax").default(0),
    amountShipping: integer("amount_shipping").default(0),
    amountShippingTax: integer("amount_shipping_tax").default(0),
    amountDiscount: integer("amount_discount").default(0),
    discountType: text("discount_type"),
    amountTotal: integer("amount_total").notNull(),
    hash: text("hash"),
    hashViewedAt: integer("hash_viewed_at", { mode: "timestamp" }),
    portalViewedAt: integer("portal_viewed_at", { mode: "timestamp" }),
    hashViewedCount: integer("hash_viewed_count").default(0).notNull(),
    portalViewedCount: integer("portal_viewed_count").default(0).notNull(),
    addressedFrom: text("addressed_from"),
    addressedTo: text("addressed_to"),
    issueDate: integer("issue_date", { mode: "timestamp" }),
    dueDate: integer("due_date", { mode: "timestamp" }),
    paidAt: integer("paid_at", { mode: "timestamp" }),
    externalId: text("external_id"),
    externalSource: text("external_source"),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("crm_invoices_reference_uidx").on(table.reference),
    uniqueIndex("crm_invoices_hash_uidx").on(table.hash),
    index("crm_invoices_owner_id_idx").on(table.ownerId),
    index("crm_invoices_contact_id_idx").on(table.contactId),
    index("crm_invoices_company_id_idx").on(table.companyId),
    index("crm_invoices_order_id_idx").on(table.orderId),
    index("crm_invoices_quote_id_idx").on(table.quoteId),
    index("crm_invoices_status_due_date_idx").on(table.status, table.dueDate),
    index("crm_invoices_external_idx").on(table.externalSource, table.externalId),
  ],
);

// --- CRM Quotes ---
export const crmQuotes = sqliteTable(
  "crm_quotes",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
    contactId: text("contact_id").references(() => crmContacts.id, { onDelete: "set null" }),
    dealId: text("deal_id").references(() => crmDeals.id, { onDelete: "set null" }),
    title: text("title"),
    reference: text("reference"),
    status: text("status", {
      enum: ["draft", "sent", "viewed", "accepted", "signed", "void"],
    }).default("draft"),
    currency: text("currency").default("NGN"),
    value: integer("value").notNull(), // in cents
    hash: text("hash"),
    lastViewedAt: integer("last_viewed_at", { mode: "timestamp" }),
    viewedCount: integer("viewed_count").default(0).notNull(),
    acceptedAt: integer("accepted_at", { mode: "timestamp" }),
    signedAt: integer("signed_at", { mode: "timestamp" }),
    signedIp: text("signed_ip"),
    externalId: text("external_id"),
    externalSource: text("external_source"),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("crm_quotes_reference_uidx").on(table.reference),
    uniqueIndex("crm_quotes_hash_uidx").on(table.hash),
    index("crm_quotes_owner_id_idx").on(table.ownerId),
    index("crm_quotes_contact_id_idx").on(table.contactId),
    index("crm_quotes_deal_id_idx").on(table.dealId),
    index("crm_quotes_status_idx").on(table.status),
    index("crm_quotes_external_idx").on(table.externalSource, table.externalId),
  ],
);

// --- CRM Products (HubSpot Product Schema Alignment) ---
export const crmProducts = sqliteTable(
  "crm_products",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    sku: text("sku").unique(),
    price: integer("price").notNull(), // in cents
    currency: text("currency").default("NGN").notNull(),
    recurringBillingFrequency: text("recurring_billing_frequency"), // monthly, quarterly, annually, etc.
    externalId: text("external_id"),
    externalSource: text("external_source"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [index("crm_products_external_idx").on(table.externalSource, table.externalId)],
);

// --- CRM Line Items (HubSpot Line Item Schema Alignment) ---
export const crmLineItems = sqliteTable(
  "crm_line_items",
  {
    id: text("id").primaryKey(),
    dealId: text("deal_id")
      .notNull()
      .references(() => crmDeals.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => crmProducts.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull(),
    price: integer("price").notNull(), // in cents
    amount: integer("amount").notNull(), // quantity * price - discount (cents)
    discount: integer("discount").default(0), // in cents
    currency: text("currency").default("NGN").notNull(),
    externalId: text("external_id"),
    externalSource: text("external_source"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index("crm_line_items_deal_id_idx").on(table.dealId),
    index("crm_line_items_product_id_idx").on(table.productId),
    index("crm_line_items_external_idx").on(table.externalSource, table.externalId),
  ],
);

// --- CRM Subscriptions (HubSpot Subscription Schema Alignment) ---
export const crmSubscriptions = sqliteTable(
  "crm_subscriptions",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
    companyId: text("company_id").references(() => crmCompanies.id, { onDelete: "set null" }),
    contactId: text("contact_id").references(() => crmContacts.id, { onDelete: "set null" }),
    productId: text("product_id")
      .notNull()
      .references(() => crmProducts.id),
    status: text("status", { enum: ["pending", "active", "cancelled", "churned", "expired"] })
      .default("active")
      .notNull(),
    billingPeriod: text("billing_period", { enum: ["day", "week", "month", "year"] }).notNull(),
    billingInterval: integer("billing_interval").default(1).notNull(),
    recurringTotal: integer("recurring_total").notNull(), // cents
    nextPaymentDate: integer("next_payment_date", { mode: "timestamp" }).notNull(),
    endDate: integer("end_date", { mode: "timestamp" }),
    externalId: text("external_id"),
    externalSource: text("external_source"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index("crm_subscriptions_customer_id_idx").on(table.customerId),
    index("crm_subscriptions_company_id_idx").on(table.companyId),
    index("crm_subscriptions_contact_id_idx").on(table.contactId),
    index("crm_subscriptions_status_idx").on(table.status),
    index("crm_subscriptions_external_idx").on(table.externalSource, table.externalId),
  ],
);

// --- CRM Contacts and Companies Junction ---
export const crmContactsCompanies = sqliteTable(
  "crm_contacts_companies",
  {
    id: text("id").primaryKey(),
    contactId: text("contact_id")
      .notNull()
      .references(() => crmContacts.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => crmCompanies.id, { onDelete: "cascade" }),
    associationTypeId: text("association_type_id"),
    isPrimary: integer("is_primary", { mode: "boolean" }).default(true).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("crm_contacts_companies_contact_company_uidx").on(table.contactId, table.companyId),
    index("crm_contacts_companies_company_idx").on(table.companyId),
  ],
);

// --- CRM Deals and Contacts Junction ---
export const crmDealsContacts = sqliteTable(
  "crm_deals_contacts",
  {
    id: text("id").primaryKey(),
    dealId: text("deal_id")
      .notNull()
      .references(() => crmDeals.id, { onDelete: "cascade" }),
    contactId: text("contact_id")
      .notNull()
      .references(() => crmContacts.id, { onDelete: "cascade" }),
    associationTypeId: text("association_type_id"),
    isPrimary: integer("is_primary", { mode: "boolean" }).default(true).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("crm_deals_contacts_deal_contact_uidx").on(table.dealId, table.contactId),
    index("crm_deals_contacts_contact_idx").on(table.contactId),
  ],
);

// --- CRM Deals and Companies Junction ---
export const crmDealsCompanies = sqliteTable(
  "crm_deals_companies",
  {
    id: text("id").primaryKey(),
    dealId: text("deal_id")
      .notNull()
      .references(() => crmDeals.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => crmCompanies.id, { onDelete: "cascade" }),
    associationTypeId: text("association_type_id"),
    isPrimary: integer("is_primary", { mode: "boolean" }).default(true).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("crm_deals_companies_deal_company_uidx").on(table.dealId, table.companyId),
    index("crm_deals_companies_company_idx").on(table.companyId),
  ],
);

// --- CRM Tickets and Contacts Junction ---
export const crmTicketsContacts = sqliteTable(
  "crm_tickets_contacts",
  {
    id: text("id").primaryKey(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => crmTickets.id, { onDelete: "cascade" }),
    contactId: text("contact_id")
      .notNull()
      .references(() => crmContacts.id, { onDelete: "cascade" }),
    associationTypeId: text("association_type_id"),
    isPrimary: integer("is_primary", { mode: "boolean" }).default(true).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("crm_tickets_contacts_ticket_contact_uidx").on(table.ticketId, table.contactId),
    index("crm_tickets_contacts_contact_idx").on(table.contactId),
  ],
);

// --- CRM Tickets and Companies Junction ---
export const crmTicketsCompanies = sqliteTable(
  "crm_tickets_companies",
  {
    id: text("id").primaryKey(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => crmTickets.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => crmCompanies.id, { onDelete: "cascade" }),
    associationTypeId: text("association_type_id"),
    isPrimary: integer("is_primary", { mode: "boolean" }).default(true).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("crm_tickets_companies_ticket_company_uidx").on(table.ticketId, table.companyId),
    index("crm_tickets_companies_company_idx").on(table.companyId),
  ],
);

// --- CRM Record Activity Timeline ---
export const crmRecordActivity = sqliteTable(
  "crm_record_activity",
  {
    id: text("id").primaryKey(),
    objectKey: text("object_key").notNull(),
    recordId: text("record_id").notNull(),
    activityType: text("activity_type", {
      enum: [
        "note",
        "task",
        "email",
        "calendar",
        "file",
        "audit",
        "workflow",
        "order",
        "deal",
        "ticket",
        "system",
      ],
    })
      .default("system")
      .notNull(),
    title: text("title").notNull(),
    body: text("body"),
    payload: text("payload"), // JSON
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    taskId: text("task_id").references(() => crmTasks.id, { onDelete: "set null" }),
    noteId: text("note_id").references(() => crmNotes.id, { onDelete: "set null" }),
    ticketId: text("ticket_id").references(() => crmTickets.id, { onDelete: "set null" }),
    dealId: text("deal_id").references(() => crmDeals.id, { onDelete: "set null" }),
    occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index("crm_record_activity_record_idx").on(table.objectKey, table.recordId, table.occurredAt),
    index("crm_record_activity_actor_user_id_idx").on(table.actorUserId),
    index("crm_record_activity_task_id_idx").on(table.taskId),
    index("crm_record_activity_note_id_idx").on(table.noteId),
    index("crm_record_activity_ticket_id_idx").on(table.ticketId),
    index("crm_record_activity_deal_id_idx").on(table.dealId),
  ],
);

// --- Inferred Database Types ---
export type DbCrmContact = InferSelectModel<typeof crmContacts>;
export type NewDbCrmContact = InferInsertModel<typeof crmContacts>;

export type DbCrmDeal = InferSelectModel<typeof crmDeals>;
export type NewDbCrmDeal = InferInsertModel<typeof crmDeals>;

export type DbCrmCompany = InferSelectModel<typeof crmCompanies>;
export type NewDbCrmCompany = InferInsertModel<typeof crmCompanies>;

export type DbCrmTicket = InferSelectModel<typeof crmTickets>;
export type NewDbCrmTicket = InferInsertModel<typeof crmTickets>;

export type DbCrmView = InferSelectModel<typeof crmViews>;
export type NewDbCrmView = InferInsertModel<typeof crmViews>;

export type DbCrmTask = InferSelectModel<typeof crmTasks>;
export type NewDbCrmTask = InferInsertModel<typeof crmTasks>;
