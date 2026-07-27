import { defineRelations } from "drizzle-orm";

import * as authSchema from "./auth";
import * as schema from "./core";
import * as crmSchema from "./crm";
import * as ecommerceSchema from "./ecommerce";

const allTables = { ...schema, ...authSchema, ...ecommerceSchema, ...crmSchema };

export const relations = defineRelations(allTables, (r) => ({
  domains: {
    organization: r.one.organization({
      from: r.domains.organizationId,
      to: r.organization.id,
    }),
  },
  user: {
    sessions: r.many.session(),
    accounts: r.many.account(),
    members: r.many.member(),
    invitations: r.many.invitation(),
    twoFactors: r.many.twoFactor(),
    referralCode: r.many.referralCode(),
    notifications: r.many.notification(),
    referralsAsReferrer: r.many.referrals({ alias: "referrer" }),
    referralsAsReferred: r.many.referrals({ alias: "referred" }),
  },
  session: {
    user: r.one.user({
      from: r.session.userId,
      to: r.user.id,
    }),
  },
  account: {
    user: r.one.user({
      from: r.account.userId,
      to: r.user.id,
    }),
  },
  organization: {
    members: r.many.member(),
    invitations: r.many.invitation(),
  },
  member: {
    organization: r.one.organization({
      from: r.member.organizationId,
      to: r.organization.id,
    }),
    user: r.one.user({
      from: r.member.userId,
      to: r.user.id,
    }),
  },
  invitation: {
    organization: r.one.organization({
      from: r.invitation.organizationId,
      to: r.organization.id,
    }),
    user: r.one.user({
      from: r.invitation.inviterId,
      to: r.user.id,
    }),
  },
  twoFactor: {
    user: r.one.user({
      from: r.twoFactor.userId,
      to: r.user.id,
    }),
  },
  referralCode: {
    user: r.one.user({
      from: r.referralCode.userId,
      to: r.user.id,
    }),
    referrals: r.many.referrals(),
  },
  referrals: {
    referrer: r.one.user({
      from: r.referrals.referrerUserId,
      to: r.user.id,
      alias: "referrer",
    }),
    referred: r.one.user({
      from: r.referrals.referredUserId,
      to: r.user.id,
      alias: "referred",
    }),
    referralCode: r.one.referralCode({
      from: r.referrals.referralCodeId,
      to: r.referralCode.id,
    }),
  },
  notification: {
    user: r.one.user({
      from: r.notification.userId,
      to: r.user.id,
    }),
  },
  crmObjects: {
    fields: r.many.crmFields(),
    views: r.many.crmViews(),
    recordLayouts: r.many.crmRecordLayouts(),
  },
  crmFields: {
    object: r.one.crmObjects({
      from: r.crmFields.objectId,
      to: r.crmObjects.id,
    }),
  },
  crmViews: {
    object: r.one.crmObjects({
      from: r.crmViews.objectId,
      to: r.crmObjects.id,
    }),
    owner: r.one.user({
      from: r.crmViews.ownerUserId,
      to: r.user.id,
    }),
    favorites: r.many.crmViewFavorites(),
  },
  crmViewFavorites: {
    view: r.one.crmViews({
      from: r.crmViewFavorites.viewId,
      to: r.crmViews.id,
    }),
    user: r.one.user({
      from: r.crmViewFavorites.userId,
      to: r.user.id,
    }),
  },
  crmRecordLayouts: {
    object: r.one.crmObjects({
      from: r.crmRecordLayouts.objectId,
      to: r.crmObjects.id,
    }),
  },
  crmContacts: {
    party: r.one.parties({
      from: r.crmContacts.partyId,
      to: r.parties.id,
    }),
    user: r.one.user({
      from: r.crmContacts.userId,
      to: r.user.id,
    }),
    companyRecord: r.one.crmCompanies({
      from: r.crmContacts.companyId,
      to: r.crmCompanies.id,
    }),
    companies: r.many.crmContactsCompanies(),
    deals: r.many.crmDeals(),
    notes: r.many.crmNotes(),
    tickets: r.many.crmTickets(),
    tasks: r.many.crmTasks(),
    channelSubscriptions: r.many.customerChannelSubscriptions(),
  },
  customerChannelSubscriptions: {
    contact: r.one.crmContacts({
      from: r.customerChannelSubscriptions.contactId,
      to: r.crmContacts.id,
    }),
    customer: r.one.customers({
      from: r.customerChannelSubscriptions.customerId,
      to: r.customers.id,
    }),
    user: r.one.user({
      from: r.customerChannelSubscriptions.userId,
      to: r.user.id,
    }),
  },
  crmDeals: {
    contact: r.one.crmContacts({
      from: r.crmDeals.contactId,
      to: r.crmContacts.id,
    }),
    order: r.one.orders({
      from: r.crmDeals.orderId,
      to: r.orders.id,
    }),
    owner: r.one.user({
      from: r.crmDeals.assignedTo,
      to: r.user.id,
    }),
    companies: r.many.crmDealsCompanies(),
    notes: r.many.crmNotes(),
    tasks: r.many.crmTasks(),
    lineItems: r.many.crmLineItems(),
  },
  crmCompanies: {
    organization: r.one.organization({
      from: r.crmCompanies.organizationId,
      to: r.organization.id,
    }),
    primaryContact: r.one.crmContacts({
      from: r.crmCompanies.primaryContactId,
      to: r.crmContacts.id,
    }),
    contacts: r.many.crmContactsCompanies(),
    deals: r.many.crmDealsCompanies(),
    notes: r.many.crmNotes(),
    tasks: r.many.crmTasks(),
  },
  crmNotes: {
    contact: r.one.crmContacts({
      from: r.crmNotes.contactId,
      to: r.crmContacts.id,
    }),
    company: r.one.crmCompanies({
      from: r.crmNotes.companyId,
      to: r.crmCompanies.id,
    }),
    deal: r.one.crmDeals({
      from: r.crmNotes.dealId,
      to: r.crmDeals.id,
    }),
    author: r.one.user({
      from: r.crmNotes.authorUserId,
      to: r.user.id,
    }),
  },
  crmTickets: {
    contact: r.one.crmContacts({
      from: r.crmTickets.contactId,
      to: r.crmContacts.id,
    }),
    customer: r.one.customers({
      from: r.crmTickets.customerId,
      to: r.customers.id,
    }),
    owner: r.one.user({
      from: r.crmTickets.assignedTo,
      to: r.user.id,
    }),
    contacts: r.many.crmTicketsContacts(),
    companies: r.many.crmTicketsCompanies(),
    tasks: r.many.crmTasks(),
  },
  crmTasks: {
    contact: r.one.crmContacts({
      from: r.crmTasks.contactId,
      to: r.crmContacts.id,
    }),
    company: r.one.crmCompanies({
      from: r.crmTasks.companyId,
      to: r.crmCompanies.id,
    }),
    deal: r.one.crmDeals({
      from: r.crmTasks.dealId,
      to: r.crmDeals.id,
    }),
    ticket: r.one.crmTickets({
      from: r.crmTasks.ticketId,
      to: r.crmTickets.id,
    }),
    customer: r.one.customers({
      from: r.crmTasks.customerId,
      to: r.customers.id,
    }),
    owner: r.one.user({
      from: r.crmTasks.assignedTo,
      to: r.user.id,
    }),
    creator: r.one.user({
      from: r.crmTasks.createdBy,
      to: r.user.id,
    }),
  },
  crmContactsCompanies: {
    contact: r.one.crmContacts({
      from: r.crmContactsCompanies.contactId,
      to: r.crmContacts.id,
    }),
    company: r.one.crmCompanies({
      from: r.crmContactsCompanies.companyId,
      to: r.crmCompanies.id,
    }),
  },
  crmDealsContacts: {
    deal: r.one.crmDeals({
      from: r.crmDealsContacts.dealId,
      to: r.crmDeals.id,
    }),
    contact: r.one.crmContacts({
      from: r.crmDealsContacts.contactId,
      to: r.crmContacts.id,
    }),
  },
  crmDealsCompanies: {
    deal: r.one.crmDeals({
      from: r.crmDealsCompanies.dealId,
      to: r.crmDeals.id,
    }),
    company: r.one.crmCompanies({
      from: r.crmDealsCompanies.companyId,
      to: r.crmCompanies.id,
    }),
  },
  crmTicketsContacts: {
    ticket: r.one.crmTickets({
      from: r.crmTicketsContacts.ticketId,
      to: r.crmTickets.id,
    }),
    contact: r.one.crmContacts({
      from: r.crmTicketsContacts.contactId,
      to: r.crmContacts.id,
    }),
  },
  crmTicketsCompanies: {
    ticket: r.one.crmTickets({
      from: r.crmTicketsCompanies.ticketId,
      to: r.crmTickets.id,
    }),
    company: r.one.crmCompanies({
      from: r.crmTicketsCompanies.companyId,
      to: r.crmCompanies.id,
    }),
  },
  crmRecordActivity: {
    actor: r.one.user({
      from: r.crmRecordActivity.actorUserId,
      to: r.user.id,
    }),
    task: r.one.crmTasks({
      from: r.crmRecordActivity.taskId,
      to: r.crmTasks.id,
    }),
    note: r.one.crmNotes({
      from: r.crmRecordActivity.noteId,
      to: r.crmNotes.id,
    }),
    ticket: r.one.crmTickets({
      from: r.crmRecordActivity.ticketId,
      to: r.crmTickets.id,
    }),
    deal: r.one.crmDeals({
      from: r.crmRecordActivity.dealId,
      to: r.crmDeals.id,
    }),
  },
  adminAuditLogs: {
    actor: r.one.user({
      from: r.adminAuditLogs.actorUserId,
      to: r.user.id,
    }),
  },
  crmInvoices: {
    owner: r.one.user({
      from: r.crmInvoices.ownerId,
      to: r.user.id,
    }),
    contact: r.one.crmContacts({
      from: r.crmInvoices.contactId,
      to: r.crmContacts.id,
    }),
    company: r.one.crmCompanies({
      from: r.crmInvoices.companyId,
      to: r.crmCompanies.id,
    }),
    order: r.one.orders({
      from: r.crmInvoices.orderId,
      to: r.orders.id,
    }),
    quote: r.one.crmQuotes({
      from: r.crmInvoices.quoteId,
      to: r.crmQuotes.id,
    }),
  },
  crmQuotes: {
    owner: r.one.user({
      from: r.crmQuotes.ownerId,
      to: r.user.id,
    }),
    contact: r.one.crmContacts({
      from: r.crmQuotes.contactId,
      to: r.crmContacts.id,
    }),
    deal: r.one.crmDeals({
      from: r.crmQuotes.dealId,
      to: r.crmDeals.id,
    }),
    invoices: r.many.crmInvoices(),
  },
  crmProducts: {
    lineItems: r.many.crmLineItems(),
    subscriptions: r.many.crmSubscriptions(),
  },
  crmLineItems: {
    deal: r.one.crmDeals({
      from: r.crmLineItems.dealId,
      to: r.crmDeals.id,
    }),
    product: r.one.crmProducts({
      from: r.crmLineItems.productId,
      to: r.crmProducts.id,
    }),
  },
  crmSubscriptions: {
    customer: r.one.customers({
      from: r.crmSubscriptions.customerId,
      to: r.customers.id,
    }),
    company: r.one.crmCompanies({
      from: r.crmSubscriptions.companyId,
      to: r.crmCompanies.id,
    }),
    contact: r.one.crmContacts({
      from: r.crmSubscriptions.contactId,
      to: r.crmContacts.id,
    }),
    product: r.one.crmProducts({
      from: r.crmSubscriptions.productId,
      to: r.crmProducts.id,
    }),
  },
  parties: {
    user: r.one.user({
      from: r.parties.userId,
      to: r.user.id,
    }),
    organization: r.one.organization({
      from: r.parties.organizationId,
      to: r.organization.id,
    }),
    customers: r.many.customers(),
    payments: r.many.payments(),
    crmContact: r.one.crmContacts({
      from: r.parties.id,
      to: r.crmContacts.partyId,
    }),
  },
  customers: {
    party: r.one.parties({
      from: r.customers.partyId,
      to: r.parties.id,
    }),
    user: r.one.user({
      from: r.customers.userId,
      to: r.user.id,
    }),
    organization: r.one.organization({
      from: r.customers.organizationId,
      to: r.organization.id,
    }),
    orders: r.many.orders(),
    payments: r.many.payments(),
    subscriptions: r.many.crmSubscriptions(),
  },
  orders: {
    customer: r.one.customers({
      from: r.orders.customerId,
      to: r.customers.id,
    }),
    organization: r.one.organization({
      from: r.orders.organizationId,
      to: r.organization.id,
    }),
    payments: r.many.payments(),
    crmInvoice: r.one.crmInvoices({
      from: r.orders.id,
      to: r.crmInvoices.orderId,
    }),
    crmDeals: r.many.crmDeals(),
  },
  payments: {
    order: r.one.orders({
      from: r.payments.orderId,
      to: r.orders.id,
    }),
    customer: r.one.customers({
      from: r.payments.customerId,
      to: r.customers.id,
    }),
    party: r.one.parties({
      from: r.payments.partyId,
      to: r.parties.id,
    }),
    user: r.one.user({
      from: r.payments.userId,
      to: r.user.id,
    }),
  },
}));
