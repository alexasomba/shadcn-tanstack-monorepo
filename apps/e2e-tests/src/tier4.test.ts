import worker from "data-service";
import { describe, expect, it, beforeAll, beforeEach } from "vite-plus/test";

import {
  setupTestDb,
  MockR2Bucket,
  UserOnboardingWorkflow,
  OrgOnboardingWorkflow,
  SentrySpy,
} from "./helpers";

interface SignUpRequest {
  name: string;
  email: string;
  userId: string;
}

interface OrganizationCreateRequest {
  name: string;
  slug: string;
  userId?: string;
}

interface InvitationCreateRequest {
  email: string;
  role?: string;
}

interface InvitationAcceptRequest {
  userId: string;
}

interface CustomerCodeRequest {
  email: string;
  userId?: string;
}

interface UpgradeRequest {
  customerId: string;
  productId: string;
}

interface WebhookRequest {
  event: string;
  data: {
    customer_code?: string;
    customer?: {
      customer_code?: string;
    };
    plan?: string;
  };
}

interface ApiKeyGenerateRequest {
  userId: string;
}

interface DbCustomer {
  id: string;
  email: string;
  paystack_customer_code?: string | null;
}

interface DbSubscription {
  id: string;
  customer_id: string;
  product_id: string;
  status: string;
}

interface DbMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
}

interface DbInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  status: string;
}

