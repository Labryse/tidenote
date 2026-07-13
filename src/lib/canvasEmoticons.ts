/**
 * Auto-convert common keyboard emoticons into emojis while typing in the
 * Excalidraw text editor. Conversion happens when the user types a space or
 * newline right after the emoticon (WhatsApp/Word-style), so typing ":Pizza"
 * never mangles into an emoji mid-word.
 */

const EMOTICONS: Record<string, string> = {
  ":D": "😄",
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

export function installCanvasEmoticons(container: HTMLElement): () => void {
  const onInput = (e: Event) => {
    const el = e.target as HTMLTextAreaElement;
    if (!el || el.tagName !== "TEXTAREA" || !el.classList.contains("excalidraw-wysiwyg")) return;

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
      
      // Ensure focus is on the element to guarantee replacement success
      el.focus();
      // Select the token and the typed separator (e.g. ":D ")
      el.setSelectionRange(caret - token.length - 1, caret);
      
      // Perform undoable replacement via browser execCommand
      const success = document.execCommand("insertText", false, emoji + sep);
      if (!success) {
        // Fallback to manual assignment if execCommand fails/is blocked
        const replaced = body.slice(0, -token.length) + emoji + sep;
        const afterPart = el.value.slice(caret);
        el.value = replaced + afterPart;
        el.selectionStart = replaced.length;
        el.selectionEnd = replaced.length;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return;
    }
  };

  container.addEventListener("input", onInput);
  return () => container.removeEventListener("input", onInput);
}
