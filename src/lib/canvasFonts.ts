import { FONT_FAMILY } from "@excalidraw/excalidraw";

// ── Canvas font system ────────────────────────────────────────────────────────
// Bold/italic on canvas text works by swapping the element's fontFamily to a
// dedicated variant family (real woff2 files), keeping fontSize a plain number.
// (The old approach wrapped fontSize in a class instance to inject "bold" into
// the canvas font string — Excalidraw's internal resize math expects a number,
// which crashed the app when moving/resizing restyled text.)
//
// Excalidraw resolves a numeric fontFamily id to a CSS family name by reverse
// lookup in FONT_FAMILY, so each variant registers {"<CSS family name>": id}
// plus an injected @font-face with exactly that family name.

// Regular (latin + latin-ext for Turkish coverage)
import poppins400 from "@fontsource/poppins/files/poppins-latin-400-normal.woff2?url";
import poppins400ext from "@fontsource/poppins/files/poppins-latin-ext-400-normal.woff2?url";
import poppins700 from "@fontsource/poppins/files/poppins-latin-700-normal.woff2?url";
import poppins700ext from "@fontsource/poppins/files/poppins-latin-ext-700-normal.woff2?url";
import poppins400i from "@fontsource/poppins/files/poppins-latin-400-italic.woff2?url";
import poppins400iext from "@fontsource/poppins/files/poppins-latin-ext-400-italic.woff2?url";
import poppins700i from "@fontsource/poppins/files/poppins-latin-700-italic.woff2?url";
import poppins700iext from "@fontsource/poppins/files/poppins-latin-ext-700-italic.woff2?url";

import inter400 from "@fontsource/inter/files/inter-latin-400-normal.woff2?url";
import inter400ext from "@fontsource/inter/files/inter-latin-ext-400-normal.woff2?url";
import inter700 from "@fontsource/inter/files/inter-latin-700-normal.woff2?url";
import inter700ext from "@fontsource/inter/files/inter-latin-ext-700-normal.woff2?url";
import inter400i from "@fontsource/inter/files/inter-latin-400-italic.woff2?url";
import inter400iext from "@fontsource/inter/files/inter-latin-ext-400-italic.woff2?url";
import inter700i from "@fontsource/inter/files/inter-latin-700-italic.woff2?url";
import inter700iext from "@fontsource/inter/files/inter-latin-ext-700-italic.woff2?url";

import nunito700 from "@fontsource/nunito/files/nunito-latin-700-normal.woff2?url";
import nunito700ext from "@fontsource/nunito/files/nunito-latin-ext-700-normal.woff2?url";
import nunito400i from "@fontsource/nunito/files/nunito-latin-400-italic.woff2?url";
import nunito400iext from "@fontsource/nunito/files/nunito-latin-ext-400-italic.woff2?url";
import nunito700i from "@fontsource/nunito/files/nunito-latin-700-italic.woff2?url";
import nunito700iext from "@fontsource/nunito/files/nunito-latin-ext-700-italic.woff2?url";

import cascadia700 from "@fontsource/cascadia-code/files/cascadia-code-latin-700-normal.woff2?url";
import cascadia700ext from "@fontsource/cascadia-code/files/cascadia-code-latin-ext-700-normal.woff2?url";
import cascadia400i from "@fontsource/cascadia-code/files/cascadia-code-latin-400-italic.woff2?url";
import cascadia400iext from "@fontsource/cascadia-code/files/cascadia-code-latin-ext-400-italic.woff2?url";
import cascadia700i from "@fontsource/cascadia-code/files/cascadia-code-latin-700-italic.woff2?url";
import cascadia700iext from "@fontsource/cascadia-code/files/cascadia-code-latin-ext-700-italic.woff2?url";

import bebas400 from "@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2?url";
import bebas400ext from "@fontsource/bebas-neue/files/bebas-neue-latin-ext-400-normal.woff2?url";

