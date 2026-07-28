export function extractTextFromBlocks(blocks: any[]): string {
  if (!blocks || !Array.isArray(blocks)) return '';
  return blocks.map(block => {
    const inlineText = Array.isArray(block.content)
      ? block.content.map((c: any) => c.text || '').join('')
      : '';
    const childText = extractTextFromBlocks(block.children || []);
    return [inlineText, childText].filter(Boolean).join(' ');
  }).join(' ');
}
