export function calculateReadTime(content) {
  const text = String(content || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return 1;
  const words = text.split(" ").filter(Boolean).length;
  const minutes = Math.ceil(words / 200);
  return Math.max(1, minutes);
}

export function generateSlug(title) {
  return String(title || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extractHeadings(htmlContent) {
  const html = String(htmlContent || "");
  if (!html) return [];

  let doc;
  try {
    doc = new DOMParser().parseFromString(html, "text/html");
  } catch {
    return [];
  }

  const headings = Array.from(doc.querySelectorAll("h2, h3"));
  const used = new Map();

  return headings
    .map((heading) => {
      const text = (heading.textContent || "").trim();
      const level = heading.tagName === "H2" ? 2 : 3;
      if (!text) return null;

      const base = heading.getAttribute("id") || generateSlug(text) || "section";
      const nextCount = (used.get(base) || 0) + 1;
      used.set(base, nextCount);
      const id = nextCount === 1 ? base : `${base}-${nextCount}`;

      return { id, text, level };
    })
    .filter(Boolean);
}

export function truncateText(text, maxLength) {
  const value = String(text || "").trim();
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getCategoryColor(category) {
  const palette = [
    "border border-violet-500/20 bg-violet-500/10 text-violet-200",
    "border border-cyan-500/20 bg-cyan-500/10 text-cyan-200",
    "border border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    "border border-amber-500/20 bg-amber-500/10 text-amber-200",
    "border border-pink-500/20 bg-pink-500/10 text-pink-200",
    "border border-sky-500/20 bg-sky-500/10 text-sky-200",
  ];

  const key = String(category || "").trim().toLowerCase() || "general";
  const idx = hashString(key) % palette.length;
  return palette[idx];
}