// ── Font ids ─────────────────────────────────────────────────────────────────
// Excalidraw builtins reused as bases: Helvetica=2, Cascadia=3, Nunito=6.
// Our ids live at 100+ to never collide with Excalidraw's own (or each other —
// the old scheme registered Comic Shanns and Cascadia variants on the SAME ids).
export const FONT_IDS = {
  helvetica: 2,
  helveticaBold: 101,
  helveticaItalic: 102,
  helveticaBoldItalic: 103,

  nunito: 6,
  nunitoBold: 111,
  nunitoItalic: 112,
  nunitoBoldItalic: 113,

  cascadia: 3,
  cascadiaBold: 121,
  cascadiaItalic: 122,
  cascadiaBoldItalic: 123,

  inter: 130,
  interBold: 131,
  interItalic: 132,
  interBoldItalic: 133,

  poppins: 140,
  poppinsBold: 141,
  poppinsItalic: 142,
  poppinsBoldItalic: 143,

  bebas: 150,
} as const;

interface FontDef {
  baseId: number;
  label: string;
  /** CSS family names per style. Missing key = style unsupported for this font. */
  families: { regular: string; bold?: string; italic?: string; boldItalic?: string };
  ids: { bold?: number; italic?: number; boldItalic?: number };
  /** Measurement fallback stack appended after the family name. */
  fallback: string;
}

const FONTS: FontDef[] = [
  {
    baseId: FONT_IDS.helvetica,
    label: "Helvetica",
    families: {
      regular: "Helvetica",
      bold: "Helvetica Bold",
      italic: "Helvetica Italic",
      boldItalic: "Helvetica Bold Italic",
    },
    ids: { bold: FONT_IDS.helveticaBold, italic: FONT_IDS.helveticaItalic, boldItalic: FONT_IDS.helveticaBoldItalic },
    fallback: "Arial, sans-serif",
  },
  {
    baseId: FONT_IDS.bebas,
    label: "Bebas Neue",
    // Single-weight display font: no true bold or italic exists, and synthetic
    // styling is what used to corrupt elements — so B/I are disabled for it.
    families: { regular: "Bebas Neue" },
    ids: {},
    fallback: "Arial Narrow, sans-serif",
  },
  {
    baseId: FONT_IDS.nunito,
    label: "Nunito",
    families: {
      regular: "Nunito", // Excalidraw bundles Nunito regular for id 6
      bold: "TN Nunito Bold",
      italic: "TN Nunito Italic",
      boldItalic: "TN Nunito Bold Italic",
    },
    ids: { bold: FONT_IDS.nunitoBold, italic: FONT_IDS.nunitoItalic, boldItalic: FONT_IDS.nunitoBoldItalic },
    fallback: "sans-serif",
  },
  {
    baseId: FONT_IDS.cascadia,
    label: "Cascadia Code",
    families: {
      regular: "Cascadia", // Excalidraw bundles Cascadia regular for id 3
      bold: "TN Cascadia Bold",
      italic: "TN Cascadia Italic",
      boldItalic: "TN Cascadia Bold Italic",
    },
    ids: { bold: FONT_IDS.cascadiaBold, italic: FONT_IDS.cascadiaItalic, boldItalic: FONT_IDS.cascadiaBoldItalic },
    fallback: "Courier New, monospace",
  },
  {
    baseId: FONT_IDS.inter,
    label: "Inter",
    families: {
      regular: "TN Inter",
      bold: "TN Inter Bold",
      italic: "TN Inter Italic",
      boldItalic: "TN Inter Bold Italic",
    },
    ids: { bold: FONT_IDS.interBold, italic: FONT_IDS.interItalic, boldItalic: FONT_IDS.interBoldItalic },
    fallback: "sans-serif",
  },
  {
    baseId: FONT_IDS.poppins,
    label: "Poppins",
    families: {
      regular: "TN Poppins",
      bold: "TN Poppins Bold",
      italic: "TN Poppins Italic",
      boldItalic: "TN Poppins Bold Italic",
    },
    ids: { bold: FONT_IDS.poppinsBold, italic: FONT_IDS.poppinsItalic, boldItalic: FONT_IDS.poppinsBoldItalic },
    fallback: "sans-serif",
  },
];

