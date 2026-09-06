import { readFileSync } from "fs";
import { join } from "path";
import { SEO_ROUTES } from "./seo-meta";

// Edge function that serves the SPA index.html with per-route <title>,
// <meta description>, and <link canonical> injected — so Google sees unique
// metadata for each URL instead of the homepage title for every route.
export default function handler(req, res) {
  const url = new URL(req.url, "https://www.facefrenzy.fun");
  let path = url.pathname;
  // Strip trailing slash (except root)
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);

  const seo = SEO_ROUTES[path];

  // Read the built index.html
  let html: string;
  try {
    html = readFileSync(join(process.cwd(), "dist", "index.html"), "utf-8");
  } catch {
    // Fallback: read from public
    try {
      html = readFileSync(join(process.cwd(), "public", "index.html"), "utf-8");
    } catch {
      res.status(500).send("Internal error");
      return;
    }
  }

  if (seo) {
    // Replace title
    html = html.replace(
      /<title>.*?<\/title>/,
      `<title>${seo.title}</title>`
    );

    // Replace meta description
    html = html.replace(
      /<meta name="description" content=".*?"\s*\/?>/,
      `<meta name="description" content="${seo.description}" />`
    );

    // Replace canonical
    html = html.replace(
      /<link rel="canonical" href=".*?"\s*\/?>/,
      `<link rel="canonical" href="https://www.facefrenzy.fun${seo.path}" />`
    );

    // Replace og:title
    html = html.replace(
      /<meta property="og:title" content=".*?"\s*\/?>/,
      `<meta property="og:title" content="${seo.title}" />`
    );

    // Replace og:description
    html = html.replace(
      /<meta property="og:description" content=".*?"\s*\/?>/,
      `<meta property="og:description" content="${seo.description}" />`
    );

    // Replace og:url
    html = html.replace(
      /<meta property="og:url" content=".*?"\s*\/?>/,
      `<meta property="og:url" content="https://www.facefrenzy.fun${seo.path}" />`
    );

    // Replace twitter:title
    html = html.replace(
      /<meta name="twitter:title" content=".*?"\s*\/?>/,
      `<meta name="twitter:title" content="${seo.title}" />`
    );

    // Replace twitter:description
    html = html.replace(
      /<meta name="twitter:description" content=".*?"\s*\/?>/,
      `<meta name="twitter:description" content="${seo.description}" />`
    );
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600");
  res.status(200).send(html);
}
