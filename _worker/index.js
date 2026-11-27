// Markdown content negotiation for virajmahesh.com.
// Requests for the homepage that prefer text/markdown (Accept header) get
// /index.md; everyone else gets the normal HTML from GitHub Pages.
// Lives in _worker/ so GitHub Pages (Jekyll) does not publish it.

const PAGES = { "/": "/index.md", "/index.html": "/index.md" };

// True when the Accept header ranks text/markdown above text/html.
function prefersMarkdown(accept) {
  if (!accept) return false;
  let md = 0;
  let html = 0;
  for (const part of accept.split(",")) {
    const [type, ...params] = part.trim().toLowerCase().split(";");
    let q = 1;
    for (const p of params) {
      const [k, v] = p.trim().split("=");
      if (k === "q") q = Number.parseFloat(v) || 0;
    }
    if (type === "text/markdown" || type === "text/x-markdown") md = Math.max(md, q);
    if (type === "text/html") html = Math.max(html, q);
  }
  return md > 0 && md >= html;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const mdPath = PAGES[url.pathname];
    const isRead = request.method === "GET" || request.method === "HEAD";

    if (mdPath && isRead && prefersMarkdown(request.headers.get("Accept"))) {
      // Same-zone subrequests skip this Worker and go straight to the origin.
      const md = await fetch(new URL(mdPath, url), { method: request.method });
      if (md.ok) {
        return new Response(md.body, {
          status: 200,
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Vary": "Accept",
            "Cache-Control": "public, max-age=600",
            "Link": `<${url.origin}${url.pathname}>; rel="canonical"`,
          },
        });
      }
    }

    const res = await fetch(request);
    if (!mdPath) return res;
    const out = new Response(res.body, res);
    out.headers.append("Vary", "Accept");
    out.headers.append("Link", `<${mdPath}>; rel="alternate"; type="text/markdown"`);
    return out;
  },
};
