export default function handler(req, res) {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.facefrenzy.fun/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>https://www.facefrenzy.fun/omegle-alternative</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>https://www.facefrenzy.fun/talk-to-strangers</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>https://www.facefrenzy.fun/safety</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://www.facefrenzy.fun/vs/ometv</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://www.facefrenzy.fun/vs/emerald-chat</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://www.facefrenzy.fun/vs/chatroulette</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://www.facefrenzy.fun/vs/monkey</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://www.facefrenzy.fun/blog/is-omegle-back</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).send(sitemap);
}
