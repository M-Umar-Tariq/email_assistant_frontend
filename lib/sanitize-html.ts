/**
 * Minimal HTML sanitizer for email body display. Strips scripts and event handlers.
 * On server (SSR) returns plain text; in browser uses DOM to remove dangerous nodes/attrs.
 */
export function sanitizeEmailHtml(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined") {
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/<[^>]+>/g, " ");
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  div.querySelectorAll("script, iframe, object, embed, form").forEach((el) => el.remove());
  div.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith("on")) el.removeAttribute(attr.name);
      if (attr.name === "href" && /^\s*javascript:/i.test(attr.value || "")) el.removeAttribute("href");
    });
    if (el.tagName === "IMG") {
      el.setAttribute("referrerpolicy", "no-referrer");
      el.setAttribute("loading", "lazy");
    }
  });
  return div.innerHTML;
}