/** Picker list: exactly the supported fonts, with per-font capabilities. */
export const CANVAS_FONTS = FONTS.map((f) => ({
  id: f.baseId,
  label: f.label,
  bold: !!f.ids.bold,
  italic: !!f.ids.italic,
}));

// variant id → its font def; and variant id → css family name
const idToFont = new Map<number, FontDef>();
const idToFamily = new Map<number, string>();
for (const f of FONTS) {
  idToFont.set(f.baseId, f);
  idToFamily.set(f.baseId, f.families.regular);
  if (f.ids.bold) { idToFont.set(f.ids.bold, f); idToFamily.set(f.ids.bold, f.families.bold!); }
  if (f.ids.italic) { idToFont.set(f.ids.italic, f); idToFamily.set(f.ids.italic, f.families.italic!); }
  if (f.ids.boldItalic) { idToFont.set(f.ids.boldItalic, f); idToFamily.set(f.ids.boldItalic, f.families.boldItalic!); }
}

/** Any known id (base or variant) → its base font id. Unknown ids pass through. */
export function getBaseFontFamily(id: number): number {
  return idToFont.get(id)?.baseId ?? id;
}

export function fontSupports(id: number): { bold: boolean; italic: boolean } {
  const f = idToFont.get(getBaseFontFamily(id));
  return { bold: !!f?.ids.bold, italic: !!f?.ids.italic };
}

/**
 * Resolve the fontFamily id for a base font + desired style. Unsupported
 * styles degrade gracefully (boldItalic → bold → base).
 */
export function resolveFontVariant(id: number, weight?: string, style?: string): number {
  const f = idToFont.get(getBaseFontFamily(id));
  if (!f) return id;
  const wantBold = weight === "bold" && !!f.ids.bold;
  const wantItalic = style === "italic" && !!f.ids.italic;
  if (wantBold && wantItalic) return f.ids.boldItalic ?? f.ids.bold ?? f.baseId;
  if (wantBold) return f.ids.bold!;
  if (wantItalic) return f.ids.italic!;
  return f.baseId;
}

/**
 * Map ids written by the old (broken) variant scheme onto the new one.
 * Old: Helvetica 10-12; Virgil 13-15; Comic Shanns AND Cascadia both 16-18.
 */
export function mapLegacyFontId(id: number): number {
  switch (id) {
    case 10: return FONT_IDS.helveticaBold;
    case 11: return FONT_IDS.helveticaItalic;
    case 12: return FONT_IDS.helveticaBoldItalic;
    case 13: case 14: case 15: return 1; // Virgil variants → Virgil regular
    case 16: return FONT_IDS.cascadiaBold;
    case 17: return FONT_IDS.cascadiaItalic;
    case 18: return FONT_IDS.cascadiaBoldItalic;
    default: return id;
  }
}

/**
 * Normalize an element loaded from a doc: legacy variant ids remapped, and any
 * non-numeric fontSize (old StyledFontSize instances) unwrapped to a number.
 */
export function sanitizeTextElementFont<T extends { type?: string; fontFamily?: number; fontSize?: any }>(el: T): T {
  if (el?.type !== "text") return el;
  let changed = false;
  let fontFamily = el.fontFamily;
  let fontSize = el.fontSize;
  if (typeof fontFamily === "number") {
    const mapped = mapLegacyFontId(fontFamily);
    if (mapped !== fontFamily) { fontFamily = mapped; changed = true; }
  }
  if (fontSize != null && typeof fontSize !== "number") {
    fontSize = Number((fontSize as any).size ?? fontSize) || 16;
    changed = true;
  }
  return changed ? { ...el, fontFamily, fontSize } : el;
}

