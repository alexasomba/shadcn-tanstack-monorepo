/**
 * Minimal SEO / AI discovery builders for storefront (sitemap, robots, llms.txt).
 */

export type DiscoveryUrl = {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

function abs(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export function buildRobotsTxt(baseUrl: string, options?: { disallow?: Array<string> }): string {
  const disallow = options?.disallow ?? ["/api/", "/demo/", "/login", "/account"];
  const lines = [
    "User-agent: *",
    ...disallow.map((d) => `Disallow: ${d}`),
    `Sitemap: ${abs(baseUrl, "/sitemap.xml")}`,
    "",
  ];
  return lines.join("\n");
}

export function buildSitemapXml(baseUrl: string, urls: Array<DiscoveryUrl>): string {
  const body = urls
    .map((u) => {
      const loc = abs(baseUrl, u.path);
      const lastmod = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : "";
      const changefreq = u.changefreq ? `\n    <changefreq>${u.changefreq}</changefreq>` : "";
      const priority =
        u.priority !== undefined ? `\n    <priority>${u.priority.toFixed(1)}</priority>` : "";
      return `  <url>\n    <loc>${loc}</loc>${lastmod}${changefreq}${priority}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

export function buildLlmsTxt(
  baseUrl: string,
  options: {
    title: string;
    description: string;
    links: Array<{ title: string; path: string; description?: string }>;
  },
): string {
  const lines = [
    `# ${options.title}`,
    "",
    `> ${options.description}`,
    "",
    `Base URL: ${baseUrl.replace(/\/$/, "")}`,
    "",
    "## Pages",
    "",
  ];
  for (const link of options.links) {
    const url = abs(baseUrl, link.path);
    const desc = link.description ? `: ${link.description}` : "";
    lines.push(`- [${link.title}](${url})${desc}`);
  }
  lines.push("");
  return lines.join("\n");
}
