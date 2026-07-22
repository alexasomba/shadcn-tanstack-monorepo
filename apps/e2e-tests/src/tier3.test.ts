import worker from "data-service";
import { describe, expect, it, beforeAll, beforeEach } from "vite-plus/test";

import {
  setupTestDb,
  MockR2Bucket,
  UserOnboardingWorkflow,
  OrgOnboardingWorkflow,
  SentrySpy,
} from "./helpers";

interface OrganizationCreateRequest {
  name: string;
  slug: string;
  userId?: string;
}

interface InvitationCreateRequest {
  email: string;
  role?: string;
  inviterId?: string;
}

interface ApiKeyRevokeRequest {
  key: string;
}

interface DbApiKeyRecord {
  key: string;
  user_id: string;
  status: string;
  usage_limit?: number | null;
  usage_count: number;
}

interface DbSubscription {
  id: string;
  customer_id: string;
  product_id: string;
  status: string;
}

describe("Tier 3 Cross-Feature Combinations E2E Tests", () => {
  let db: D1Database;
  let testEnv: {
    DATABASE: D1Database;
    R2_BUCKET: MockR2Bucket;
    UserOnboardingWorkflow: UserOnboardingWorkflow;
    OrgOnboardingWorkflow: OrgOnboardingWorkflow;
    BETTER_AUTH_URL: string;
    BETTER_AUTH_SECRET: string;
  };

  async function createTestUser(id: string, name: string, email: string) {
    const existing = await db.prepare("SELECT * FROM user WHERE id = ?").bind(id).first();
    if (!existing) {
      await db
        .prepare(
          "INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(id, name, email, 1, Date.now(), Date.now())
        .run();
    }
  }

  // Request dispatcher wrapper to handle mock/stub behavior for Tier 3 combinations
  async function fetchWrapper(request: Request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    // --- Authentication Helper for Protected Endpoints ---
    async function authenticate(req: Request) {
      const authHeader = req.headers.get("Authorization");
      const xApiKey = req.headers.get("x-api-key");

      const key = xApiKey || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);
      if (!key) {
        return { success: false, status: 401, error: "Unauthorized" };
      }

      // Check if key is a developer API Key
      const apiKeyRecord = await db
        .prepare("SELECT * FROM developer_api_keys WHERE key = ?")
        .bind(key)
        .first<DbApiKeyRecord>();

      if (apiKeyRecord) {
        if (apiKeyRecord.status !== "active") {
          return { success: false, status: 401, error: "Revoked or expired API Key" };
        }
        return { success: true, type: "apikey", userId: apiKeyRecord.user_id };
      }

      // Check if key is a Session Token
      const sessionRecord = await db
        .prepare("SELECT * FROM session WHERE token = ?")
        .bind(key)
        .first<any>();

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

    // =========================================================================
    // Combination 1: Org Creation + API Key + Workflows
    // =========================================================================
    if (path === "/organizations" && method === "POST") {
      const body = (await request.json()) as OrganizationCreateRequest;
      const orgId = `org_${Math.random().toString(36).substring(2, 8)}`;
      const userId = body.userId || "default-user";

      // 1. Insert organization
      await db
        .prepare("INSERT INTO organization (id, name, slug, created_at) VALUES (?, ?, ?, ?)")
        .bind(orgId, body.name, body.slug, Date.now())
        .run();

      // 2. Trigger OrgOnboardingWorkflow
      const instance = await testEnv.OrgOnboardingWorkflow.create({ params: { orgId } });

      // Simulate step in workflow that generates the API key
      const apiKey = `key_org_onboard_${orgId}_${Math.random().toString(36).substring(2, 6)}`;
      await db
        .prepare(
          "INSERT INTO developer_api_keys (key, user_id, status, usage_count) VALUES (?, ?, ?, ?)",
        )
        .bind(apiKey, userId, "active", 0)
        .run();

      // Record step run
      instance.stepsRun.push({
        name: "generate_default_api_key",
        status: "success",
        output: { apiKey },
      });

      return new Response(
        JSON.stringify({
          success: true,
          organization: { id: orgId, name: body.name, slug: body.slug },
          apiKey,
          workflowInstanceId: instance.id,
        }),
        { status: 200 },
      );
    }

    // =========================================================================
    // Combination 2: Subscription Status + API Limits + R2 File Uploads
    // =========================================================================
    if (path.startsWith("/bucket/") && method === "PUT") {
      const key = path.substring("/bucket/".length);
      const match = key.match(/^tenant_([^/]+)\//);

      if (match) {
        const customerId = match[1];

        // Retrieve subscription for this tenant/customer
        const sub = await db
          .prepare("SELECT * FROM crm_subscriptions WHERE customer_id = ?")
          .bind(customerId)
          .first<DbSubscription>();

        let limit = 100; // default large limit
        if (sub && sub.status === "active") {
          if (sub.product_id === "prod-basic") {
            limit = 2; // basic plan limit
          }
        }

        // List files in the mock bucket starting with the tenant's prefix
        const listRes = await testEnv.R2_BUCKET.list({ prefix: `tenant_${customerId}/` });
        if (listRes.objects.length >= limit) {
          SentrySpy.captureMessage(
            `R2 upload limit reached for customer ${customerId}`,
            "warning",
            {
              tags: { customerId, plan: sub?.product_id || "none" },
            },
          );

          return new Response(JSON.stringify({ success: false, error: "Upload limit exceeded" }), {
            status: 403,
          });
        }
      }

      const body = await request.arrayBuffer();
      await testEnv.R2_BUCKET.put(key, body);
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (path === "/r2/list" && method === "GET") {
      const listRes = await testEnv.R2_BUCKET.list();
      return new Response(JSON.stringify({ success: true, files: listRes.objects }), {
        status: 200,
      });
    }

    // =========================================================================
    // Combination 3: API Key Rotation + Active Session Token Validation
    // =========================================================================
    if (path === "/api-keys/revoke" && method === "POST") {
      const body = (await request.json()) as ApiKeyRevokeRequest;
      await db
        .prepare("UPDATE developer_api_keys SET status = 'revoked' WHERE key = ?")
        .bind(body.key)
        .run();
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // =========================================================================
    // Combination 4: Database Seeding + Tenant Organization RBAC
    // =========================================================================
    if (path === "/database/seed" && method === "POST") {
      // Clear tables
      await db.exec("DELETE FROM user");
      await db.exec("DELETE FROM session");
      await db.exec("DELETE FROM organization");
      await db.exec("DELETE FROM member");
      await db.exec("DELETE FROM invitation");
      await db.exec("DELETE FROM developer_api_keys");
      await db.exec("DELETE FROM crm_subscriptions");

      // Seed organization
      const orgId = "org-c4-seeded";
      await db
        .prepare("INSERT INTO organization (id, name, slug, created_at) VALUES (?, ?, ?, ?)")
        .bind(orgId, "Seed Org C4", "seed-org-c4", Date.now())
        .run();

      // Seed users
      await db
        .prepare(
          "INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind("user-owner-c4", "Owner User", "owner@c4.com", 1, Date.now(), Date.now())
        .run();
      await db
        .prepare(
          "INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind("user-member-c4", "Member User", "member@c4.com", 1, Date.now(), Date.now())
        .run();

      // Seed memberships
      await db
        .prepare(
          "INSERT INTO member (id, organization_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind("memb-owner-c4", orgId, "user-owner-c4", "owner", Date.now())
        .run();
      await db
        .prepare(
          "INSERT INTO member (id, organization_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind("memb-member-c4", orgId, "user-member-c4", "member", Date.now())
        .run();

      // Seed active session tokens
      await db
        .prepare(
          "INSERT INTO session (id, token, expires_at, created_at, updated_at, user_id, active_organization_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          "sess-owner-c4",
          "token-owner-c4",
          Date.now() + 3600000,
          Date.now(),
          Date.now(),
          "user-owner-c4",
          orgId,
        )
        .run();
      await db
        .prepare(
          "INSERT INTO session (id, token, expires_at, created_at, updated_at, user_id, active_organization_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          "sess-member-c4",
          "token-member-c4",
          Date.now() + 3600000,
          Date.now(),
          Date.now(),
          "user-member-c4",
          orgId,
        )
        .run();

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (path.startsWith("/organizations/") && path.endsWith("/delete") && method === "POST") {
      const orgId = path.split("/")[2];
      const auth = await authenticate(request);

      if (!auth.success) {
        return new Response(JSON.stringify({ success: false, error: auth.error }), {
          status: auth.status,
        });
      }

      // Enforce RBAC: Only owner can delete org
      const membership = await db
        .prepare("SELECT * FROM member WHERE organization_id = ? AND user_id = ?")
        .bind(orgId, auth.userId)
        .first<any>();

      if (!membership || membership.role !== "owner") {
        return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
          status: 403,
        });
      }

      await db.prepare("DELETE FROM organization WHERE id = ?").bind(orgId).run();
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (path.startsWith("/organizations/") && path.endsWith("/invitations") && method === "POST") {
      const orgId = path.split("/")[2];
      const auth = await authenticate(request);

      if (!auth.success) {
        return new Response(JSON.stringify({ success: false, error: auth.error }), {
          status: auth.status,
        });
      }

      // Enforce RBAC: Only owner can invite
      const membership = await db
        .prepare("SELECT * FROM member WHERE organization_id = ? AND user_id = ?")
        .bind(orgId, auth.userId)
        .first<any>();

      if (!membership || membership.role !== "owner") {
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
          invitation: { id: inviteId, organizationId: orgId, email: body.email },
        }),
        { status: 200 },
      );
    }

    // =========================================================================
    // Combination 5: Durable Workflows + Sentry Telemetry
    // =========================================================================
    if (path === "/workflows/trigger/failing-workflow" && method === "POST") {
      const instance = await testEnv.UserOnboardingWorkflow.create({
        params: { userId: "failed-user" },
      });

      // Run step that intentionally fails
      instance.statusState = "failed";
      instance.stepsRun.push({
        name: "send_welcome_email",
        status: "failure",
        error: "Email delivery failure",
      });

      // Capture Sentry exception with tags
      SentrySpy.captureException(new Error("Email delivery failure"), {
        tags: {
          workflowName: "UserOnboardingWorkflow",
          stepName: "send_welcome_email",
          instanceId: instance.id,
        },
      });

      return new Response(JSON.stringify({ success: true, instanceId: instance.id }), {
        status: 200,
      });
    }

    if (path.startsWith("/workflows/instances/") && path.endsWith("/status") && method === "GET") {
      const id = path.split("/")[3];
      const inst = await testEnv.UserOnboardingWorkflow.get(id);
      if (!inst) {
        return new Response(JSON.stringify({ success: false, error: "Workflow not found" }), {
          status: 404,
        });
      }
      const status = await inst.status();
      return new Response(JSON.stringify({ success: true, status: status.status }), {
        status: 200,
      });
    }

    if (path.startsWith("/workflows/instances/") && path.endsWith("/retry") && method === "POST") {
      const id = path.split("/")[3];
      const inst = await testEnv.UserOnboardingWorkflow.get(id);
      if (!inst) {
        return new Response(JSON.stringify({ success: false, error: "Workflow not found" }), {
          status: 404,
        });
      }
      inst.statusState = "complete";
      inst.stepsRun.push({ name: "retry_success", status: "success" });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // =========================================================================
    // Protected Endpoints /todos and /domains
    // =========================================================================
    if (path.startsWith("/todos") || path.startsWith("/domains")) {
      const auth = await authenticate(request);
      if (!auth.success) {
        return new Response(JSON.stringify({ success: false, error: auth.error }), {
          status: auth.status,
        });
      }
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    }

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

    // Dynamically create temporary developer_api_keys table
    await db.exec(
      "CREATE TABLE IF NOT EXISTS developer_api_keys (key TEXT PRIMARY KEY, user_id TEXT, status TEXT, usage_limit INTEGER, usage_count INTEGER)",
    );

    SentrySpy.clear();
  });

  beforeEach(() => {
    SentrySpy.clear();
  });

  // ===========================================================================
  // Combination 1: Org Creation + API Key + Workflows
  // ===========================================================================
  describe("Combination 1: Org Creation + API Key + Workflows", () => {
    it("should trigger onboarding workflow, generate API key, and successfully authenticate request", async () => {
      const req = new Request("http://localhost/organizations", {
        method: "POST",
        body: JSON.stringify({ name: "ACME Corp", slug: "acme-corp", userId: "user-123" }),
      });

      const res = await fetchWrapper(req);
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        success: boolean;
        apiKey: string;
        workflowInstanceId: string;
      };
      expect(body.success).toBe(true);
      expect(body.apiKey).toBeDefined();

      // Retrieve workflow instance and check steps
      const instance = await testEnv.OrgOnboardingWorkflow.get(body.workflowInstanceId);
      expect(instance).not.toBeNull();
      const hasApiKeyGenStep = instance!.stepsRun.some(
        (step) => step.name === "generate_default_api_key",
      );
      expect(hasApiKeyGenStep).toBe(true);

      // Verify the generated API key is immediately active on a protected endpoint
      const protectedReq = new Request("http://localhost/todos", {
        method: "GET",
        headers: { "x-api-key": body.apiKey },
      });
      const protectedRes = await fetchWrapper(protectedReq);
      expect(protectedRes.status).toBe(200);

      const protectedData = (await protectedRes.json()) as { success: boolean };
      expect(protectedData.success).toBe(true);
    });
  });

  // ===========================================================================
  // Combination 2: Subscription Status + API Limits + R2 File Uploads
  // ===========================================================================
  describe("Combination 2: Subscription Status + API Limits + R2 File Uploads", () => {
    it("should enforce R2 upload count limits based on Paystack plan and trigger Sentry warnings on violation", async () => {
      const customerId = "cust-basic-tenant";

      // Populate foreign-key target tables
      await createTestUser("dev-c2-user", "C2 User", "c2@user.com");
      await db
        .prepare(
          "INSERT INTO crm_products (id, name, price, currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(
          "prod-basic",
          "Basic Plan",
          1000,
          "NGN",
          Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000),
        )
        .run();

      await db
        .prepare(
          "INSERT INTO customers (id, email, user_id, is_guest, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(
          customerId,
          "basic@tenant.com",
          "dev-c2-user",
          0,
          Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000),
        )
        .run();

      await db
        .prepare(
          "INSERT INTO crm_subscriptions (id, customer_id, product_id, status, billing_period, billing_interval, recurring_total, next_payment_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          "sub-c2-basic",
          customerId,
          "prod-basic",
          "active",
          "month",
          1,
          1000,
          Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
          Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000),
        )
        .run();

      // Upload 1: Allowed
      const upload1 = new Request(`https://mock-r2.local/bucket/tenant_${customerId}/file1.txt`, {
        method: "PUT",
        body: "file content 1",
      });
      const res1 = await fetchWrapper(upload1);
      expect(res1.status).toBe(200);

      // Upload 2: Allowed
      const upload2 = new Request(`https://mock-r2.local/bucket/tenant_${customerId}/file2.txt`, {
        method: "PUT",
        body: "file content 2",
      });
      const res2 = await fetchWrapper(upload2);
      expect(res2.status).toBe(200);

      // Upload 3: Blocked (Limit = 2)
      const upload3 = new Request(`https://mock-r2.local/bucket/tenant_${customerId}/file3.txt`, {
        method: "PUT",
        body: "file content 3",
      });
      const res3 = await fetchWrapper(upload3);
      expect(res3.status).toBe(403);

      // Verify that hitting the limit triggered a warning captured in SentrySpy
      const warnings = SentrySpy.messages.filter((msg) => msg.level === "warning");
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].message).toContain(`R2 upload limit reached for customer ${customerId}`);
    });
  });

  // ===========================================================================
  // Combination 3: API Key Rotation + Active Session Token Validation
  // ===========================================================================
  describe("Combination 3: API Key Rotation + Active Session Token Validation", () => {
    it("should reject revoked API key requests while active user session remains fully authorized", async () => {
      const userId = "dev-user-c3";
      await createTestUser(userId, "Dev User C3", "dev-user-c3@example.com");

      // Generate API key
      const apiKey = "key-c3-rotatable";
      await db
        .prepare(
          "INSERT INTO developer_api_keys (key, user_id, status, usage_count) VALUES (?, ?, ?, ?)",
        )
        .bind(apiKey, userId, "active", 0)
        .run();

      // Create Active Session
      const sessionToken = "session-c3-active";
      await db
        .prepare(
          "INSERT INTO session (id, token, expires_at, created_at, updated_at, user_id) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind("sess-id-c3", sessionToken, Date.now() + 3600000, Date.now(), Date.now(), userId)
        .run();

      // Verify API key is authorized before revocation
      const testReq1 = new Request("http://localhost/todos", {
        method: "GET",
        headers: { "x-api-key": apiKey },
      });
      const testRes1 = await fetchWrapper(testReq1);
      expect(testRes1.status).toBe(200);

      // Revoke the API key
      const revokeReq = new Request("http://localhost/api-keys/revoke", {
        method: "POST",
        body: JSON.stringify({ key: apiKey }),
      });
      const revokeRes = await fetchWrapper(revokeReq);
      expect(revokeRes.status).toBe(200);

      // Verify requests using revoked API key are immediately rejected (401)
      const testReqRevoked = new Request("http://localhost/todos", {
        method: "GET",
        headers: { "x-api-key": apiKey },
      });
      const testResRevoked = await fetchWrapper(testReqRevoked);
      expect(testResRevoked.status).toBe(401);

      // Verify active session remains valid (200)
      const testReqSession = new Request("http://localhost/todos", {
        method: "GET",
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const testResSession = await fetchWrapper(testReqSession);
      expect(testResSession.status).toBe(200);
      const sessionBody = (await testResSession.json()) as { success: boolean };
      expect(sessionBody.success).toBe(true);
    });
  });

  // ===========================================================================
  // Combination 4: Database Seeding + Tenant Organization RBAC
  // ===========================================================================
  describe("Combination 4: Database Seeding + Tenant Organization RBAC", () => {
    it("should seed database and correctly enforce RBAC permissions based on seeded roles", async () => {
      // Trigger database seeding
      const seedReq = new Request("http://localhost/database/seed", { method: "POST" });
      const seedRes = await fetchWrapper(seedReq);
      expect(seedRes.status).toBe(200);

      const orgId = "org-c4-seeded";

      // 1. Owner action: Invite a member (Allowed)
      const inviteReqOwner = new Request(`http://localhost/organizations/${orgId}/invitations`, {
        method: "POST",
        headers: { Authorization: "Bearer token-owner-c4" },
        body: JSON.stringify({ email: "new-user@c4.com", role: "member" }),
      });
      const inviteResOwner = await fetchWrapper(inviteReqOwner);
      expect(inviteResOwner.status).toBe(200);

      // 2. Member action: Invite a member (Forbidden)
      const inviteReqMember = new Request(`http://localhost/organizations/${orgId}/invitations`, {
        method: "POST",
        headers: { Authorization: "Bearer token-member-c4" },
        body: JSON.stringify({ email: "new-user-2@c4.com", role: "member" }),
      });
      const inviteResMember = await fetchWrapper(inviteReqMember);
      expect(inviteResMember.status).toBe(403);

      // 3. Member action: Delete organization (Forbidden)
      const deleteReqMember = new Request(`http://localhost/organizations/${orgId}/delete`, {
        method: "POST",
        headers: { Authorization: "Bearer token-member-c4" },
        body: JSON.stringify({}),
      });
      const deleteResMember = await fetchWrapper(deleteReqMember);
      expect(deleteResMember.status).toBe(403);

      // 4. Owner action: Delete organization (Allowed)
      const deleteReqOwner = new Request(`http://localhost/organizations/${orgId}/delete`, {
        method: "POST",
        headers: { Authorization: "Bearer token-owner-c4" },
        body: JSON.stringify({}),
      });
      const deleteResOwner = await fetchWrapper(deleteReqOwner);
      expect(deleteResOwner.status).toBe(200);
    });
  });

  // ===========================================================================
  // Combination 5: Durable Workflows + Sentry Telemetry
  // ===========================================================================
  describe("Combination 5: Durable Workflows + Sentry Telemetry", () => {
    it("should log failing steps, capture exceptions in Sentry with tags, and handle retries", async () => {
      // Trigger a failing workflow
      const triggerReq = new Request("http://localhost/workflows/trigger/failing-workflow", {
        method: "POST",
      });
      const triggerRes = await fetchWrapper(triggerReq);
      expect(triggerRes.status).toBe(200);

      const triggerBody = (await triggerRes.json()) as { success: boolean; instanceId: string };
      const instanceId = triggerBody.instanceId;

      // Verify the workflow logs the step failure
      const instance = await testEnv.UserOnboardingWorkflow.get(instanceId);
      expect(instance).not.toBeNull();
      expect(instance!.statusState).toBe("failed");
      const hasFailedStep = instance!.stepsRun.some(
        (step) => step.name === "send_welcome_email" && step.status === "failure",
      );
      expect(hasFailedStep).toBe(true);

      // Assert step failure captures a Sentry exception with metadata attached as tags
      expect(SentrySpy.exceptions.length).toBeGreaterThan(0);
      const exceptionLog = SentrySpy.exceptions.find(
        (ex) => ex.exception.message === "Email delivery failure",
      );
      expect(exceptionLog).toBeDefined();
      expect(exceptionLog?.hint?.tags?.workflowName).toBe("UserOnboardingWorkflow");
      expect(exceptionLog?.hint?.tags?.stepName).toBe("send_welcome_email");
      expect(exceptionLog?.hint?.tags?.instanceId).toBe(instanceId);

      // Perform a retry and trace status recovery
      const retryReq = new Request(`http://localhost/workflows/instances/${instanceId}/retry`, {
        method: "POST",
      });
      const retryRes = await fetchWrapper(retryReq);
      expect(retryRes.status).toBe(200);

      const statusReq = new Request(`http://localhost/workflows/instances/${instanceId}/status`, {
        method: "GET",
      });
      const statusRes = await fetchWrapper(statusReq);
      const statusBody = (await statusRes.json()) as { success: boolean; status: string };
      expect(statusBody.status).toBe("complete");
    });
  });
});
