import { allSpeakers, allTalks } from "content-collections";
import { buildLlmsTxt, buildRobotsTxt, buildSitemapXml } from "data-ops";
import type { DiscoveryUrl } from "data-ops";

const DEFAULT_BASE = "http://127.0.0.1:8300";

export function getPublicBaseUrl(): string {
  const fromEnv =
    (import.meta.env.VITE_APP_URL as string | undefined) ||
    (import.meta.env.VITE_BETTER_AUTH_URL as string | undefined);
  if (fromEnv && !fromEnv.includes("localhost") && !fromEnv.includes("127.0.0.1")) {
    return fromEnv.replace(/\/$/, "");
  }
  if (import.meta.env.PROD) {
    return (fromEnv || DEFAULT_BASE).replace(/\/$/, "");
  }
  return (fromEnv || DEFAULT_BASE).replace(/\/$/, "");
}

export function conferenceDiscoveryUrls(): Array<DiscoveryUrl> {
  const staticPages: Array<DiscoveryUrl> = [
    { path: "/", changefreq: "weekly", priority: 1 },
    { path: "/talks", changefreq: "weekly", priority: 0.9 },
    { path: "/speakers", changefreq: "weekly", priority: 0.9 },
    { path: "/schedule", changefreq: "weekly", priority: 0.8 },
    { path: "/about", changefreq: "monthly", priority: 0.5 },
  ];

  const talks = allTalks.map((t) => ({
    path: `/talks/${t.slug}`,
    changefreq: "monthly" as const,
    priority: 0.7,
  }));

  const speakers = allSpeakers.map((s) => ({
    path: `/speakers/${s.slug}`,
    changefreq: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...talks, ...speakers];
}

export function renderSitemap(): string {
  return buildSitemapXml(getPublicBaseUrl(), conferenceDiscoveryUrls());
}

export function renderRobots(): string {
  return buildRobotsTxt(getPublicBaseUrl());
}

export function renderLlms(): string {
  const base = getPublicBaseUrl();
  return buildLlmsTxt(base, {
    title: "Conference site",
    description: "Talks, speakers, and schedule for the monorepo demo storefront.",
    links: [
      { title: "Home", path: "/", description: "Landing page" },
      { title: "Talks", path: "/talks", description: "All sessions" },
      { title: "Speakers", path: "/speakers", description: "Speaker roster" },
      { title: "Schedule", path: "/schedule", description: "Day-by-day schedule" },
      ...allTalks.slice(0, 20).map((t) => ({
        title: t.title,
        path: `/talks/${t.slug}`,
        description: t.content.slice(0, 120).replace(/\s+/g, " ").trim(),
      })),
    ],
  });
}
