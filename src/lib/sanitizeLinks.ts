/**
 * Safely sanitizes BlockNote JSON content to prevent XSS via malicious `href` properties.
 * It recursively traverses the blocks and validates any `href` field against an allowlist.
 */

const ALLOWED_PROTOCOLS = [
  "http://",
  "https://",
  "mailto:",
  "/",
  "#",
  "./"
];

function isSafeHref(href: string): boolean {
  if (typeof href !== "string") return false;

  // 1. Remove all control characters and whitespace to prevent bypasses 
  // like "java\tscript:" or "  javascript:"
  // \x00-\x20 covers all ASCII control characters and space.
  const cleanedHref = href.replace(/[\x00-\x20\t\n\r]/g, "").toLowerCase();

  // 2. Check against the allowlist (Starts With)
  for (const protocol of ALLOWED_PROTOCOLS) {
    if (cleanedHref.startsWith(protocol)) {
      return true;
    }
  }

  return false;
}

export function sanitizeBlockNoteLinks(obj: any): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeBlockNoteLinks(item));
  }

  // It's an object
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (key === "href" && typeof obj[key] === "string") {
        if (!isSafeHref(obj[key])) {
          console.warn(`[Sanitizer] Blocked malicious link: ${obj[key]}`);
          newObj[key] = "#";
        } else {
          newObj[key] = obj[key];
        }
      } else {
        newObj[key] = sanitizeBlockNoteLinks(obj[key]);
      }
    }
  }

  return newObj;
}
