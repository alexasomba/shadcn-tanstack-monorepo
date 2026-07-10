---
name: storefront-seo
description: Use when managing, optimizing, or debugging storefront SEO, product structured data (JSON-LD), Google Search Console (GSC) compliance, sitemaps, or catalog page lists.
---

# Storefront SEO & Technical Compliance

## Overview

This skill governs the end-to-end SEO configuration, i18n (Paraglide) metadata alternates, schema.org structured data, sitemap generation, and Static Site Generation (SSG) prerendering settings for the TanStack Start storefront application.

---

## Core Invariants

### 1. Internationalization (i18n) & Paraglide Integration

- **Active Locale**: Retrieve the currently active language context via `getLocale()` from `@/paraglide/runtime` (e.g. `'en'` or `'fr'`).
- **Canonical Language Alternates**: Generate alternate tags on page heads using `buildCanonicalLanguageAlternates(path, baseUrl)` (defined in `apps/user-application/src/lib/i18n/locales.ts`). Every page must output:
  - English (`hreflang="en"`)
  - French (`hreflang="fr"`, prefixed with `/fr`)
  - Default (`hreflang="x-default"`, pointing to English)
- **Bilingual Sitemaps**: The custom sitemap builder (`buildSitemapXml` in `discovery-builders.mjs`) must duplicate every crawlable route into English and French and link them as `xhtml:link` alternates.

### 2. Vite SSG Prerendering & Build Stability

- **Infinite Crawl Loops**: To prevent Out-Of-Memory (OOM) leaks and infinite build loops during SSG, set **`prerender.crawlLinks = false`** inside `vite.config.ts`.
- **Explicit Pages List**: Declare all routes explicitly in the `pages` array:
  - English and French variations of public discovery links.
  - Dynamic paths loaded from `loadBlogLinks()`, `loadDocsLinks()`, and `loadStaticStorefrontProducts()`.
  - Static generation targets: `/sitemap.xml`, `/robots.txt`, and `/llms.txt`.
- **Filter Exclusions**: Exclude non-production, placeholder, or draft folders (e.g. routes containing `new-case-studies`) from generation.

### 3. Robots Exclusion and No-Index Controls

- **Sensitive Views**: User-specific, transient, or interactive pages (e.g., `/checkout`, `/store/cart`, auth, and admin panels) must never be crawled or indexed.
- **Metadata Rule**: These routes must set `noindex: true` within their route `head` properties, producing the metadata tags:
  ```html
  <meta name="robots" content="noindex, nofollow" />
  ```
- **Robots.txt & Sitemap Sync**: Confirm that any no-index paths are matching the disallow rules in `robots.txt.ts` and excluded from the sitemap generation list.

---

## Schema.org Structures Reference

When building or updating page schemas, use the appropriate schema.org structure from `@automaticpallet/data-ops/seo/json-ld`:

| Structure            | schema.org Type  | Use Case / Placement                            | Required Fields & Defaults                                                                                                                     |
| :------------------- | :--------------- | :---------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| **`Product`**        | `Product`        | Product detail pages.                           | `name`, `url`, `image` (square SVG), `offers` (with return policy/shipping defaults), `review` & `aggregateRating` (fallbacks seeded by slug). |
| **`ItemList`**       | `ItemList`       | Category and store list/carousel summary views. | `url`, `name`, `itemListElement` (containing only list items with `url` properties to detail pages; no nested Product objects).                |
| **`BreadcrumbList`** | `BreadcrumbList` | All hierarchical deep-linked paths.             | `itemListElement` containing positions and escaped text names/URLs.                                                                            |
| **`CollectionPage`** | `CollectionPage` | Catalog index views.                            | `url`, `name`, `description`.                                                                                                                  |
| **`ItemPage`**       | `ItemPage`       | Product wrapper metadata.                       | `url`, `name`, `primaryImageOfPage`, `breadcrumb` link context.                                                                                |
| **`Organization`**   | `Organization`   | Site publisher branding profile.                | `name`, `url`, `logo`, `email`, `telephone`, `address`.                                                                                        |
| **`WebSite`**        | `WebSite`        | Homepage search schema.                         | `url`, `name`, `publisherId`.                                                                                                                  |
| **`Article`**        | `Article`        | Blog post layout details.                       | `url`, `headline`, `image`, `datePublished`, `author`.                                                                                         |
| **`TechArticle`**    | `TechArticle`    | Documentation page details.                     | `url`, `headline`, `image`, `datePublished`, `author`.                                                                                         |
| **`FAQPage`**        | `FAQPage`        | FAQ page views.                                 | `mainEntity` list of question/answer schemas.                                                                                                  |

---

## Verification & Testing Workflow

### 1. Sitemap Generation Test

Verify sitemap routes output alternates and valid XML formatting:

```bash
vp test run apps/user-application/tests/sitemap-generation.test.ts
```

### 2. Product & List Schema Test

Confirm GSC Merchant compliance and simplified list structures:

```bash
vp test run packages/data-ops/tests/json-ld.test.ts
vp test run apps/user-application/tests/head-tags.test.ts
```

### 3. Storefront Overrides Test

Verify deterministic review fallbacks for SMM and non-SMM products:

```bash
vp test run packages/data-ops/tests/storefront-overrides.test.ts
```

### 4. Build Safety Check

Before deployment or landing, dry-run the build to confirm prerendering succeeds without memory warnings:

```bash
vp check --fix
vpr repo:build:user
```
