# Cloudflare for SaaS — custom domains + org slugs

Production guide for this monorepo: **custom hostnames** attach TLS at the edge via [Cloudflare for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/); **tenant identity** is always `organization.slug` in D1.

Related code:

| Piece                     | Location                                                                        |
| ------------------------- | ------------------------------------------------------------------------------- |
| Domain lifecycle API      | `apps/data-service` `/domains/*` + `@opencoredev/domain-sdk` (`cloudflareSaaS`) |
| Host → tenant resolve     | `packages/data-ops` `resolveOrganizationByHost`; `GET /tenant/resolve`          |
| App branding + active org | `apps/user-web` `getTenant()` / `syncTenantActiveOrganization`                  |

---

## Architecture

```text
Customer DNS: CNAME www.customer.com → CLOUDFLARE_CNAME_TARGET
                     │
                     ▼
         Cloudflare for SaaS (custom hostname + cert)
                     │
                     ▼  fallback origin (proxied)
              user-web Worker (sees Host: www.customer.com)
                     │
                     ├─ resolveOrganizationByHost (D1, Cache API TTL)
                     └─ brand + setActive org for members
```

Vanity hosts (no custom hostname row required):

```text
{slug}.{PLATFORM_BASE_DOMAIN}  →  organization.slug
```

---

## Prerequisites

1. A Cloudflare zone for your SaaS product (e.g. `example.com`).
2. **Cloudflare for SaaS** enabled on that zone.
3. **Fallback origin** — proxied hostname that terminates to the **user-web** Worker (e.g. `saas-origin.example.com` or the Worker’s workers.dev / custom domain).
4. **CNAME target** for customers (e.g. `customers.example.com`) — document this in product UI; set `CLOUDFLARE_CNAME_TARGET`.
5. SSL mode on the zone: **Full (strict)**.

---

## Secrets vs vars

| Name                       | Kind       | How to set                                                                                      |
| -------------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`     | **secret** | `wrangler secret put CLOUDFLARE_API_TOKEN` (Custom Hostnames: Edit permission on the SaaS zone) |
| `ONESIGNAL_API_KEY`        | **secret** | `wrangler secret put`                                                                           |
| `DISCORD_WEBHOOK_URL`      | **secret** | `wrangler secret put`                                                                           |
| `BETTER_AUTH_SECRET`       | **secret** | `wrangler secret put`                                                                           |
| `CLOUDFLARE_ZONE_ID`       | var        | `wrangler.jsonc` `vars` or dashboard                                                            |
| `CLOUDFLARE_CNAME_TARGET`  | var        | e.g. `customers.example.com`                                                                    |
| `PLATFORM_BASE_DOMAIN`     | var        | e.g. `app.example.com` (vanity subdomains)                                                      |
| `ONESIGNAL_APP_ID`         | var        | public app id                                                                                   |
| `DOMAIN_SDK_MODE`          | var        | `memory` for local/e2e only — **never** in production                                           |
| `TENANT_CACHE_TTL_SECONDS` | var        | default `60` (user-web Host→tenant cache)                                                       |

Local: put secrets in `apps/*/ .dev.vars` (gitignored). Do **not** put empty secret keys in `vars` (empty strings override secrets).

---

## Worker routing (critical for custom hostnames)

When traffic hits a **custom hostname**, Worker Routes match on that hostname—not your fallback origin name.

**Recommended for user-web as the SaaS origin:**

1. Deploy `user-web-app` with a **custom domain** or route for your primary app host (`app.example.com`).
2. Ensure custom hostnames fall through to the same Worker:
   - Option A: Worker route pattern that covers all custom hostnames (e.g. zone-wide route with exclusions for assets you do not want in the Worker), or
   - Option B: set the **fallback origin** to a hostname that already points at the user-web Worker (orange-clouded DNS).

Community / docs pattern: use a broad route such as `*/*` **with exclusions** for hostnames you do not want the Worker to handle. Confirm current route UI at [Workers routes](https://developers.cloudflare.com/workers/configuration/routing/routes/).

Example wrangler production sketch (fill in real zone / patterns; do not commit real IDs):

```jsonc
// apps/user-web/wrangler.jsonc — production env sketch only
{
  "env": {
    "production": {
      "vars": {
        "PLATFORM_BASE_DOMAIN": "app.example.com",
        "TENANT_CACHE_TTL_SECONDS": "60",
      },
      // Worker is the origin for the platform app host
      "routes": [
        { "pattern": "app.example.com", "custom_domain": true },
        // Custom SaaS hostnames: prefer fallback origin → this Worker,
        // and/or additional routes for your SaaS zone as required by CF for SaaS.
      ],
    },
  },
}
```

Vanity `*.app.example.com`:

- Add a proxied DNS record for `*.app.example.com` → Worker / fallback, **or**
- Use a route pattern `*app.example.com/*` with a proxied wildcard DNS record.

---

## SSL / certificate validation

1. Zone SSL/TLS mode: **Full (strict)**.
2. When creating custom hostnames (domain-sdk / dashboard):
   - Prefer automatic **DV** validation (HTTP or TXT per CF for SaaS docs).
   - Do not treat “TLS handshake succeeded” alone as “hostname active” — use custom hostname status / domain-sdk `refresh` as source of truth.
3. Product UX: show DNS records from domain-sdk (`required: true`) until status is active; only then does `resolveOrganizationByHost` accept the custom host (app requires `status = active`).

---

## API token scope

Create an API token with:

- **Zone → Cloudflare for SaaS → Edit** (or Custom Hostnames Edit) on the SaaS zone
- Zone ID in `CLOUDFLARE_ZONE_ID`

Store only as a **secret** on data-service (and any Worker that calls domain-sdk).

---

## Runtime path (this repo)

1. Customer adds hostname → `POST /domains` (API key + paid `domains` entitlement + active org).
2. domain-sdk `cloudflareSaaS` registers custom hostname; DNS instructions returned.
3. Customer CNAMEs to `CLOUDFLARE_CNAME_TARGET`.
4. After validation, `POST /domains/:hostname/verify` (or polling via `refresh`) sets D1 status `active`.
5. Request to `www.customer.com` hits user-web with that Host.
6. `getTenant()` → Cache API (short TTL) → D1 `resolveOrganizationByHost` → branding + optional `setActiveOrganization` for members.

---

## Checklist before go-live

- [ ] Fallback origin proxied and reaches **user-web**
- [ ] SSL Full (strict)
- [ ] `CLOUDFLARE_API_TOKEN` secret + `CLOUDFLARE_ZONE_ID` + `CLOUDFLARE_CNAME_TARGET` set
- [ ] `PLATFORM_BASE_DOMAIN` set on **user-web** and **data-service**
- [ ] `DOMAIN_SDK_MODE` **unset** in production (no memory provider)
- [ ] Observability enabled (user-web, admin-web, data-service, agents)
- [ ] Disposable hostname test end-to-end (add → DNS → active → resolve → branded login)

---

## Local / e2e

```bash
# data-service
DOMAIN_SDK_MODE=memory
# optional
PLATFORM_BASE_DOMAIN=app.example.com
```

Memory provider does not call Cloudflare; tenant resolve still works against D1 domain rows.

---

## References

- [Cloudflare for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/)
- [Getting started](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/getting-started/)
- [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
- [Workers routes](https://developers.cloudflare.com/workers/configuration/routing/routes/)
- Domain SDK: [domain-sdk.dev](https://domain-sdk.dev/)
