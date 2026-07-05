/**
 * Contained DOM patches for Excalidraw-internal UI we can't reach via props:
 *
 * 1. Context menu: clamp into the viewport (bottom-of-page right-clicks used
 *    to overflow below the fold / under toolbars) and remove the Zen mode item.
 * 2. "Copied styles." toast: reposition like a normal app toast and force
 *    auto-dismiss after ~2s (it could previously linger indefinitely).
 * 3. Stats panel ("Canvas & Shape properties") + context menu: translate
 *    strings Excalidraw's tr-TR locale is missing (verified absent in the
 *    bundled locale — the whole `stats` section falls back to English).
 *
 * All of this is behind a MutationObserver scoped to the Excalidraw container
 * and is a no-op for non-matching mutations. If Excalidraw ships proper TR
 * strings / context-menu API, delete the corresponding block here.
 */

const TR_STRINGS: Record<string, string> = {
  "Canvas & Shape properties": "Tuval ve Şekil Özellikleri",
  "Shape properties": "Şekil Özellikleri",
  "Properties": "Özellikler",
  "General": "Genel",
  "Scene": "Sahne",
  "Selected": "Seçili",
  "Storage": "Depolama",
  "Total": "Toplam",
  "Version": "Sürüm",
  "Click to copy": "Kopyalamak için tıkla",
  "Width": "Genişlik",
  "Height": "Yükseklik",
  "Angle": "Açı",
  "Font size": "Yazı boyutu",
  "Font family": "Yazı tipi",
  "Letter spacing": "Harf aralığı",
  "Line height": "Satır yüksekliği",
  "Elements": "Öğeler",
  "Dimensions": "Boyutlar",
  "X position": "X konumu",
  "Y position": "Y konumu",
};

function translateTextNodes(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const raw = n.textContent;
    if (!raw) continue;
    const key = raw.trim();
    const tr = TR_STRINGS[key];
    if (tr) n.textContent = raw.replace(key, tr);
  }
}

function clampIntoViewport(el: HTMLElement) {
  // Runs after Excalidraw positions the menu; shift it back inside the window.
  const margin = 8;
  const rect = el.getBoundingClientRect();
  let dx = 0;
  let dy = 0;
  if (rect.bottom > window.innerHeight - margin) dy = window.innerHeight - margin - rect.bottom;
  if (rect.right > window.innerWidth - margin) dx = window.innerWidth - margin - rect.right;
  if (rect.top + dy < margin) dy = margin - rect.top;
  if (rect.left + dx < margin) dx = margin - rect.left;
  if (dx || dy) {
    el.style.transform = `${el.style.transform ? el.style.transform + " " : ""}translate(${dx}px, ${dy}px)`;
  }
}

function patchContextMenu(menu: HTMLElement, isTr: boolean) {
  // Remove Zen mode entirely (EN "Zen mode" / TR "Zen modu").
  menu.querySelectorAll(".context-menu-item").forEach((item) => {
    const label = (item.textContent || "").toLowerCase();
    if (label.includes("zen mod")) {
      (item.closest("li") || item).remove();
    }
  });
  if (isTr) translateTextNodes(menu);
  // Clamp after our removals settle the final height.
  requestAnimationFrame(() => clampIntoViewport(menu));
}

function patchToast(toast: HTMLElement) {
  toast.classList.add("tidenote-exc-toast");
  // Force dismissal after ~2s no matter what state Excalidraw leaves it in.
  window.setTimeout(() => {
    toast.style.transition = "opacity 0.25s ease";
    toast.style.opacity = "0";
    window.setTimeout(() => toast.remove(), 300);
  }, 2000);
}

export function installExcalidrawDomPatches(
  container: HTMLElement,
  getLang: () => string
): () => void {
  const isTr = () => getLang().startsWith("tr");

  const handleNode = (node: Node) => {
    if (!(node instanceof HTMLElement)) return;

    const menus: HTMLElement[] = node.matches(".context-menu")
      ? [node]
      : (Array.from(node.querySelectorAll(".context-menu")) as HTMLElement[]);
    menus.forEach((m) => patchContextMenu(m, isTr()));

    const toasts: HTMLElement[] = node.matches(".Toast")
      ? [node]
      : (Array.from(node.querySelectorAll(".Toast")) as HTMLElement[]);
    toasts.forEach((t) => {
      if (!t.classList.contains("tidenote-exc-toast")) patchToast(t);
    });

    if (isTr()) {
      const stats: HTMLElement[] = node.matches(".exc-stats")
        ? [node]
        : (Array.from(node.querySelectorAll(".exc-stats")) as HTMLElement[]);
      stats.forEach((s) => translateTextNodes(s));
    }
  };

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach(handleNode);
      // Stats panel re-renders its rows on selection change; retranslate the
      // panel the rows live in (exact-match replacement never touches numbers).
      if (isTr() && m.target instanceof HTMLElement) {
        const stats = m.target.closest(".exc-stats");
        if (stats) translateTextNodes(stats);
      }
    }
  });

  observer.observe(container, { childList: true, subtree: true });
  return () => observer.disconnect();
}
