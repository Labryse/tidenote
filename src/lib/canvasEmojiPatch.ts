const emojiRegex = /\p{Extended_Pictographic}/u;

function splitEmojis(text: string): { text: string; isEmoji: boolean }[] {
  const parts: { text: string; isEmoji: boolean }[] = [];
  let currentPart = "";
  let lastWasEmoji = false;

  for (const char of text) {
    const isEmoji = emojiRegex.test(char);
    if (isEmoji !== lastWasEmoji && currentPart) {
      parts.push({ text: currentPart, isEmoji: lastWasEmoji });
      currentPart = "";
    }
    currentPart += char;
    lastWasEmoji = isEmoji;
  }
  if (currentPart) {
    parts.push({ text: currentPart, isEmoji: lastWasEmoji });
  }
  return parts;
}

export function patchCanvasForEmojis() {
  if (typeof window === "undefined" || !window.CanvasRenderingContext2D) return;

  const proto = window.CanvasRenderingContext2D.prototype;
  const nativeFillText = proto.fillText;
  const nativeStrokeText = proto.strokeText;

  proto.fillText = function (text: any, x: number, y: number, maxWidth?: number) {
    const str = String(text);
    if (!emojiRegex.test(str)) {
      return nativeFillText.call(this, text, x, y, maxWidth);
    }

    // Check if the canvas belongs to Excalidraw and is in dark mode
    const isExcalidrawDark = this.canvas && this.canvas.closest(".theme--dark");
    if (!isExcalidrawDark) {
      return nativeFillText.call(this, text, x, y, maxWidth);
    }

    const parts = splitEmojis(str);
    let currentX = x;
    for (const part of parts) {
      if (part.isEmoji) {
        this.save();
        // Pre-invert the emoji so the Excalidraw dark-theme CSS filter double-inverts it back to normal
        this.filter = "invert(100%) hue-rotate(180deg)";
        nativeFillText.call(this, part.text, currentX, y);
        this.restore();
      } else {
        nativeFillText.call(this, part.text, currentX, y);
      }
      currentX += this.measureText(part.text).width;
    }
  };

  proto.strokeText = function (text: any, x: number, y: number, maxWidth?: number) {
    const str = String(text);
    if (!emojiRegex.test(str)) {
      return nativeStrokeText.call(this, text, x, y, maxWidth);
    }

    const isExcalidrawDark = this.canvas && this.canvas.closest(".theme--dark");
    if (!isExcalidrawDark) {
      return nativeStrokeText.call(this, text, x, y, maxWidth);
    }

    const parts = splitEmojis(str);
    let currentX = x;
    for (const part of parts) {
      if (part.isEmoji) {
        this.save();
        this.filter = "invert(100%) hue-rotate(180deg)";
        nativeStrokeText.call(this, part.text, currentX, y);
        this.restore();
      } else {
        nativeStrokeText.call(this, part.text, currentX, y);
      }
      currentX += this.measureText(part.text).width;
    }
  };
}