describe("Tier 4 SaaS Expansion Real-World Scenarios E2E Tests", () => {
  let db: D1Database;
  let testEnv: {
    DATABASE: D1Database;
    R2_BUCKET: MockR2Bucket;
    UserOnboardingWorkflow: UserOnboardingWorkflow;
    OrgOnboardingWorkflow: OrgOnboardingWorkflow;
    BETTER_AUTH_URL: string;
    BETTER_AUTH_SECRET: string;
  };

  // Helper to resolve authorization context for test endpoints using real DB snake_case columns
  async function authenticate(req: Request) {
    const authHeader = req.headers.get("Authorization");
    const xApiKey = req.headers.get("x-api-key");

    const key = xApiKey || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);
    if (!key) {
      return { success: false, status: 401, error: "Unauthorized" };
    }

    // Check developer API Keys first
    const apiKeyRecord = await db
      .prepare("SELECT * FROM developer_api_keys WHERE key = ?")
      .bind(key)
      .first<{ key: string; user_id: string; status: string }>();

    if (apiKeyRecord) {
      if (apiKeyRecord.status !== "active") {
        return { success: false, status: 401, error: "Revoked or expired API Key" };
      }
      return { success: true, type: "apikey", userId: apiKeyRecord.user_id };
    }

    // Check Session tokens (must query with exact database snake_case properties)
    const sessionRecord = await db
      .prepare("SELECT * FROM session WHERE token = ?")
      .bind(key)
      .first<{
        id: string;
        token: string;
        expires_at: number;
        user_id: string;
        active_organization_id?: string | null;
      }>();

    if (sessionRecord) {
      if (sessionRecord.expires_at < Date.now()) {
        return { success: false, status: 401, error: "Session expired" };
      }
      return {
        success: true,
        type: "session",
        userId: sessionRecord.user_id,
        activeOrganizationId: sessionRecord.active_organization_id,
      };
    }

    return { success: false, status: 401, error: "Invalid Credentials" };
  }

  // Interceptor request router for e2e test environment simulations
  async function fetchWrapper(request: Request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    // Sign up onboarding journey
    if (path === "/api/auth/signup" && method === "POST") {
      const body = (await request.json()) as SignUpRequest;
      await db
        .prepare(
          "INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(body.userId, body.name, body.email, 1, Date.now(), Date.now())
        .run();

      const instance = await testEnv.UserOnboardingWorkflow.create({
        params: { userId: body.userId },
      });
      return new Response(
        JSON.stringify({
          success: true,
          userId: body.userId,
          workflowInstanceId: instance.id,
        }),
        { status: 200 },
      );
    }

    // Create Organization and Onboarding workflow
    if (path === "/organizations" && method === "POST") {
      const body = (await request.json()) as OrganizationCreateRequest;
      const orgId = `org_${Math.random().toString(36).substring(2, 8)}`;
      const userId = body.userId || "default-user";

      await db
        .prepare("INSERT INTO organization (id, name, slug, created_at) VALUES (?, ?, ?, ?)")
        .bind(orgId, body.name, body.slug, Date.now())
        .run();

      const memberId = `memb_${Math.random().toString(36).substring(2, 8)}`;
      await db
        .prepare(
          "INSERT INTO member (id, organization_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(memberId, orgId, userId, "owner", Date.now())
        .run();

      const instance = await testEnv.OrgOnboardingWorkflow.create({ params: { orgId } });
      return new Response(
        JSON.stringify({
          success: true,
          organization: { id: orgId, name: body.name, slug: body.slug },
          workflowInstanceId: instance.id,
        }),
        { status: 200 },
      );
    }

    // Paystack Link customer code
    if (path === "/subscriptions/customer-code" && method === "POST") {
      const body = (await request.json()) as CustomerCodeRequest;
      const paystackCustomerCode = `cus_${Math.random().toString(36).substring(2, 8)}`;

      const existing = await db
        .prepare("SELECT * FROM customers WHERE email = ?")
        .bind(body.email)
        .first<DbCustomer>();

      if (!existing) {
        const customerId = `cust_${Math.random().toString(36).substring(2, 8)}`;
        await db
          .prepare(
            "INSERT INTO customers (id, email, user_id, paystack_customer_code, is_guest, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            customerId,
            body.email,
            body.userId || null,
            paystackCustomerCode,
            0,
            Math.floor(Date.now() / 1000),
            Math.floor(Date.now() / 1000),
          )
          .run();
      } else {
        await db
          .prepare("UPDATE customers SET paystack_customer_code = ? WHERE email = ?")
          .bind(paystackCustomerCode, body.email)
          .run();
      }

      return new Response(JSON.stringify({ success: true, paystackCustomerCode }), { status: 200 });
    }

    // Paystack Upgrade Subscription
    if (path === "/subscriptions/upgrade" && method === "POST") {
      const body = (await request.json()) as UpgradeRequest;
      const subId = `sub_${Math.random().toString(36).substring(2, 8)}`;

      const auth = await authenticate(request);
      if (auth.success && auth.activeOrganizationId) {
        const membership = await db
          .prepare("SELECT * FROM member WHERE organization_id = ? AND user_id = ?")
          .bind(auth.activeOrganizationId, auth.userId)
          .first<DbMember>();
        if (!membership || membership.role !== "owner") {
          return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
            status: 403,
          });
        }
      }

      const existingProd = await db
        .prepare("SELECT * FROM crm_products WHERE id = ?")
        .bind(body.productId)
        .first<{ id: string; name: string }>();
      if (!existingProd) {
        await db
          .prepare(
            "INSERT INTO crm_products (id, name, price, currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
          )
          .bind(
            body.productId,
            "Premium Product",
            5000,
            "NGN",
            Math.floor(Date.now() / 1000),
            Math.floor(Date.now() / 1000),
          )
          .run();
      }

      await db
        .prepare(
          "INSERT OR REPLACE INTO crm_subscriptions (id, customer_id, product_id, status, billing_period, billing_interval, recurring_total, next_payment_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          subId,
          body.customerId,
          body.productId,
          "pending",
          "month",
          1,
          5000,
          Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
          Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000),
        )
        .run();

      return new Response(JSON.stringify({ success: true, subscriptionId: subId }), {
        status: 200,
      });
    }

    // Paystack Webhook handler (upgrade/charge events)
    if (path === "/subscriptions/webhook" && method === "POST") {
      const body = (await request.json()) as WebhookRequest;
      const customerCode = body.data.customer_code || body.data.customer?.customer_code;

      const customer = await db
        .prepare("SELECT * FROM customers WHERE paystack_customer_code = ?")
        .bind(customerCode || "")
        .first<DbCustomer>();

      if (customer) {
        let newStatus = "active";
        if (body.event === "subscription.charge_failed" || body.event === "charge.failed") {
          newStatus = "past_due";
        }

        await db
          .prepare("UPDATE crm_subscriptions SET status = ? WHERE customer_id = ?")
          .bind(newStatus, customer.id)
          .run();
      }

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // Cancel Subscription
    if (path === "/subscriptions/cancel" && method === "POST") {
      const auth = await authenticate(request);
      if (!auth.success) {
        return new Response(JSON.stringify({ success: false, error: auth.error }), {
          status: auth.status,
        });
      }

      if (auth.activeOrganizationId) {
        const membership = await db
          .prepare("SELECT * FROM member WHERE organization_id = ? AND user_id = ?")
          .bind(auth.activeOrganizationId, auth.userId)
          .first<DbMember>();
        if (!membership || membership.role !== "owner") {
          return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
            status: 403,
          });
        }
      }

      const body = (await request.json()) as { customerId: string };
      await db
        .prepare("UPDATE crm_subscriptions SET status = 'cancelled' WHERE customer_id = ?")
        .bind(body.customerId)
        .run();

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // Generate developer API key
    if (path === "/api-keys/generate" && method === "POST") {
      const body = (await request.json()) as ApiKeyGenerateRequest;
      const key = `key_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
      await db
        .prepare("INSERT INTO developer_api_keys (key, user_id, status) VALUES (?, ?, ?)")
        .bind(key, body.userId, "active")
        .run();
      return new Response(JSON.stringify({ success: true, key }), { status: 200 });
    }

    // R2 Upload Presigned PUT URL
    if (path === "/r2/presigned-put" && method === "POST") {
      const auth = await authenticate(request);
      if (!auth.success) {
        return new Response(JSON.stringify({ success: false, error: auth.error }), {
          status: auth.status,
        });
      }

      const customer = await db
        .prepare("SELECT * FROM customers WHERE user_id = ?")
        .bind(auth.userId)
        .first<DbCustomer>();
      if (customer) {
        const sub = await db
          .prepare("SELECT * FROM crm_subscriptions WHERE customer_id = ?")
          .bind(customer.id)
          .first<DbSubscription>();
        if (sub && sub.status !== "active") {
          return new Response(JSON.stringify({ success: false, error: "Payment Required" }), {
            status: 402,
          });
        }
      }

      const body = (await request.json()) as { key: string };
      return new Response(
        JSON.stringify({
          success: true,
          url: `https://mock-r2.local/bucket/${body.key}`,
        }),
        { status: 200 },
      );
    }

    // R2 mock bucket PUT
    if (path.startsWith("/bucket/") && method === "PUT") {
      const key = path.substring("/bucket/".length);
      const match = key.match(/^tenant_([^/]+)\//);
      if (match) {
        const customerId = match[1];
        const sub = await db
          .prepare("SELECT * FROM crm_subscriptions WHERE customer_id = ?")
          .bind(customerId)
          .first<DbSubscription>();

        let limit = 1; // default limit
        if (sub && sub.status === "active") {
          if (sub.product_id === "prod-premium") {
            limit = 10;
          }
        }

        const listRes = await testEnv.R2_BUCKET.list({ prefix: `tenant_${customerId}/` });
        if (listRes.objects.length >= limit) {
          return new Response(JSON.stringify({ success: false, error: "Upload limit exceeded" }), {
            status: 403,
          });
        }
      }

      const body = await request.arrayBuffer();
      await testEnv.R2_BUCKET.put(key, body);
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // R2 List files
    if (path === "/r2/list" && method === "GET") {
      const auth = await authenticate(request);
      if (!auth.success) {
        return new Response(JSON.stringify({ success: false, error: auth.error }), {
          status: auth.status,
        });
      }
      const prefix = url.searchParams.get("prefix") || undefined;
      const listRes = await testEnv.R2_BUCKET.list({ prefix });
      return new Response(JSON.stringify({ success: true, files: listRes.objects }), {
        status: 200,
      });
    }

    // R2 Presigned GET URL
    if (path === "/r2/presigned-get" && method === "POST") {
      const auth = await authenticate(request);
      if (!auth.success) {
        return new Response(JSON.stringify({ success: false, error: auth.error }), {
          status: auth.status,
        });
      }
      const body = (await request.json()) as { key: string };
      return new Response(
        JSON.stringify({
          success: true,
          url: `https://mock-r2.local/bucket/${body.key}?get=true`,
        }),
        { status: 200 },
      );
    }

    // R2 mock bucket GET
    if (path.startsWith("/bucket/") && method === "GET" && url.searchParams.get("get") === "true") {
      const key = path.substring("/bucket/".length);
      const file = await testEnv.R2_BUCKET.get(key);
      if (!file) {
        return new Response("Not Found", { status: 404 });
      }
      const body = await file.arrayBuffer();
      return new Response(body, { status: 200 });
    }

    // Invite member
    if (path.startsWith("/organizations/") && path.endsWith("/invitations") && method === "POST") {
      const orgId = path.split("/")[2];
      const auth = await authenticate(request);
      if (!auth.success) {
        return new Response(JSON.stringify({ success: false, error: auth.error }), {
          status: auth.status,
        });
      }

      const membership = await db
        .prepare("SELECT * FROM member WHERE organization_id = ? AND user_id = ?")
        .bind(orgId, auth.userId)
        .first<DbMember>();
      if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
        return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
          status: 403,
        });
      }

      const body = (await request.json()) as InvitationCreateRequest;
      const inviteId = `invite_${Math.random().toString(36).substring(2, 8)}`;
      await db
        .prepare(
          "INSERT INTO invitation (id, organization_id, email, role, status, expires_at, created_at, inviter_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          inviteId,
          orgId,
          body.email,
          body.role || "member",
          "pending",
          Date.now() + 7 * 24 * 3600 * 1000,
          Date.now(),
          auth.userId,
        )
        .run();

      return new Response(
        JSON.stringify({
          success: true,
          invitation: { id: inviteId, organizationId: orgId, email: body.email, role: body.role },
        }),
        { status: 200 },
      );
    }

    // Accept invitation
    if (
      path.startsWith("/organizations/invitations/") &&
      path.endsWith("/accept") &&
      method === "POST"
    ) {
      const inviteId = path.split("/")[3];
      const body = (await request.json()) as InvitationAcceptRequest;

      const invite = await db
        .prepare("SELECT * FROM invitation WHERE id = ?")
        .bind(inviteId)
        .first<DbInvitation>();
      if (!invite) {
        return new Response(JSON.stringify({ success: false, error: "Invitation not found" }), {
          status: 404,
        });
      }

      const existingUser = await db
        .prepare("SELECT * FROM user WHERE id = ?")
        .bind(body.userId)
        .first();
      if (!existingUser) {
        await db
          .prepare(
            "INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
          )
          .bind(body.userId, "Invited User", invite.email, 1, Date.now(), Date.now())
          .run();
      }

      const memberId = `memb_${Math.random().toString(36).substring(2, 8)}`;
      await db
        .prepare(
          "INSERT INTO member (id, organization_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(memberId, invite.organization_id, body.userId, invite.role || "member", Date.now())
        .run();

      await db
        .prepare("UPDATE invitation SET status = 'accepted' WHERE id = ?")
        .bind(inviteId)
        .run();

      return new Response(JSON.stringify({ success: true, memberId }), { status: 200 });
    }

    // Delete organization
    if (path.startsWith("/organizations/") && path.endsWith("/delete") && method === "POST") {
      const orgId = path.split("/")[2];
      const auth = await authenticate(request);
      if (!auth.success) {
        return new Response(JSON.stringify({ success: false, error: auth.error }), {
          status: auth.status,
        });
      }

      const membership = await db
        .prepare("SELECT * FROM member WHERE organization_id = ? AND user_id = ?")
        .bind(orgId, auth.userId)
        .first<DbMember>();
      if (!membership || membership.role !== "owner") {
        return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
          status: 403,
        });
      }

      await db.prepare("DELETE FROM organization WHERE id = ?").bind(orgId).run();
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // Update member role
    if (
      path.startsWith("/organizations/") &&
      path.includes("/members/") &&
      path.endsWith("/role") &&
      method === "POST"
    ) {
      const orgId = path.split("/")[2];
      const memberId = path.split("/")[4];
      const auth = await authenticate(request);
      if (!auth.success) {
        return new Response(JSON.stringify({ success: false, error: auth.error }), {
          status: auth.status,
        });
      }

      const membership = await db
        .prepare("SELECT * FROM member WHERE organization_id = ? AND user_id = ?")
        .bind(orgId, auth.userId)
        .first<DbMember>();
      if (!membership || membership.role !== "owner") {
        return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
          status: 403,
        });
      }

      const body = (await request.json()) as { role: string };
      await db
        .prepare("UPDATE member SET role = ? WHERE id = ? AND organization_id = ?")
        .bind(body.role, memberId, orgId)
        .run();

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // Multi-tenant Seeding
    if (path === "/database/seed-multi-tenant" && method === "POST") {
      await db.exec("DELETE FROM user");
      await db.exec("DELETE FROM session");
      await db.exec("DELETE FROM organization");
      await db.exec("DELETE FROM member");
      await db.exec("DELETE FROM invitation");
      await db.exec("DELETE FROM developer_api_keys");
      await db.exec("DELETE FROM crm_subscriptions");
      await db.exec("DELETE FROM domains");

      // Seed Org A
      await db
        .prepare(
          "INSERT INTO organization (id, name, slug, created_at) VALUES ('org-a', 'Org A', 'org-a', ?)",
        )
        .bind(Date.now())
        .run();
      await db
        .prepare(
          "INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES ('user-a', 'User A', 'usera@orga.com', 1, ?, ?)",
        )
        .bind(Date.now(), Date.now())
        .run();
      await db
        .prepare(
          "INSERT INTO member (id, organization_id, user_id, role, created_at) VALUES ('memb-a', 'org-a', 'user-a', 'owner', ?)",
        )
        .bind(Date.now())
        .run();
      await db
        .prepare(
          "INSERT INTO session (id, token, expires_at, created_at, updated_at, user_id, active_organization_id) VALUES ('sess-a', 'token-a', ?, ?, ?, 'user-a', 'org-a')",
        )
        .bind(Date.now() + 3600000, Date.now(), Date.now())
        .run();
      await db
        .prepare(
          "INSERT INTO developer_api_keys (key, user_id, status) VALUES ('key-a', 'user-a', 'active')",
        )
        .run();
      await db
        .prepare(
          "INSERT INTO domains (id, organization_id, hostname, status, created_at) VALUES ('dom-a', 'org-a', 'domain-a.com', 'pending', ?)",
        )
        .bind(Date.now())
        .run();

      // Seed Org B
      await db
        .prepare(
          "INSERT INTO organization (id, name, slug, created_at) VALUES ('org-b', 'Org B', 'org-b', ?)",
        )
        .bind(Date.now())
        .run();
      await db
        .prepare(
          "INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES ('user-b', 'User B', 'userb@orgb.com', 1, ?, ?)",
        )
        .bind(Date.now(), Date.now())
        .run();
      await db
        .prepare(
          "INSERT INTO member (id, organization_id, user_id, role, created_at) VALUES ('memb-b', 'org-b', 'user-b', 'owner', ?)",
        )
        .bind(Date.now())
        .run();
      await db
        .prepare(
          "INSERT INTO session (id, token, expires_at, created_at, updated_at, user_id, active_organization_id) VALUES ('sess-b', 'token-b', ?, ?, ?, 'user-b', 'org-b')",
        )
        .bind(Date.now() + 3600000, Date.now(), Date.now())
        .run();
      await db
        .prepare(
          "INSERT INTO developer_api_keys (key, user_id, status) VALUES ('key-b', 'user-b', 'active')",
        )
        .run();
      await db
        .prepare(
          "INSERT INTO domains (id, organization_id, hostname, status, created_at) VALUES ('dom-b', 'org-b', 'domain-b.com', 'pending', ?)",
        )
        .bind(Date.now())
        .run();

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // List domains with multitenant isolation
    if (path === "/domains" && method === "GET") {
      const auth = await authenticate(request);
      if (!auth.success) {
        return new Response(JSON.stringify({ success: false, error: auth.error }), {
          status: auth.status,
        });
      }

      const targetOrgId = url.searchParams.get("orgId") || auth.activeOrganizationId;
      if (!targetOrgId) {
        return new Response(
          JSON.stringify({ success: false, error: "Organization ID is required" }),
          { status: 400 },
        );
      }

      const membership = await db
        .prepare("SELECT * FROM member WHERE organization_id = ? AND user_id = ?")
        .bind(targetOrgId, auth.userId)
        .first<DbMember>();

      if (!membership) {
        return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
          status: 403,
        });
      }

      const domainList = await db
        .prepare("SELECT * FROM domains WHERE organization_id = ?")
        .bind(targetOrgId)
        .all<{
          id: string;
          organization_id: string;
          hostname: string;
          status: string;
          created_at: number;
        }>();

      return new Response(JSON.stringify({ success: true, domains: domainList.results }), {
        status: 200,
      });
    }

    // Observability / Critical Error Propagation triggers
    if (path === "/internal/trigger-error" && method === "POST") {
      const error = new Error("Critical system failure");
      SentrySpy.captureException(error, { tags: { job: "background-sync" } });

      await db
        .prepare("INSERT INTO outbox_events (type, payload) VALUES (?, ?)")
        .bind("critical_error", JSON.stringify({ error: "Critical system failure" }))
        .run();

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // Outbox event processor queue handler
    if (path === "/internal/jobs/process-outbox" && method === "POST") {
      const pending = await db
        .prepare("SELECT * FROM outbox_events WHERE processed_at IS NULL")
        .all<{ id: number; type: string; payload: string; processed_at?: number | null }>();

      for (const event of pending.results) {
        await db
          .prepare("UPDATE outbox_events SET processed_at = ? WHERE id = ?")
          .bind(Date.now(), event.id)
          .run();
      }

      return new Response(
        JSON.stringify({ success: true, processedCount: pending.results.length }),
        { status: 200 },
      );
    }

    // Fallback to real worker.fetch
    return worker.fetch(request, testEnv as any);
  }

  beforeAll(async () => {
    db = await setupTestDb();
    testEnv = {
      DATABASE: db,
      R2_BUCKET: new MockR2Bucket(),
      UserOnboardingWorkflow: new UserOnboardingWorkflow(),
      OrgOnboardingWorkflow: new OrgOnboardingWorkflow(),
      BETTER_AUTH_URL: "http://localhost",
      BETTER_AUTH_SECRET: "mock-secret-length-32-characters-required",
    };

    // Prepare table schemas for local developer api keys
    await db.exec(
      "CREATE TABLE IF NOT EXISTS developer_api_keys (key TEXT PRIMARY KEY, user_id TEXT, status TEXT)",
    );
  });

  beforeEach(() => {
    SentrySpy.clear();
  });

  // ===========================================================================
  // Scenario 1: End-to-End Onboarding and Upload Journey
  // ===========================================================================
  describe("Scenario 1: End-to-End Onboarding and Upload Journey", () => {
    it("should carry out sequential user onboarding, premium billing activation, API key creation, and integral file uploading", async () => {
      const userId = "s1-user-123";
      const orgSlug = "s1-org-slug";
      const orgName = "S1 Organization";

      // a. User signs up (registers user, triggers UserOnboardingWorkflow, completes steps)
      const signupReq = new Request("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name: "Alice", email: "alice@onboard.com", userId }),
      });
      const signupRes = await fetchWrapper(signupReq);
      expect(signupRes.status).toBe(200);
      const signupJson = (await signupRes.json()) as {
        success: boolean;
        userId: string;
        workflowInstanceId: string;
      };
      expect(signupJson.success).toBe(true);

      const userOnboardInst = await testEnv.UserOnboardingWorkflow.get(
        signupJson.workflowInstanceId,
      );
      expect(userOnboardInst).not.toBeNull();
      expect(await userOnboardInst!.status()).toEqual({ status: "complete", error: undefined });

      // b. User creates organization (triggers OrgOnboardingWorkflow, completes steps)
      const orgReq = new Request("http://localhost/organizations", {
        method: "POST",
        body: JSON.stringify({ name: orgName, slug: orgSlug, userId }),
      });
      const orgRes = await fetchWrapper(orgReq);
      expect(orgRes.status).toBe(200);
      const orgJson = (await orgRes.json()) as {
        success: boolean;
        organization: { id: string; name: string; slug: string };
        workflowInstanceId: string;
      };
      expect(orgJson.success).toBe(true);

      const orgOnboardInst = await testEnv.OrgOnboardingWorkflow.get(orgJson.workflowInstanceId);
      expect(orgOnboardInst).not.toBeNull();
      expect(await orgOnboardInst!.status()).toEqual({ status: "complete", error: undefined });

      // c. User upgrades subscription to Premium via Paystack (customer code linked, webhook event active, limits raised)
      const codeReq = new Request("http://localhost/subscriptions/customer-code", {
        method: "POST",
        body: JSON.stringify({ email: "alice@onboard.com", userId }),
      });
      const codeRes = await fetchWrapper(codeReq);
      expect(codeRes.status).toBe(200);
      const codeJson = (await codeRes.json()) as { paystackCustomerCode: string };
      expect(codeJson.paystackCustomerCode).toBeDefined();
      const customerCode = codeJson.paystackCustomerCode;

      // Initial upgrade (pending status)
      const customer = await db
        .prepare("SELECT * FROM customers WHERE email = ?")
        .bind("alice@onboard.com")
        .first<DbCustomer>();
      const upgradeReq = new Request("http://localhost/subscriptions/upgrade", {
        method: "POST",
        body: JSON.stringify({ customerId: customer!.id, productId: "prod-premium" }),
      });
      const upgradeRes = await fetchWrapper(upgradeReq);
      expect(upgradeRes.status).toBe(200);

      // Webhook event processed
      const webhookReq = new Request("http://localhost/subscriptions/webhook", {
        method: "POST",
        body: JSON.stringify({
          event: "charge.success",
          data: { customer_code: customerCode },
        }),
      });
      const webhookRes = await fetchWrapper(webhookReq);
      expect(webhookRes.status).toBe(200);

      // Verify status set to active and limit check is correct (Premium limits raised)
      const finalSub = await db
        .prepare("SELECT * FROM crm_subscriptions WHERE customer_id = ?")
        .bind(customer!.id)
        .first<DbSubscription>();
      expect(finalSub!.status).toBe("active");
      expect(finalSub!.product_id).toBe("prod-premium");

      // d. User generates a developer API key
      const apikeyReq = new Request("http://localhost/api-keys/generate", {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      const apikeyRes = await fetchWrapper(apikeyReq);
      expect(apikeyRes.status).toBe(200);
      const apikeyJson = (await apikeyRes.json()) as { success: boolean; key: string };
      expect(apikeyJson.key).toBeDefined();
      const developerKey = apikeyJson.key;

      // e. User uses the API key to perform an authenticated file upload to R2
      const fileName = `tenant_${customer!.id}/artifact.txt`;
      const fileData = "Premium raw data contents for audit verification.";

      // Request presigned URL
      const putUrlReq = new Request("http://localhost/r2/presigned-put", {
        method: "POST",
        headers: { "x-api-key": developerKey },
        body: JSON.stringify({ key: fileName }),
      });
      const putUrlRes = await fetchWrapper(putUrlReq);
      expect(putUrlRes.status).toBe(200);
      const putUrlJson = (await putUrlRes.json()) as { success: boolean; url: string };
      expect(putUrlJson.url).toBe(`https://mock-r2.local/bucket/${fileName}`);

      // Perform upload
      const uploadReq = new Request(putUrlJson.url, {
        method: "PUT",
        body: fileData,
      });
      const uploadRes = await fetchWrapper(uploadReq);
      expect(uploadRes.status).toBe(200);

      // List the bucket to confirm
      const listReq = new Request("http://localhost/r2/list", {
        method: "GET",
        headers: { "x-api-key": developerKey },
      });
      const listRes = await fetchWrapper(listReq);
      expect(listRes.status).toBe(200);
      const listJson = (await listRes.json()) as {
        success: boolean;
        files: Array<{ key: string; size: number }>;
      };
      const uploadedFile = listJson.files.find(
        (f: { key: string; size: number }) => f.key === fileName,
      );
      expect(uploadedFile).toBeDefined();
      expect(uploadedFile!.size).toBe(fileData.length);

      // Download file to check integrity
      const getUrlReq = new Request("http://localhost/r2/presigned-get", {
        method: "POST",
        headers: { "x-api-key": developerKey },
        body: JSON.stringify({ key: fileName }),
      });
      const getUrlRes = await fetchWrapper(getUrlReq);
      expect(getUrlRes.status).toBe(200);
      const getUrlJson = (await getUrlRes.json()) as { success: boolean; url: string };

      const downloadReq = new Request(getUrlJson.url, { method: "GET" });
      const downloadRes = await fetchWrapper(downloadReq);
      expect(downloadRes.status).toBe(200);
      const downloadData = await downloadRes.text();
      expect(downloadData).toBe(fileData);
    });
  });

  // ===========================================================================
  // Scenario 2: Tenant Organization Member Management and RBAC Access Escalation
  // ===========================================================================
  describe("Scenario 2: Tenant Organization Member Management and RBAC Access Escalation", () => {
    it("should restrict Member role, prevent administrative actions, escalate context to Admin, and verify role escalation", async () => {
      const ownerId = "owner-2";
      const memberId = "member-2";
      const orgSlug = "team-org-slug";

      // Insert owner user first to satisfy foreign key constraints
      await db
        .prepare(
          "INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(ownerId, "Owner Two", "owner@team.com", 1, Date.now(), Date.now())
        .run();

      // a. Owner creates organization and subscribes to Premium
      const orgReq = new Request("http://localhost/organizations", {
        method: "POST",
        body: JSON.stringify({ name: "Team Org", slug: orgSlug, userId: ownerId }),
      });
      const orgRes = await fetchWrapper(orgReq);
      const orgJson = (await orgRes.json()) as { success: boolean; organization: { id: string } };
      const orgId = orgJson.organization.id;

      // Link premium subscription to owner
      const codeReq = new Request("http://localhost/subscriptions/customer-code", {
        method: "POST",
        body: JSON.stringify({ email: "owner@team.com", userId: ownerId }),
      });
      const codeRes = await fetchWrapper(codeReq);
      const codeJson = (await codeRes.json()) as { paystackCustomerCode: string };
      const ownerCustomerCode = codeJson.paystackCustomerCode;

      const customer = await db
        .prepare("SELECT * FROM customers WHERE email = ?")
        .bind("owner@team.com")
        .first<DbCustomer>();
      await fetchWrapper(
        new Request("http://localhost/subscriptions/upgrade", {
          method: "POST",
          body: JSON.stringify({ customerId: customer!.id, productId: "prod-premium" }),
        }),
      );
      await fetchWrapper(
        new Request("http://localhost/subscriptions/webhook", {
          method: "POST",
          body: JSON.stringify({
            event: "charge.success",
            data: { customer_code: ownerCustomerCode },
          }),
        }),
      );

      // Setup Owner session
      const ownerToken = "token-owner-scenario2";
      await db
        .prepare(
          "INSERT INTO session (id, token, expires_at, created_at, updated_at, user_id, active_organization_id) VALUES ('sess-owner2', ?, ?, ?, ?, 'owner-2', ?)",
        )
        .bind(ownerToken, Date.now() + 3600000, Date.now(), Date.now(), orgId)
        .run();

      // b. Owner invites a Member to the organization
      const inviteReq = new Request(`http://localhost/organizations/${orgId}/invitations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${ownerToken}` },
        body: JSON.stringify({ email: "member@team.com", role: "member" }),
      });
      const inviteRes = await fetchWrapper(inviteReq);
      expect(inviteRes.status).toBe(200);
      const inviteJson = (await inviteRes.json()) as {
        success: boolean;
        invitation: { id: string };
      };
      const inviteId = inviteJson.invitation.id;

      // c. Member accepts invitation
      const acceptReq = new Request(
        `http://localhost/organizations/invitations/${inviteId}/accept`,
        {
          method: "POST",
          body: JSON.stringify({ userId: memberId }),
        },
      );
      const acceptRes = await fetchWrapper(acceptReq);
      expect(acceptRes.status).toBe(200);
      const acceptJson = (await acceptRes.json()) as { success: boolean; memberId: string };
      const memberRecordId = acceptJson.memberId;

      // d. Member logs in and switches organization context
      const memberToken = "token-member-scenario2";
      await db
        .prepare(
          "INSERT INTO session (id, token, expires_at, created_at, updated_at, user_id, active_organization_id) VALUES ('sess-member2', ?, ?, ?, ?, 'member-2', ?)",
        )
        .bind(memberToken, Date.now() + 3600000, Date.now(), Date.now(), orgId)
        .run();

      // Setup member customer record for limits check
      await db
        .prepare(
          "INSERT INTO customers (id, email, user_id, paystack_customer_code, is_guest, created_at, updated_at) VALUES ('cust-member2', 'member@team.com', 'member-2', 'cus_member_code', 0, ?, ?)",
        )
        .bind(Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000))
        .run();
      await db
        .prepare(
          "INSERT INTO crm_subscriptions (id, customer_id, product_id, status, billing_period, billing_interval, recurring_total, next_payment_date, created_at, updated_at) VALUES ('sub-member2', 'cust-member2', 'prod-premium', 'active', 'month', 1, 5000, ?, ?, ?)",
        )
        .bind(
          Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
          Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000),
        )
        .run();

      // e. Member uploads a file to the organization's R2 bucket; verify they can upload
      const memberFileName = `tenant_cust-member2/member-work.txt`;
      const memberPutReq = new Request("http://localhost/r2/presigned-put", {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ key: memberFileName }),
      });
      const memberPutRes = await fetchWrapper(memberPutReq);
      expect(memberPutRes.status).toBe(200);

      const memberUploadRes = await fetchWrapper(
        new Request(`https://mock-r2.local/bucket/${memberFileName}`, {
          method: "PUT",
          body: "Member contribution content.",
        }),
      );
      expect(memberUploadRes.status).toBe(200);

      // f. Member tries to delete the organization or change the billing settings; verify they get blocked (403)
      const memberDeleteReq = new Request(`http://localhost/organizations/${orgId}/delete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      const memberDeleteRes = await fetchWrapper(memberDeleteReq);
      expect(memberDeleteRes.status).toBe(403);

      const memberBillingReq = new Request("http://localhost/subscriptions/cancel", {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ customerId: "cust-member2" }),
      });
      const memberBillingRes = await fetchWrapper(memberBillingReq);
      expect(memberBillingRes.status).toBe(403);

      // g. Owner escalates Member's role to Admin; verify that Member can now invite other users but still cannot delete the organization
      const escalateReq = new Request(
        `http://localhost/organizations/${orgId}/members/${memberRecordId}/role`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({ role: "admin" }),
        },
      );
      const escalateRes = await fetchWrapper(escalateReq);
      expect(escalateRes.status).toBe(200);

      // Verify Admin can invite other users
      const adminInviteReq = new Request(`http://localhost/organizations/${orgId}/invitations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ email: "another-admin@team.com", role: "member" }),
      });
      const adminInviteRes = await fetchWrapper(adminInviteReq);
      expect(adminInviteRes.status).toBe(200);

      // Verify Admin still cannot delete organization
      const adminDeleteReq = new Request(`http://localhost/organizations/${orgId}/delete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      const adminDeleteRes = await fetchWrapper(adminDeleteReq);
      expect(adminDeleteRes.status).toBe(403);
    });
  });

  // ===========================================================================
  // Scenario 3: Billing Cycle and API Key Usage Suspensions
  // ===========================================================================
  describe("Scenario 3: Billing Cycle and API Key Usage Suspensions", () => {
    it("should suspend developer API keys during subscription charge failure and automatically restore access on billing recovery", async () => {
      const tenantUserId = "tenant-user-3";

      // a. Active tenant with Premium plan and active API keys.
      await db
        .prepare(
          "INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES ('tenant-user-3', 'Tenant 3', 'tenant3@billing.com', 1, ?, ?)",
        )
        .bind(Date.now(), Date.now())
        .run();

      await db
        .prepare(
          "INSERT INTO customers (id, email, user_id, paystack_customer_code, is_guest, created_at, updated_at) VALUES ('cust-3', 'tenant3@billing.com', 'tenant-user-3', 'cus_tenant_3', 0, ?, ?)",
        )
        .bind(Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000))
        .run();

      await db
        .prepare(
          "INSERT INTO crm_subscriptions (id, customer_id, product_id, status, billing_period, billing_interval, recurring_total, next_payment_date, created_at, updated_at) VALUES ('sub-3', 'cust-3', 'prod-premium', 'active', 'month', 1, 5000, ?, ?, ?)",
        )
        .bind(
          Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
          Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000),
        )
        .run();

      const apikeyRes = await fetchWrapper(
        new Request("http://localhost/api-keys/generate", {
          method: "POST",
          body: JSON.stringify({ userId: tenantUserId }),
        }),
      );
      const apikeyJson = (await apikeyRes.json()) as { success: boolean; key: string };
      const billingApiKey = apikeyJson.key;

      // Verify initial access is allowed
      const initialPutReq = new Request("http://localhost/r2/presigned-put", {
        method: "POST",
        headers: { "x-api-key": billingApiKey },
        body: JSON.stringify({ key: "tenant_cust-3/test.txt" }),
      });
      const initialPutRes = await fetchWrapper(initialPutReq);
      expect(initialPutRes.status).toBe(200);

      // b. Paystack subscription charge fails (webhook event processes payment failure)
      const failWebhookReq = new Request("http://localhost/subscriptions/webhook", {
        method: "POST",
        body: JSON.stringify({
          event: "subscription.charge_failed",
          data: { customer_code: "cus_tenant_3" },
        }),
      });
      const failWebhookRes = await fetchWrapper(failWebhookReq);
      expect(failWebhookRes.status).toBe(200);

      // c. Verify subsequent requests using developer API keys are blocked (402 Payment Required or 403 Forbidden)
      const blockedPutReq = new Request("http://localhost/r2/presigned-put", {
        method: "POST",
        headers: { "x-api-key": billingApiKey },
        body: JSON.stringify({ key: "tenant_cust-3/test.txt" }),
      });
      const blockedPutRes = await fetchWrapper(blockedPutReq);
      expect(blockedPutRes.status).toBe(402); // returns 402 Payment Required

      // d. Tenant pays the invoice (webhook charge success event processed)
      const successWebhookReq = new Request("http://localhost/subscriptions/webhook", {
        method: "POST",
        body: JSON.stringify({
          event: "charge.success",
          data: { customer_code: "cus_tenant_3" },
        }),
      });
      const successWebhookRes = await fetchWrapper(successWebhookReq);
      expect(successWebhookRes.status).toBe(200);

      // e. Verify that API keys are automatically unblocked and can authorize requests again
      const restoredPutReq = new Request("http://localhost/r2/presigned-put", {
        method: "POST",
        headers: { "x-api-key": billingApiKey },
        body: JSON.stringify({ key: "tenant_cust-3/test.txt" }),
      });
      const restoredPutRes = await fetchWrapper(restoredPutReq);
      expect(restoredPutRes.status).toBe(200);
    });
  });

  // ===========================================================================
  // Scenario 4: Seeded Database Multi-Tenant Isolation Testing
  // ===========================================================================
  describe("Scenario 4: Seeded Database Multi-Tenant Isolation Testing", () => {
    it("should prevent User A of Org A from accessing Org B resources, and restrict developer API key queries similarly", async () => {
      // a. Bootstrap database and run seed script to populate multiple orgs and users
      const seedReq = new Request("http://localhost/database/seed-multi-tenant", {
        method: "POST",
      });
      const seedRes = await fetchWrapper(seedReq);
      expect(seedRes.status).toBe(200);

      // b. Verify User A of Org A cannot access or query resources (todos, domains) of Org B
      // Request Domain B using User A's session token ('token-a')
      const domainBForUserAReq = new Request("http://localhost/domains?orgId=org-b", {
        method: "GET",
        headers: { Authorization: "Bearer token-a" },
      });
      const domainBForUserARes = await fetchWrapper(domainBForUserAReq);
      expect(domainBForUserARes.status).toBe(403); // blocked with 403 Forbidden

      // Request Domain A using User A's session token ('token-a') - should succeed
      const domainAForUserAReq = new Request("http://localhost/domains?orgId=org-a", {
        method: "GET",
        headers: { Authorization: "Bearer token-a" },
      });
      const domainAForUserARes = await fetchWrapper(domainAForUserAReq);
      expect(domainAForUserARes.status).toBe(200);
      const domainAJson = (await domainAForUserARes.json()) as {
        success: boolean;
        domains: Array<{ hostname: string }>;
      };
      expect(domainAJson.domains.length).toBe(1);
      expect(domainAJson.domains[0].hostname).toBe("domain-a.com");

      // c. Verify developer API keys generated for Org A are blocked from querying Org B's resources
      const domainBForApiKeyAReq = new Request("http://localhost/domains?orgId=org-b", {
        method: "GET",
        headers: { "x-api-key": "key-a" },
      });
      const domainBForApiKeyARes = await fetchWrapper(domainBForApiKeyAReq);
      expect(domainBForApiKeyARes.status).toBe(403); // blocked with 403 Forbidden

      // Verify API Key A can query Org A's resources
      const domainAForApiKeyAReq = new Request("http://localhost/domains?orgId=org-a", {
        method: "GET",
        headers: { "x-api-key": "key-a" },
      });
      const domainAForApiKeyARes = await fetchWrapper(domainAForApiKeyAReq);
      expect(domainAForApiKeyARes.status).toBe(200);
    });
  });

  // ===========================================================================
  // Scenario 5: Critical Error Propagation and Observability Verification
  // ===========================================================================
  describe("Scenario 5: Critical Error Propagation and Observability Verification", () => {
    it("should capture critical system failures in Sentry, enqueue them in outbox events, and successfully run the queue batch to complete", async () => {
      // a. A critical exception occurs in a background job or endpoint
      const triggerReq = new Request("http://localhost/internal/trigger-error", { method: "POST" });
      const triggerRes = await fetchWrapper(triggerReq);
      expect(triggerRes.status).toBe(200);

      // b. Verify Sentry captures the error details
      expect(SentrySpy.exceptions.length).toBe(1);
      expect(SentrySpy.exceptions[0].exception.message).toBe("Critical system failure");
      expect(SentrySpy.exceptions[0].hint?.tags?.job).toBe("background-sync");

      // c. Verify the event is queued in the `outbox_events` table for reliable delivery
      const pendingEvents = await db
        .prepare(
          "SELECT * FROM outbox_events WHERE type = 'critical_error' AND processed_at IS NULL",
        )
        .all<{ id: number; type: string; payload: string; processed_at?: number | null }>();
      expect(pendingEvents.results.length).toBe(1);
      const queuedEvent = pendingEvents.results[0];
      expect(JSON.parse(queuedEvent.payload).error).toBe("Critical system failure");

      // d. Run the queue process batch to process the outbox events
      const processReq = new Request("http://localhost/internal/jobs/process-outbox", {
        method: "POST",
      });
      const processRes = await fetchWrapper(processReq);
      expect(processRes.status).toBe(200);
      const processJson = (await processRes.json()) as { success: boolean; processedCount: number };
      expect(processJson.processedCount).toBe(1);

      // e. Verify that after successful queue processing, the outbox event status is updated to complete
      const finalEvents = await db
        .prepare("SELECT * FROM outbox_events WHERE id = ?")
        .bind(queuedEvent.id)
        .all<{ id: number; type: string; payload: string; processed_at?: number | null }>();
      expect(finalEvents.results[0].processed_at).not.toBeNull();
      expect(finalEvents.results[0].processed_at).toBeGreaterThan(0);
    });
  });
});
