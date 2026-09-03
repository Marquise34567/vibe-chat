export default function handler(req, res) {
  const robots = `User-agent: *
Allow: /
Disallow: /match
Disallow: /chat/

Sitemap: https://www.facefrenzy.fun/sitemap.xml
`;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.status(200).send(robots);
}