/** Measure a text element's box for a given variant id (single source of truth). */
export function measureCanvasText(text: string, fontSize: number, fontFamilyId: number) {
  const f = idToFont.get(getBaseFontFamily(fontFamilyId));
  const family = idToFamily.get(fontFamilyId) ?? f?.families.regular ?? "Helvetica";
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { width: 100, height: 30 };
  ctx.font = `${fontSize}px "${family}", ${f?.fallback ?? "sans-serif"}`;

  const lines = text.split("\n");
  let maxWidth = 0;
  for (const line of lines) {
    const w = ctx.measureText(line).width;
    if (w > maxWidth) maxWidth = w;
  }
  const height = lines.length * fontSize * 1.25;
  return { width: Math.max(10, Math.ceil(maxWidth)), height: Math.max(10, Math.ceil(height)) };
}

// ── Registration (module side-effect, idempotent) ────────────────────────────

const face = (family: string, url: string, unicodeRange?: string) => `
@font-face {
  font-family: "${family}";
  src: url("${url}") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  ${unicodeRange ? `unicode-range: ${unicodeRange};` : ""}
}`;

// latin-ext first, latin second; both faces share the family name and the
// browser picks per-glyph (Turkish chars live in latin-ext).
const EXT = "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF";

let registered = false;
export function registerCanvasFonts() {
  if (registered || typeof document === "undefined") return;
  registered = true;

  // Register ids on Excalidraw's FONT_FAMILY map (reverse-lookup source).
  const FF = FONT_FAMILY as any;
  for (const f of FONTS) {
    if (!(f.families.regular in FF)) FF[f.families.regular] = f.baseId;
    if (f.ids.bold) FF[f.families.bold!] = f.ids.bold;
    if (f.ids.italic) FF[f.families.italic!] = f.ids.italic;
    if (f.ids.boldItalic) FF[f.families.boldItalic!] = f.ids.boldItalic;
  }

  const css = [
    // Helvetica variants stay local()-based (defined in index.css).
    face("TN Nunito Bold", nunito700ext, EXT), face("TN Nunito Bold", nunito700),
    face("TN Nunito Italic", nunito400iext, EXT), face("TN Nunito Italic", nunito400i),
    face("TN Nunito Bold Italic", nunito700iext, EXT), face("TN Nunito Bold Italic", nunito700i),

    face("TN Cascadia Bold", cascadia700ext, EXT), face("TN Cascadia Bold", cascadia700),
    face("TN Cascadia Italic", cascadia400iext, EXT), face("TN Cascadia Italic", cascadia400i),
    face("TN Cascadia Bold Italic", cascadia700iext, EXT), face("TN Cascadia Bold Italic", cascadia700i),

    face("TN Inter", inter400ext, EXT), face("TN Inter", inter400),
    face("TN Inter Bold", inter700ext, EXT), face("TN Inter Bold", inter700),
    face("TN Inter Italic", inter400iext, EXT), face("TN Inter Italic", inter400i),
    face("TN Inter Bold Italic", inter700iext, EXT), face("TN Inter Bold Italic", inter700i),

    face("TN Poppins", poppins400ext, EXT), face("TN Poppins", poppins400),
    face("TN Poppins Bold", poppins700ext, EXT), face("TN Poppins Bold", poppins700),
    face("TN Poppins Italic", poppins400iext, EXT), face("TN Poppins Italic", poppins400i),
    face("TN Poppins Bold Italic", poppins700iext, EXT), face("TN Poppins Bold Italic", poppins700i),

    face("Bebas Neue", bebas400ext, EXT), face("Bebas Neue", bebas400),
  ].join("\n");

  const style = document.createElement("style");
  style.id = "tidenote-canvas-fonts";
  style.textContent = css;
  document.head.appendChild(style);

  // Warm the faces so first paint on canvas doesn't fall back.
  try {
    const families = new Set(idToFamily.values());
    families.forEach((fam) => document.fonts.load(`16px "${fam}"`).catch(() => {}));
  } catch { /* FontFaceSet unsupported — faces load lazily */ }
}

registerCanvasFonts();
