/**
 * Auto-convert common keyboard emoticons into emojis while typing in the
 * Excalidraw text editor. Conversion happens when the user types a space or
 * newline right after the emoticon (WhatsApp/Word-style), so typing ":Pizza"
 * never mangles into an emoji mid-word.
 */

const EMOTICONS: Record<string, string> = {
  ":D": "😀",
  ":)": "🙂",
  ":(": "🙁",
  ":P": "😛",
  ":p": "😛",
  ";)": "😉",
  ":*": "😘",
  ":B": "🤓",
  ":O": "😮",
  ":o": "😮",
  ":|": "😐",
  ":/": "😕",
  "xD": "😆",
  "XD": "😆",
  "<3": "❤️",
};

// Longest first so ":D" doesn't shadow potential longer tokens.
const TOKENS = Object.keys(EMOTICONS).sort((a, b) => b.length - a.length);

// Native setter: React/Excalidraw ignore direct .value writes, so we go
// through the prototype setter and re-dispatch a real input event.
const setNativeValue = (el: HTMLTextAreaElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

export function installCanvasEmoticons(container: HTMLElement): () => void {
  const onInput = (e: Event) => {
    const el = e.target as HTMLTextAreaElement;
    if (!el || el.tagName !== "TEXTAREA" || !el.classList.contains("excalidraw-texteditor")) return;

    const caret = el.selectionStart ?? 0;
    if (caret < 2) return;
    const before = el.value.slice(0, caret);

    // Trigger only right after a separator was typed.
    const sep = before[before.length - 1];
    if (sep !== " " && sep !== "\n") return;
    const body = before.slice(0, -1);

    for (const token of TOKENS) {
      if (!body.endsWith(token)) continue;
      // Word boundary before the token (start of text or whitespace).
      const prev = body[body.length - token.length - 1];
      if (prev !== undefined && prev !== " " && prev !== "\n") return;

      const emoji = EMOTICONS[token];
      const next = body.slice(0, -token.length) + emoji + sep + el.value.slice(caret);
      const nextCaret = caret - token.length + emoji.length;
      setNativeValue(el, next);
      el.setSelectionRange(nextCaret, nextCaret);
      return;
    }
  };

  container.addEventListener("input", onInput);
  return () => container.removeEventListener("input", onInput);
}
